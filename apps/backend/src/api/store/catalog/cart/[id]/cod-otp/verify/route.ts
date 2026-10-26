import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { createCodPaymentSession } from "../../../../../../../lib/cod-session"
import { normalizeIndianMobile } from "../../../../../../../lib/phone"
import { tooManyRequests } from "../../../../../../../lib/http"
import { LIMITS } from "../../../../../../../lib/rate-limit"
import { verifyOtp } from "../../../../../../../lib/otp-service"
import { getSetting } from "../../../../../../../lib/settings"
import { STORE_CART_FIELDS, toStoreCart, type RawCart } from "../../../../../../../lib/store-cart"

const Body = z.object({ code: z.string().regex(/^\d{6}$/) })

const MESSAGES = {
  expired: "That code has expired. Ask for a new one.",
  too_many_attempts: "Too many wrong codes. Ask for a new one.",
  already_used: "That code was already used. Ask for a new one.",
  wrong_code: "That code is not right. Check it and try again.",
  no_challenge: "Ask for a code first.",
} as const

/**
 * POST /store/catalog/cart/:id/cod-otp/verify — on a correct code, creates the COD payment session
 * itself (rather than letting the storefront call the generic payment-sessions route directly), so
 * a COD session can never exist on a cart without the OTP step actually having passed.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = Body.safeParse(req.body)
  if (!body.success) {
    return res.status(400).json({ type: "invalid_data", message: "Enter the 6-digit code" })
  }
  if (tooManyRequests(req, res, LIMITS.codOtpVerifyIp)) return

  const cartId = req.params.id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "shipping_address.phone",
      "shipping_address.postal_code",
      "payment_collection.id",
    ],
    filters: { id: cartId },
  })
  const cart = data[0] as
    | {
        id: string
        shipping_address?: { phone?: string | null; postal_code?: string | null } | null
        payment_collection?: { id: string } | null
      }
    | undefined
  if (!cart) return res.status(404).json({ type: "not_found", message: "Cart not found" })

  const phone = normalizeIndianMobile(cart.shipping_address?.phone ?? "")
  if (!phone) {
    return res
      .status(400)
      .json({ type: "invalid_data", message: "Add a delivery address with a mobile number first" })
  }

  const verdict = await verifyOtp(req.scope, {
    phone,
    purpose: "cod",
    code: body.data.code,
    context: cartId,
  })
  if (verdict !== "ok") {
    return res.status(401).json({ type: "invalid_code", code: verdict, message: MESSAGES[verdict] })
  }

  await createCodPaymentSession(req.scope, cartId, cart.shipping_address?.postal_code ?? null)

  const { data: refreshed } = await query.graph({
    entity: "cart",
    fields: STORE_CART_FIELDS,
    filters: { id: cartId },
  })
  const [shipping, checkout, cod] = await Promise.all([
    getSetting(req.scope, "shipping"),
    getSetting(req.scope, "checkout"),
    getSetting(req.scope, "cod"),
  ])
  res.setHeader("Cache-Control", "private, no-store")
  return res.json({
    cart: toStoreCart(refreshed[0] as unknown as RawCart, { shipping, checkout, cod }),
  })
}
