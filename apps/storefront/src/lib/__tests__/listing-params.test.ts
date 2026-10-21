import { describe, expect, it } from "vitest"
import {
  activeFilterCount,
  MAX_PAGE,
  parseListingParams,
  toSearchParams,
  withFilters,
} from "../listing-params"

describe("parseListingParams", () => {
  it("returns safe defaults for an empty query", () => {
    expect(parseListingParams({})).toEqual({
      q: "",
      sizes: [],
      colors: [],
      fits: [],
      sleeves: [],
      necks: [],
      shapes: [],
      sports: [],
      techs: [],
      genders: [],
      priceMin: undefined,
      priceMax: undefined,
      discountMin: undefined,
      inStockOnly: false,
      sort: "relevance",
      page: 1,
    })
  })

  it("reads repeated and comma-separated values, de-duplicated", () => {
    const p = parseListingParams({ size: ["S", "M", "S"], color: "Navy,Black", tech: "t9-dry" })
    expect(p.sizes).toEqual(["S", "M"])
    expect(p.colors).toEqual(["Navy", "Black"])
    expect(p.techs).toEqual(["t9-dry"])
  })

  it("clamps hostile input: long values, many values, huge numbers, bad sort, bad page", () => {
    const p = parseListingParams({
      q: "x".repeat(500),
      size: Array.from({ length: 100 }, (_, i) => `S${i}`),
      color: "y".repeat(200),
      min: "-50",
      max: "9999999999",
      discount: "500",
      sort: "drop table",
      page: "99999",
    })
    expect(p.q.length).toBe(80)
    expect(p.sizes.length).toBe(12)
    expect(p.colors[0]!.length).toBe(40)
    expect(p.priceMin).toBe(0)
    expect(p.priceMax).toBe(1_000_000)
    expect(p.discountMin).toBe(90)
    expect(p.sort).toBe("relevance")
    expect(p.page).toBe(MAX_PAGE)
  })

  it("ignores non-numeric numbers and fixes an inverted price range", () => {
    expect(parseListingParams({ min: "abc", page: "x" })).toMatchObject({
      priceMin: undefined,
      page: 1,
    })
    expect(parseListingParams({ min: "800", max: "300" })).toMatchObject({
      priceMin: 800,
      priceMax: 800,
    })
  })

  it("accepts a fractional page by flooring it", () => {
    expect(parseListingParams({ page: "2.9" }).page).toBe(2)
  })
})

describe("toSearchParams", () => {
  it("round-trips and omits defaults", () => {
    const p = parseListingParams({
      size: ["M", "S"],
      sort: "price_asc",
      min: "300",
      stock: "1",
      page: "3",
    })
    const qs = toSearchParams(p).toString()
    expect(qs).toBe("size=M&size=S&min=300&stock=1&sort=price_asc&page=3")
    expect(toSearchParams(parseListingParams({})).toString()).toBe("")
  })

  it("produces the same URL for the same filters however they were typed", () => {
    const a = toSearchParams(parseListingParams({ color: "Navy", size: "S" })).toString()
    const b = toSearchParams(parseListingParams({ size: "S", color: "Navy" })).toString()
    expect(a).toBe(b)
  })
})

describe("filter helpers", () => {
  it("resets to page 1 when filters change", () => {
    const p = parseListingParams({ page: "4" })
    expect(withFilters(p, { sizes: ["S"] }).page).toBe(1)
  })
  it("counts active filters, treating the price range as one", () => {
    expect(
      activeFilterCount(parseListingParams({ size: ["S", "M"], min: "1", max: "9", stock: "1" })),
    ).toBe(4)
    expect(activeFilterCount(parseListingParams({ sort: "newest", page: "2" }))).toBe(0)
  })
})
