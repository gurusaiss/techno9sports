"use server"

import { z } from "zod"
import type { StoreCart } from "@t9/types"
import { friendlyError } from "@/lib/action-error"
import {
  codCheck,
  completePayment,
  confirmCodNoOtp,
  initiateRazorpay,
  requestCodOtp,
  simulateRazorpay,
  verifyCodOtp,
  type CodCheck,
  type CompleteResult,
  type OtpSent,
  type RazorpaySession,
} from "@/lib/payment"
import { currentCart } from "@/lib/store"

export async function razorpaySessionAction(): Promise<
  { ok: true; session: RazorpaySession } | { ok: false; error: string }
> {
  try {
    const session = await initiateRazorpay()
    if (!session) return { ok: false, error: "Your bag is empty." }
    return { ok: true, session }
  } catch (e) {
    return { ok: false, error: friendlyError(e, "Couldn't start your payment. Please try again.") }
  }
}

export async function completePaymentAction(): Promise<CompleteResult> {
  return completePayment()
}

export async function codCheckAction(): Promise<CodCheck> {
  try {
    return await codCheck()
  } catch (e) {
    return {
      eligible: false,
      message: friendlyError(e, "Couldn't check cash-on-delivery right now."),
    }
  }
}

export async function requestCodOtpAction(): Promise<
  (OtpSent & { ok: true }) | { ok: false; error: string }
> {
  try {
    const sent = await requestCodOtp()
    return { ...sent, ok: true }
  } catch (e) {
    return { ok: false, error: friendlyError(e, "Couldn't send a code right now.") }
  }
}

const codeSchema = z.string().regex(/^\d{6}$/)

export async function verifyCodOtpAction(
  code: unknown,
): Promise<{ ok: true; cart: StoreCart | null } | { ok: false; error: string }> {
  const p = codeSchema.safeParse(code)
  if (!p.success) return { ok: false, error: "Enter the 6-digit code" }
  try {
    const cart = await verifyCodOtp(p.data)
    return { ok: true, cart }
  } catch (e) {
    return { ok: false, error: friendlyError(e, "That code didn't work. Please try again.") }
  }
}

export async function confirmCodAction(): Promise<
  { ok: true; cart: StoreCart | null } | { ok: false; error: string }
> {
  try {
    const cart = await confirmCodNoOtp()
    return { ok: true, cart }
  } catch (e) {
    return {
      ok: false,
      error: friendlyError(e, "Couldn't set cash on delivery. Please try again."),
    }
  }
}

/** Dev/test only; the backend itself refuses this outside Razorpay mock mode. */
export async function simulateRazorpayAction(
  orderId: unknown,
  outcome: unknown,
): Promise<{ ok: boolean }> {
  const o = z
    .object({ orderId: z.string().min(1), outcome: z.enum(["success", "failure"]) })
    .safeParse({
      orderId,
      outcome,
    })
  if (!o.success) return { ok: false }
  await simulateRazorpay(o.data.orderId, o.data.outcome).catch(() => undefined)
  return { ok: true }
}

export async function refreshCartAction() {
  return currentCart()
}
