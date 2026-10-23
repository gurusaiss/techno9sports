import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting } from "../../../../../lib/settings"
import { STORE_CART_FIELDS, toStoreCart, type RawCart } from "../../../../../lib/store-cart"

/** GET /store/catalog/cart/:id — the cart as the storefront shows it: server-computed totals, MRP, stock caps, promotions, free-shipping progress. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: STORE_CART_FIELDS,
    filters: { id: req.params.id },
  })
  const cart = data[0] as unknown as RawCart | undefined
  if (!cart) return res.status(404).json({ type: "not_found", message: "Cart not found" })
  const [shipping, checkout, cod] = await Promise.all([
    getSetting(req.scope, "shipping"),
    getSetting(req.scope, "checkout"),
    getSetting(req.scope, "cod"),
  ])
  res.setHeader("Cache-Control", "private, no-store")
  return res.json({ cart: toStoreCart(cart, { shipping, checkout, cod }) })
}
