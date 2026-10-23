import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Rebuilds every product document in the search index by announcing each product as updated.
 * Use after a price-list change (emits no event), a bulk edit, or if the index looks stale.
 */
export default async function reindexSearch({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const bus = container.resolve(Modules.EVENT_BUS)
  const { data } = await query.graph({ entity: "product", fields: ["id"] })
  await bus.emit(data.map((p) => ({ name: "product.updated", data: { id: p.id } })))
  await new Promise((r) => setTimeout(r, 15_000))
  logger.info(`Re-announced ${data.length} products to the search index`)
}
