import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { checkCodEligibility, COD_REJECTION_MESSAGE } from "../../../../../../lib/cod-eligibility"
import { createCodPaymentSession } from "../../../../../../lib/cod-session"
import { getSetting } from "../../../../../../lib/settings"
import { STORE_CART_FIELDS, toStoreCart, type RawCart } from "../../../../../../lib/store-cart"

/**
 * POST /store/catalog/cart/:id/cod-confirm — creates a COD payment session without an OTP step.
 * Only usable while `cod.otp_required` is off; the OTP-gated route is the only path otherwise, so
 * this can't be used to skip the OTP check on a store that has it switched on.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cartId = req.params.id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "total", "shipping_address.postal_code", "items.product_id"],
    filters: { id: cartId },
  })
  const cart = data[0] as
    | {
        total: number
        shipping_address?: { postal_code?: string | null } | null
        items?: { product_id: string }[]
      }
    | undefined
  if (!cart) return res.status(404).json({ type: "not_found", message: "Cart not found" })

  const cod = await getSetting(req.scope, "cod")
  if (cod.otp_required) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Verify your mobile number to use cash on delivery",
    )
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

  await createCodPaymentSession(req.scope, cartId, cart.shipping_address?.postal_code ?? null)

  const { data: refreshed } = await query.graph({
    entity: "cart",
    fields: STORE_CART_FIELDS,
    filters: { id: cartId },
  })
  const [shipping, checkout] = await Promise.all([
    getSetting(req.scope, "shipping"),
    getSetting(req.scope, "checkout"),
  ])
  res.setHeader("Cache-Control", "private, no-store")
  return res.json({
    cart: toStoreCart(refreshed[0] as unknown as RawCart, { shipping, checkout, cod }),
  })
}
