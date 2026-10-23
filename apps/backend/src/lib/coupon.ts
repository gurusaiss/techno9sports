import { cartMerchandiseTotal, FIRST_ORDER_MESSAGE } from "./promotion-rules"

export type CouponRejection =
  | "email_required"
  | "not_found"
  | "inactive"
  | "not_started"
  | "expired"
  | "min_cart"
  | "limit_reached"
  | "not_applicable"
  | "first_order"

export interface PromotionFacts {
  status: string
  campaign?: {
    starts_at?: string | Date | null
    ends_at?: string | Date | null
    budget?: { type?: string; limit?: number | null; used?: number | null } | null
  } | null
  rules?: { attribute: string; operator: string; values?: { value: string }[] | null }[] | null
}

export function minimumCartValue(p: PromotionFacts): number | null {
  const rule = p.rules?.find(
    (r) => r.attribute === "cart_total" && (r.operator === "gte" || r.operator === "gt"),
  )
  const v = Number(rule?.values?.[0]?.value)
  return Number.isFinite(v) ? v : null
}

export function explainRejection(
  promotion: PromotionFacts | undefined,
  cartItems: { unit_price: number | string; quantity: number | string }[],
  now = new Date(),
): { reason: CouponRejection; shortfall?: number } {
  if (!promotion) return { reason: "not_found" }
  if (promotion.status !== "active") return { reason: "inactive" }
  const c = promotion.campaign
  if (c?.starts_at && new Date(c.starts_at) > now) return { reason: "not_started" }
  if (c?.ends_at && new Date(c.ends_at) <= now) return { reason: "expired" }
  const min = minimumCartValue(promotion)
  if (min !== null) {
    const have = cartMerchandiseTotal(cartItems)
    if (have < min) return { reason: "min_cart", shortfall: Math.ceil(min - have) }
  }
  const b = c?.budget
  if (b?.limit != null && b.type === "usage" && Number(b.used ?? 0) >= b.limit)
    return { reason: "limit_reached" }
  return { reason: "not_applicable" }
}

export function rejectionMessage(r: { reason: CouponRejection; shortfall?: number }): string {
  switch (r.reason) {
    case "email_required":
      return "Add your email at checkout and this code will be applied."
    case "not_found":
      return "That code isn't valid. Check the spelling and try again."
    case "inactive":
      return "This code isn't active right now."
    case "not_started":
      return "This offer hasn't started yet."
    case "expired":
      return "This code has expired."
    case "min_cart":
      return `Add items worth ₹${(r.shortfall ?? 0).toLocaleString("en-IN")} more to use this code.`
    case "limit_reached":
      return "This offer has been fully claimed."
    case "first_order":
      return "This code is only for your first order."
    default:
      return "This code doesn't apply to the items in your bag."
  }
}

/** Maps the messages Medusa's promotion workflow throws to a reason and customer wording. */
export function classifyPromotionError(
  message: string,
): { reason: CouponRejection; message: string } | null {
  if (message === FIRST_ORDER_MESSAGE)
    return { reason: "first_order", message: FIRST_ORDER_MESSAGE }
  if (/required by promotion campa/i.test(message)) {
    return {
      reason: "email_required",
      message: "Add your email at checkout and this code will be applied.",
    }
  }
  if (/promotion code .* is invalid/i.test(message))
    return { reason: "not_found", message: rejectionMessage({ reason: "not_found" }) }
  return null
}
