import { AbstractSearchProviderService, MedusaError } from "@medusajs/framework/utils"
import type { SearchTypes } from "@medusajs/framework/types"
import { MeiliClient, MeiliError } from "./client"
import { compileFilters, extractPrimaryKeyIds, toIndexedValue } from "./filters"
import { assertIndexSupported, buildSettings } from "./settings"

export interface MeilisearchOptions {
  host: string
  apiKey: string
  /** Prepended to every physical index name, to share one Meilisearch between environments. */
  indexPrefix?: string
  /** How long writes may take before the provider gives up waiting, in ms. */
  taskTimeoutMs?: number
}

type Fields = Record<string, SearchTypes.SearchFieldDefinition>

const bad = (message: string) => new MedusaError(MedusaError.Types.INVALID_DATA, message)

/**
 * Meilisearch provider for the Medusa Search module. Keep this behind the module's interface:
 * the storefront never talks to Meilisearch, so Algolia or Typesense can replace it by swapping
 * the provider in medusa-config.
 */
export class MeilisearchSearchService extends AbstractSearchProviderService {
  static identifier = "meilisearch"

  protected readonly client_: MeiliClient
  protected readonly options_: MeilisearchOptions

  constructor(_container: Record<string, unknown>, options: MeilisearchOptions) {
    super()
    if (!options?.host) throw bad("The Meilisearch provider needs a `host` option")
    this.options_ = options
    this.client_ = new MeiliClient(options.host, options.apiKey)
  }

  /** Throws a clear error at boot when options are missing. */
  static validateOptions(options: Record<string, unknown>) {
    if (!options?.host) throw bad("The Meilisearch provider needs a `host` option")
  }

  protected timeout(): number {
    return this.options_.taskTimeoutMs ?? 30_000
  }

  protected async finish(taskUid: number, index: string): Promise<SearchTypes.SearchTask> {
    // Index and settings changes are cheap, and callers rely on them being applied.
    const task = await this.client_.waitForTask(taskUid, this.timeout())
    if (task.status === "failed") {
      return {
        id: String(taskUid),
        index,
        status: "failed",
        error: {
          message: task.error?.message ?? "Meilisearch task failed",
          code: task.error?.code,
        },
      }
    }
    return { id: String(taskUid), index, status: "succeeded" }
  }

  async upsertIndex({ index }: { index: SearchTypes.ResolvedSearchIndexDefinition }) {
    assertIndexSupported(index)
    const uid = index.physical_name
    try {
      await this.client_.getIndex(uid)
    } catch (e) {
      if (!(e instanceof MeiliError) || e.code !== "index_not_found") throw e
      const created = await this.client_.createIndex(uid, index.primary_key)
      const result = await this.finish(created.taskUid, uid)
      if (result.status === "failed") throw bad(result.error?.message ?? "Could not create index")
    }
    const update = await this.client_.updateSettings(uid, buildSettings(index))
    const result = await this.finish(update.taskUid, uid)
    if (result.status === "failed") throw bad(result.error?.message ?? "Could not apply settings")
    return result
  }

  async deleteIndex({ index }: { index: string }) {
    try {
      const task = await this.client_.deleteIndex(index)
      return await this.finish(task.taskUid, index)
    } catch (e) {
      if (e instanceof MeiliError && e.code === "index_not_found") {
        return { index, status: "succeeded" as const }
      }
      throw e
    }
  }

  async listIndexes(): Promise<SearchTypes.SearchIndexInfo[]> {
    const { results } = await this.client_.listIndexes()
    const prefix = this.options_.indexPrefix ?? ""
    const mine = results.filter((i) => i.uid.startsWith(prefix))
    return await Promise.all(
      mine.map(async (i) => ({
        name: i.uid,
        provider: MeilisearchSearchService.identifier,
        document_count: await this.client_.documentCount(i.uid),
        created_at: new Date(i.createdAt),
        updated_at: new Date(i.updatedAt),
      })),
    )
  }

  /** Keep declared fields only, and turn dates into epoch ms so they sort and filter. */
  protected prepare(
    documents: SearchTypes.SearchDocument[],
    definition: SearchTypes.ResolvedSearchIndexDefinition,
  ) {
    return documents.map((doc) => {
      const out: Record<string, unknown> = {
        [definition.primary_key]: doc[definition.primary_key] ?? doc.id,
      }
      for (const [path, def] of Object.entries(definition.fields)) {
        const v = doc[path]
        if (v === undefined) continue
        if (def.type === "date") {
          const toMs = (x: unknown) =>
            x instanceof Date ? x.getTime() : typeof x === "string" ? Date.parse(x) : x
          out[path] = Array.isArray(v) ? v.map(toMs) : toMs(v)
        } else {
          out[path] = Array.isArray(v) ? v.map(toIndexedValue) : toIndexedValue(v)
        }
      }
      return out
    })
  }

  async upsertDocuments({
    index,
    definition,
    documents,
  }: {
    index: string
    definition: SearchTypes.ResolvedSearchIndexDefinition
    documents: SearchTypes.SearchDocument[]
  }) {
    if (!documents.length) return { index, status: "succeeded" as const }
    const task = await this.client_.addDocuments(
      index,
      this.prepare(documents, definition),
      definition.primary_key,
    )
    return { id: String(task.taskUid), index, status: "enqueued" as const }
  }

  async waitForTask(task: SearchTypes.SearchTask, options?: { timeout_ms?: number }) {
    if (!task.id) return task
    const done = await this.client_.waitForTask(
      Number(task.id),
      options?.timeout_ms ?? this.timeout(),
    )
    return {
      ...task,
      status: done.status === "succeeded" ? ("succeeded" as const) : ("failed" as const),
      error: done.error ? { message: done.error.message, code: done.error.code } : undefined,
    }
  }

