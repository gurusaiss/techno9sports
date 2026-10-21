import { parse } from "csv-parse/sync"
import { stringify } from "csv-stringify/sync"
import { z } from "@medusajs/framework/zod"

/**
 * Catalogue CSV sheets for bulk work in a spreadsheet.
 *
 * Product sheet: one row per product. Sizes and colours are lists ("S|M|L"); a new product gets one
 * variant per size and colour. Stock sheet: one row per SKU with an absolute quantity.
 * Everything here is pure: it reads text and reference lists, and returns rows or line-numbered
 * errors, so it can be tested without a database.
 */
export const MAX_ROWS = 500
export const MAX_BYTES = 2 * 1024 * 1024

export const PRODUCT_COLUMNS = [
  "handle",
  "title",
  "status",
  "gender",
  "categories",
  "collection",
  "type",
  "tags",
  "technologies",
  "size_chart",
  "sizes",
  "colors",
  "color_hex",
  "price",
  "mrp",
  "hsn_code",
  "fabric",
  "fit",
  "sleeve",
  "neck",
  "shape",
  "sport",
  "rise",
  "impact",
  "lens",
  "description",
  "features",
  "sku_prefix",
  "weight_g",
  "bestseller_rank",
] as const

export const STOCK_COLUMNS = ["sku", "quantity"] as const
/** Columns an exported stock sheet carries for humans; they are ignored on import. */
export const STOCK_EXPORT_COLUMNS = ["sku", "quantity", "product", "variant"] as const

export interface SheetError {
  /** 1-based line in the file, counting the header as line 1. */
  line: number
  message: string
}

export interface References {
  categories: Set<string>
  collections: Set<string>
  types: Set<string>
  technologies: Set<string>
  sizeCharts: Set<string>
}

const list = (v: string | undefined) =>
  (v ?? "")
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean)

const money = z
  .string()
  .trim()
  .regex(/^\d{1,7}(\.\d{1,2})?$/, "must be a number like 499 or 499.50 (no ₹ or commas)")
  .transform(Number)

const optionalInt = (max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : Number(v)))
    .refine(
      (v) => v === undefined || (Number.isInteger(v) && v >= 0 && v <= max),
      `must be a whole number from 0 to ${max}`,
    )

const text = (max: number) => z.string().trim().max(max)
const handle = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use lowercase letters, numbers and hyphens")
  .max(120)

export const productRowSchema = z
  .object({
    handle,
    title: text(160).min(1, "is required"),
    status: z.enum(["draft", "published"]).catch("draft" as never),
    gender: z.enum(["men", "women", "unisex"], { message: "must be men, women or unisex" }),
    categories: z.string().transform(list),
    collection: z.string().trim(),
    type: z.string().trim().min(1, "is required"),
    tags: z.string().transform(list),
    technologies: z.string().transform(list),
    size_chart: z.string().trim(),
    sizes: z
      .string()
      .transform(list)
      .refine((v) => v.length > 0 && v.length <= 12, "give 1 to 12 sizes separated by |"),
    colors: z
      .string()
      .transform(list)
      .refine((v) => v.length > 0 && v.length <= 12, "give 1 to 12 colours separated by |"),
    color_hex: z.string().transform(list),
    price: money,
    mrp: money,
    hsn_code: z
      .string()
      .trim()
      .regex(/^(\d{4}|\d{6}|\d{8})?$/, "must be 4, 6 or 8 digits"),
    fabric: text(200),
    fit: text(40),
    sleeve: text(40),
    neck: text(40),
    shape: text(40),
    sport: text(40),
    rise: text(40),
    impact: text(40),
    lens: text(40),
    description: text(2000),
    features: z.string().transform(list),
    sku_prefix: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{2,12}$/, "use 2 to 12 capital letters or digits"),
    weight_g: optionalInt(50000),
    bestseller_rank: optionalInt(9999),
  })
  .refine((r) => r.mrp >= r.price, { message: "MRP must be at least the price", path: ["mrp"] })

export type ProductRow = z.infer<typeof productRowSchema>

export interface ParseResult<T> {
  rows: (T & { line: number })[]
  errors: SheetError[]
}

