import { createPromotionsWorkflow, updatePromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

/**
 * Every price in the store is GST-inclusive, so a fixed-amount code must be too: "₹150 off" has to
 * take ₹150 off the total, not ₹150 plus tax on it. Medusa defaults new fixed codes to
 * tax-exclusive, so this flips them right after they are created or edited.
 */
async function makeFixedInclusive(
  container: Pick<MedusaContainer, "resolve">,
  promotions: { id: string }[],
) {
  if (!promotions.length) return
  const service = container.resolve(Modules.PROMOTION)
  const rows = await service.listPromotions(
    { id: promotions.map((p) => p.id) },
    { relations: ["application_method"], take: promotions.length },
  )
  const toFix = rows.filter((p) => p.application_method?.type === "fixed" && !p.is_tax_inclusive)
  if (toFix.length)
    await service.updatePromotions(toFix.map((p) => ({ id: p.id, is_tax_inclusive: true })))
}

createPromotionsWorkflow.hooks.promotionsCreated(async ({ promotions }, { container }) => {
  await makeFixedInclusive(container, promotions)
  return new StepResponse(undefined)
})

updatePromotionsWorkflow.hooks.promotionsUpdated(async ({ promotions }, { container }) => {
  await makeFixedInclusive(container, promotions)
  return new StepResponse(undefined)
})
