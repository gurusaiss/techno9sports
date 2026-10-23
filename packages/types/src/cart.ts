/**
 * Cart and checkout contract. The backend builds these from Medusa's cart; the storefront only
 * displays them and never sends an amount back. Money is rupees (Medusa's unit), GST-inclusive.
 */
import type { AvailabilityStatus } from "./catalog"

export interface CartLine {
  id: string
  product_id: string
  product_handle: string
  variant_id: string
  title: string
  size: string | null
  color: string | null
  thumbnail: string | null
  quantity: number
  unit_price: number
  mrp: number | null
  line_total: number
  discount: number
  max_quantity: number
  availability: AvailabilityStatus
}

export interface CartPromotion {
  code: string
  description: string | null
  automatic: boolean
}

export interface CartAddress {
  first_name: string
  last_name: string
  phone: string
  address_1: string
  address_2: string | null
  city: string
  province: string
  postal_code: string
}

export interface CartShippingOption {
  id: string
  name: string
  description: string | null
  amount: number
}

export interface StoreCart {
  id: string
  email: string | null
  customer_id: string | null
  items: CartLine[]
  item_count: number
  mrp_total: number
  items_total: number
  discount_total: number
  shipping_total: number
  cod_fee: number
  tax_total: number
  total: number
  savings: number
  promotions: CartPromotion[]
  shipping_method: { option_id: string; name: string; amount: number } | null
  shipping_address: CartAddress | null
  free_shipping: { threshold: number | null; remaining: number; reached: boolean }
  payment_method: "razorpay" | "cod" | null
  payable: number
  completed: boolean
}
