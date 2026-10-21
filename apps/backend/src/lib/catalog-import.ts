import type { MedusaContainer } from "@medusajs/framework/types"
import {
  MedusaError,
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  updateInventoryLevelsWorkflow,
  updateProductsWorkflow,
  upsertVariantPricesWorkflow,
} from "@medusajs/medusa/core-flows"
import { FABRIC_TECHNOLOGY_MODULE } from "../modules/fabric-technology"
import type FabricTechnologyModuleService from "../modules/fabric-technology/service"
import { SIZE_CHART_MODULE } from "../modules/size-chart"
import type SizeChartModuleService from "../modules/size-chart/service"
import { COLORS } from "../seed/catalog-data"
import {
  PRODUCT_COLUMNS,
  STOCK_EXPORT_COLUMNS,
  parseProductSheet,
  parseStockSheet,
  toCsv,
  type ProductRow,
  type References,
  type SheetError,
} from "./catalog-csv"

export interface ImportReport {
  kind: "products" | "stock"
  dry_run: boolean
  created: string[]
  updated: string[]
  unchanged: string[]
  warnings: SheetError[]
  errors: SheetError[]
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

const emptyReport = (kind: ImportReport["kind"], dry: boolean): ImportReport => ({
  kind,
  dry_run: dry,
  created: [],
  updated: [],
  unchanged: [],
  warnings: [],
  errors: [],
})

interface Context {
  channelId: string
  locationId: string
  profileId: string
  categoryId: Map<string, string>
  collectionId: Map<string, string>
  typeId: Map<string, string>
  techId: Map<string, string>
  chartId: Map<string, string>
  refs: References
}

async function loadContext(container: MedusaContainer): Promise<Context> {
  const productModule = container.resolve(Modules.PRODUCT)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fabric: FabricTechnologyModuleService = container.resolve(FABRIC_TECHNOLOGY_MODULE)
  const charts: SizeChartModuleService = container.resolve(SIZE_CHART_MODULE)
  const [channel] = await container
    .resolve(Modules.SALES_CHANNEL)
    .listSalesChannels({}, { take: 1 })
  const [location] = await container
    .resolve(Modules.STOCK_LOCATION)
    .listStockLocations({}, { take: 1 })
  const { data: profiles } = await query.graph({ entity: "shipping_profile", fields: ["id"] })
  if (!channel || !location || !profiles[0])
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Store is not set up (run setup-store.ts)",
    )

  const [cats, cols, types, techs, sizeCharts] = await Promise.all([
    productModule.listProductCategories({}, { take: 1000 }),
    productModule.listProductCollections({}, { take: 1000 }),
    productModule.listProductTypes({}, { take: 1000 }),
    fabric.listFabricTechnologies({}, { take: 1000 }),
    charts.listSizeCharts({}, { take: 1000 }),
  ])
  const categoryId = new Map(cats.map((c) => [c.handle, c.id]))
  const collectionId = new Map(cols.map((c) => [c.handle, c.id]))
  const typeId = new Map(types.map((t) => [t.value, t.id]))
  const techId = new Map(techs.map((t) => [t.handle, t.id]))
  const chartId = new Map(sizeCharts.map((c) => [c.handle, c.id]))
  return {
    channelId: channel.id,
    locationId: location.id,
    profileId: profiles[0].id,
    categoryId,
    collectionId,
    typeId,
    techId,
    chartId,
    refs: {
      categories: new Set(categoryId.keys()),
      collections: new Set(collectionId.keys()),
      types: new Set(typeId.keys()),
      technologies: new Set(techId.keys()),
      sizeCharts: new Set(chartId.keys()),
    },
  }
}

const ATTRIBUTE_KEYS = [
  "fit",
  "sleeve",
  "neck",
  "shape",
  "sport",
  "rise",
  "impact",
  "lens",
] as const

/** The attributes a sheet row sets (blank cells mean "none"). */
const attributesOf = (r: ProductRow): Record<string, string> =>
  Object.fromEntries(ATTRIBUTE_KEYS.flatMap((k) => (r[k] ? [[k, r[k]]] : [])))

