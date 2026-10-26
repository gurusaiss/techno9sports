"use server"

import type { StoreCart } from "@t9/types"
import { friendlyError } from "@/lib/action-error"
import { couponSchema, quantitySchema } from "@/lib/schemas"
import {
  addLine,
  applyCoupon,
  currentCart,
  removeCoupon,
  removeLine,
  setLineQuantity,
} from "@/lib/store"

export interface CartResult {
  cart: StoreCart | null
  error?: string
  applied?: boolean
  reason?: string
}

export async function getCartAction(): Promise<CartResult> {
  try {
    return { cart: await currentCart() }
  } catch (e) {
    return { cart: null, error: friendlyError(e) }
  }
}

export async function addToCartAction(variantId: string, quantity = 1): Promise<CartResult> {
  const qty = quantitySchema.safeParse(quantity)
  if (!qty.success || typeof variantId !== "string" || !variantId.startsWith("variant_")) {
    return { cart: await currentCart().catch(() => null), error: "Choose a size first." }
  }
  try {
    return { cart: await addLine(variantId, qty.data) }
  } catch (e) {
    return {
      cart: await currentCart().catch(() => null),
      error: friendlyError(e, "Couldn't add that to your bag."),
    }
  }
}

export async function setQuantityAction(lineId: string, quantity: number): Promise<CartResult> {
  const qty = quantitySchema.safeParse(quantity)
  if (!qty.success)
    return { cart: await currentCart().catch(() => null), error: "Choose a quantity from 1 to 99." }
  try {
    return { cart: await setLineQuantity(lineId, qty.data) }
  } catch (e) {
    return {
      cart: await currentCart().catch(() => null),
      error: friendlyError(e, "Couldn't change the quantity."),
    }
  }
}

export async function removeLineAction(lineId: string): Promise<CartResult> {
  try {
    return { cart: await removeLine(lineId) }
  } catch (e) {
    return {
      cart: await currentCart().catch(() => null),
      error: friendlyError(e, "Couldn't remove that item."),
    }
  }
}

export async function applyCouponAction(code: string): Promise<CartResult> {
  const parsed = couponSchema.safeParse(code)
  if (!parsed.success)
    return { cart: await currentCart().catch(() => null), error: parsed.error.issues[0]!.message }
  try {
    const r = await applyCoupon(parsed.data)
    return {
      cart: r.cart,
      applied: r.applied,
      reason: r.reason,
      error: r.applied ? undefined : r.message,
    }
  } catch (e) {
    return {
      cart: await currentCart().catch(() => null),
      error: friendlyError(e, "Couldn't apply that code."),
    }
  }
}

export async function removeCouponAction(code: string): Promise<CartResult> {
  try {
    return { cart: await removeCoupon(code) }
  } catch (e) {
    return {
      cart: await currentCart().catch(() => null),
      error: friendlyError(e, "Couldn't remove that code."),
    }
  }
}
