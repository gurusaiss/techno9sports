import { type AuthenticatedMedusaRequest, type MedusaResponse } from "@medusajs/framework/http"
import { WISHLIST_MODULE } from "../../../../modules/wishlist"
import type WishlistModuleService from "../../../../modules/wishlist/service"

/** PUT /store/wishlist/:product_id: save (idempotent). */
export async function PUT(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE)
  const customer_id = req.auth_context.actor_id
  const product_id = req.params.product_id!
  const [existing] = await service.listWishlistItems({ customer_id, product_id }, { take: 1 })
  if (!existing) await service.createWishlistItems({ customer_id, product_id })
  return res.json({ saved: true })
}

/** DELETE /store/wishlist/:product_id: remove (idempotent). */
export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE)
  const customer_id = req.auth_context.actor_id
  const items = await service.listWishlistItems({ customer_id, product_id: req.params.product_id! })
  if (items.length) await service.deleteWishlistItems(items.map((i) => i.id))
  return res.json({ saved: false })
}