/** Sheet attributes over the existing ones, keeping any key the sheet has no column for. */
function mergeAttributes(existing: unknown, r: ProductRow): Record<string, string> {
  const known = new Set<string>(ATTRIBUTE_KEYS)
  const kept = Object.fromEntries(
    Object.entries((existing ?? {}) as Record<string, string>).filter(([k]) => !known.has(k)),
  )
  return { ...kept, ...attributesOf(r) }
}

const stable = (o: Record<string, unknown>) =>
  JSON.stringify(Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b))))

function colorHexOf(r: ProductRow): Record<string, string> {
  const custom = Object.fromEntries(
    r.color_hex.map((p) => {
      const i = p.lastIndexOf(":")
      return [p.slice(0, i), p.slice(i + 1)]
    }),
  )
  return Object.fromEntries(r.colors.map((c) => [c, custom[c] ?? COLORS[c] ?? "#9aa4ad"]))
}

const sku = (r: ProductRow, size: string, color: string) =>
  `${r.sku_prefix}-${slug(color).toUpperCase()}-${slug(size).toUpperCase()}`

type Existing = {
  id: string
  handle: string
  title: string
  description: string | null
  status: string
  hs_code: string | null
  material: string | null
  metadata: Record<string, unknown> | null
  options: { title: string; values: { value: string }[] }[]
  variants: {
    id: string
    sku: string | null
    prices: { amount: number; currency_code: string }[]
  }[]
  tags: { value: string }[]
  categories: { handle: string }[]
  collection: { handle: string } | null
  type: { value: string } | null
  fabric_technologies: { id: string; handle: string }[]
  size_chart: { id: string; handle: string } | null
}

const EXISTING_FIELDS = [
  "id",
  "handle",
  "title",
  "description",
  "status",
  "hs_code",
  "material",
  "metadata",
  "options.title",
  "options.values.value",
  "variants.id",
  "variants.sku",
  "variants.prices.amount",
  "variants.prices.currency_code",
  "tags.value",
  "categories.handle",
  "collection.handle",
  "type.value",
  "fabric_technologies.id",
  "fabric_technologies.handle",
  "size_chart.id",
  "size_chart.handle",
]

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))

function isUnchanged(e: Existing, r: ProductRow): boolean {
  const meta = (e.metadata ?? {}) as Record<string, any>
  const prices = e.variants.flatMap((v) =>
    v.prices.filter((p) => p.currency_code === "inr").map((p) => Number(p.amount)),
  )
  return (
    e.title === r.title &&
    (e.description ?? "") === r.description &&
    e.status === r.status &&
    (e.hs_code ?? "") === r.hsn_code &&
    (e.material ?? "") === r.fabric &&
    meta.mrp === r.mrp &&
    meta.gender === r.gender &&
    stable(meta.attributes ?? {}) === stable(mergeAttributes(meta.attributes, r)) &&
    JSON.stringify(meta.features ?? []) === JSON.stringify(r.features) &&
    (meta.bestseller_rank ?? 999) === (r.bestseller_rank ?? 999) &&
    prices.length > 0 &&
    prices.every((p) => p === r.price) &&
    sameSet(
      e.categories.map((c) => c.handle),
      r.categories,
    ) &&
    (e.collection?.handle ?? "") === r.collection &&
    (e.type?.value ?? "") === r.type &&
    sameSet(
      e.tags.map((t) => t.value),
      r.tags,
    ) &&
    sameSet(
      e.fabric_technologies.map((t) => t.handle),
      r.technologies,
    ) &&
    (e.size_chart?.handle ?? "") === r.size_chart
  )
}

async function ensureTags(container: MedusaContainer, names: string[]): Promise<string[]> {
  if (!names.length) return []
  const productModule = container.resolve(Modules.PRODUCT)
  const have = await productModule.listProductTags({ value: names }, { take: 200 })
  const ids = new Map(have.map((t) => [t.value, t.id]))
  const missing = names.filter((n) => !ids.has(n))
  if (missing.length) {
    for (const t of await productModule.createProductTags(missing.map((value) => ({ value }))))
      ids.set(t.value, t.id)
  }
  return names.map((n) => ids.get(n)!)
}

