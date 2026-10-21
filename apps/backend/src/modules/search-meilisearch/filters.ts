import { MedusaError } from "@medusajs/framework/utils"
import type { SearchTypes } from "@medusajs/framework/types"

type Fields = Record<string, SearchTypes.SearchFieldDefinition>

const OPERATORS = new Set([
  "$eq",
  "$ne",
  "$in",
  "$nin",
  "$lt",
  "$lte",
  "$gt",
  "$gte",
  "$exists",
  "$contains",
  "$overlaps",
])

const unsupported = (message: string) => new MedusaError(MedusaError.Types.INVALID_DATA, message)

/** Dates are indexed as epoch milliseconds so they can be filtered and sorted. */
export function toIndexedValue(value: unknown): unknown {
  if (value instanceof Date) return value.getTime()
  return value
}

function literal(value: unknown, kind: SearchTypes.SearchFieldKind | undefined): string {
  if (value === null) return "null"
  if (value instanceof Date) return String(value.getTime())
  if (kind === "date" && typeof value === "string") {
    const ms = Date.parse(value)
    if (Number.isNaN(ms)) throw unsupported(`"${value}" is not a valid date`)
    return String(ms)
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw unsupported("Filter values must be finite numbers")
    return String(value)
  }
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "string") return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
  throw unsupported(`Unsupported filter value of type ${typeof value}`)
}

function attr(path: string, fields: Fields): SearchTypes.SearchFieldDefinition {
  const def = fields[path]
  if (!def) throw unsupported(`Field "${path}" is not part of this search index`)
  if (!def.filterable) throw unsupported(`Field "${path}" is not filterable`)
  return def
}

function compileField(path: string, raw: unknown, fields: Fields): string {
  const def = attr(path, fields)
  const kind = def.type
  const isOperatorMap =
    raw !== null &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    !(raw instanceof Date) &&
    Object.keys(raw as object).some((k) => k.startsWith("$"))

  if (!isOperatorMap) {
    if (Array.isArray(raw)) return compileField(path, { $in: raw }, fields)
    return raw === null ? `${path} IS NULL` : `${path} = ${literal(raw, kind)}`
  }

  const parts: string[] = []
  for (const [op, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === undefined) continue
    if (!OPERATORS.has(op)) {
      throw unsupported(
        `Operator ${op} is not supported by the Meilisearch provider (field "${path}")`,
      )
    }
    const list = (v: unknown) => (Array.isArray(v) ? v : [v])
    switch (op) {
      case "$eq":
        parts.push(value === null ? `${path} IS NULL` : `${path} = ${literal(value, kind)}`)
        break
      case "$ne":
        parts.push(value === null ? `${path} IS NOT NULL` : `${path} != ${literal(value, kind)}`)
        break
      case "$in":
      case "$overlaps":
        parts.push(
          `${path} IN [${list(value)
            .map((v) => literal(v, kind))
            .join(", ")}]`,
        )
        break
      case "$nin":
        parts.push(
          `${path} NOT IN [${list(value)
            .map((v) => literal(v, kind))
            .join(", ")}]`,
        )
        break
      case "$lt":
        parts.push(`${path} < ${literal(value, kind)}`)
        break
      case "$lte":
        parts.push(`${path} <= ${literal(value, kind)}`)
        break
      case "$gt":
        parts.push(`${path} > ${literal(value, kind)}`)
        break
      case "$gte":
        parts.push(`${path} >= ${literal(value, kind)}`)
        break
      case "$exists":
        parts.push(value ? `${path} EXISTS` : `${path} NOT EXISTS`)
        break
      case "$contains":
        if (!def.array) throw unsupported(`$contains needs an array field, "${path}" is not one`)
        parts.push(...list(value).map((v) => `${path} = ${literal(v, kind)}`))
        break
    }
  }
  if (!parts.length) throw unsupported(`Empty operator map for field "${path}"`)
  return parts.length === 1 ? parts[0]! : `(${parts.join(" AND ")})`
}

/** Compiles a Medusa search filter tree to a Meilisearch filter expression. */
export function compileFilters(
  filters: SearchTypes.SearchFilters | undefined,
  fields: Fields,
): string | undefined {
  if (!filters) return undefined
  const parts: string[] = []
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || key === "q") continue
    if (key === "$and" || key === "$or") {
      const children = (value as SearchTypes.SearchFilters[])
        .map((f) => compileFilters(f, fields))
        .filter((c): c is string => Boolean(c))
      if (children.length) parts.push(`(${children.join(key === "$and" ? " AND " : " OR ")})`)
    } else if (key === "$not") {
      const inner = compileFilters(value as SearchTypes.SearchFilters, fields)
      if (inner) parts.push(`NOT (${inner})`)
    } else if (key === "$prefix" || key === "$like") {
      throw unsupported(`${key} is not supported by the Meilisearch provider`)
    } else {
      parts.push(compileField(key, value, fields))
    }
  }
  return parts.length ? parts.join(" AND ") : undefined
}

/** `{ id: "x" }`, `{ id: ["x","y"] }` or `{ id: { $in: [...] } }` on the primary key only. */
export function extractPrimaryKeyIds(
  filters: SearchTypes.SearchFilters,
  primaryKey: string,
): string[] | undefined {
  const keys = Object.keys(filters).filter((k) => filters[k] !== undefined)
  if (keys.length !== 1 || keys[0] !== primaryKey) return undefined
  const v = filters[primaryKey] as unknown
  if (typeof v === "string") return [v]
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v as string[]
  if (v && typeof v === "object" && "$in" in v) {
    const list = (v as { $in?: unknown[] }).$in
    if (Array.isArray(list) && list.every((x) => typeof x === "string")) return list as string[]
  }
  return undefined
}
