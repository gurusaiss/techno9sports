import { compileFilters, extractPrimaryKeyIds } from "../filters"
import { assertIndexSupported, buildSettings } from "../settings"

const fields = {
  id: { type: "keyword" as const, filterable: true },
  title: { type: "text" as const, searchable: { weight: 3 }, sortable: true },
  description: { type: "text" as const, searchable: { weight: 1 } },
  gender: { type: "keyword" as const, filterable: true, facetable: true },
  size: { type: "keyword" as const, array: true, filterable: true, facetable: true },
  price: {
    type: "float" as const,
    filterable: true,
    sortable: true,
    facetable: { types: ["stats" as const] },
  },
  created_at: { type: "date" as const, sortable: true, filterable: true },
  secret: { type: "keyword" as const, retrievable: false },
}

describe("compileFilters", () => {
  it("compiles equality, arrays and ranges", () => {
    expect(compileFilters({ gender: "men" }, fields)).toBe('gender = "men"')
    expect(compileFilters({ size: ["S", "M"] }, fields)).toBe('size IN ["S", "M"]')
    expect(compileFilters({ price: { $gte: 299, $lte: 999 } }, fields)).toBe(
      "(price >= 299 AND price <= 999)",
    )
  })

  it("combines fields with AND and supports $or and $not", () => {
    expect(
      compileFilters(
        { gender: "men", $or: [{ size: "S" }, { size: "M" }], $not: { price: { $gt: 5 } } },
        fields,
      ),
    ).toBe('gender = "men" AND (size = "S" OR size = "M") AND NOT (price > 5)')
  })

  it("converts dates to epoch milliseconds", () => {
    expect(compileFilters({ created_at: { $gte: "2026-01-01T00:00:00.000Z" } }, fields)).toBe(
      `created_at >= ${Date.parse("2026-01-01T00:00:00.000Z")}`,
    )
  })

  it("escapes quotes so a value can't break out of the expression", () => {
    expect(compileFilters({ gender: 'x" OR gender = "men' }, fields)).toBe(
      'gender = "x\\" OR gender = \\"men"',
    )
  })

  it("requires every array value for $contains and any for $overlaps", () => {
    expect(compileFilters({ size: { $contains: ["S", "M"] } }, fields)).toBe(
      '(size = "S" AND size = "M")',
    )
    expect(compileFilters({ size: { $overlaps: ["S", "M"] } }, fields)).toBe('size IN ["S", "M"]')
  })

  it("rejects unknown, unfilterable and unsupported things instead of guessing", () => {
    expect(() => compileFilters({ nope: "x" }, fields)).toThrow(/not part of this search index/)
    expect(() => compileFilters({ title: "x" }, fields)).toThrow(/not filterable/)
    expect(() => compileFilters({ gender: { $like: "me" } }, fields)).toThrow(/not supported/)
    expect(() => compileFilters({ gender: { $prefix: "me" } }, fields)).toThrow(/not supported/)
    expect(() => compileFilters({ gender: "men", $prefix: "a" } as never, fields)).toThrow()
    expect(() => compileFilters({ gender: { $contains: "men" } }, fields)).toThrow(/array/)
  })

  it("ignores the free-text key and returns undefined for no filters", () => {
    expect(compileFilters({ q: "tee" }, fields)).toBeUndefined()
    expect(compileFilters(undefined, fields)).toBeUndefined()
  })
})

describe("extractPrimaryKeyIds", () => {
  it("recognises primary-key-only filters", () => {
    expect(extractPrimaryKeyIds({ id: "a" }, "id")).toEqual(["a"])
    expect(extractPrimaryKeyIds({ id: ["a", "b"] }, "id")).toEqual(["a", "b"])
    expect(extractPrimaryKeyIds({ id: { $in: ["a"] } }, "id")).toEqual(["a"])
    expect(extractPrimaryKeyIds({ id: "a", gender: "men" }, "id")).toBeUndefined()
    expect(extractPrimaryKeyIds({ gender: "men" }, "id")).toBeUndefined()
  })
})

const index = {
  name: "product",
  entity: "product",
  primary_key: "id",
  provider: "meilisearch",
  fields,
  settings: { typo_tolerance: { enabled: true } },
  definition_hash: "h",
  physical_name: "product_v1",
  seed: async function* () {},
} as never

describe("buildSettings", () => {
  it("orders searchable attributes by weight and exposes filter, sort and display lists", () => {
    const s = buildSettings(index) as Record<string, unknown>
    expect(s.searchableAttributes).toEqual(["title", "description"])
    expect(s.filterableAttributes).toEqual(
      expect.arrayContaining(["id", "gender", "size", "price", "created_at"]),
    )
    expect(s.sortableAttributes).toEqual(expect.arrayContaining(["title", "price", "created_at"]))
    expect(s.displayedAttributes).not.toContain("secret")
  })

  it("refuses field types and facet kinds Meilisearch can't serve", () => {
    const withObject = { ...(index as object), fields: { a: { type: "object" } } } as never
    expect(() => assertIndexSupported(withObject)).toThrow(/does not support/)
    const withRange = {
      ...(index as object),
      fields: { p: { type: "float", facetable: { types: ["range"] } } },
    } as never
    expect(() => assertIndexSupported(withRange)).toThrow(/range facets/)
  })
})