/** Validate a product sheet and, unless it is a dry run with errors, create or update products. */
export async function importProductSheet(
  container: MedusaContainer,
  csv: string,
  opts: { dryRun: boolean },
): Promise<ImportReport> {
  const report = emptyReport("products", opts.dryRun)
  const ctx = await loadContext(container)
  const { rows, errors } = parseProductSheet(csv, ctx.refs)
  report.errors.push(...errors)
  if (!rows.length) return report

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: EXISTING_FIELDS,
    filters: { handle: rows.map((r) => r.handle) },
  })
  const existing = new Map((data as unknown as Existing[]).map((e) => [e.handle, e]))

  const toCreate: ProductRow[] = []
  const toUpdate: { row: ProductRow; existing: Existing }[] = []
  for (const row of rows) {
    const e = existing.get(row.handle)
    if (!e) {
      toCreate.push(row)
      report.created.push(row.handle)
      if (row.status === "published") {
        report.warnings.push({
          line: row.line,
          message: `${row.handle}: published without images; add images in the admin`,
        })
      }
      continue
    }
    const sizes = e.options.find((o) => o.title === "Size")?.values.map((v) => v.value) ?? []
    const colors = e.options.find((o) => o.title === "Color")?.values.map((v) => v.value) ?? []
    if (!sameSet(sizes, row.sizes) || !sameSet(colors, row.colors)) {
      report.warnings.push({
        line: row.line,
        message: `${row.handle}: sizes and colours of an existing product are not changed by import; edit them in the admin`,
      })
    }
    if (isUnchanged(e, row)) report.unchanged.push(row.handle)
    else {
      toUpdate.push({ row, existing: e })
      report.updated.push(row.handle)
    }
  }

  if (opts.dryRun || report.errors.length) return report

  // Create
  for (const row of toCreate) {
    const tagIds = await ensureTags(container, row.tags)
    const colorHex = colorHexOf(row)
    const { result } = await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: row.title,
            handle: row.handle,
            description: row.description || undefined,
            hs_code: row.hsn_code || undefined,
            material: row.fabric || undefined,
            status: row.status === "published" ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
            type_id: ctx.typeId.get(row.type),
            collection_id: row.collection ? ctx.collectionId.get(row.collection) : undefined,
            category_ids: row.categories.map((c) => ctx.categoryId.get(c)!),
            tag_ids: tagIds,
            shipping_profile_id: ctx.profileId,
            sales_channels: [{ id: ctx.channelId }],
            options: [
              { title: "Size", values: row.sizes },
              { title: "Color", values: row.colors },
            ],
            variants: row.sizes.flatMap((size) =>
              row.colors.map((color) => ({
                title: `${size} / ${color}`,
                sku: sku(row, size, color),
                manage_inventory: true,
                allow_backorder: false,
                weight: row.weight_g,
                options: { Size: size, Color: color },
                prices: [{ currency_code: "inr", amount: row.price }],
              })),
            ),
            metadata: {
              mrp: row.mrp,
              gender: row.gender,
              attributes: attributesOf(row),
              features: row.features,
              color_hex: colorHex,
              bestseller_rank: row.bestseller_rank ?? 999,
            },
          },
        ],
      },
    })
    const product = result[0]!
    await linkRelations(container, product.id, row, ctx, [])
    // Show the new SKUs in the stock sheet with zero stock.
    const skus = row.sizes.flatMap((s) => row.colors.map((c) => sku(row, s, c)))
    const items = await container
      .resolve(Modules.INVENTORY)
      .listInventoryItems({ sku: skus }, { take: skus.length })
    if (items.length) {
      await createInventoryLevelsWorkflow(container).run({
        input: {
          inventory_levels: items.map((i) => ({
            inventory_item_id: i.id,
            location_id: ctx.locationId,
            stocked_quantity: 0,
          })),
        },
      })
    }
  }

  // Update
  for (const { row, existing: e } of toUpdate) {
    const tagIds = await ensureTags(container, row.tags)
    const meta = { ...((e.metadata ?? {}) as Record<string, unknown>) }
    Object.assign(meta, {
      mrp: row.mrp,
      gender: row.gender,
      attributes: mergeAttributes(meta.attributes, row),
      features: row.features,
      bestseller_rank: row.bestseller_rank ?? 999,
    })
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: e.id },
        update: {
          title: row.title,
          description: row.description || null,
          status: row.status === "published" ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
          hs_code: row.hsn_code || null,
          material: row.fabric || null,
          type_id: ctx.typeId.get(row.type),
          collection_id: row.collection ? ctx.collectionId.get(row.collection)! : null,
          category_ids: row.categories.map((c) => ctx.categoryId.get(c)!),
          tag_ids: tagIds,
          metadata: meta,
        },
      },
    })
    await upsertVariantPricesWorkflow(container).run({
      input: {
        variantPrices: e.variants.map((v) => ({
          variant_id: v.id,
          product_id: e.id,
          prices: [{ currency_code: "inr", amount: row.price }],
        })),
        previousVariantIds: e.variants.map((v) => v.id),
      },
    })
    await linkRelations(
      container,
      e.id,
      row,
      ctx,
      e.fabric_technologies.map((t) => t.id),
      e.size_chart?.id,
    )
  }
  return report
}

