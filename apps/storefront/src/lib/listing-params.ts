/**
 * Listing filters live in the URL so pages are shareable and crawlable. Multi-value filters repeat
 * the key (?size=S&size=M). Everything from the URL is untrusted: it is clamped and sanitised here.
 */
export const SORT_KEYS = [
  "relevance",
  "bestseller",
  "newest",
  "price_asc",
  "price_desc",
  "discount",
] as const
export type SortKey = (typeof SORT_KEYS)[number]

export interface ListingParams {
  q: string
  sizes: string[]
  colors: string[]
  fits: string[]
  sleeves: string[]
  necks: string[]
  shapes: string[]
  sports: string[]
  techs: string[]
  genders: string[]
  priceMin?: number
  priceMax?: number
  discountMin?: number
  /** Hide sold-out products. Off by default so shoppers can still see (and be notified about) them. */
  inStockOnly: boolean
  sort: SortKey
  page: number
}

export type RawSearchParams = Record<string, string | string[] | undefined>

const MULTI = {
  size: "sizes",
  color: "colors",
  fit: "fits",
  sleeve: "sleeves",
  neck: "necks",
  shape: "shapes",
  sport: "sports",
  tech: "techs",
  gender: "genders",
} as const

const MAX_VALUES = 12
const MAX_LEN = 40
export const MAX_PAGE = 100
export const PAGE_SIZE = 24

const list = (raw: string | string[] | undefined): string[] => {
  const values = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]
  const clean = values
    .flatMap((v) => v.split(","))
    .map((v) => v.trim().slice(0, MAX_LEN))
    .filter(Boolean)
  return Array.from(new Set(clean)).slice(0, MAX_VALUES)
}

const num = (raw: string | string[] | undefined, min: number, max: number): number | undefined => {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (v === undefined || v === "") return undefined
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : undefined
}

export function parseListingParams(raw: RawSearchParams): ListingParams {
  const first = (k: string) => (Array.isArray(raw[k]) ? raw[k]![0] : (raw[k] as string | undefined))
  const sort = SORT_KEYS.find((s) => s === first("sort"))
  const page = num(raw.page, 1, MAX_PAGE)
  const priceMin = num(raw.min, 0, 1_000_000)
  const priceMax = num(raw.max, 0, 1_000_000)
  return {
    q: (first("q") ?? "").trim().slice(0, 80),
    sizes: list(raw.size),
    colors: list(raw.color),
    fits: list(raw.fit),
    sleeves: list(raw.sleeve),
    necks: list(raw.neck),
    shapes: list(raw.shape),
    sports: list(raw.sport),
    techs: list(raw.tech),
    genders: list(raw.gender),
    priceMin,
    priceMax:
      priceMin !== undefined && priceMax !== undefined && priceMax < priceMin ? priceMin : priceMax,
    discountMin: num(raw.discount, 0, 90),
    inStockOnly: first("stock") === "1",
    sort: sort ?? "relevance",
    page: Math.floor(page ?? 1),
  }
}

/** Canonical query string: stable key order, defaults omitted, so equal filters give equal URLs. */
export function toSearchParams(p: Partial<ListingParams>): URLSearchParams {
  const out = new URLSearchParams()
  if (p.q) out.set("q", p.q)
  for (const [key, field] of Object.entries(MULTI)) {
    for (const v of (p[field] as string[] | undefined) ?? []) out.append(key, v)
  }
  if (p.priceMin !== undefined) out.set("min", String(p.priceMin))
  if (p.priceMax !== undefined) out.set("max", String(p.priceMax))
  if (p.discountMin) out.set("discount", String(p.discountMin))
  if (p.inStockOnly) out.set("stock", "1")
  if (p.sort && p.sort !== "relevance") out.set("sort", p.sort)
  if (p.page && p.page > 1) out.set("page", String(p.page))
  return out
}

/** Filters changed, so go back to page 1. */
export function withFilters(p: ListingParams, changes: Partial<ListingParams>): ListingParams {
  return { ...p, ...changes, page: 1 }
}

export function activeFilterCount(p: ListingParams): number {
  return (
    p.sizes.length +
    p.colors.length +
    p.fits.length +
    p.sleeves.length +
    p.necks.length +
    p.shapes.length +
    p.sports.length +
    p.techs.length +
    p.genders.length +
    (p.priceMin !== undefined || p.priceMax !== undefined ? 1 : 0) +
    (p.discountMin ? 1 : 0) +
    (p.inStockOnly ? 1 : 0)
  )
}
