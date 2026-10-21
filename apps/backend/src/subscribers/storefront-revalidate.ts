import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { storefrontRevalidator } from "../lib/storefront-revalidate"

const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Catalogue changes mark the storefront's cached pages stale. Product events carry the product
 * id, so those also name the product's own page; everything else refreshes the broad tags.
 */
export default async function storefrontRevalidate({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const revalidator = storefrontRevalidator((m) => logger.warn(m))
  const tags = ["products", "catalog"]

  if (event.name.startsWith("product-category") || event.name.startsWith("product-collection")) {
    tags.push("categories")
  }

  if (event.name.startsWith("product.") && event.data?.id) {
    try {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({
        entity: "product",
        fields: ["handle"],
        filters: { id: event.data.id },
        withDeleted: true,
      })
      const handle = data[0]?.handle
      if (handle && HANDLE.test(handle)) tags.push(`product:${handle}`)
    } catch {
      // Fall back to the broad tags.
    }
  }
  revalidator.request(tags)
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product-variant.created",
    "product-variant.updated",
    "product-variant.deleted",
    "product-category.created",
    "product-category.updated",
    "product-category.deleted",
    "product-collection.created",
    "product-collection.updated",
    "product-collection.deleted",
    "inventory-level.updated",
  ],
}
