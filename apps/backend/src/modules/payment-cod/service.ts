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

/**
 * Cash on delivery: no money moves online. The session authorizes immediately (eligibility — the
 * limit, blocked pincodes, OTP — is enforced by the checkout route before this is ever reached);
 * "capture" happens when the parcel is marked delivered in admin (Phase 6), "refund" is a manual
 * bank transfer the admin records (Phase 5/6), not an API call.
 */
export default class CodProviderService implements IPaymentProvider {
  static identifier = "cod"

  getIdentifier() {
    return CodProviderService.identifier
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    return {
      id: String(input.data?.session_id ?? ""),
      data: { ...input.data, method: "cod" },
      status: PaymentSessionStatus.AUTHORIZED,
    }
  }
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: input.data }
  }
  async deletePayment(): Promise<DeletePaymentOutput> {
    return {}
  }
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    return { status: PaymentSessionStatus.AUTHORIZED, data: input.data }
  }
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    // A real capture is recorded by admin on delivery (Phase 6); this only accepts the state Medusa hands it.
    return { data: input.data }
  }
  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    return {
      data: {
        ...input.data,
        refund_note: "Recorded manually: COD refunds are a bank/UPI transfer, not an API call.",
      },
    }
  }
  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data }
  }
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data }
  }
  async getPaymentStatus(_input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    return { status: PaymentSessionStatus.AUTHORIZED }
  }
  async listPaymentMethods() {
    return []
  }
  async savePaymentMethod(): Promise<never> {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Not supported for cash on delivery")
  }
  async deletePaymentMethod() {
    return {}
  }
  async retrieveAccountHolder(): Promise<never> {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Not supported for cash on delivery")
  }
  async createAccountHolder(): Promise<never> {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Not supported for cash on delivery")
  }
  async updateAccountHolder(): Promise<never> {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Not supported for cash on delivery")
  }
  async deleteAccountHolder() {
    return {}
  }
  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"],
  ): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }
}
