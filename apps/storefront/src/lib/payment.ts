import "server-only"
import type { StoreCart, StoreOrder } from "@t9/types"
import { medusa } from "./api"
import { getCartId } from "./session"
import { fetchCart } from "./store"

export interface RazorpaySession {
  session_id: string
  order_id: string
  key_id: string
  amount: number
  currency: string
  mock: boolean
}

interface PaymentSessionsResponse {
  payment_collection: {
    id: string
    payment_sessions: { id: string; provider_id: string; data: Record<string, unknown> }[]
  }
}

async function paymentCollectionId(cartId: string): Promise<string> {
  const { cart } = await medusa<{ cart: { payment_collection?: { id: string } | null } }>(
    `/store/carts/${cartId}?fields=*payment_collection`,
    { cache: "no-store" },
  )
  if (cart.payment_collection) return cart.payment_collection.id
  const { payment_collection } = await medusa<{ payment_collection: { id: string } }>(
    "/store/payment-collections",
    { method: "POST", body: JSON.stringify({ cart_id: cartId }) },
  )
  return payment_collection.id
}

/** Creates (or refreshes) a Razorpay order for the cart's current total and returns what the client needs to open Checkout. */
export async function initiateRazorpay(): Promise<RazorpaySession | null> {
  const cartId = await getCartId()
  if (!cartId) return null
  const pcId = await paymentCollectionId(cartId)
  const { payment_collection } = await medusa<PaymentSessionsResponse>(
    `/store/payment-collections/${pcId}/payment-sessions`,
    { method: "POST", body: JSON.stringify({ provider_id: "pp_razorpay_razorpay" }) },
  )
  const session = payment_collection.payment_sessions.find(
    (s) => s.provider_id === "pp_razorpay_razorpay",
  )
  if (!session) return null
  const data = session.data as { order_id: string; key_id: string }
  const cart = await fetchCart(cartId)
  return {
    session_id: session.id,
    order_id: data.order_id,
    key_id: data.key_id,
    amount: cart?.total ?? 0,
    currency: "INR",
    mock: data.key_id === "rzp_test_mock",
  }
}

export interface CodCheck {
  eligible: boolean
  otp_required?: boolean
  fee?: number
  reason?: string
  message?: string
}

export async function codCheck(): Promise<CodCheck> {
  const cartId = await getCartId()
  if (!cartId) return { eligible: false, message: "Your bag is empty." }
  return medusa<CodCheck>(`/store/catalog/cart/${cartId}/cod-check`, { cache: "no-store" })
}

export interface OtpSent {
  ok: boolean
  expires_in?: number
  resend_in?: number
}

export async function requestCodOtp(): Promise<OtpSent> {
  const cartId = await getCartId()
  if (!cartId) throw new Error("No cart")
  return medusa<OtpSent>(`/store/catalog/cart/${cartId}/cod-otp/request`, { method: "POST" })
}

export async function verifyCodOtp(code: string): Promise<StoreCart | null> {
  const cartId = await getCartId()
  if (!cartId) return null
  const { cart } = await medusa<{ cart: StoreCart }>(
    `/store/catalog/cart/${cartId}/cod-otp/verify`,
    {
      method: "POST",
      body: JSON.stringify({ code }),
    },
  )
  return cart
}

export async function confirmCodNoOtp(): Promise<StoreCart | null> {
  const cartId = await getCartId()
  if (!cartId) return null
  const { cart } = await medusa<{ cart: StoreCart }>(`/store/catalog/cart/${cartId}/cod-confirm`, {
    method: "POST",
  })
  return cart
}

/** Dev/test only: simulates a Razorpay outcome on a mock order. The backend refuses this outside mock mode. */
export async function simulateRazorpay(
  orderId: string,
  outcome: "success" | "failure",
): Promise<void> {
  await medusa("/store/dev/razorpay/simulate", {
    method: "POST",
    body: JSON.stringify({ order_id: orderId, outcome }),
  })
}

export type CompleteResult =
  { ok: true; orderId: string } | { ok: false; message: string; cart: StoreCart | null }

export async function completePayment(): Promise<CompleteResult> {
  const cartId = await getCartId()
  if (!cartId) return { ok: false, message: "Your bag is empty.", cart: null }
  try {
    const result = await medusa<{ type: string; order?: { id: string } }>(
      `/store/carts/${cartId}/complete`,
      { method: "POST" },
    )
    if (result.type === "order" && result.order) return { ok: true, orderId: result.order.id }
    return {
      ok: false,
      message: "That payment didn't go through. Please try again.",
      cart: await fetchCart(cartId),
    }
  } catch {
    return {
      ok: false,
      message: "That payment didn't go through. Please try again.",
      cart: await fetchCart(cartId),
    }
  }
}

export async function fetchOrder(id: string): Promise<StoreOrder | null> {
  try {
    const { order } = await medusa<{ order: StoreOrder }>(`/store/orders/${id}`, {
      cache: "no-store",
    })
    return order
  } catch {
    return null
  }
}
