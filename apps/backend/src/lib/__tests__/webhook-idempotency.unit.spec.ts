import { claimWebhookEvent } from "../webhook-idempotency"

describe("claimWebhookEvent", () => {
  it("claims once and reports every later attempt as already seen", async () => {
    const rows: { provider: string; key: string }[] = []
    const fakeKnex = {
      raw: async (_sql: string, bindings: unknown[]) => {
        const [, provider, key] = bindings as [string, string, string]
        if (rows.some((r) => r.provider === provider && r.key === key)) return { rows: [] }
        rows.push({ provider, key })
        return { rows: [{ id: "whev_x" }] }
      },
    }
    const container = { __pg_connection__: fakeKnex }
    expect(await claimWebhookEvent(container, "razorpay", "payment.captured:pay_1")).toBe(true)
    expect(await claimWebhookEvent(container, "razorpay", "payment.captured:pay_1")).toBe(false)
    expect(await claimWebhookEvent(container, "razorpay", "payment.captured:pay_2")).toBe(true)
    expect(await claimWebhookEvent(container, "cod", "payment.captured:pay_1")).toBe(true)
  })
})
