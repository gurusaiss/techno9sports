import {
  parseProductSheet,
  parseStockSheet,
  PRODUCT_COLUMNS,
  safeCell,
  toCsv,
  unsafeCell,
  type References,
} from "../catalog-csv"

const refs: References = {
  categories: new Set(["men-t-shirts", "men"]),
  collections: new Set(["everyday-essentials"]),
  types: new Set(["T-shirt"]),
  technologies: new Set(["t9-dry"]),
  sizeCharts: new Set(["mens-tops"]),
}

const row = (over: Record<string, string> = {}) => ({
  handle: "test-tee",
  title: "Test Tee",
  status: "published",
  gender: "men",
  categories: "men-t-shirts",
  collection: "everyday-essentials",
  type: "T-shirt",
  tags: "new",
  technologies: "t9-dry",
  size_chart: "mens-tops",
  sizes: "S|M|L",
  colors: "Navy|Black",
  color_hex: "",
  price: "449",
  mrp: "899",
  hsn_code: "6109",
  fabric: "100% polyester",
  fit: "Regular",
  sleeve: "",
  neck: "",
  shape: "",
  sport: "",
  rise: "",
  impact: "",
  lens: "",
  description: "A tee",
  features: "Quick-dry|Tagless",
  sku_prefix: "TEST1",
  weight_g: "180",
  bestseller_rank: "10",
  ...over,
})
const csvOf = (rows: Record<string, string>[], cols: readonly string[] = PRODUCT_COLUMNS) =>
  toCsv(cols, rows)

describe("parseProductSheet", () => {
  it("parses a valid row into typed values", () => {
    const { rows, errors } = parseProductSheet(csvOf([row()]), refs)
    expect(errors).toEqual([])
    expect(rows[0]).toMatchObject({
      line: 2,
      handle: "test-tee",
      sizes: ["S", "M", "L"],
      colors: ["Navy", "Black"],
      categories: ["men-t-shirts"],
      price: 449,
      mrp: 899,
      weight_g: 180,
      features: ["Quick-dry", "Tagless"],
    })
  })

  it("reports every problem with its line number, and imports nothing from a bad row", () => {
    const csv = csvOf([
      row({ handle: "ok-tee", sku_prefix: "OK1" }),
      row({
        handle: "Bad Handle",
        price: "₹449",
        mrp: "100",
        sizes: "",
        gender: "kids",
        categories: "nope",
        sku_prefix: "bad",
      }),
    ])
    const { rows, errors } = parseProductSheet(csv, refs)
    expect(rows.map((r) => r.handle)).toEqual(["ok-tee"])
    const lines = new Set(errors.map((e) => e.line))
    expect(lines).toEqual(new Set([3]))
    const text = errors.map((e) => e.message).join(" | ")
    expect(text).toMatch(/handle: use lowercase/)
    expect(text).toMatch(/price: must be a number/)
    expect(text).toMatch(/sizes: give 1 to 12/)
    expect(text).toMatch(/gender: must be men, women or unisex/)
    expect(text).toMatch(/sku_prefix: use 2 to 12 capital/)
  })

  it("checks references against the store", () => {
    const { errors } = parseProductSheet(
      csvOf([
        row({
          categories: "men-t-shirts|ghost",
          collection: "x",
          type: "Y",
          technologies: "z",
          size_chart: "w",
        }),
      ]),
      refs,
    )
    const text = errors.map((e) => e.message).join(" | ")
    expect(text).toMatch(/unknown category "ghost"/)
    expect(text).toMatch(/unknown collection "x"/)
    expect(text).toMatch(/unknown product type "Y"/)
    expect(text).toMatch(/unknown technology "z"/)
    expect(text).toMatch(/unknown size chart "w"/)
  })

  it("rejects an MRP below the price, repeated handles and repeated SKU prefixes", () => {
    const dup = csvOf([row(), row({ mrp: "100" }), row({ handle: "other", sku_prefix: "TEST1" })])
    const { errors } = parseProductSheet(dup, refs)
    const text = errors.map((e) => `${e.line}:${e.message}`).join(" | ")
    expect(text).toMatch(/3:mrp: MRP must be at least the price/)
    expect(text).toMatch(/4:sku_prefix: repeated from line 2/)
  })

  it("falls back to draft for an unknown status", () => {
    const { rows } = parseProductSheet(csvOf([row({ status: "live" })]), refs)
    expect(rows[0]!.status).toBe("draft")
  })

  it("fails the whole file for structural problems", () => {
    expect(parseProductSheet("handle,title\nx,y", refs).errors[0]!.message).toMatch(
      /Missing columns/,
    )
    expect(
      parseProductSheet(toCsv([...PRODUCT_COLUMNS, "extra"], [{ ...row(), extra: "x" }]), refs)
        .errors[0]!.message,
    ).toMatch(/Unknown column: extra/)
    expect(parseProductSheet('handle,title\n"unterminated', refs).errors[0]!.message).toMatch(
      /Could not read/,
    )
    const many = csvOf(
      Array.from({ length: 501 }, (_, i) => row({ handle: `p-${i}`, sku_prefix: `S${i}` })),
    )
    expect(parseProductSheet(many, refs).errors[0]!.message).toMatch(/Too many rows/)
    expect(parseProductSheet("a".repeat(3 * 1024 * 1024), refs).errors[0]!.message).toMatch(
      /larger than/,
    )
  })

  it("accepts a UTF-8 byte order mark, as Excel adds one", () => {
    const { rows, errors } = parseProductSheet("﻿" + csvOf([row()]), refs)
    expect(errors).toEqual([])
    expect(rows).toHaveLength(1)
  })
})

describe("parseStockSheet", () => {
  it("parses quantities and flags bad rows with line numbers", () => {
    const { rows, errors } = parseStockSheet(
      "sku,quantity\nT9001-NAVY-S,12\nT9001-NAVY-M,-3\nT9001-NAVY-L,abc\nT9001-NAVY-S,5\n",
    )
    expect(rows).toEqual([{ sku: "T9001-NAVY-S", quantity: 12, line: 2 }])
    expect(errors.map((e) => e.line)).toEqual([3, 4, 5])
    expect(errors[2]!.message).toMatch(/repeated from line 2/)
  })
  it("requires both columns", () => {
    expect(parseStockSheet("sku\nabc").errors[0]!.message).toMatch(/Missing column/)
  })
})

describe("spreadsheet formula protection", () => {
  it("neutralises cells that would run as formulas, but not numbers", () => {
    expect(safeCell('=HYPERLINK("http://evil")')).toBe('\'=HYPERLINK("http://evil")')
    expect(safeCell("+1+1")).toBe("'+1+1")
    expect(safeCell("@SUM(A1)")).toBe("'@SUM(A1)")
    expect(safeCell("-cmd")).toBe("'-cmd")
    expect(safeCell("-5")).toBe("-5")
    expect(safeCell(499)).toBe("499")
    expect(safeCell(null)).toBe("")
    expect(safeCell("Everyday Tee")).toBe("Everyday Tee")
  })
  it("a round trip through export keeps text intact", () => {
    expect(unsafeCell(safeCell("=SUM(1)"))).toBe("=SUM(1)")
    expect(unsafeCell("It's fine")).toBe("It's fine")
  })
})