function readRecords(
  csv: string,
  columns: readonly string[],
  required: readonly string[],
): { error: string } | { records: Record<string, string>[] } {
  if (Buffer.byteLength(csv, "utf8") > MAX_BYTES) {
    return { error: `File is larger than ${MAX_BYTES / 1024 / 1024} MB` }
  }
  let records: Record<string, string>[]
  try {
    records = parse(csv.replace(/^﻿/, ""), {
      columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
      skip_empty_lines: true,
      relax_column_count: false,
      trim: false,
    })
  } catch (e) {
    return {
      error: `Could not read the CSV: ${e instanceof Error ? e.message : "invalid file"}` as const,
    }
  }
  // Undo the apostrophe an export adds in front of formula-looking text.
  records = records.map((r) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, unsafeCell(String(v ?? ""))])),
  )
  const header = records[0] ? Object.keys(records[0]) : []
  const missing = required.filter((c) => !header.includes(c))
  if (records.length && missing.length) {
    return {
      error: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}` as const,
    }
  }
  const unknown = header.filter((c) => !columns.includes(c))
  if (unknown.length)
    return {
      error: `Unknown column${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}` as const,
    }
  if (records.length > MAX_ROWS)
    return { error: `Too many rows (${records.length}); the limit is ${MAX_ROWS}` }
  return { records }
}

/** Parse and validate a product sheet against the references that exist in the store. */
export function parseProductSheet(csv: string, refs: References): ParseResult<ProductRow> {
  const read = readRecords(csv, PRODUCT_COLUMNS, [
    "handle",
    "title",
    "gender",
    "type",
    "sizes",
    "colors",
    "price",
    "mrp",
    "sku_prefix",
  ])
  if ("error" in read) return { rows: [], errors: [{ line: 1, message: read.error }] }

  const rows: ParseResult<ProductRow>["rows"] = []
  const errors: SheetError[] = []
  const seenHandles = new Map<string, number>()
  const seenPrefixes = new Map<string, number>()

  read.records.forEach((rec, i) => {
    const line = i + 2
    const full = Object.fromEntries(PRODUCT_COLUMNS.map((c) => [c, rec[c] ?? ""]))
    const parsed = productRowSchema.safeParse(full)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({ line, message: `${issue.path.join(".") || "row"}: ${issue.message}` })
      }
      return
    }
    const row = parsed.data
    const problems: string[] = []
    const check = (field: string, values: string[], known: Set<string>, noun: string) => {
      for (const v of values) if (!known.has(v)) problems.push(`${field}: unknown ${noun} "${v}"`)
    }
    check("categories", row.categories, refs.categories, "category")
    if (!row.categories.length) problems.push("categories: give at least one category handle")
    if (row.collection) check("collection", [row.collection], refs.collections, "collection")
    check("type", [row.type], refs.types, "product type")
    check("technologies", row.technologies, refs.technologies, "technology")
    if (row.size_chart) check("size_chart", [row.size_chart], refs.sizeCharts, "size chart")
    for (const h of row.color_hex) {
      if (!/^.+:#[0-9a-fA-F]{6}$/.test(h))
        problems.push(`color_hex: "${h}" must look like Navy:#0f2a43`)
    }
    if (seenHandles.has(row.handle))
      problems.push(`handle: repeated from line ${seenHandles.get(row.handle)}`)
    if (seenPrefixes.has(row.sku_prefix))
      problems.push(`sku_prefix: repeated from line ${seenPrefixes.get(row.sku_prefix)}`)
    if (problems.length) {
      for (const message of problems) errors.push({ line, message })
      return
    }
    seenHandles.set(row.handle, line)
    seenPrefixes.set(row.sku_prefix, line)
    rows.push({ ...row, line })
  })
  return { rows, errors }
}

export interface StockRow {
  sku: string
  quantity: number
}

const stockRowSchema = z.object({
  sku: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$/, "is not a valid SKU"),
  quantity: z
    .string()
    .trim()
    .regex(/^\d{1,6}$/, "must be a whole number from 0 to 999999")
    .transform(Number),
})

export function parseStockSheet(csv: string): ParseResult<StockRow> {
  const read = readRecords(csv, STOCK_EXPORT_COLUMNS, STOCK_COLUMNS)
  if ("error" in read) return { rows: [], errors: [{ line: 1, message: read.error }] }
  const rows: ParseResult<StockRow>["rows"] = []
  const errors: SheetError[] = []
  const seen = new Map<string, number>()
  read.records.forEach((rec, i) => {
    const line = i + 2
    const parsed = stockRowSchema.safeParse({ sku: rec.sku ?? "", quantity: rec.quantity ?? "" })
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        errors.push({ line, message: `${issue.path.join(".")}: ${issue.message}` })
      return
    }
    if (seen.has(parsed.data.sku)) {
      errors.push({ line, message: `sku: repeated from line ${seen.get(parsed.data.sku)}` })
      return
    }
    seen.set(parsed.data.sku, line)
    rows.push({ ...parsed.data, line })
  })
  return { rows, errors }
}

/**
 * Spreadsheet programs run text that starts with = + - @ as a formula. Exported text is prefixed
 * with an apostrophe so a malicious product title can't execute when staff open the file.
 * Plain numbers (including negatives) are left alone.
 */
export function safeCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value)
  if (/^[=+@\t\r]/.test(s)) return `'${s}`
  if (/^-/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) return `'${s}`
  return s
}

export function toCsv(columns: readonly string[], rows: Record<string, unknown>[]): string {
  return stringify([columns as string[], ...rows.map((r) => columns.map((c) => safeCell(r[c])))])
}

/** Imports strip the apostrophe an earlier export added, so a round trip is lossless. */
export function unsafeCell(value: string): string {
  return /^'[=+\-@\t\r]/.test(value) ? value.slice(1) : value
}
