import { describe, expect, it } from "vitest"
import { parseListingParams } from "@/lib/listing-params"
import type { ListingResult } from "@/lib/search-result"
import { activeChips, groupsFromFacets, paramsFromState, stateFromParams } from "../filter-state"

const facets = (over: Partial<ListingResult["facets"]> = {}): ListingResult["facets"] => ({
  sizes_available: [],
  colors: [],
  fit: [],
  sleeve: [],
  neck: [],
  shape: [],
  sport: [],
  technologies: [],
  gender: [],
  ...over,
})

describe("params <-> filter state", () => {
  it("round-trips every filter and resets to page 1", () => {
    const base = parseListingParams({
      size: ["S", "M"],
      color: "Navy",
      fit: "Slim",
      tech: "t9-dry",
      min: "300",
      max: "900",
      discount: "30",
      stock: "1",
      sort: "newest",
      page: "4",
      q: "tee",
    })
    const back = paramsFromState(stateFromParams(base), base)
    expect(back).toEqual({ ...base, page: 1 })
  })

  it("takes the largest chosen discount and repairs an inverted price range", () => {
    const base = parseListingParams({})
    const state = stateFromParams(base)
    state.options.discount = ["20", "40"]
    state.ranges.price = { min: 900, max: 300 }
    expect(paramsFromState(state, base)).toMatchObject({
      discountMin: 40,
      priceMin: 900,
      priceMax: 900,
    })
  })
})

describe("groupsFromFacets", () => {
  const result = {
    facets: facets({
      sizes_available: [{ value: "S", count: 3 }],
      colors: [{ value: "Navy", count: 2 }],
      technologies: [{ value: "t9-dry", count: 1 }],
      gender: [{ value: "men", count: 4 }],
    }),
    price: { min: 299, max: 1999 },
  }

  it("includes only groups that have values, with readable labels and swatches", () => {
    const groups = groupsFromFacets(result, {
      techNames: { "t9-dry": "T9 Dry" },
      showGender: false,
    })
    expect(groups.map((g) => g.id)).toEqual(["size", "color", "tech", "discount", "price", "stock"])
    const color = groups.find((g) => g.id === "color")!
    expect(color.kind === "options" && color.options[0]).toMatchObject({
      label: "Navy",
      swatch: "#0f2a43",
    })
    const tech = groups.find((g) => g.id === "tech")!
    expect(tech.kind === "options" && tech.options[0]!.label).toBe("T9 Dry")
  })

  it("shows the gender filter only where it is useful", () => {
    const ids = groupsFromFacets(result, { techNames: {}, showGender: true }).map((g) => g.id)
    expect(ids).toContain("gender")
  })

  it("omits the price range when every product costs the same", () => {
    const ids = groupsFromFacets(
      { ...result, price: { min: 499, max: 499 } },
      { techNames: {}, showGender: false },
    ).map((g) => g.id)
    expect(ids).not.toContain("price")
  })
})

describe("activeChips", () => {
  it("makes one removable chip per active value and removal clears just that value", () => {
    const p = parseListingParams({ size: ["S", "M"], tech: "t9-dry", min: "300", stock: "1" })
    const groups = groupsFromFacets(
      {
        facets: facets({
          sizes_available: [
            { value: "S", count: 1 },
            { value: "M", count: 1 },
          ],
        }),
        price: null,
      },
      { techNames: { "t9-dry": "T9 Dry" }, showGender: false },
    )
    const chips = activeChips(p, groups, { "t9-dry": "T9 Dry" })
    expect(chips.map((c) => c.label)).toEqual(["S", "M", "T9 Dry", "In stock only", "₹300 to any"])
    const after = paramsFromState(chips[0]!.remove(stateFromParams(p)), p)
    expect(after.sizes).toEqual(["M"])
    expect(after.techs).toEqual(["t9-dry"])
    const noPrice = paramsFromState(chips[4]!.remove(stateFromParams(p)), p)
    expect(noPrice.priceMin).toBeUndefined()
  })
})