  async deleteDocuments({ index, filters }: SearchTypes.SearchDeleteDocumentsInput) {
    const info = await this.client_.getIndex(index)
    const ids = extractPrimaryKeyIds(filters, info.primaryKey ?? "id")
    if (ids) {
      const task = await this.client_.deleteDocumentsByIds(index, ids)
      return { id: String(task.taskUid), index, status: "enqueued" as const }
    }
    const settings = await this.client_.getSettings(index)
    const fields: Fields = Object.fromEntries(
      ((settings.filterableAttributes as string[] | undefined) ?? []).map((p) => [
        p,
        { type: "keyword" as const, filterable: true },
      ]),
    )
    const filter = compileFilters(filters, fields)
    if (!filter) throw bad("deleteDocuments needs at least one filter")
    const task = await this.client_.deleteDocumentsByFilter(index, filter)
    return { id: String(task.taskUid), index, status: "enqueued" as const }
  }

  async clearIndex({ index }: { index: string }) {
    const task = await this.client_.deleteAllDocuments(index)
    return await this.finish(task.taskUid, index)
  }

  protected fromIndexed(hit: Record<string, unknown>, fields: Fields): Record<string, unknown> {
    const doc: Record<string, unknown> = { ...hit }
    delete doc._rankingScore
    for (const [path, def] of Object.entries(fields)) {
      if (def.type !== "date" || doc[path] === undefined || doc[path] === null) continue
      const toIso = (x: unknown) => (typeof x === "number" ? new Date(x).toISOString() : x)
      doc[path] = Array.isArray(doc[path]) ? (doc[path] as unknown[]).map(toIso) : toIso(doc[path])
    }
    return doc
  }

  async search(input: SearchTypes.ProviderSearchQuery): Promise<SearchTypes.SearchResult> {
    const { index, filters, pagination, search_options: opts = {} } = input
    const fields = index.fields
    if (opts.highlight) throw bad("Highlighting is not supported by the Meilisearch provider")
    if (opts.vector) throw bad("Vector search is not supported by the Meilisearch provider")
    if (opts.min_score !== undefined)
      throw bad("min_score is not supported by the Meilisearch provider")
    if (opts.typo_tolerance === false) {
      throw bad("Per-query typo tolerance can't be disabled; change the index settings instead")
    }

    const skip = pagination?.skip ?? 0
    const take = pagination?.take ?? 20
    const sort = Object.entries(pagination?.order ?? {})
      .filter(([field]) => field !== "_score")
      .map(([field, dir]) => {
        if (!fields[field]?.sortable) throw bad(`Field "${field}" is not sortable`)
        return `${field}:${dir === "DESC" ? "desc" : "asc"}`
      })

    const facetRequests = (opts.facets ?? []).map((f) => (typeof f === "string" ? { field: f } : f))
    for (const f of facetRequests) {
      if ("type" in f && f.type === "range") {
        throw bad(`Range facets are not supported by the Meilisearch provider ("${f.field}")`)
      }
      if (!fields[f.field]?.facetable) throw bad(`Field "${f.field}" is not facetable`)
    }

    const wantExact = opts.count !== "estimated" && opts.count !== "none"
    // Meilisearch only reports an exact total in page mode, which needs skip to align with take.
    const pageMode = wantExact && take > 0 && skip % take === 0

    const params: Record<string, unknown> = {
      filter: compileFilters(filters, fields),
      sort: sort.length ? sort : undefined,
      facets: facetRequests.length ? facetRequests.map((f) => f.field) : undefined,
      attributesToRetrieve: Array.from(
        new Set([index.primary_key, ...input.attributes_to_retrieve]),
      ),
      attributesToSearchOn: opts.attributes_to_search_on,
      matchingStrategy: opts.match_strategy,
      showRankingScore: opts.include_score || undefined,
      distinct: opts.distinct,
      ...(pageMode ? { hitsPerPage: take, page: skip / take + 1 } : { limit: take, offset: skip }),
    }

    const res = await this.client_.search<{
      hits: Record<string, unknown>[]
      totalHits?: number
      estimatedTotalHits?: number
      facetDistribution?: Record<string, Record<string, number>>
      facetStats?: Record<string, { min: number; max: number }>
      processingTimeMs?: number
    }>(index.physical_name, { q: input.q ?? "", ...params })

    const total = res.totalHits ?? res.estimatedTotalHits ?? null
    const facets: Record<string, SearchTypes.SearchFacetResult> = {}
    for (const f of facetRequests) {
      const wantsStats = "type" in f && f.type === "stats"
      if (wantsStats) {
        const s = res.facetStats?.[f.field]
        if (s) facets[f.field] = { type: "stats", min: s.min, max: s.max, count: total ?? 0 }
      } else {
        const dist = res.facetDistribution?.[f.field] ?? {}
        const sortAlpha = "sort" in f && f.sort === "alpha"
        const values = Object.entries(dist)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => (sortAlpha ? a.value.localeCompare(b.value) : b.count - a.count))
        const limit = "limit" in f ? f.limit : undefined
        facets[f.field] = { type: "value", values: limit ? values.slice(0, limit) : values }
      }
    }

    return {
      hits: res.hits.map((hit) => ({
        id: String(hit[index.primary_key]),
        score: opts.include_score ? (hit._rankingScore as number | undefined) : undefined,
        document: this.fromIndexed(hit, fields),
      })),
      facets: facetRequests.length ? facets : undefined,
      metadata: {
        skip,
        take,
        count: opts.count === "none" ? null : total,
        query: input.q,
        processing_time_ms: res.processingTimeMs,
      },
    }
  }
}
