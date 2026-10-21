import { PAGE_SIZE, type ListingParams, type SortKey } from "./listing-params"

/** What a listing page is about, before the shopper's own filters. */
export interface ListingScope {
  categories?: string[]
  collection?: string
  tags?: string[]
  technologies?: string[]
  onSale?: boolean
  maxPrice?: number
}

export const HIT_FIELDS = [
  "id",
  "handle",
  "title",
  "thumbnail",
  "min_price_inr",
  "mrp",
  "discount_percent",
  "in_stock",
  "tags",
  "technologies",
  "color_swatches",
  "fit",
  "gender",
  "product_type",
  "created_at",
] as const

export const FACET_FIELDS = [
  "sizes_available",
  "colors",
  "fit",
  "sleeve",
  "neck",
  "shape",
  "sport",
  "technologies",
  "gender",
] as const

type Order = Record<string, "ASC" | "DESC">

export function sortOrder(sort: SortKey, hasQuery: boolean): Order | undefined {
  // Shoppers see sold-out items last, except in text search where relevance decides.
  const stockLast: Order = hasQuery ? {} : { in_stock: "DESC" }
  switch (sort) {
    case "bestseller":
      return { ...stockLast, bestseller_rank: "ASC" }
    case "newest":
      return { ...stockLast, created_at: "DESC" }
    case "price_asc":
      return { ...stockLast, min_price_inr: "ASC" }
    case "price_desc":
      return { ...stockLast, min_price_inr: "DESC" }
    case "discount":
      return { ...stockLast, discount_percent: "DESC", bestseller_rank: "ASC" }
    default:
      return hasQuery ? undefined : { ...stockLast, bestseller_rank: "ASC" }
  }
}

type Filters = Record<string, unknown>

export function buildFilters(scope: ListingScope, p: ListingParams): Filters {
  const f: Filters = {}
  const and: Filters[] = []
  if (p.q) f.q = p.q
  if (scope.categories?.length) and.push({ categories: { $overlaps: scope.categories } })
  if (scope.collection) f.collection = scope.collection
  if (scope.tags?.length) f.tags = { $overlaps: scope.tags }
  if (scope.technologies?.length) and.push({ technologies: { $overlaps: scope.technologies } })

  const price: Record<string, number> = {}
  if (scope.maxPrice !== undefined) price.$lte = scope.maxPrice
  if (p.priceMin !== undefined) price.$gte = p.priceMin
  if (p.priceMax !== undefined) price.$lte = Math.min(p.priceMax, price.$lte ?? p.priceMax)
  if (Object.keys(price).length) f.min_price_inr = price

  const discount: Record<string, number> = {}
  if (scope.onSale) discount.$gt = 0
  if (p.discountMin) discount.$gte = p.discountMin
  if (Object.keys(discount).length) f.discount_percent = discount

  if (p.sizes.length) and.push({ sizes_available: { $overlaps: p.sizes } })
  if (p.colors.length) and.push({ colors: { $overlaps: p.colors } })
  if (p.techs.length) and.push({ technologies: { $overlaps: p.techs } })
  if (p.fits.length) f.fit = { $in: p.fits }
  if (p.sleeves.length) f.sleeve = { $in: p.sleeves }
  if (p.necks.length) f.neck = { $in: p.necks }
  if (p.shapes.length) f.shape = { $in: p.shapes }
  if (p.sports.length) f.sport = { $in: p.sports }
  if (p.genders.length) f.gender = { $in: p.genders }
  if (p.inStockOnly) f.in_stock = true
  if (and.length) f.$and = and
  return f
}

export function buildSearchBody(scope: ListingScope, p: ListingParams, take = PAGE_SIZE) {
  const order = sortOrder(p.sort, Boolean(p.q))
  return {
    entity: "product",
    fields: [...HIT_FIELDS],
    filters: buildFilters(scope, p),
    pagination: { skip: (p.page - 1) * take, take, ...(order ? { order } : {}) },
    search_options: {
      facets: [
        ...FACET_FIELDS,
        { field: "min_price_inr", type: "stats" as const },
        { field: "discount_percent", type: "stats" as const },
      ],
      disjunctive_facets: true,
    },
  }
}
