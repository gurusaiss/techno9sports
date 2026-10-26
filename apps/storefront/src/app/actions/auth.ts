"use server"

import { friendlyError } from "@/lib/action-error"
import { ApiError } from "@/lib/api"
import {
  loginWithPassword,
  mergeWishlist,
  registerWithPassword,
  requestOtp,
  signOut,
  verifyOtp,
} from "@/lib/customer"
import { claimCart } from "@/lib/store"
import {
  fieldErrors,
  firstError,
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
  registerSchema,
} from "@/lib/schemas"

export interface AuthResult {
  ok: boolean
  error?: string
  fields?: Record<string, string>
  isNew?: boolean
  resendIn?: number
}

async function afterSignIn(guestWishlist: string[] = []) {
  await claimCart()
  if (guestWishlist.length) await mergeWishlist(guestWishlist.slice(0, 200)).catch(() => undefined)
}

export async function loginAction(
  input: unknown,
  guestWishlist: string[] = [],
): Promise<AuthResult> {
  const p = loginSchema.safeParse(input)
  if (!p.success) return { ok: false, error: firstError(p.error), fields: fieldErrors(p.error) }
  try {
    await loginWithPassword(p.data.email, p.data.password)
  } catch (e) {
    if (e instanceof ApiError && e.status === 401)
      return { ok: false, error: "Email or password is not right." }
    return { ok: false, error: friendlyError(e) }
  }
  await afterSignIn(guestWishlist)
  return { ok: true }
}

export async function registerAction(
  input: unknown,
  guestWishlist: string[] = [],
): Promise<AuthResult> {
  const p = registerSchema.safeParse(input)
  if (!p.success) return { ok: false, error: firstError(p.error), fields: fieldErrors(p.error) }
  try {
    await registerWithPassword(p.data)
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 400 || e.status === 422)) {
      return { ok: false, error: "That email already has an account. Try signing in instead." }
    }
    return { ok: false, error: friendlyError(e) }
  }
  await afterSignIn(guestWishlist)
  return { ok: true }
}

export async function requestOtpAction(input: unknown): Promise<AuthResult> {
  const p = otpRequestSchema.safeParse(input)
  if (!p.success) return { ok: false, error: firstError(p.error), fields: fieldErrors(p.error) }
  try {
    const r = await requestOtp(p.data.phone)
    return { ok: true, resendIn: r.resend_in }
  } catch (e) {
    return { ok: false, error: friendlyError(e, "Couldn't send the code. Please try again.") }
  }
}

export async function verifyOtpAction(
  input: unknown,
  guestWishlist: string[] = [],
): Promise<AuthResult> {
  const p = otpVerifySchema.safeParse(input)
  if (!p.success) return { ok: false, error: firstError(p.error), fields: fieldErrors(p.error) }
  try {
    const { isNew } = await verifyOtp(p.data.phone, p.data.code)
    await afterSignIn(guestWishlist)
    return { ok: true, isNew }
  } catch (e) {
    return { ok: false, error: friendlyError(e, "That code didn't work. Please try again.") }
  }
}

export async function signOutAction(): Promise<void> {
  await signOut()
}

export interface SessionInfo {
  signedIn: boolean
  firstName: string | null
}

export async function getSessionAction(): Promise<SessionInfo> {
  try {
    const { currentCustomer } = await import("@/lib/customer")
    const c = await currentCustomer()
    return { signedIn: !!c, firstName: c?.first_name ?? null }
  } catch {
    return { signedIn: false, firstName: null }
  }
}
