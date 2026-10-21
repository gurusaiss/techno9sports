import { availabilityOf, type InventoryVariantRow } from "./availability"

type Row = Record<string, any>

export interface StoreVariant {
  id: string
  sku: string | null
  title: string
  size: string | null
  color: string | null
  /** Rupees, GST-inclusive. */
  price: number | null
  availability: ReturnType<typeof availabilityOf>
}

/** Raw graph fields the product page needs. Keep in sync with `toStoreProduct`. */
export const STORE_PRODUCT_FIELDS = [
  "id",
  "title",
  "subtitle",
  "description",
  "handle",
  "thumbnail",
  "status",
  "created_at",
  "metadata",
  "material",
  "images.url",
  "images.metadata",
  "options.title",
  "options.values.value",
  "categories.handle",
  "categories.name",
  "categories.parent_category.handle",
  "categories.parent_category.name",
  "collection.handle",
  "collection.title",
  "type.value",
  "tags.value",
  "variants.id",
  "variants.sku",
  "variants.title",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "variants.options.value",
  "variants.options.option.title",
  "variants.calculated_price.calculated_amount",
  "variants.calculated_price.original_amount",
  "variants.inventory_items.inventory.location_levels.stocked_quantity",
  "variants.inventory_items.inventory.location_levels.reserved_quantity",
  "fabric_technologies.handle",
  "fabric_technologies.name",
  "fabric_technologies.tagline",
  "fabric_technologies.description",
  "fabric_technologies.sort_order",
  "fabric_technologies.is_active",
  "size_chart.handle",
  "size_chart.name",
  "size_chart.unit",
  "size_chart.columns",
  "size_chart.sizes",
  "size_chart.rows",
  "size_chart.how_to_measure",
  "size_chart.notes",
]

const optionOf = (variant: Row, title: string): string | null =>
  (variant.options ?? []).find((o: Row) => o?.option?.title === title)?.value ?? null

/**
 * The product page response. Admin-only metadata (HSN code, bestseller rank) is left out on
 * purpose, and exact stock is only revealed when it is low.
 */
export function toStoreProduct(p: Row) {
  const meta = (p.metadata ?? {}) as Record<string, any>
  const variants: StoreVariant[] = (p.variants ?? []).map((v: Row) => ({
    id: v.id,
    sku: v.sku ?? null,
    title: v.title,
    size: optionOf(v, "Size"),
    color: optionOf(v, "Color"),
    price:
      typeof v.calculated_price?.calculated_amount === "number"
        ? v.calculated_price.calculated_amount
        : null,
    availability: availabilityOf(v as InventoryVariantRow),
  }))
  const prices = variants.map((v) => v.price).filter((x): x is number => typeof x === "number")
  const price = prices.length ? Math.min(...prices) : null
  const mrp = typeof meta.mrp === "number" ? meta.mrp : null
  const discount =
    mrp && price !== null && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0

  const chart = p.size_chart
  return {
    id: p.id as string,
    handle: p.handle as string,
    title: p.title as string,
    subtitle: (p.subtitle as string | null) ?? null,
    description: (p.description as string | null) ?? null,
    thumbnail: (p.thumbnail as string | null) ?? null,
    created_at: p.created_at as string,
    price,
    mrp,
    discount_percent: discount,
    gender: (meta.gender as string | undefined) ?? null,
    attributes: (meta.attributes ?? {}) as Record<string, string>,
    features: (Array.isArray(meta.features) ? meta.features : []) as string[],
    fabric: (p.material as string | null) ?? null,
    color_hex: (meta.color_hex ?? {}) as Record<string, string>,
    in_stock: variants.some((v) => v.availability.status !== "out_of_stock"),
    images: (p.images ?? []).map((i: Row) => ({
      url: i.url as string,
      color: (i.metadata?.color as string | undefined) ?? null,
      view: (i.metadata?.view as string | undefined) ?? null,
    })),
    options: (p.options ?? []).map((o: Row) => ({
      title: o.title as string,
      values: (o.values ?? []).map((x: Row) => x.value as string),
    })),
    variants,
    categories: (p.categories ?? []).map((c: Row) => ({
      handle: c.handle as string,
      name: c.name as string,
      parent: c.parent_category
        ? { handle: c.parent_category.handle as string, name: c.parent_category.name as string }
        : null,
    })),
    collection: p.collection
      ? { handle: p.collection.handle as string, title: p.collection.title as string }
      : null,
    type: (p.type?.value as string | undefined) ?? null,
    tags: (p.tags ?? []).map((t: Row) => t.value as string),
    technologies: (p.fabric_technologies ?? [])
      .filter((t: Row) => t && t.is_active !== false)
      .sort((a: Row, b: Row) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((t: Row) => ({
        handle: t.handle,
        name: t.name,
        tagline: t.tagline ?? null,
        description: t.description ?? null,
      })),
    size_chart: chart
      ? {
          handle: chart.handle as string,
          name: chart.name as string,
          unit: chart.unit as string,
          columns: chart.columns as string[],
          sizes: chart.sizes as string[],
          rows: chart.rows as Record<string, Record<string, string>>,
          how_to_measure: (chart.how_to_measure as string | null) ?? null,
          notes: (chart.notes as string | null) ?? null,
        }
      : null,
  }
}

export type StoreProduct = ReturnType<typeof toStoreProduct>
