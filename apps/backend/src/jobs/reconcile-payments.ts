import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { razorpayClient } from "../lib/razorpay"

const STALE_AFTER_MS = 10 * 60 * 1000

/**
 * Every 15 minutes: find carts whose payment session has sat pending for a while and ask the
 * provider directly whether Razorpay actually captured it. Covers a missed or delayed webhook —
 * the webhook is still the fast path, this is the backstop the build prompt requires.
 */
export default async function reconcilePayments(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const client = razorpayClient()

  const cutoff = new Date(Date.now() - STALE_AFTER_MS)
  const { data: sessions } = await query.graph({
    entity: "payment_session",
    fields: ["id", "status", "provider_id", "created_at", "payment_collection_id", "data"],
    filters: { status: "pending", provider_id: "pp_razorpay_razorpay" },
  })
  const stale = sessions.filter((s) => new Date(s.created_at) < cutoff)
  if (!stale.length) return

  let completed = 0
  let stillPending = 0
  for (const session of stale) {
    try {
      const orderId = (session.data as { order_id?: string } | null)?.order_id
      if (!orderId) {
        stillPending++
        continue
      }
      const payments = await client.fetchOrderPayments(orderId)
      const captured = payments.some((p) => p.status === "captured")
      if (!captured) {
        stillPending++
        continue
      }
      const { data: links } = await query.graph({
        entity: "cart_payment_collection",
        fields: ["cart_id"],
        filters: { payment_collection_id: session.payment_collection_id },
      })
      const cartId = links[0]?.cart_id
      if (!cartId) continue
      const { data: carts } = await query.graph({
        entity: "cart",
        fields: ["id", "completed_at"],
        filters: { id: cartId },
      })
      if (carts[0]?.completed_at) continue
      await completeCartWorkflow(container).run({ input: { id: cartId } })
      completed++
    } catch (e) {
      logger.warn(
        `Reconciliation: could not resolve payment session ${session.id}: ${(e as Error).message}`,
      )
    }
  }
  if (completed || stillPending) {
    logger.info(
      `Payment reconciliation: ${completed} completed, ${stillPending} still pending, ${stale.length} checked`,
    )
  }
}

export const config = {
  name: "reconcile-razorpay-payments",
  schedule: "*/15 * * * *",
}
