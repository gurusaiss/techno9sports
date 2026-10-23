import type { CartLine, CartPromotion, StoreCart } from "@t9/types"
import { availabilityOf, onHandQuantity, type InventoryVariantRow } from "./availability"
import type { Settings } from "./settings"

const r2 = (n: unknown) => Math.round(Number(n ?? 0) * 100) / 100

interface RawLine {
  id: string
  product_id: string
  product_handle: string | null
  product_title: string | null
  variant_id: string
  thumbnail: string | null
  quantity: number
  unit_price: number
  total: number
  discount_total: number
  variant?:
    | (InventoryVariantRow & {
        options?: { value: string; option?: { title: string } | null }[] | null
        product?: { metadata?: Record<string, unknown> | null } | null
      })
    | null
}

export interface RawCart {
  id: string
  email: string | null
  customer_id: string | null
  completed_at: string | null
  items?: RawLine[] | null
  item_total: number
  discount_total: number
  shipping_total: number
  tax_total: number
  total: number
  payment_collection?: {
    payment_sessions?: { provider_id: string; status: string }[] | null
  } | null
  promotions?:
    { code: string; is_automatic?: boolean; metadata?: Record<string, unknown> | null }[] | null
  shipping_methods?: { shipping_option_id: string | null; name: string; amount: number }[] | null
  shipping_address?: {
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    address_1?: string | null
    address_2?: string | null
    city?: string | null
    province?: string | null
    postal_code?: string | null
  } | null
}

function optionValue(line: RawLine, title: string): string | null {
  return line.variant?.options?.find((o) => o.option?.title?.toLowerCase() === title)?.value ?? null
}

function readMrp(line: RawLine): number | null {
  const mrp = Number(line.variant?.product?.metadata?.mrp)
  return Number.isFinite(mrp) && mrp > line.unit_price ? mrp : null
}

export function toStoreCart(
  cart: RawCart,
  settings: {
    shipping: Settings["shipping"]
    checkout: Settings["checkout"]
    cod: Settings["cod"]
  },
): StoreCart {
  const items: CartLine[] = (cart.items ?? []).map((l) => {
    const variant = l.variant ?? {}
    const managed = variant.manage_inventory !== false && variant.allow_backorder !== true
    const stock = managed ? onHandQuantity(variant) : Infinity
    const cap = settings.checkout.cart_max_quantity_per_line
    return {
      id: l.id,
      product_id: l.product_id,
      product_handle: l.product_handle ?? "",
      variant_id: l.variant_id,
      title: l.product_title ?? "",
      size: optionValue(l, "size"),
      color: optionValue(l, "color"),
      thumbnail: l.thumbnail,
      quantity: l.quantity,
      unit_price: r2(l.unit_price),
      mrp: readMrp(l),
      line_total: r2(l.total),
      discount: r2(l.discount_total),
      max_quantity: Math.max(0, Math.min(cap, stock)),
      availability: availabilityOf(variant).status,
    }
  })

  const mrp_total = r2(items.reduce((s, i) => s + (i.mrp ?? i.unit_price) * i.quantity, 0))
  const items_total = r2(items.reduce((s, i) => s + i.unit_price * i.quantity, 0))
  const discount_total = r2(cart.discount_total)
  const method = cart.shipping_methods?.[0]
  const threshold = settings.shipping.free_above
  const payableItems = r2(cart.item_total)
  const session = cart.payment_collection?.payment_sessions?.[0]
  const payment_method =
    session?.provider_id === "razorpay" ? "razorpay" : session?.provider_id === "cod" ? "cod" : null
  const cod_fee = payment_method === "cod" && settings.cod.enabled ? settings.cod.fee : 0

  const promotions: CartPromotion[] = (cart.promotions ?? []).map((p) => ({
    code: p.code,
    description: typeof p.metadata?.description === "string" ? p.metadata.description : null,
    automatic: !!p.is_automatic,
  }))
  const a = cart.shipping_address
  return {
    id: cart.id,
    email: cart.email,
    customer_id: cart.customer_id,
    items,
    item_count: items.reduce((s, i) => s + i.quantity, 0),
    mrp_total,
    items_total,
    discount_total,
    shipping_total: r2(cart.shipping_total),
    cod_fee,
    tax_total: r2(cart.tax_total),
    total: r2(cart.total) + cod_fee,
    savings: r2(mrp_total - items_total + discount_total),
    promotions,
    shipping_method: method
      ? { option_id: method.shipping_option_id ?? "", name: method.name, amount: r2(method.amount) }
      : null,
    shipping_address:
      a && a.address_1
        ? {
            first_name: a.first_name ?? "",
            last_name: a.last_name ?? "",
            phone: a.phone ?? "",
            address_1: a.address_1,
            address_2: a.address_2 ?? null,
            city: a.city ?? "",
            province: a.province ?? "",
            postal_code: a.postal_code ?? "",
          }
        : null,
    free_shipping: {
      threshold,
      remaining: threshold === null ? 0 : Math.max(0, r2(threshold - payableItems)),
      reached: threshold !== null && payableItems >= threshold,
    },
    payment_method,
    payable: r2(cart.total) + cod_fee,
    completed: !!cart.completed_at,
  }
}

export const STORE_CART_FIELDS = [
  "id",
  "email",
  "customer_id",
  "completed_at",
  "item_total",
  "discount_total",
  "shipping_total",
  "tax_total",
  "total",
  "items.id",
  "items.product_id",
  "items.product_handle",
  "items.product_title",
  "items.variant_id",
  "items.thumbnail",
  "items.quantity",
  "items.unit_price",
  "items.total",
  "items.discount_total",
  "items.variant.manage_inventory",
  "items.variant.allow_backorder",
  "items.variant.inventory_items.inventory.location_levels.stocked_quantity",
  "items.variant.inventory_items.inventory.location_levels.reserved_quantity",
  "items.variant.options.value",
  "items.variant.options.option.title",
  "items.variant.product.metadata",
  "promotions.code",
  "promotions.is_automatic",
  "promotions.metadata",
  "shipping_methods.shipping_option_id",
  "shipping_methods.name",
  "shipping_methods.amount",
  "shipping_address.*",
  "payment_collection.payment_sessions.provider_id",
  "payment_collection.payment_sessions.status",
]
