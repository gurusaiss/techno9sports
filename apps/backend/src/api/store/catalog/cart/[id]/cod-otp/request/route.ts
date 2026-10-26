import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  checkCodEligibility,
  COD_REJECTION_MESSAGE,
} from "../../../../../../../lib/cod-eligibility"
import { normalizeIndianMobile } from "../../../../../../../lib/phone"
import { tooManyRequests } from "../../../../../../../lib/http"
import { LIMITS } from "../../../../../../../lib/rate-limit"
import { requestOtp } from "../../../../../../../lib/otp-service"

/**
 * POST /store/catalog/cart/:id/cod-otp/request — sends a code to the phone already on the cart's
 * shipping address (never an arbitrary number from the request body) before COD can be chosen.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "total",
      "shipping_address.phone",
      "shipping_address.postal_code",
      "items.product_id",
    ],
    filters: { id: req.params.id },
  })
  const cart = data[0] as
    | {
        total: number
        shipping_address?: { phone?: string | null; postal_code?: string | null } | null
        items?: { product_id: string }[]
      }
    | undefined
  if (!cart) return res.status(404).json({ type: "not_found", message: "Cart not found" })

  const phone = normalizeIndianMobile(cart.shipping_address?.phone ?? "")
  if (!phone) {
    return res
      .status(400)
      .json({ type: "invalid_data", message: "Add a delivery address with a mobile number first" })
  }

  const verdict = await checkCodEligibility(req.scope, {
    total: Number(cart.total),
    postalCode: cart.shipping_address?.postal_code ?? null,
    productIds: (cart.items ?? []).map((i) => i.product_id),
  })
  if (!verdict.eligible) {
    return res
      .status(422)
      .json({
        type: "cod_not_eligible",
        reason: verdict.reason,
        message: COD_REJECTION_MESSAGE[verdict.reason],
      })
  }

  if (tooManyRequests(req, res, LIMITS.codOtpRequestIp)) return
  if (tooManyRequests(req, res, LIMITS.codOtpRequestPhone, phone)) return

  try {
    const sent = await requestOtp(req.scope, { phone, purpose: "cod", context: req.params.id })
    return res.json({
      ok: true,
      expires_in: sent.expiresInSeconds,
      resend_in: sent.resendInSeconds,
    })
  } catch (e) {
    if (e instanceof MedusaError && e.type === MedusaError.Types.NOT_ALLOWED) {
      return res.status(429).json({ type: "too_many_requests", message: e.message })
    }
    throw e
  }
}
