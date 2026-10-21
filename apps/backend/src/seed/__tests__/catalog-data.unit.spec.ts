import {
  CATEGORIES,
  COLLECTIONS,
  COLORS,
  FABRIC_TECHS,
  FLAG_TAGS,
  defaultCollection,
  PRODUCT_TYPES,
  PRODUCTS,
  SIZE_CHARTS,
} from "../catalog-data"

const categoryHandles = new Set(
  CATEGORIES.flatMap((c) => [c.handle, ...(c.children ?? []).map((k) => k.handle)]),
)
const leafHandles = new Set(CATEGORIES.flatMap((c) => (c.children ?? []).map((k) => k.handle)))

describe("seed catalogue", () => {
  it("has at least 40 products with unique codes and titles", () => {
    expect(PRODUCTS.length).toBeGreaterThanOrEqual(40)
    expect(new Set(PRODUCTS.map((p) => p.code)).size).toBe(PRODUCTS.length)
    expect(new Set(PRODUCTS.map((p) => p.title)).size).toBe(PRODUCTS.length)
  })

  it("references only categories, collections, types, techs, charts and colours that exist", () => {
    const collections = new Set([
      ...COLLECTIONS.map((c) => c.handle),
      ...Object.keys(FLAG_TAGS),
      "under-499",
    ])
    const techs = new Set(FABRIC_TECHS.map((t) => t.handle))
    const charts = new Set(SIZE_CHARTS.map((c) => c.handle))
    for (const p of PRODUCTS) {
      for (const c of p.categories) expect(leafHandles.has(c)).toBe(true)
      for (const c of p.collections) expect(collections.has(c)).toBe(true)
      for (const t of p.tech) expect(techs.has(t)).toBe(true)
      if (p.sizeChart) expect(charts.has(p.sizeChart)).toBe(true)
      expect(PRODUCT_TYPES).toContain(p.type)
      for (const c of p.colors) expect(COLORS[c]).toBeDefined()
    }
    expect(categoryHandles.size).toBeGreaterThan(20)
  })

  it("gives each product at most one real collection", () => {
    const real = new Set(COLLECTIONS.map((c) => c.handle))
    for (const p of PRODUCTS) {
      expect(p.collections.filter((c) => real.has(c)).length).toBeLessThanOrEqual(1)
      const resolved = p.collections.find((c) => real.has(c)) ?? defaultCollection(p)
      if (resolved) expect(real.has(resolved)).toBe(true)
    }
  })

  it("keeps prices in the planned range with a real MRP above the price", () => {
    for (const p of PRODUCTS) {
      expect(p.price).toBeGreaterThanOrEqual(299)
      expect(p.price).toBeLessThanOrEqual(1999)
      expect(p.mrp).toBeGreaterThan(p.price)
    }
  })

  it("covers every top-level category, and frames carry no fabric tech", () => {
    const tops = new Set(PRODUCTS.flatMap((p) => p.categories.map((c) => c.split("-")[0])))
    for (const top of ["men", "women", "unisex", "frames", "accessories"])
      expect(tops.has(top)).toBe(true)
    for (const p of PRODUCTS.filter((x) => x.type === "Sports frames")) expect(p.tech).toEqual([])
  })

  it("has size chart rows that match their columns, and sizes that exist in the chart", () => {
    for (const c of SIZE_CHARTS) {
      for (const row of c.rows)
        for (const col of c.columns) expect((row as Record<string, string>)[col]).toBeDefined()
    }
    for (const p of PRODUCTS.filter((x) => x.sizeChart)) {
      const chart = SIZE_CHARTS.find((c) => c.handle === p.sizeChart)!
      const chartSizes = chart.rows.map((r) => r.size)
      for (const s of p.sizes) expect(chartSizes).toContain(s)
    }
  })
})
