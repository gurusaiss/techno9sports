import { type AuthenticatedMedusaRequest, type MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { WISHLIST_MODULE } from "../../../modules/wishlist"
import type WishlistModuleService from "../../../modules/wishlist/service"

const MAX_ITEMS = 200

/** GET /store/wishlist: the signed-in customer's saved product ids, newest first. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE)
  const items = await service.listWishlistItems(
    { customer_id: req.auth_context.actor_id },
    { order: { created_at: "DESC" }, take: MAX_ITEMS },
  )
  return res.json({ product_ids: items.map((i) => i.product_id) })
}

export const MergeBody = z.object({ product_ids: z.array(z.string().min(1)).max(MAX_ITEMS) })

/** POST /store/wishlist: adds many ids at once (merging a guest list on sign-in). Idempotent. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const body = MergeBody.safeParse(req.body)
  if (!body.success)
    return res.status(400).json({ type: "invalid_data", message: "Invalid wishlist" })
  const service = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE)
  const customer_id = req.auth_context.actor_id
  const have = await service.listWishlistItems({ customer_id }, { take: MAX_ITEMS })
  const owned = new Set(have.map((h) => h.product_id))
  const fresh = [...new Set(body.data.product_ids)]
    .filter((id) => !owned.has(id))
    .slice(0, MAX_ITEMS - owned.size)
  if (fresh.length)
    await service.createWishlistItems(fresh.map((product_id) => ({ customer_id, product_id })))
  const all = await service.listWishlistItems(
    { customer_id },
    { order: { created_at: "DESC" }, take: MAX_ITEMS },
  )
  return res.json({ product_ids: all.map((i) => i.product_id) })
}
