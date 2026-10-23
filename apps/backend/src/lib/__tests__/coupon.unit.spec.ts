import {
  classifyPromotionError,
  explainRejection,
  minimumCartValue,
  rejectionMessage,
} from "../coupon"

const items = [{ unit_price: 500, quantity: 1 }]
const live = { status: "active" }

describe("explainRejection", () => {
  it("unknown code", () => expect(explainRejection(undefined, items).reason).toBe("not_found"))
  it("draft code", () =>
    expect(explainRejection({ status: "draft" }, items).reason).toBe("inactive"))
  it("not started", () => {
    const p = { ...live, campaign: { starts_at: "2099-01-01T00:00:00Z" } }
    expect(explainRejection(p, items).reason).toBe("not_started")
  })
  it("expired", () => {
    const p = { ...live, campaign: { ends_at: "2020-01-01T00:00:00Z" } }
    expect(explainRejection(p, items).reason).toBe("expired")
  })
  it("minimum cart value, with the shortfall", () => {
    const p = {
      ...live,
      rules: [{ attribute: "cart_total", operator: "gte", values: [{ value: "699" }] }],
    }
    const r = explainRejection(p, items)
    expect(r).toEqual({ reason: "min_cart", shortfall: 199 })
    expect(rejectionMessage(r)).toBe("Add items worth ₹199 more to use this code.")
  })
  it("usage cap reached", () => {
    const p = { ...live, campaign: { budget: { type: "usage", limit: 10, used: 10 } } }
    expect(explainRejection(p, items).reason).toBe("limit_reached")
  })
  it("falls back to not applicable", () =>
    expect(explainRejection(live, items).reason).toBe("not_applicable"))
  it("reads the minimum", () => {
    expect(
      minimumCartValue({
        ...live,
        rules: [{ attribute: "cart_total", operator: "gte", values: [{ value: "499" }] }],
      }),
    ).toBe(499)
    expect(minimumCartValue(live)).toBeNull()
  })
})

describe("classifyPromotionError", () => {
  it("knows Medusa's messages", () => {
    expect(classifyPromotionError("The promotion code NOPE is invalid")?.reason).toBe("not_found")
    expect(
      classifyPromotionError(
        'Attribute value for "customer_email" is required by promotion campaing budget',
      )?.reason,
    ).toBe("email_required")
    expect(classifyPromotionError("This code is only for your first order.")?.reason).toBe(
      "first_order",
    )
  })
  it("leaves unknown errors alone", () =>
    expect(classifyPromotionError("database exploded")).toBeNull())
})