/** Make the product's technology and size chart links match the sheet. */
async function linkRelations(
  container: MedusaContainer,
  productId: string,
  row: ProductRow,
  ctx: Context,
  currentTechIds: string[],
  currentChartId?: string,
) {
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const wantedTech = row.technologies.map((t) => ctx.techId.get(t)!)
  const drop = currentTechIds.filter((id) => !wantedTech.includes(id))
  const add = wantedTech.filter((id) => !currentTechIds.includes(id))
  if (drop.length) {
    await link.dismiss(
      drop.map((id) => ({
        [Modules.PRODUCT]: { product_id: productId },
        [FABRIC_TECHNOLOGY_MODULE]: { fabric_technology_id: id },
      })),
    )
  }
  const wantedChart = row.size_chart ? ctx.chartId.get(row.size_chart) : undefined
  if (currentChartId && currentChartId !== wantedChart) {
    await link.dismiss([
      {
        [Modules.PRODUCT]: { product_id: productId },
        [SIZE_CHART_MODULE]: { size_chart_id: currentChartId },
      },
    ])
  }
  const creates: Record<string, Record<string, string>>[] = add.map((id) => ({
    [Modules.PRODUCT]: { product_id: productId },
    [FABRIC_TECHNOLOGY_MODULE]: { fabric_technology_id: id },
  }))
  if (wantedChart && wantedChart !== currentChartId) {
    creates.push({
      [Modules.PRODUCT]: { product_id: productId },
      [SIZE_CHART_MODULE]: { size_chart_id: wantedChart },
    })
  }
  if (creates.length) await link.create(creates)
  // Links emit no events, so announce the product so search and the storefront refresh.
  await container
    .resolve(Modules.EVENT_BUS)
    .emit({ name: "product.updated", data: { id: productId } })
}

/** Validate a stock sheet and, unless it is a dry run or has errors, set absolute quantities. */
export async function importStockSheet(
  container: MedusaContainer,
  csv: string,
  opts: { dryRun: boolean },
): Promise<ImportReport> {
  const report = emptyReport("stock", opts.dryRun)
  const { rows, errors } = parseStockSheet(csv)
  report.errors.push(...errors)
  if (!rows.length) return report

  const inventory = container.resolve(Modules.INVENTORY)
  const [location] = await container
    .resolve(Modules.STOCK_LOCATION)
    .listStockLocations({}, { take: 1 })
  if (!location)
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "No stock location configured")
  const items = await inventory.listInventoryItems(
    { sku: rows.map((r) => r.sku) },
    { take: rows.length },
  )
  const itemBySku = new Map(items.map((i) => [i.sku!, i.id]))
  const levels = await inventory.listInventoryLevels(
    { inventory_item_id: items.map((i) => i.id), location_id: location.id },
    { take: items.length },
  )
  const levelByItem = new Map(levels.map((l) => [l.inventory_item_id, l]))

  const updates: { inventory_item_id: string; location_id: string; stocked_quantity: number }[] = []
  const creates: typeof updates = []
  for (const row of rows) {
    const itemId = itemBySku.get(row.sku)
    if (!itemId) {
      report.errors.push({ line: row.line, message: `sku: "${row.sku}" does not exist` })
      continue
    }
    const level = levelByItem.get(itemId)
    const change = {
      inventory_item_id: itemId,
      location_id: location.id,
      stocked_quantity: row.quantity,
    }
    if (!level) {
      creates.push(change)
      report.updated.push(row.sku)
    } else if (Number(level.stocked_quantity) === row.quantity) {
      report.unchanged.push(row.sku)
    } else {
      updates.push(change)
      report.updated.push(row.sku)
      if (row.quantity < Number(level.reserved_quantity ?? 0)) {
        report.warnings.push({
          line: row.line,
          message: `${row.sku}: quantity ${row.quantity} is below the ${level.reserved_quantity} units already reserved by open orders`,
        })
      }
    }
  }
  if (opts.dryRun || report.errors.length) return report
  if (creates.length)
    await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels: creates } })
  if (updates.length) await updateInventoryLevelsWorkflow(container).run({ input: { updates } })
  return report
}

