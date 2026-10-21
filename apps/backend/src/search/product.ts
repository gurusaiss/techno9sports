import type { SearchTypes } from "@medusajs/framework/types"
import { defineSearchIndex, graphConsume, graphSeed, search } from "@medusajs/framework/utils"

import { ProductOptionRow, toOptionValues } from "./helpers/option-values"
import { isVariantAvailable as available } from "../lib/availability"
import { loadPricing, priceFields, toProductPricing } from "./helpers/pricing"
import { resolveProductIds } from "./helpers/resolve-product-ids"

/**
 * The storefront's product index. It holds everything the listing, filters, sort and search
 * need, so listing pages never join across modules at request time. Selling price comes from
 * Medusa pricing (`min_price_inr`); MRP is `metadata.mrp`; discount is derived from the two.
 * Field meanings: docs/catalog-model.md.
 */
const PRODUCT_GRAPH_FIELDS = [
  "id",
  "title",
  "subtitle",
  "description",
  "handle",
  "thumbnail",
  "status",
  "created_at",
  "metadata",
  "sales_channels.id",
  "categories.handle",
  "categories.name",
  "categories.parent_category.handle",
  "collection.handle",
  "type.value",
  "tags.value",
  "options.title",
  "options.values.value",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "variants.options.value",
  "variants.options.option.title",
  "variants.inventory_items.inventory.location_levels.stocked_quantity",
  "variants.inventory_items.inventory.location_levels.reserved_quantity",
  "fabric_technologies.handle",
  "fabric_technologies.name",
  "fabric_technologies.is_active",
]

type Row = Record<string, any>

const keywordFacet = () => search.keyword().filterable().facetable().retrievable()
const keywordArrayFacet = () => search.keyword().array().filterable().facetable().retrievable()

const productFields = search.define({
  id: search.keyword().filterable().retrievable(),
  // Read by `/store/search` to scope the index; never returned to hits.
  status: search.keyword().filterable().retrievable(false),
  sales_channel_ids: search.keyword().array().filterable().retrievable(false),

  title: search.text().searchable({ weight: 4 }).sortable().retrievable(),
  technology_names: search.text().array().searchable({ weight: 3 }).retrievable(),
  category_names: search.text().array().searchable({ weight: 2 }).retrievable(),
  option_values: search
    .keyword()
    .array()
    .searchable({ weight: 2 })
    .filterable()
    .facetable()
    .retrievable(),
  description: search.text().searchable({ weight: 1 }),
  handle: search.keyword().retrievable(),
  thumbnail: search.keyword().retrievable(),
  created_at: search.date().sortable().retrievable(),

  gender: keywordFacet(),
  categories: keywordArrayFacet(),
  collection: keywordFacet(),
  product_type: keywordFacet(),
  tags: keywordArrayFacet(),
  technologies: keywordArrayFacet(),
  fit: keywordFacet(),
  sleeve: keywordFacet(),
  neck: keywordFacet(),
  shape: keywordFacet(),
  sport: keywordFacet(),
  sizes: keywordArrayFacet(),
  sizes_available: keywordArrayFacet(),
  colors: keywordArrayFacet(),
  /** "Navy:#0f2a43" pairs, for swatches on cards. Not filterable. */
  color_swatches: search.keyword().array().retrievable(),
  in_stock: search.boolean().filterable().facetable().retrievable(),

  mrp: search.float().filterable().sortable().retrievable(),
  discount_percent: search
    .integer()
    .filterable()
    .sortable()
    .facetable({ types: ["stats"] })
    .retrievable(),
  bestseller_rank: search.integer().sortable().retrievable(),
  ...priceFields,
})

type ProductDocument = SearchTypes.InferSearchDocumentType<typeof productFields>

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null)
const uniq = <T>(list: T[]) => Array.from(new Set(list))

