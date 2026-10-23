/**
 * Rules that Medusa's promotion rules cannot express by themselves. Enforced server-side when a
 * code is applied, and again at order completion, never in the browser.
 */
export interface PromotionMeta {
  first_order_only?: boolean
}

export function readPromotionMeta(metadata: unknown): PromotionMeta {
  const m = (metadata ?? {}) as Record<string, unknown>
  return { first_order_only: m.first_order_only === true || m.first_order_only === "true" }
}

/** Sum of line prices before any discount, in rupees (the figure "minimum cart value" is judged on). */
export function cartMerchandiseTotal(
  items: { unit_price: number | string; quantity: number | string }[] | undefined,
): number {
  return (items ?? []).reduce((sum, i) => sum + Number(i.unit_price) * Number(i.quantity), 0)
}

export const FIRST_ORDER_MESSAGE = "This code is only for your first order."
