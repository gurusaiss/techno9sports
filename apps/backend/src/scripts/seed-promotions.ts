import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import type { CreatePromotionDTO } from "@medusajs/framework/types"

/**
 * Sample coupons and one automatic offer so the cart can be judged. Safe to run again (skips codes
 * that exist). Placeholders — the owner edits real offers in the admin.
 *   WELCOME10  10% off, first order only, once per email, cart at least ₹699
 *   FLAT150    ₹150 off a cart of ₹1,499 or more
 *   FREESHIP   free delivery on a cart of ₹499 or more
 *   TEE2GET1   buy 2 tees, the third is 50% off
 *   FRAMES10   automatic 10% off all sports frames
 */
export default async function seedPromotions({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const promotions = container.resolve(Modules.PROMOTION)

  const existing = new Set(
    (await promotions.listPromotions({}, { select: ["code"] })).map((p) => p.code),
  )
  const { data: types } = await query.graph({ entity: "product_type", fields: ["id", "value"] })
  const { data: cats } = await query.graph({ entity: "product_category", fields: ["id", "handle"] })
  const frames = types.find((t) => t.value === "Sports frames")
  const tees = cats.filter((c) => c.handle.endsWith("-t-shirts"))

  const minCart = (v: number) => ({
    attribute: "cart_total",
    operator: "gte" as const,
    values: [String(v)],
  })
  const rows: CreatePromotionDTO[] = []

  if (!existing.has("WELCOME10")) {
    rows.push({
      code: "WELCOME10",
      type: "standard",
      status: "active",
      is_automatic: false,
      metadata: { first_order_only: true, description: "10% off your first order" },
      campaign: {
        name: "Welcome offer",
        campaign_identifier: "welcome-offer",
        budget: { type: "use_by_attribute", attribute: "customer_email", limit: 1 },
      },
      application_method: {
        type: "percentage",
        target_type: "items",
        allocation: "across",
        value: 10,
        currency_code: "inr",
      },
      rules: [minCart(699)],
    })
  }
  if (!existing.has("FLAT150")) {
    rows.push({
      code: "FLAT150",
      type: "standard",
      status: "active",
      is_automatic: false,
      is_tax_inclusive: true,
      metadata: { description: "₹150 off on ₹1,499 and above" },
      application_method: {
        type: "fixed",
        target_type: "order",
        allocation: "across",
        value: 150,
        currency_code: "inr",
      },
      rules: [minCart(1499)],
    })
  }
  if (!existing.has("FREESHIP")) {
    rows.push({
      code: "FREESHIP",
      type: "standard",
      status: "active",
      is_automatic: false,
      metadata: { description: "Free delivery on ₹499 and above" },
      application_method: {
        type: "percentage",
        target_type: "shipping_methods",
        allocation: "each",
        value: 100,
        currency_code: "inr",
        max_quantity: 1,
      },
      rules: [minCart(499)],
    })
  }
  if (!existing.has("TEE2GET1") && tees.length) {
    rows.push({
      code: "TEE2GET1",
      type: "buyget",
      status: "active",
      is_automatic: false,
      metadata: { description: "Buy 2 tees, get the third at 50% off" },
      application_method: {
        type: "percentage",
        target_type: "items",
        allocation: "each",
        value: 50,
        currency_code: "inr",
        max_quantity: 1,
        apply_to_quantity: 1,
        buy_rules_min_quantity: 2,
        target_rules: [
          {
            attribute: "items.product.categories.id",
            operator: "in",
            values: tees.map((t) => t.id),
          },
        ],
        buy_rules: [
          {
            attribute: "items.product.categories.id",
            operator: "in",
            values: tees.map((t) => t.id),
          },
        ],
      },
    })
  }
  if (!existing.has("FRAMES10") && frames) {
    rows.push({
      code: "FRAMES10",
      type: "standard",
      status: "active",
      is_automatic: true,
      metadata: { description: "10% off all frames" },
      application_method: {
        type: "percentage",
        target_type: "items",
        allocation: "across",
        value: 10,
        currency_code: "inr",
        target_rules: [{ attribute: "items.product.type_id", operator: "in", values: [frames.id] }],
      },
    })
  }

  if (!rows.length) return logger.info("Promotions already seeded")
  await createPromotionsWorkflow(container).run({ input: { promotionsData: rows } })
  logger.info(`Seeded ${rows.length} promotions`)
}
