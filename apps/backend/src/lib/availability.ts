export interface InventoryVariantRow {
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  inventory_items?:
    | {
        inventory?: {
          location_levels?:
            { stocked_quantity?: number | null; reserved_quantity?: number | null }[] | null
        } | null
      }[]
    | null
}

/** Units that can be sold now: stocked minus reserved, across all locations (one warehouse today). */
export function onHandQuantity(variant: InventoryVariantRow): number {
  let total = 0
  for (const item of variant.inventory_items ?? []) {
    for (const level of item?.inventory?.location_levels ?? []) {
      total += Number(level?.stocked_quantity ?? 0) - Number(level?.reserved_quantity ?? 0)
    }
  }
  return Math.max(0, total)
}

export function isVariantAvailable(variant: InventoryVariantRow): boolean {
  if (variant.manage_inventory === false || variant.allow_backorder === true) return true
  return onHandQuantity(variant) > 0
}

export type AvailabilityStatus = "in_stock" | "low_stock" | "out_of_stock"

/** Below this many units the storefront shows "Only N left". Config in Phase 6. */
export const LOW_STOCK_THRESHOLD = 5

/** Customer-facing availability. Exact counts are only revealed when stock is low. */
export function availabilityOf(variant: InventoryVariantRow): {
  status: AvailabilityStatus
  low_quantity?: number
} {
  if (!isVariantAvailable(variant)) return { status: "out_of_stock" }
  if (variant.manage_inventory === false || variant.allow_backorder === true) {
    return { status: "in_stock" }
  }
  const n = onHandQuantity(variant)
  return n <= LOW_STOCK_THRESHOLD
    ? { status: "low_stock", low_quantity: n }
    : { status: "in_stock" }
}
