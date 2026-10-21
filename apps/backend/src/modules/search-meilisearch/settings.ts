import { MedusaError } from "@medusajs/framework/utils"
import type { SearchTypes } from "@medusajs/framework/types"

const SUPPORTED: SearchTypes.SearchFieldKind[] = [
  "keyword",
  "text",
  "integer",
  "float",
  "boolean",
  "date",
]

/** Refuses what Meilisearch can't hold, so a bad definition fails at boot, not at query time. */
export function assertIndexSupported(index: SearchTypes.ResolvedSearchIndexDefinition) {
  for (const [path, def] of Object.entries(index.fields)) {
    if (!SUPPORTED.includes(def.type)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Field "${path}" has type "${def.type}", which the Meilisearch provider does not support`,
      )
    }
    const types =
      typeof def.facetable === "object" && def.facetable.types ? def.facetable.types : undefined
    if (types?.includes("range")) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Field "${path}" asks for range facets, which the Meilisearch provider does not support`,
      )
    }
  }
}

const weightOf = (def: SearchTypes.SearchFieldDefinition): number =>
  typeof def.searchable === "object" ? (def.searchable.weight ?? 1) : 1

/** Meilisearch ranks by the order of searchableAttributes, so heavier fields come first. */
export function buildSettings(
  index: SearchTypes.ResolvedSearchIndexDefinition,
): Record<string, unknown> {
  const entries = Object.entries(index.fields)
  const searchable = entries
    .filter(([, d]) => d.searchable)
    .sort(([, a], [, b]) => weightOf(b) - weightOf(a))
    .map(([p]) => p)
  const filterable = entries.filter(([, d]) => d.filterable || d.facetable).map(([p]) => p)
  const sortable = entries.filter(([, d]) => d.sortable).map(([p]) => p)
  const displayed = [
    index.primary_key,
    ...entries.filter(([, d]) => d.retrievable !== false).map(([p]) => p),
  ]
  const typo = index.settings.typo_tolerance
  return {
    searchableAttributes: searchable.length ? searchable : ["*"],
    filterableAttributes: Array.from(new Set([index.primary_key, ...filterable])),
    sortableAttributes: sortable,
    displayedAttributes: Array.from(new Set(displayed)),
    distinctAttribute: index.settings.distinct_attribute ?? null,
    typoTolerance: {
      enabled: typo?.enabled ?? true,
      minWordSizeForTypos: {
        oneTypo: typo?.min_word_size_for_one_typo ?? 5,
        twoTypos: typo?.min_word_size_for_two_typos ?? 9,
      },
      disableOnAttributes: typo?.disabled_on_attributes ?? [],
    },
    faceting: { maxValuesPerFacet: 200 },
    pagination: { maxTotalHits: 10000 },
  }
}
