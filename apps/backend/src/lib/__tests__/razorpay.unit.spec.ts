import {
  HttpRazorpayClient,
  MockRazorpayClient,
  paiseToRupees,
  razorpayClient,
  razorpayMode,
  rupeesToPaise,
  signCheckout,
  signWebhook,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "../razorpay"

describe("signatures", () => {
  const secret = "topsecret"
  it("accepts the right checkout signature and nothing else", () => {
    const sig = signCheckout(secret, "order_1", "pay_1")
    expect(
      verifyCheckoutSignature(secret, { orderId: "order_1", paymentId: "pay_1", signature: sig }),
    ).toBe(true)
    expect(
      verifyCheckoutSignature(secret, { orderId: "order_1", paymentId: "pay_2", signature: sig }),
    ).toBe(false)
    expect(
      verifyCheckoutSignature(secret, { orderId: "order_2", paymentId: "pay_1", signature: sig }),
    ).toBe(false)
    expect(
      verifyCheckoutSignature("other", { orderId: "order_1", paymentId: "pay_1", signature: sig }),
    ).toBe(false)
    expect(
      verifyCheckoutSignature(secret, { orderId: "order_1", paymentId: "pay_1", signature: "zz" }),
    ).toBe(false)
    expect(
      verifyCheckoutSignature(secret, { orderId: "order_1", paymentId: "pay_1", signature: "" }),
    ).toBe(false)
  })
  it("verifies webhooks against the exact raw body", () => {
    const body = '{"event":"payment.captured","x":1}'
    const sig = signWebhook(secret, body)
    expect(verifyWebhookSignature(secret, body, sig)).toBe(true)
    expect(verifyWebhookSignature(secret, body + " ", sig)).toBe(false)
    expect(verifyWebhookSignature(secret, Buffer.from(body), sig)).toBe(true)
    expect(verifyWebhookSignature(secret, body, sig.slice(2))).toBe(false)
  })
})

describe("money", () => {
  it("converts rupees to exact paise", () => {
    expect(rupeesToPaise(857.2)).toBe(85720)
    expect(rupeesToPaise("649")).toBe(64900)
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30)
    expect(paiseToRupees(85720)).toBe(857.2)
  })
  it("rejects nonsense", () => {
    expect(() => rupeesToPaise(-1)).toThrow()
    expect(() => rupeesToPaise(NaN)).toThrow()
    expect(() => rupeesToPaise("abc")).toThrow()
  })
})

describe("mode", () => {
  it("is mock without keys, test or live by key prefix", () => {
    expect(razorpayMode({})).toBe("mock")
    expect(razorpayMode({ RAZORPAY_KEY_ID: "rzp_test_1", RAZORPAY_KEY_SECRET: "s" })).toBe("test")
    expect(razorpayMode({ RAZORPAY_KEY_ID: "rzp_live_1", RAZORPAY_KEY_SECRET: "s" })).toBe("live")
  })
  it("refuses the mock in production", () => {
    expect(() => razorpayClient({ NODE_ENV: "production" })).toThrow(/required in production/)
    expect(razorpayClient({ NODE_ENV: "development" })).toBeInstanceOf(MockRazorpayClient)
  })
})

describe("MockRazorpayClient", () => {
  it("runs order, payment, capture and refunds like the real thing", async () => {
    const c = new MockRazorpayClient()
    const o = await c.createOrder({
      amount: 10000,
      currency: "INR",
      receipt: "r1",
      notes: { cart_id: "cart_1" },
    })
    expect((await c.fetchOrderPayments(o.id)).length).toBe(0)
    const p = c.simulatePayment(o.id)
    expect(p.status).toBe("captured")
    expect((await c.fetchOrder(o.id)).status).toBe("paid")
    await c.refundPayment(p.id, { amount: 4000 })
    await expect(c.refundPayment(p.id, { amount: 6001 })).rejects.toThrow(/exceeds/)
    await c.refundPayment(p.id, { amount: 6000 })
    expect((await c.fetchPayment(p.id)).status).toBe("refunded")
    expect((await c.fetchPaymentRefunds(p.id)).length).toBe(2)
  })
  it("records a failed attempt without capturing", async () => {
    const c = new MockRazorpayClient()
    const o = await c.createOrder({ amount: 500, currency: "INR", receipt: "r2" })
    const p = c.simulatePayment(o.id, "failure")
    expect(p.status).toBe("failed")
    await expect(c.refundPayment(p.id, { amount: 100 })).rejects.toThrow()
    expect((await c.fetchOrder(o.id)).status).toBe("attempted")
  })
})

describe("HttpRazorpayClient", () => {
  it("uses basic auth and never leaks the response body into errors", async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return new Response(
        JSON.stringify({ error: { description: "card 4111 1111 1111 1111 declined" } }),
        { status: 400 },
      )
    }) as unknown as typeof fetch
    const c = new HttpRazorpayClient("rzp_test_k", "sec", fake, "https://example.test/v1")
    await expect(c.fetchOrder("order_1")).rejects.toThrow(
      "Razorpay GET /orders/order_1 failed (400)",
    )
    await expect(c.fetchOrder("order_1")).rejects.not.toThrow(/4111/)
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe(
      `Basic ${Buffer.from("rzp_test_k:sec").toString("base64")}`,
    )
  })
  it("asks for auto-capture when creating an order", async () => {
    let body = ""
    const fake = (async (_u: string, init: RequestInit) => {
      body = String(init.body)
      return new Response(JSON.stringify({ id: "order_1" }), { status: 200 })
    }) as unknown as typeof fetch
    await new HttpRazorpayClient("k", "s", fake).createOrder({
      amount: 100,
      currency: "INR",
      receipt: "r",
    })
    expect(JSON.parse(body)).toMatchObject({ amount: 100, payment_capture: 1 })
  })
})
