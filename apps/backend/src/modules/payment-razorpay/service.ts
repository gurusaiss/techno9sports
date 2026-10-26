import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  IPaymentProvider,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { MedusaError, PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import {
  paiseToRupees,
  razorpayClient,
  razorpaySecrets,
  rupeesToPaise,
  verifyWebhookSignature,
  type RzpPayment,
} from "../../lib/razorpay"
import { claimWebhookEvent } from "../../lib/webhook-idempotency"

type OrderData = { order_id: string; session_id: string; key_id: string }

function paymentStatus(p: RzpPayment | undefined): PaymentSessionStatus {
  if (!p) return PaymentSessionStatus.PENDING
  if (p.status === "captured" || p.status === "refunded") return PaymentSessionStatus.CAPTURED
  if (p.status === "authorized") return PaymentSessionStatus.AUTHORIZED
  if (p.status === "failed") return PaymentSessionStatus.ERROR
  return PaymentSessionStatus.PENDING
}

/**
 * Razorpay as a Medusa payment provider: UPI, cards, netbanking and wallets via Razorpay
 * Checkout. The server creates the order and is the only thing that ever decides the amount; the
 * client only ever gets back an order id and key to open Checkout with. See docs/decisions/0007.
 */
export default class RazorpayProviderService implements IPaymentProvider {
  static identifier = "razorpay"
  private container_: { resolve: (key: string) => unknown; __pg_connection__: unknown }

  constructor(container: { resolve: (key: string) => unknown; __pg_connection__: unknown }) {
    this.container_ = container
  }

  getIdentifier() {
    return RazorpayProviderService.identifier
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const sessionId = String(input.data?.session_id ?? "")
    if (!sessionId)
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Missing payment session id")
    const order = await razorpayClient().createOrder({
      amount: rupeesToPaise(input.amount as number),
      currency: input.currency_code.toUpperCase(),
      receipt: sessionId,
      notes: { session_id: sessionId },
    })
    const data: OrderData = {
      order_id: order.id,
      session_id: sessionId,
      key_id: razorpaySecrets().keyId,
    }
    return { id: order.id, data, status: PaymentSessionStatus.PENDING }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    // Razorpay orders are immutable once created (amount can't change); a changed cart total
    // before payment gets a fresh order, same as a first-time initiate.
    return this.initiatePayment(input)
  }

  async deletePayment(_input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return {}
  }

  private async latestPayment(
    data: Record<string, unknown> | undefined,
  ): Promise<RzpPayment | undefined> {
    const orderId = (data as OrderData | undefined)?.order_id
    if (!orderId) return undefined
    const payments = await razorpayClient().fetchOrderPayments(orderId)
    // Auto-capture is on, so a captured payment (if any) is what matters; otherwise the latest attempt.
    return payments.find((p) => p.status === "captured") ?? payments.at(-1)
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const payment = await this.latestPayment(input.data)
    return { status: paymentStatus(payment), data: { ...input.data, payment_id: payment?.id } }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    // Orders are created with payment_capture=1 (auto-capture), so by the time this is called the
    // payment is already captured on Razorpay's side; this just confirms it and returns the data.
    const payment = await this.latestPayment(input.data)
    if (!payment || payment.status !== "captured") {
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        "Payment is not captured on Razorpay",
      )
    }
    return { data: { ...input.data, payment_id: payment.id } }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const paymentId = (input.data as { payment_id?: string } | undefined)?.payment_id
    if (!paymentId)
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No Razorpay payment to refund")
    const refund = await razorpayClient().refundPayment(paymentId, {
      amount: rupeesToPaise(input.amount as number),
    })
    return { data: { ...input.data, last_refund_id: refund.id } }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const payment = await this.latestPayment(input.data)
    return { data: { ...input.data, payment: payment ?? null } }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    // A Razorpay order can't be cancelled server-side; an un-paid order simply expires unused.
    return { data: input.data }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const payment = await this.latestPayment(input.data)
    return { status: paymentStatus(payment) }
  }

  async listPaymentMethods() {
    return []
  }
  async savePaymentMethod(): Promise<never> {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Saved payment methods are not supported")
  }
  async deletePaymentMethod() {
    return {}
  }
  async retrieveAccountHolder(): Promise<never> {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Account holders are not supported")
  }
  async createAccountHolder(): Promise<never> {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Account holders are not supported")
  }
  async updateAccountHolder(): Promise<never> {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Account holders are not supported")
  }
  async deleteAccountHolder() {
    return {}
  }

  /**
   * Called by Medusa's built-in `/hooks/payment/razorpay` route. Signature is verified here
   * (against the raw body Medusa hands us), so a forged event is rejected before any action is
   * taken. `session_id` travels on the order's notes, copied onto the payment by Razorpay.
   */
  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"],
  ): Promise<WebhookActionResult> {
    const signature = (payload.headers["x-razorpay-signature"] as string | undefined) ?? ""
    if (!verifyWebhookSignature(razorpaySecrets().webhookSecret, payload.rawData, signature)) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Invalid Razorpay webhook signature")
    }
    const body = payload.data as {
      event?: string
      payload?: { payment?: { entity?: RzpPayment & { notes?: Record<string, string> } } }
    }
    const entity = body.payload?.payment?.entity
    const sessionId = entity?.notes?.session_id
    if (!sessionId || !entity) return { action: PaymentActions.NOT_SUPPORTED }

    // Idempotency: a retried or duplicated delivery of the same (event, payment) is a no-op.
    const fresh = await claimWebhookEvent(
      this.container_ as unknown as Parameters<typeof claimWebhookEvent>[0],
      "razorpay",
      `${body.event}:${entity.id}`,
      { event: body.event },
    )
    if (!fresh) return { action: PaymentActions.NOT_SUPPORTED }

    const amount = paiseToRupees(entity.amount)
    switch (body.event) {
      case "payment.captured":
      case "order.paid":
        return { action: PaymentActions.SUCCESSFUL, data: { session_id: sessionId, amount } }
      case "payment.authorized":
        return { action: PaymentActions.AUTHORIZED, data: { session_id: sessionId, amount } }
      case "payment.failed":
        return { action: PaymentActions.FAILED, data: { session_id: sessionId, amount } }
      default:
        // refund.processed / refund.failed etc. are logged by the subscriber, not acted on here:
        // a refund is always admin-initiated, this just confirms what already happened.
        return { action: PaymentActions.NOT_SUPPORTED }
    }
  }
}
