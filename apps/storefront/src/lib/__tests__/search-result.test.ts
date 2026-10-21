import { describe, expect, it } from "vitest"
import { mapSearchResult, sortFacetValues } from "../search-result"
import { parseSwatches } from "../colors"

describe("sortFacetValues", () => {
  it("orders sizes like a garment rack and others by popularity", () => {
    const sizes = [
      { value: "XL", count: 1 },
      { value: "S", count: 9 },
      { value: "XS", count: 2 },
      { value: "M", count: 5 },
    ]
    expect(sortFacetValues("sizes_available", sizes).map((s) => s.value)).toEqual([
      "XS",
      "S",
      "M",
      "XL",
    ])
    const colors = [
      { value: "Navy", count: 3 },
      { value: "Black", count: 8 },
      { value: "Coral", count: 3 },
    ]
    expect(sortFacetValues("colors", colors).map((s) => s.value)).toEqual([
      "Black",
      "Coral",
      "Navy",
    ])
  })
})

describe("mapSearchResult", () => {
  const raw = {
    hits: [{ id: "p1", document: { id: "p1", title: "A" } }],
    metadata: { count: 50 },
    facets: {
      colors: { type: "value" as const, values: [{ value: "Navy", count: 2 }] },
      min_price_inr: { type: "stats" as const, min: 299, max: 1999 },
    },
  }
  it("maps hits, totals, page count, facets and the price range", () => {
    const r = mapSearchResult(raw, 2, 24)
    expect(r.items).toHaveLength(1)
    expect(r.total).toBe(50)
    expect(r.pageCount).toBe(3)
    expect(r.facets.colors).toEqual([{ value: "Navy", count: 2 }])
    expect(r.facets.fit).toEqual([])
    expect(r.price).toEqual({ min: 299, max: 1999 })
  })
  it("handles an empty result", () => {
    const r = mapSearchResult({ hits: [], metadata: { count: 0 } }, 1, 24)
    expect(r.pageCount).toBe(1)
    expect(r.price).toBeNull()
  })
})

describe("parseSwatches", () => {
  it("parses name:hex pairs and drops malformed entries", () => {
    expect(
      parseSwatches(["Navy:#0f2a43", "Grey Melange:#9aa4ad", "bad", "x:#12", ":#ffffff"]),
    ).toEqual([
      { name: "Navy", hex: "#0f2a43" },
      { name: "Grey Melange", hex: "#9aa4ad" },
    ])
    expect(parseSwatches(undefined)).toEqual([])
  })
})
