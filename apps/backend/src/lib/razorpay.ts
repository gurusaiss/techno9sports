import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { MedusaError } from "@medusajs/framework/utils"

/**
 * Razorpay, as small as this shop needs it: orders, payments, capture and refunds. Amounts are
 * integer paise on this boundary (Medusa works in rupees; the provider converts exactly once).
 * A mock client with the same interface stands in until real test keys exist, so the whole
 * checkout can be exercised locally without network access.
 */

export interface RzpOrder {
  id: string
  amount: number
  currency: string
  receipt: string | null
  status: "created" | "attempted" | "paid"
  notes: Record<string, string>
}

export type RzpPaymentStatus = "created" | "authorized" | "captured" | "refunded" | "failed"

export interface RzpPayment {
  id: string
  order_id: string
  amount: number
  currency: string
  status: RzpPaymentStatus
  method: string | null
  amount_refunded: number
  captured: boolean
  error_code?: string | null
  notes: Record<string, string>
}

export interface RzpRefund {
  id: string
  payment_id: string
  amount: number
  status: "pending" | "processed" | "failed"
  notes: Record<string, string>
}

export interface RazorpayClient {
  createOrder(input: {
    amount: number
    currency: string
    receipt: string
    notes?: Record<string, string>
  }): Promise<RzpOrder>
  fetchOrder(orderId: string): Promise<RzpOrder>
  fetchOrderPayments(orderId: string): Promise<RzpPayment[]>
  fetchPayment(paymentId: string): Promise<RzpPayment>
  capturePayment(paymentId: string, amount: number, currency: string): Promise<RzpPayment>
  refundPayment(
    paymentId: string,
    input: { amount: number; notes?: Record<string, string> },
  ): Promise<RzpRefund>
  fetchPaymentRefunds(paymentId: string): Promise<RzpRefund[]>
}

const hmacHex = (secret: string, body: string | Buffer) =>
  createHmac("sha256", secret).update(body).digest("hex")

function safeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"))
}

/** The signature Razorpay Checkout returns after a payment: HMAC of `order_id|payment_id`. */
export function verifyCheckoutSignature(
  secret: string,
  input: { orderId: string; paymentId: string; signature: string },
): boolean {
  return safeEqualHex(hmacHex(secret, `${input.orderId}|${input.paymentId}`), input.signature)
}
export function signCheckout(secret: string, orderId: string, paymentId: string): string {
  return hmacHex(secret, `${orderId}|${paymentId}`)
}

/** Webhook signature: HMAC of the exact raw request body with the webhook secret. */
export function verifyWebhookSignature(
  secret: string,
  rawBody: string | Buffer,
  signature: string,
): boolean {
  return safeEqualHex(hmacHex(secret, rawBody), signature)
}
export function signWebhook(secret: string, rawBody: string | Buffer): string {
  return hmacHex(secret, rawBody)
}

/** Rupees (Medusa) to integer paise, exactly. Rejects NaN, negatives and sub-paise noise beyond rounding. */
export function rupeesToPaise(rupees: number | string): number {
  const n = Number(rupees)
  if (!Number.isFinite(n) || n < 0)
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid amount")
  return Math.round(n * 100)
}
export const paiseToRupees = (paise: number): number => paise / 100

export class HttpRazorpayClient implements RazorpayClient {
  constructor(
    private keyId: string,
    private keySecret: string,
    private fetchImpl: typeof fetch = fetch,
    private base = "https://api.razorpay.com/v1",
  ) {}

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.fetchImpl(`${this.base}${path}`, {
      method,
      headers: {
        authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64")}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      // Never put the response body in the message: it can echo payment details.
      throw new MedusaError(
        res.status >= 500 ? MedusaError.Types.UNEXPECTED_STATE : MedusaError.Types.INVALID_DATA,
        `Razorpay ${method} ${path.split("?")[0]} failed (${res.status})`,
      )
    }
    return (await res.json()) as T
  }

  createOrder(input: Parameters<RazorpayClient["createOrder"]>[0]) {
    return this.call<RzpOrder>("POST", "/orders", { ...input, payment_capture: 1 })
  }
  fetchOrder(id: string) {
    return this.call<RzpOrder>("GET", `/orders/${id}`)
  }
  async fetchOrderPayments(id: string) {
    return (await this.call<{ items: RzpPayment[] }>("GET", `/orders/${id}/payments`)).items
  }
  fetchPayment(id: string) {
    return this.call<RzpPayment>("GET", `/payments/${id}`)
  }
  capturePayment(id: string, amount: number, currency: string) {
    return this.call<RzpPayment>("POST", `/payments/${id}/capture`, { amount, currency })
  }
  refundPayment(id: string, input: { amount: number; notes?: Record<string, string> }) {
    return this.call<RzpRefund>("POST", `/payments/${id}/refund`, input)
  }
  async fetchPaymentRefunds(id: string) {
    return (await this.call<{ items: RzpRefund[] }>("GET", `/payments/${id}/refunds`)).items
  }
}

const rid = (prefix: string) => `${prefix}_${randomBytes(7).toString("hex")}`

/**
 * In-memory stand-in with Razorpay's behaviour: orders, a payment that can succeed or fail,
 * auto-capture, refunds up to the captured amount. Shared per process, so the dev simulator and
 * the provider see the same state.
 */
export class MockRazorpayClient implements RazorpayClient {
  orders = new Map<string, RzpOrder>()
  payments = new Map<string, RzpPayment>()
  refunds = new Map<string, RzpRefund>()

