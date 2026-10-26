import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { checkCodEligibility, COD_REJECTION_MESSAGE } from "../../../../../../lib/cod-eligibility"
import { getSetting } from "../../../../../../lib/settings"

/**
 * GET /store/catalog/cart/:id/cod-check — a friendly, earlier check so the storefront can hide or
 * explain why COD isn't offered, before the customer picks it. The real enforcement is inside the
 * COD payment provider's `initiatePayment` (cannot be bypassed by skipping this call).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "total", "shipping_address.postal_code", "items.product_id"],
    filters: { id: req.params.id },
  })
  const cart = data[0] as
    | {
        total: number
        shipping_address?: { postal_code?: string } | null
        items?: { product_id: string }[]
      }
    | undefined
  if (!cart) return res.status(404).json({ eligible: false, message: "Cart not found" })

  const verdict = await checkCodEligibility(req.scope, {
    total: Number(cart.total),
    postalCode: cart.shipping_address?.postal_code ?? null,
    productIds: (cart.items ?? []).map((i) => i.product_id),
  })
  if (verdict.eligible) {
    const cod = await getSetting(req.scope, "cod")
    return res.json({ eligible: true, otp_required: cod.otp_required, fee: cod.fee })
  }
  return res.json({
    eligible: false,
    reason: verdict.reason,
    message: COD_REJECTION_MESSAGE[verdict.reason],
  })
}
