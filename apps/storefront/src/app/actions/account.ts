"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { friendlyError } from "@/lib/action-error"
import {
  deleteAddress,
  mergeWishlist,
  saveAddress,
  setWishlisted,
  updateProfile,
  wishlistIds,
} from "@/lib/customer"
import { addressSchema, emailField, fieldErrors, firstError } from "@/lib/schemas"

export interface FormResult {
  ok: boolean
  error?: string
  fields?: Record<string, string>
}

const profileSchema = z.object({
  first_name: z.string().trim().min(1, "Enter your first name").max(60),
  last_name: z.string().trim().max(60).optional().default(""),
  email: emailField.optional().or(z.literal("")),
})

export async function updateProfileAction(input: unknown): Promise<FormResult> {
  const p = profileSchema.safeParse(input)
  if (!p.success) return { ok: false, error: firstError(p.error), fields: fieldErrors(p.error) }
  try {
    await updateProfile({ ...p.data, email: p.data.email || undefined })
    revalidatePath("/account")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: friendlyError(e, "Couldn't save your details.") }
  }
}

export async function saveAddressAction(
  input: unknown,
  id?: string,
  makeDefault = false,
): Promise<FormResult> {
  const p = addressSchema.safeParse(input)
  if (!p.success) return { ok: false, error: firstError(p.error), fields: fieldErrors(p.error) }
  try {
    await saveAddress(p.data, id, makeDefault)
    revalidatePath("/account/addresses")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: friendlyError(e, "Couldn't save that address.") }
  }
}

export async function deleteAddressAction(id: string): Promise<FormResult> {
  try {
    await deleteAddress(id)
    revalidatePath("/account/addresses")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: friendlyError(e, "Couldn't remove that address.") }
  }
}

export async function getWishlistAction(): Promise<string[]> {
  return wishlistIds().catch(() => [])
}

export async function toggleWishlistAction(
  productId: string,
  saved: boolean,
): Promise<{ ok: boolean }> {
  if (!productId.startsWith("prod_")) return { ok: false }
  try {
    await setWishlisted(productId, saved)
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

export async function mergeWishlistAction(ids: string[]): Promise<string[]> {
  return mergeWishlist(
    ids.filter((i) => typeof i === "string" && i.startsWith("prod_")).slice(0, 200),
  ).catch(() => [])
}
