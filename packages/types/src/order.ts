import type { CartAddress } from "./cart"

export type OrderPaymentMethod = "razorpay" | "cod"

export interface OrderLine {
  title: string
  variant: string | null
  thumbnail: string | null
  quantity: number
  unit_price: number
  line_total: number
}

export interface StoreOrder {
  id: string
  display_id: number
  email: string | null
  created_at: string
  payment_method: OrderPaymentMethod | null
  payment_status: "pending" | "authorized" | "captured" | "canceled" | "unknown"
  items: OrderLine[]
  shipping_address: CartAddress | null
  items_total: number
  shipping_total: number
  discount_total: number
  tax_total: number
  total: number
  paid_total: number
  /** Courier-collected COD handling surcharge, on top of `total`; 0 unless payment_method is "cod". */
  cod_fee: number
  /** What the customer actually pays: `total` for prepaid orders, `total + cod_fee` for COD. */
  payable: number
}
