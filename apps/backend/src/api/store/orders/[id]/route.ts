import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { STORE_ORDER_FIELDS, toStoreOrder, type RawOrder } from "../../../../lib/store-order"

/**
 * GET /store/orders/:id — the order confirmation summary. Looked up by id alone, the same
 * unauthenticated-by-id convention as the invoice route: an order id is a Medusa ULID, never
 * guessable or enumerable, so it works as the capability token a just-placed guest order needs.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: STORE_ORDER_FIELDS,
    filters: { id: req.params.id },
  })
  const order = data[0] as unknown as RawOrder | undefined
  if (!order) return res.status(404).json({ type: "not_found", message: "Order not found" })
  res.setHeader("Cache-Control", "private, no-store")
  return res.json({ order: toStoreOrder(order) })
}
