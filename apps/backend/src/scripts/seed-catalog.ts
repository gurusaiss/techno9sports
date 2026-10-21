import type { CreateProductWorkflowInputDTO, ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import {
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { FABRIC_TECHNOLOGY_MODULE } from "../modules/fabric-technology"
import type FabricTechnologyModuleService from "../modules/fabric-technology/service"
import { SIZE_CHART_MODULE } from "../modules/size-chart"
import type SizeChartModuleService from "../modules/size-chart/service"
import {
  CATEGORIES,
  COLLECTIONS,
  COLORS,
  FABRIC_TECHS,
  FLAG_TAGS,
  PRODUCT_TYPES,
  PRODUCTS,
  SIZE_CHARTS,
  WEIGHT_G,
  defaultCollection,
} from "../seed/catalog-data"
import { placeholderImage } from "../seed/placeholder-images"

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

/** Stable pseudo-random stock so reruns and tests agree: some sold out sizes, some low stock. */
function stockFor(sku: string, soldOut?: boolean): number {
  if (soldOut) return 0
  let h = 0
  for (const ch of sku) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const n = h % 100
  if (n < 8) return 0
  if (n < 20) return 1 + (n % 4)
  return 12 + (n % 40)
}

/**
 * Development catalogue: categories, collections, types, fabric technologies, size charts and
 * 40+ placeholder products with sizes, colours, stock and generated placeholder images.
 * Safe to rerun: existing records are skipped.
 *   pnpm --filter @t9/backend exec medusa exec ./src/scripts/seed-catalog.ts
 */
export default async function seedCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const productModule = container.resolve(Modules.PRODUCT)
  const fileModule = container.resolve(Modules.FILE)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const fabricModule: FabricTechnologyModuleService = container.resolve(FABRIC_TECHNOLOGY_MODULE)
  const sizeChartModule: SizeChartModuleService = container.resolve(SIZE_CHART_MODULE)

  const [channel] = await salesChannelModule.listSalesChannels({ name: "Techno9Sports Web" })
  const [location] = await stockLocationModule.listStockLocations({})
  const { data: profiles } = await query.graph({ entity: "shipping_profile", fields: ["id"] })
  if (!channel || !location || !profiles[0]) {
    throw new Error("Run setup-store.ts first (sales channel, warehouse, shipping profile)")
  }

  // Product types
  const existingTypes = await productModule.listProductTypes({}, { take: 200 })
  const typeId = new Map(existingTypes.map((t) => [t.value, t.id]))
  const missingTypes = PRODUCT_TYPES.filter((t) => !typeId.has(t))
  if (missingTypes.length) {
    for (const t of await productModule.createProductTypes(
      missingTypes.map((value) => ({ value })),
    )) {
      typeId.set(t.value, t.id)
    }
  }

  // Categories (parents first)
  const existingCats = await productModule.listProductCategories({}, { take: 500 })
  const catId = new Map(existingCats.map((c) => [c.handle, c.id]))
  for (const parent of CATEGORIES) {
    if (!catId.has(parent.handle)) {
      const { result } = await createProductCategoriesWorkflow(container).run({
        input: {
          product_categories: [{ name: parent.name, handle: parent.handle, is_active: true }],
        },
      })
      catId.set(parent.handle, result[0]!.id)
    }
    const kids = (parent.children ?? []).filter((c) => !catId.has(c.handle))
    if (kids.length) {
      const { result } = await createProductCategoriesWorkflow(container).run({
        input: {
          product_categories: kids.map((c) => ({
            name: c.name,
            handle: c.handle,
            is_active: true,
            parent_category_id: catId.get(parent.handle),
          })),
        },
      })
      for (const c of result) catId.set(c.handle, c.id)
    }
  }

  // Collections
  const existingCols = await productModule.listProductCollections({}, { take: 100 })
  const colId = new Map(existingCols.map((c) => [c.handle, c.id]))
  const newCols = COLLECTIONS.filter((c) => !colId.has(c.handle))
  if (newCols.length) {
    const { result } = await createCollectionsWorkflow(container).run({
      input: { collections: newCols },
    })
    for (const c of result) colId.set(c.handle, c.id)
  }

  // Tags (bestseller, new)
  const existingTags = await productModule.listProductTags({}, { take: 100 })
  const tagId = new Map(existingTags.map((t) => [t.value, t.id]))
  for (const value of Object.values(FLAG_TAGS)) {
    if (!tagId.has(value))
      tagId.set(value, (await productModule.createProductTags([{ value }]))[0]!.id)
  }

  // Fabric technologies and size charts
  const techs = await fabricModule.listFabricTechnologies({})
  const techId = new Map(techs.map((t) => [t.handle, t.id]))
  for (const t of FABRIC_TECHS.filter((x) => !techId.has(x.handle))) {
    techId.set(t.handle, (await fabricModule.createFabricTechnologies(t)).id)
  }
  const charts = await sizeChartModule.listSizeCharts({})
  const chartId = new Map(charts.map((c) => [c.handle, c.id]))
  for (const c of SIZE_CHARTS.filter((x) => !chartId.has(x.handle))) {
    const { rows, ...rest } = c
    const byRow = Object.fromEntries(
      rows.map(({ size, ...measurements }) => [size, measurements as Record<string, string>]),
    )
    chartId.set(
      c.handle,
      (
        await sizeChartModule.createSizeCharts({
          ...rest,
          sizes: rows.map((r) => r.size),
          rows: byRow,
        })
      ).id,
    )
  }

  // Products
  const handleOf = (title: string) => slug(title)
  const existing = await productModule.listProducts(
    { handle: PRODUCTS.map((p) => handleOf(p.title)) },
    { take: 500 },
  )
  const have = new Set(existing.map((p) => p.handle))
  const todo = PRODUCTS.filter((p) => !have.has(handleOf(p.title)))
  logger.info(`${have.size} products already exist, creating ${todo.length}`)

  let createdCount = 0
  const BATCH = 4
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH)
    const inputs: CreateProductWorkflowInputDTO[] = []
    for (const [offset, spec] of batch.entries()) {
      const seed = i + offset
      const handle = handleOf(spec.title)

      // Two placeholder images per colour: front and detail.
      const images: { url: string; metadata: Record<string, string> }[] = []
      for (const color of spec.colors) {
        for (const view of ["front", "detail"] as const) {
          const png = await placeholderImage(spec.glyph, COLORS[color]!, view, seed)
          const [file] = await fileModule.createFiles([
            {
              filename: `${handle}-${slug(color)}-${view}.webp`,
              mimeType: "image/webp",
              content: png.toString("binary"),
              access: "public",
            },
          ])
          images.push({ url: file!.url, metadata: { color, view } })
        }
      }

      const flags = spec.collections.filter((c) => c in FLAG_TAGS).map((c) => FLAG_TAGS[c]!)
      const collection =
        spec.collections.find((c) => COLLECTIONS.some((x) => x.handle === c)) ??
        defaultCollection(spec)

      inputs.push({
        title: spec.title,
        handle,
        subtitle: spec.tech.length
          ? FABRIC_TECHS.find((t) => t.handle === spec.tech[0])!.name
          : undefined,
        description: spec.description,
        status: ProductStatus.PUBLISHED,
        thumbnail: images[0]!.url,
        images,
        type_id: typeId.get(spec.type),
        collection_id: collection ? colId.get(collection) : undefined,
        category_ids: spec.categories.map((c) => catId.get(c)!),
        tag_ids: flags.map((f) => tagId.get(f)!),
        shipping_profile_id: profiles[0]!.id,
        sales_channels: [{ id: channel.id }],
        options: [
          { title: "Size", values: spec.sizes },
          { title: "Color", values: spec.colors },
        ],
        variants: spec.sizes.flatMap((size) =>
          spec.colors.map((color) => ({
            title: `${size} / ${color}`,
            sku: `${spec.code}-${slug(color).toUpperCase()}-${slug(size).toUpperCase()}`,
            manage_inventory: true,
            allow_backorder: false,
            weight: WEIGHT_G[spec.glyph],
            options: { Size: size, Color: color },
            prices: [{ currency_code: "inr", amount: spec.price }],
          })),
        ),
        // Selling price is the variant price (GST-inclusive, rupees). MRP and the rest are metadata;
        // see docs/catalog-model.md.
        metadata: {
          mrp: spec.mrp,
          gender: spec.gender,
          hsn_code: spec.hsn,
          attributes: spec.attrs,
          features: spec.features,
          fabric: spec.fabric,
          color_hex: Object.fromEntries(spec.colors.map((c) => [c, COLORS[c]])),
          bestseller_rank: spec.rank ?? 999,
        },
      })
    }
    const { result } = await createProductsWorkflow(container).run({ input: { products: inputs } })
    createdCount += result.length
    logger.info(`Created ${createdCount}/${todo.length} products`)
  }

  // Stock and links for every catalogue product, filling in only what is missing. This also
  // repairs a run that stopped half way.
  const { data: all } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "handle",
      "variants.sku",
      "variants.inventory_items.inventory_item_id",
      "variants.inventory_items.inventory.location_levels.id",
      "fabric_technologies.id",
      "size_chart.id",
    ],
    filters: { handle: PRODUCTS.map((p) => handleOf(p.title)) },
  })
  const specByHandle = new Map(PRODUCTS.map((p) => [handleOf(p.title), p]))

  const levels: { inventory_item_id: string; location_id: string; stocked_quantity: number }[] = []
  const links: Record<string, Record<string, string>>[] = []
  for (const product of all) {
    const spec = specByHandle.get(product.handle)!
    for (const variant of product.variants ?? []) {
      for (const ii of variant?.inventory_items ?? []) {
        if ((ii?.inventory?.location_levels ?? []).length === 0) {
          levels.push({
            inventory_item_id: ii!.inventory_item_id,
            location_id: location.id,
            stocked_quantity: stockFor(variant!.sku!, spec.soldOut),
          })
        }
      }
    }
    const linkedTechs = new Set((product.fabric_technologies ?? []).map((t) => t?.id))
    for (const t of spec.tech) {
      if (!linkedTechs.has(techId.get(t))) {
        links.push({
          [Modules.PRODUCT]: { product_id: product.id },
          [FABRIC_TECHNOLOGY_MODULE]: { fabric_technology_id: techId.get(t)! },
        })
      }
    }
    if (spec.sizeChart && !product.size_chart) {
      links.push({
        [Modules.PRODUCT]: { product_id: product.id },
        [SIZE_CHART_MODULE]: { size_chart_id: chartId.get(spec.sizeChart)! },
      })
    }
  }
  if (levels.length) {
    await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels: levels } })
  }
  if (links.length) await link.create(links)
  logger.info(`Added stock to ${levels.length} variants and ${links.length} links`)

  logger.info("Catalogue seed complete")
}