export async function exportProductSheet(container: MedusaContainer): Promise<string> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: [...EXISTING_FIELDS, "variants.weight", "options.values.value"],
    pagination: { take: 5000, order: { handle: "ASC" } },
  })
  const rows = (
    data as unknown as (Existing & {
      variants: {
        sku: string | null
        weight: number | null
        prices: { amount: number; currency_code: string }[]
      }[]
    })[]
  ).map((p) => {
    const meta = (p.metadata ?? {}) as Record<string, any>
    const attrs = (meta.attributes ?? {}) as Record<string, string>
    const values = (title: string) =>
      p.options.find((o) => o.title === title)?.values.map((v) => v.value) ?? []
    const prices = p.variants.flatMap((v) =>
      v.prices.filter((x) => x.currency_code === "inr").map((x) => Number(x.amount)),
    )
    const hex = (meta.color_hex ?? {}) as Record<string, string>
    return {
      handle: p.handle,
      title: p.title,
      status: p.status,
      gender: meta.gender ?? "",
      categories: p.categories.map((c) => c.handle).join("|"),
      collection: p.collection?.handle ?? "",
      type: p.type?.value ?? "",
      tags: p.tags.map((t) => t.value).join("|"),
      technologies: p.fabric_technologies.map((t) => t.handle).join("|"),
      size_chart: p.size_chart?.handle ?? "",
      sizes: values("Size").join("|"),
      colors: values("Color").join("|"),
      color_hex: Object.entries(hex)
        .map(([k, v]) => `${k}:${v}`)
        .join("|"),
      price: prices.length ? Math.min(...prices) : "",
      mrp: meta.mrp ?? "",
      hsn_code: p.hs_code ?? "",
      fabric: p.material ?? "",
      fit: attrs.fit ?? "",
      sleeve: attrs.sleeve ?? "",
      neck: attrs.neck ?? "",
      shape: attrs.shape ?? "",
      sport: attrs.sport ?? "",
      rise: attrs.rise ?? "",
      impact: attrs.impact ?? "",
      lens: attrs.lens ?? "",
      description: p.description ?? "",
      features: ((meta.features as string[] | undefined) ?? []).join("|"),
      sku_prefix: p.variants[0]?.sku?.split("-")[0] ?? "",
      weight_g: p.variants[0]?.weight ?? "",
      bestseller_rank: meta.bestseller_rank ?? "",
    }
  })
  return toCsv(PRODUCT_COLUMNS, rows)
}

export async function exportStockSheet(container: MedusaContainer): Promise<string> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: [
      "sku",
      "title",
      "product.title",
      "inventory_items.inventory.location_levels.stocked_quantity",
    ],
    pagination: { take: 20000, order: { sku: "ASC" } },
  })
  const rows = (data as any[]).map((v) => ({
    sku: v.sku ?? "",
    quantity: (v.inventory_items ?? []).reduce(
      (sum: number, ii: any) =>
        sum +
        (ii?.inventory?.location_levels ?? []).reduce(
          (s: number, l: any) => s + Number(l?.stocked_quantity ?? 0),
          0,
        ),
      0,
    ),
    product: v.product?.title ?? "",
    variant: v.title ?? "",
  }))
  return toCsv(STOCK_EXPORT_COLUMNS, rows)
}
