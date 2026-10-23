import { updateCartPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  PromotionActions,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  cartMerchandiseTotal,
  FIRST_ORDER_MESSAGE,
  readPromotionMeta,
} from "../../lib/promotion-rules"

/** True if this email or customer already has a non-cancelled order. */
export async function hasPreviousOrder(
  container: Pick<MedusaContainer, "resolve">,
  who: { email?: string | null; customer_id?: string | null },
): Promise<boolean> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const checks: Record<string, string>[] = []
  if (who.customer_id) checks.push({ customer_id: who.customer_id })
  if (who.email) checks.push({ email: who.email.toLowerCase() })
  for (const filters of checks) {
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "status"],
      filters: { ...filters, status: { $ne: "canceled" } },
      pagination: { take: 1 },
    })
    if (data.length) return true
  }
  return false
}

export async function assertFirstOrderEligible(
  container: Pick<MedusaContainer, "resolve">,
  codes: string[],
  who: { email?: string | null; customer_id?: string | null },
) {
  if (!codes.length || (!who.email && !who.customer_id)) return
  const promotions = container.resolve(Modules.PROMOTION)
  const found = await promotions.listPromotions(
    { code: codes },
    { select: ["id", "code", "metadata"] },
  )
  if (!found.some((p) => readPromotionMeta(p.metadata).first_order_only)) return
  if (await hasPreviousOrder(container, who)) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, FIRST_ORDER_MESSAGE)
  }
}

// Minimum cart value: promotions carry a `cart_total` rule, and this supplies the figure.
updateCartPromotionsWorkflow.hooks.setPromotionContext(async ({ cart }) => {
  return new StepResponse({ cart_total: cartMerchandiseTotal(cart.items as never) })
})

// Applying a code is where a customer can be told no. Existing codes are not re-judged on every
// cart edit; order completion re-checks them (Phase 4).
updateCartPromotionsWorkflow.hooks.validate(async ({ input, cart }, { container }) => {
  const action = input.action ?? PromotionActions.ADD
  if (action !== PromotionActions.ADD) return
  await assertFirstOrderEligible(container, (input.promo_codes ?? []) as string[], {
    email: cart.email,
    customer_id: cart.customer_id,
  })
})
