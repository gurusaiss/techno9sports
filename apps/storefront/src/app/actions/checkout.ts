"use server"

import { z } from "zod"
import type { StoreCart } from "@t9/types"
import { friendlyError } from "@/lib/action-error"
import { addressSchema, emailField, fieldErrors, firstError, pincodeField } from "@/lib/schemas"
import {
  chooseShipping,
  currentCart,
  lookupPincode,
  setContactAndAddress,
  shippingOptions,
  type PincodeInfo,
  type ShippingOption,
} from "@/lib/store"

export interface CheckoutResult {
  cart: StoreCart | null
  options?: ShippingOption[]
  error?: string
  fields?: Record<string, string>
}

const detailsSchema = z.object({ email: emailField, address: addressSchema })

export async function saveDetailsAction(input: unknown): Promise<CheckoutResult> {
  const p = detailsSchema.safeParse(input)
  if (!p.success) {
    const f = fieldErrors(p.error)
    return { cart: await currentCart().catch(() => null), error: firstError(p.error), fields: f }
  }
  try {
    const cart = await setContactAndAddress(p.data)
    if (!cart || cart.items.length === 0) return { cart, error: "Your bag is empty." }
    return { cart, options: await shippingOptions() }
  } catch (e) {
    return {
      cart: await currentCart().catch(() => null),
      error: friendlyError(e, "Couldn't save your details."),
    }
  }
}

export async function chooseShippingAction(optionId: string): Promise<CheckoutResult> {
  if (typeof optionId !== "string" || !optionId.startsWith("so_")) {
    return { cart: await currentCart().catch(() => null), error: "Choose a delivery option." }
  }
  try {
    return { cart: await chooseShipping(optionId) }
  } catch (e) {
    return {
      cart: await currentCart().catch(() => null),
      error: friendlyError(e, "Couldn't set delivery."),
    }
  }
}

export async function lookupPincodeAction(
  pincode: string,
): Promise<{ ok: boolean; info?: PincodeInfo; error?: string }> {
  const p = pincodeField.safeParse(pincode)
  if (!p.success) return { ok: false, error: p.error.issues[0]!.message }
  try {
    return { ok: true, info: await lookupPincode(p.data) }
  } catch (e) {
    return { ok: false, error: friendlyError(e, "Couldn't check that pincode right now.") }
  }
}
