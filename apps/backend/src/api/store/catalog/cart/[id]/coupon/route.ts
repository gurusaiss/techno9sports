import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules, PromotionActions } from "@medusajs/framework/utils"
import { updateCartPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { z } from "zod"
import {
  classifyPromotionError,
  explainRejection,
  rejectionMessage,
  type PromotionFacts,
} from "../../../../../../lib/coupon"

const Body = z.object({ code: z.string().trim().min(1).max(40) })

async function loadCart(req: MedusaRequest) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "promotions.code", "items.unit_price", "items.quantity"],
    filters: { id: req.params.id },
  })
  return data[0] as
    | {
        id: string
        promotions?: { code: string }[]
        items?: { unit_price: number; quantity: number }[]
      }
    | undefined
}

/** POST /store/catalog/cart/:id/coupon { code } — applies a code and, if rejected, says why. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = Body.safeParse(req.body)
  if (!body.success) return res.status(400).json({ applied: false, message: "Enter a code" })
  const code = body.data.code.toUpperCase()

  const cart = await loadCart(req)
  if (!cart) return res.status(404).json({ applied: false, message: "Cart not found" })
  if (cart.promotions?.some((p) => p.code === code))
    return res.json({ applied: true, message: "That code is already applied." })

  try {
    await updateCartPromotionsWorkflow(req.scope).run({
      input: { cart_id: cart.id, promo_codes: [code], action: PromotionActions.ADD },
    })
  } catch (e) {
    const known = classifyPromotionError((e as Error | undefined)?.message ?? "")
    if (!known) throw e
    return res.json({ applied: false, reason: known.reason, message: known.message })
  }

  const after = await loadCart(req)
  if (after?.promotions?.some((p) => p.code === code)) return res.json({ applied: true })

  const service = req.scope.resolve(Modules.PROMOTION)
  const [promotion] = await service.listPromotions(
    { code: [code] },
    { relations: ["campaign", "campaign.budget", "rules", "rules.values"], take: 1 },
  )
  const verdict = explainRejection(
    promotion as unknown as PromotionFacts | undefined,
    after?.items ?? [],
  )
  return res.json({ applied: false, reason: verdict.reason, message: rejectionMessage(verdict) })
}

/** DELETE /store/catalog/cart/:id/coupon { code } */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const body = Body.safeParse(req.body)
  if (!body.success) return res.status(400).json({ message: "Enter a code" })
  await updateCartPromotionsWorkflow(req.scope).run({
    input: {
      cart_id: req.params.id!,
      promo_codes: [body.data.code.toUpperCase()],
      action: PromotionActions.REMOVE,
    },
  })
  return res.json({ removed: true })
}