function toDocument(
  product: Row,
  pricing: Parameters<typeof toProductPricing>[0],
): ProductDocument {
  const meta = (product.metadata ?? {}) as Record<string, any>
  const attrs = (meta.attributes ?? {}) as Record<string, string>

  const categoryHandles = uniq(
    (product.categories ?? []).flatMap((c: Row) => [
      text(c?.handle),
      text(c?.parent_category?.handle),
    ]),
  ).filter((h): h is string => Boolean(h))

  const variants: Row[] = product.variants ?? []
  const sizeOf = (v: Row) =>
    (v.options ?? []).find((o: Row) => o?.option?.title === "Size")?.value as string | undefined
  const sizes = uniq(
    (product.options ?? []).flatMap((o: Row) =>
      o?.title === "Size" ? (o.values ?? []).map((x: Row) => text(x?.value)) : [],
    ),
  ).filter((v): v is string => Boolean(v))
  const sizesAvailable = uniq(variants.filter(available).map(sizeOf)).filter((v): v is string =>
    Boolean(v),
  )
  const colors = uniq(
    (product.options ?? []).flatMap((o: Row) =>
      o?.title === "Color" ? (o.values ?? []).map((x: Row) => text(x?.value)) : [],
    ),
  ).filter((v): v is string => Boolean(v))
  const hex = (meta.color_hex ?? {}) as Record<string, string>

  const techs = (product.fabric_technologies ?? []).filter((t: Row) => t && t.is_active !== false)
  const priced = toProductPricing(pricing)
  const price = priced.min_price_inr
  const mrp = typeof meta.mrp === "number" ? meta.mrp : null
  const discount =
    mrp && typeof price === "number" && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0

  return {
    id: product.id,
    status: product.status ?? null,
    sales_channel_ids: (product.sales_channels ?? []).map((c: Row) => c?.id).filter(Boolean),
    title: product.title ?? null,
    technology_names: techs.map((t: Row) => t.name),
    category_names: uniq((product.categories ?? []).map((c: Row) => text(c?.name))).filter(
      Boolean,
    ) as string[],
    option_values: toOptionValues(product.options as ProductOptionRow[]),
    description: product.description ?? null,
    handle: product.handle ?? null,
    thumbnail: product.thumbnail ?? null,
    created_at: product.created_at ?? null,
    gender: text(meta.gender),
    categories: categoryHandles,
    collection: text(product.collection?.handle),
    product_type: text(product.type?.value),
    tags: (product.tags ?? []).map((t: Row) => text(t?.value)).filter(Boolean) as string[],
    technologies: techs.map((t: Row) => t.handle),
    fit: text(attrs.fit),
    sleeve: text(attrs.sleeve),
    neck: text(attrs.neck),
    shape: text(attrs.shape),
    sport: text(attrs.sport),
    sizes,
    sizes_available: sizesAvailable,
    colors,
    color_swatches: colors.map((c) => `${c}:${hex[c] ?? "#9aa4ad"}`),
    in_stock: variants.some(available),
    mrp,
    discount_percent: discount,
    bestseller_rank: typeof meta.bestseller_rank === "number" ? meta.bestseller_rank : 999,
    ...priced,
  }
}

/**
 * A row that returns no document leaves the index: the helpers turn it into a delete on
 * `consume` and on the catch-up pass.
 */
const source = {
  fields: PRODUCT_GRAPH_FIELDS,
  transform: async (rows: Row[], context: SearchTypes.SearchIngestionContext) => {
    const pricing = await loadPricing(
      rows.map((row) => row.id),
      context,
    )
    return rows.map((row) => toDocument(row, pricing.get(row.id)))
  },
}

/**
 * Everything a document is built from, so a change to any of it re-indexes the products it
 * touches. Stock events keep `in_stock` and `sizes_available` honest.
 *
 * Known gaps (also true of the starter): price lists emit no events, so a scheduled sale starting
 * or ending needs a reindex job (Phase 6). Link changes (technology, size chart) emit no events,
 * so admin tools must emit `product.updated` after changing them.
 */
const PRODUCT_EVENTS = [
  "product.created",
  "product.updated",
  "product.deleted",
  "product-variant.created",
  "product-variant.updated",
  "product-variant.deleted",
  "product-option.created",
  "product-option.updated",
  "product-option.deleted",
  "product-option-value.updated",
  "product-option-value.deleted",
  "product-tag.updated",
  "product-tag.deleted",
  "product-category.updated",
  "product-category.deleted",
  "sales-channel.deleted",
  "inventory-level.created",
  "inventory-level.updated",
  "inventory-level.deleted",
  "inventory-item.updated",
  "fabric-technology.updated",
  "size-chart.updated",
]

export default defineSearchIndex({
  name: "product",
  entity: "product",
  primary_key: "id",
  fields: productFields,
  settings: {
    typo_tolerance: { enabled: true },
  },
  events: PRODUCT_EVENTS,
  consume: graphConsume<typeof productFields, Row>({
    ...source,
    resolve_ids: resolveProductIds,
    is_delete: (event) => event.name === "product.deleted",
  }),
  seed: graphSeed<typeof productFields, Row>(source),
})