  async createOrder(input: Parameters<RazorpayClient["createOrder"]>[0]) {
    const order: RzpOrder = {
      id: rid("order"),
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      status: "created",
      notes: input.notes ?? {},
    }
    this.orders.set(order.id, order)
    return order
  }
  async fetchOrder(id: string) {
    const o = this.orders.get(id)
    if (!o) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Razorpay order not found")
    return o
  }
  async fetchOrderPayments(id: string) {
    return [...this.payments.values()].filter((p) => p.order_id === id)
  }
  async fetchPayment(id: string) {
    const p = this.payments.get(id)
    if (!p) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Razorpay payment not found")
    return p
  }
  async capturePayment(id: string, amount: number) {
    const p = await this.fetchPayment(id)
    if (p.status === "captured") return p
    if (p.status !== "authorized" || amount !== p.amount)
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Cannot capture this payment")
    p.status = "captured"
    p.captured = true
    return p
  }
  async refundPayment(id: string, input: { amount: number; notes?: Record<string, string> }) {
    const p = await this.fetchPayment(id)
    if (!p.captured || input.amount <= 0 || p.amount_refunded + input.amount > p.amount) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Refund exceeds the captured amount")
    }
    p.amount_refunded += input.amount
    if (p.amount_refunded === p.amount) p.status = "refunded"
    const r: RzpRefund = {
      id: rid("rfnd"),
      payment_id: id,
      amount: input.amount,
      status: "processed",
      notes: input.notes ?? {},
    }
    this.refunds.set(r.id, r)
    return r
  }
  async fetchPaymentRefunds(id: string) {
    return [...this.refunds.values()].filter((r) => r.payment_id === id)
  }

  /** Test and dev helper: the customer pays (or fails to pay) an order. */
  simulatePayment(
    orderId: string,
    outcome: "success" | "failure" = "success",
    method = "upi",
  ): RzpPayment {
    const order = this.orders.get(orderId)
    if (!order) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Razorpay order not found")
    const okOutcome = outcome === "success"
    const p: RzpPayment = {
      id: rid("pay"),
      order_id: orderId,
      amount: order.amount,
      currency: order.currency,
      status: okOutcome ? "captured" : "failed",
      method,
      amount_refunded: 0,
      captured: okOutcome,
      error_code: okOutcome ? null : "BAD_REQUEST_ERROR",
      notes: order.notes,
    }
    this.payments.set(p.id, p)
    order.status = okOutcome ? "paid" : "attempted"
    return p
  }
}

let mock: MockRazorpayClient | undefined
export const mockRazorpay = (): MockRazorpayClient => (mock ??= new MockRazorpayClient())
/** Test-only: forces a fresh in-memory Razorpay on the next mockRazorpay() call. */
export const resetMockRazorpay = () => {
  mock = undefined
}

export interface RazorpayEnv {
  RAZORPAY_KEY_ID?: string
  RAZORPAY_KEY_SECRET?: string
  RAZORPAY_WEBHOOK_SECRET?: string
  NODE_ENV?: string
}

export function razorpayMode(env: RazorpayEnv = process.env): "mock" | "test" | "live" {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return "mock"
  return env.RAZORPAY_KEY_ID.startsWith("rzp_live_") ? "live" : "test"
}

/** The client for this environment. The mock is refused in production so a missing key can never go live silently. */
export function razorpayClient(env: RazorpayEnv = process.env): RazorpayClient {
  const mode = razorpayMode(env)
  if (mode === "mock") {
    if (env.NODE_ENV === "production")
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required in production",
      )
    return mockRazorpay()
  }
  return new HttpRazorpayClient(env.RAZORPAY_KEY_ID!, env.RAZORPAY_KEY_SECRET!)
}

export function razorpaySecrets(env: RazorpayEnv = process.env) {
  const mode = razorpayMode(env)
  return {
    mode,
    keyId: env.RAZORPAY_KEY_ID ?? "rzp_test_mock",
    keySecret: env.RAZORPAY_KEY_SECRET ?? "mock_secret_do_not_use",
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET ?? "mock_webhook_secret",
  }
}
