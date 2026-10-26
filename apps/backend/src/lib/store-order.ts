import type { OrderLine, StoreOrder } from "@t9/types"

const r2 = (n: unknown) => Math.round(Number(n ?? 0) * 100) / 100

export interface RawOrder {
  id: string
  display_id: number
  email: string | null
  created_at: string
  item_total: number
  shipping_total: number
  discount_total: number
  tax_total: number
  total: number
  summary?: { paid_total?: number } | null
  metadata?: Record<string, unknown> | null
  items?:
    | {
        product_title: string | null
        variant_title: string | null
        thumbnail: string | null
        quantity: number
        unit_price: number
        total: number
      }[]
    | null
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
  payment_collections?:
    { status: string; payment_sessions?: { provider_id: string }[] | null }[] | null
}

export function toStoreOrder(order: RawOrder): StoreOrder {
  const pc = order.payment_collections?.[0]
  const provider = pc?.payment_sessions?.[0]?.provider_id
  const payment_method =
    provider === "pp_razorpay_razorpay" ? "razorpay" : provider === "pp_cod_cod" ? "cod" : null
  const payment_status: StoreOrder["payment_status"] =
    pc?.status === "authorized" || pc?.status === "captured" || pc?.status === "canceled"
      ? pc.status
      : pc?.status === "not_paid"
        ? "pending"
        : "unknown"

  const items: OrderLine[] = (order.items ?? []).map((i) => ({
    title: i.product_title ?? "",
    variant: i.variant_title,
    thumbnail: i.thumbnail,
    quantity: i.quantity,
    unit_price: r2(i.unit_price),
    line_total: r2(i.total),
  }))

  const cod_fee = payment_method === "cod" ? Number(order.metadata?.cod_fee ?? 0) : 0
  const a = order.shipping_address
  return {
    id: order.id,
    display_id: order.display_id,
    email: order.email,
    created_at: order.created_at,
    payment_method,
    payment_status,
    items,
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
    items_total: r2(order.item_total),
    shipping_total: r2(order.shipping_total),
    discount_total: r2(order.discount_total),
    tax_total: r2(order.tax_total),
    total: r2(order.total),
    paid_total: r2(order.summary?.paid_total),
    cod_fee: r2(cod_fee),
    payable: r2(Number(order.total) + cod_fee),
  }
}

export const STORE_ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "created_at",
  "item_total",
  "shipping_total",
  "discount_total",
  "tax_total",
  "total",
  "metadata",
  "summary.paid_total",
  "items.product_title",
  "items.variant_title",
  "items.thumbnail",
  "items.quantity",
  "items.unit_price",
  "items.total",
  "shipping_address.*",
  "payment_collections.status",
  "payment_collections.payment_sessions.provider_id",
]
