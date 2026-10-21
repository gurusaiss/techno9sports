import { describe, expect, it } from "vitest"
import { buildFilters, buildSearchBody, sortOrder } from "../catalog-query"
import { parseListingParams } from "../listing-params"

const P = (raw: Record<string, string | string[]> = {}) => parseListingParams(raw)

describe("buildFilters", () => {
  it("combines the page scope with the shopper's filters", () => {
    const f = buildFilters(
      { categories: ["men-t-shirts"], tags: ["new"] },
      P({ size: ["M"], color: "Navy", fit: "Slim", min: "300", max: "900", discount: "30" }),
    )
    expect(f).toEqual({
      tags: { $overlaps: ["new"] },
      min_price_inr: { $gte: 300, $lte: 900 },
      discount_percent: { $gte: 30 },
      fit: { $in: ["Slim"] },
      $and: [
        { categories: { $overlaps: ["men-t-shirts"] } },
        { sizes_available: { $overlaps: ["M"] } },
        { colors: { $overlaps: ["Navy"] } },
      ],
    })
  })

  it("keeps the page's price cap even if the URL asks for more", () => {
    expect(buildFilters({ maxPrice: 499 }, P({ max: "999" })).min_price_inr).toEqual({ $lte: 499 })
    expect(buildFilters({ maxPrice: 499 }, P({ max: "300" })).min_price_inr).toEqual({ $lte: 300 })
  })

  it("restricts the sale page to discounted products", () => {
    expect(buildFilters({ onSale: true }, P()).discount_percent).toEqual({ $gt: 0 })
    expect(buildFilters({ onSale: true }, P({ discount: "40" })).discount_percent).toEqual({
      $gt: 0,
      $gte: 40,
    })
  })

  it("puts free text in q and sold-out handling in in_stock", () => {
    const f = buildFilters({}, P({ q: "dry tee", stock: "1" }))
    expect(f.q).toBe("dry tee")
    expect(f.in_stock).toBe(true)
    expect(buildFilters({}, P()).in_stock).toBeUndefined()
  })

  it("produces no filters for an unscoped, unfiltered listing", () => {
    expect(buildFilters({}, P())).toEqual({})
  })
})

describe("sortOrder", () => {
  it("shows sold-out last for browsing sorts", () => {
    expect(sortOrder("price_asc", false)).toEqual({ in_stock: "DESC", min_price_inr: "ASC" })
    expect(sortOrder("newest", false)).toEqual({ in_stock: "DESC", created_at: "DESC" })
    expect(sortOrder("discount", false)).toEqual({
      in_stock: "DESC",
      discount_percent: "DESC",
      bestseller_rank: "ASC",
    })
  })
  it("lets relevance decide in text search, and defaults to bestsellers when browsing", () => {
    expect(sortOrder("relevance", true)).toBeUndefined()
    expect(sortOrder("relevance", false)).toEqual({ in_stock: "DESC", bestseller_rank: "ASC" })
    expect(sortOrder("price_desc", true)).toEqual({ min_price_inr: "DESC" })
  })
})

describe("buildSearchBody", () => {
  it("paginates, asks for facets and price stats, and never requests unindexed fields", () => {
    const body = buildSearchBody({ categories: ["men"] }, P({ page: "3" }), 24)
    expect(body.pagination).toMatchObject({ skip: 48, take: 24 })
    expect(body.search_options.facets).toContainEqual({ field: "min_price_inr", type: "stats" })
    expect(body.fields).toContain("min_price_inr")
    expect(body.fields).not.toContain("status")
  })
})
