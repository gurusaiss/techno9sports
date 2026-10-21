import { MeilisearchSearchService } from "../service"

// Runs against a real Meilisearch. Skipped unless MEILISEARCH_TEST_HOST is set, e.g.
//   MEILISEARCH_TEST_HOST=http://localhost:7700 MEILISEARCH_TEST_KEY=t9-dev-master-key pnpm test
const host = process.env.MEILISEARCH_TEST_HOST
const run = host ? describe : describe.skip

const physical = `t9_test_${Date.now()}`
const index = {
  name: "product",
  entity: "product",
  primary_key: "id",
  provider: "meilisearch",
  fields: {
    id: { type: "keyword", filterable: true, retrievable: true },
    title: { type: "text", searchable: { weight: 3 }, sortable: true, retrievable: true },
    gender: { type: "keyword", filterable: true, facetable: true, retrievable: true },
    size: { type: "keyword", array: true, filterable: true, facetable: true, retrievable: true },
    price: {
      type: "float",
      filterable: true,
      sortable: true,
      facetable: { types: ["stats"] },
      retrievable: true,
    },
    created_at: { type: "date", sortable: true, retrievable: true },
  },
  settings: { typo_tolerance: { enabled: true } },
  definition_hash: "h",
  physical_name: physical,
  seed: async function* () {},
} as never

const docs = [
  {
    id: "p1",
    title: "Everyday Dry Tee",
    gender: "men",
    size: ["S", "M"],
    price: 499,
    created_at: "2026-01-03T00:00:00.000Z",
  },
  {
    id: "p2",
    title: "Flex Training Joggers",
    gender: "men",
    size: ["M", "L"],
    price: 799,
    created_at: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "p3",
    title: "Cool Tank Top",
    gender: "women",
    size: ["S"],
    price: 349,
    created_at: "2026-01-01T00:00:00.000Z",
  },
]

run("MeilisearchSearchService (live)", () => {
  jest.setTimeout(60000)
  let svc: MeilisearchSearchService
  const q = (extra: object) =>
    svc.search({
      index,
      attributes_to_retrieve: ["id", "title", "price", "created_at"],
      ...extra,
    } as never)

  beforeAll(async () => {
    svc = new MeilisearchSearchService(
      {},
      { host: host!, apiKey: process.env.MEILISEARCH_TEST_KEY ?? "" },
    )
    await svc.upsertIndex({ index })
    const task = await svc.upsertDocuments({
      index: physical,
      definition: index,
      documents: docs as never,
    })
    await svc.waitForTask(task)
  })
  afterAll(async () => {
    await svc.deleteIndex({ index: physical })
  })

  it("finds by text with typo tolerance", async () => {
    const r = await q({ q: "joggrs" })
    expect(r.hits.map((h) => h.id)).toEqual(["p2"])
  })

  it("filters, sorts, paginates and counts exactly", async () => {
    const r = await q({
      filters: { gender: "men" },
      pagination: { skip: 0, take: 1, order: { price: "DESC" } },
    })
    expect(r.hits.map((h) => h.id)).toEqual(["p2"])
    expect(r.metadata.count).toBe(2)
  })

  it("returns value facets and stats facets", async () => {
    const r = await q({ search_options: { facets: ["gender", { field: "price", type: "stats" }] } })
    expect(r.facets?.gender).toEqual({
      type: "value",
      values: [
        { value: "men", count: 2 },
        { value: "women", count: 1 },
      ],
    })
    expect(r.facets?.price).toMatchObject({ type: "stats", min: 349, max: 799 })
  })

  it("matches array fields and returns dates as ISO strings", async () => {
    const r = await q({ filters: { size: { $overlaps: ["L"] } } })
    expect(r.hits.map((h) => h.id)).toEqual(["p2"])
    expect(r.hits[0]!.document.created_at).toBe("2026-01-02T00:00:00.000Z")
  })

  it("deletes by id and by filter", async () => {
    const byId = await svc.deleteDocuments({ index: physical, filters: { id: "p1" } })
    await svc.waitForTask(byId)
    expect((await q({})).hits.map((h) => h.id).sort()).toEqual(["p2", "p3"])
    const t = await svc.deleteDocuments({ index: physical, filters: { gender: "women" } })
    await svc.waitForTask(t)
    expect((await q({})).hits.map((h) => h.id)).toEqual(["p2"])
  })

  it("rejects what it can't express", async () => {
    await expect(q({ search_options: { highlight: true } })).rejects.toThrow(/Highlighting/)
    await expect(
      q({ search_options: { facets: [{ field: "price", type: "range", ranges: [] }] } }),
    ).rejects.toThrow(/Range/)
    await expect(q({ pagination: { order: { gender: "ASC" } } })).rejects.toThrow(/not sortable/)
  })

  it("lists indexes with document counts", async () => {
    const list = await svc.listIndexes()
    expect(list.find((i) => i.name === physical)?.document_count).toBeGreaterThanOrEqual(1)
  })
})
