import type { ProductHit } from "@t9/types"
import { FACET_FIELDS } from "./catalog-query"

export type FacetKey = (typeof FACET_FIELDS)[number]
export interface FacetValue {
  value: string
  count: number
}

export interface ListingResult {
  items: ProductHit[]
  total: number
  page: number
  pageCount: number
  facets: Record<FacetKey, FacetValue[]>
  price: { min: number; max: number } | null
}

interface RawResult {
  hits: { id: string; document: Record<string, unknown> }[]
  facets?: Record<
    string,
    { type: "value"; values: FacetValue[] } | { type: "stats"; min: number; max: number }
  >
  metadata: { count: number | null }
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]

/** Sizes in garment order, everything else by how many products match. */
export function sortFacetValues(key: FacetKey, values: FacetValue[]): FacetValue[] {
  const copy = [...values]
  if (key === "sizes_available") {
    const rank = (v: string) => {
      const i = SIZE_ORDER.indexOf(v)
      return i === -1 ? 100 : i
    }
    return copy.sort((a, b) => rank(a.value) - rank(b.value) || a.value.localeCompare(b.value))
  }
  return copy.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

export function mapSearchResult(raw: RawResult, page: number, take: number): ListingResult {
  const total = raw.metadata.count ?? raw.hits.length
  const facets = Object.fromEntries(
    FACET_FIELDS.map((key) => {
      const f = raw.facets?.[key]
      return [key, f && f.type === "value" ? sortFacetValues(key, f.values) : []]
    }),
  ) as Record<FacetKey, FacetValue[]>
  const stats = raw.facets?.min_price_inr
  return {
    items: raw.hits.map((h) => h.document as unknown as ProductHit),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / take)),
    facets,
    price: stats && stats.type === "stats" ? { min: stats.min, max: stats.max } : null,
  }
}
