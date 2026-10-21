import { toStoreProduct } from "../store-product"

const level = (n: number) => [
  { inventory: { location_levels: [{ stocked_quantity: n, reserved_quantity: 0 }] } },
]
const variant = (id: string, size: string, color: string, amount: number, stock: number) => ({
  id,
  sku: `SKU-${id}`,
  title: `${size} / ${color}`,
  manage_inventory: true,
  allow_backorder: false,
  options: [
    { value: size, option: { title: "Size" } },
    { value: color, option: { title: "Color" } },
  ],
  calculated_price: { calculated_amount: amount, original_amount: amount },
  inventory_items: level(stock),
})

const raw = {
  id: "prod_1",
  handle: "everyday-dry-tee",
  title: "Everyday Dry Tee",
  created_at: "2026-01-01T00:00:00.000Z",
  metadata: {
    mrp: 899,
    gender: "men",
    hsn_code: "6109",
    bestseller_rank: 1,
    features: ["Quick-dry"],
    attributes: { fit: "Regular" },
    color_hex: { Navy: "#0f2a43" },
  },
  images: [
    { url: "http://x/a.webp", metadata: { color: "Navy", view: "front" } },
    { url: "http://x/b.webp" },
  ],
  options: [{ title: "Size", values: [{ value: "S" }, { value: "M" }] }],
  variants: [
    variant("v1", "S", "Navy", 449, 2),
    variant("v2", "M", "Navy", 499, 0),
    variant("v3", "L", "Navy", 449, 30),
  ],
  fabric_technologies: [
    { handle: "t9-warm", name: "T9 Warm", sort_order: 4, is_active: true },
    { handle: "t9-dry", name: "T9 Dry", sort_order: 1, is_active: true },
    { handle: "old", name: "Old", sort_order: 0, is_active: false },
  ],
  size_chart: {
    handle: "mens-tops",
    name: "Men's tops",
    unit: "in",
    columns: ["Chest"],
    sizes: ["S"],
    rows: { S: { Chest: "36" } },
  },
}

describe("toStoreProduct", () => {
  const p = toStoreProduct(raw)

  it("derives price, MRP and discount from the cheapest variant", () => {
    expect(p.price).toBe(449)
    expect(p.mrp).toBe(899)
    expect(p.discount_percent).toBe(50)
  })

  it("never exposes admin-only metadata", () => {
    const json = JSON.stringify(p)
    expect(json).not.toContain("6109")
    expect(json).not.toContain("bestseller_rank")
    expect(json).not.toContain("hsn")
  })

  it("reports per-variant availability without leaking large stock counts", () => {
    expect(p.variants.map((v) => v.availability)).toEqual([
      { status: "low_stock", low_quantity: 2 },
      { status: "out_of_stock" },
      { status: "in_stock" },
    ])
    expect(p.in_stock).toBe(true)
  })

  it("is out of stock only when every variant is", () => {
    const none = toStoreProduct({ ...raw, variants: [variant("v9", "S", "Navy", 449, 0)] })
    expect(none.in_stock).toBe(false)
  })

  it("splits size and colour, tags images by colour, and orders active technologies", () => {
    expect(p.variants[0]).toMatchObject({ size: "S", color: "Navy", price: 449 })
    expect(p.images[0]).toEqual({ url: "http://x/a.webp", color: "Navy", view: "front" })
    expect(p.images[1]).toEqual({ url: "http://x/b.webp", color: null, view: null })
    expect(p.technologies.map((t) => t.handle)).toEqual(["t9-dry", "t9-warm"])
  })

  it("shows no discount when MRP is missing or not higher", () => {
    expect(
      toStoreProduct({ ...raw, metadata: { ...raw.metadata, mrp: 449 } }).discount_percent,
    ).toBe(0)
    expect(toStoreProduct({ ...raw, metadata: {} }).discount_percent).toBe(0)
  })

  it("passes the size chart through", () => {
    expect(p.size_chart?.rows.S).toEqual({ Chest: "36" })
    expect(toStoreProduct({ ...raw, size_chart: null }).size_chart).toBeNull()
  })
})
