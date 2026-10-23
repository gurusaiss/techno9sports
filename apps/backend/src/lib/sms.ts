import { MedusaError } from "@medusajs/framework/utils"
import { maskPhone } from "./phone"

export type SmsTemplate = "otp" | "order_placed" | "order_shipped" | "order_delivered"

export interface SmsMessage {
  to: string
  template: SmsTemplate
  vars: Record<string, string>
}

export interface SmsProvider {
  send(message: SmsMessage): Promise<void>
}

/** Development provider: logs only, never sends. Codes are logged only outside production. */
export class LogSmsProvider implements SmsProvider {
  constructor(private log: (m: string) => void = console.log) {}
  async send(message: SmsMessage) {
    const detail =
      process.env.NODE_ENV === "production"
        ? ""
        : ` vars=${JSON.stringify(message.vars)} (development only: SMS_PROVIDER=log)`
    this.log(`[sms:log] ${message.template} to ${maskPhone(message.to)}${detail}`)
  }
}

/** MSG91 OTP/transactional API. Needs DLT-approved template ids (owner action item). */
export class Msg91SmsProvider implements SmsProvider {
  constructor(
    private authKey: string,
    private templates: Partial<Record<SmsTemplate, string>>,
    private fetchImpl: typeof fetch = fetch,
  ) {}
  async send(message: SmsMessage) {
    const templateId = this.templates[message.template]
    if (!templateId) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `No MSG91 template configured for ${message.template}`,
      )
    }
    const res = await this.fetchImpl("https://control.msg91.com/api/v5/flow", {
      method: "POST",
      headers: {
        authkey: this.authKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        template_id: templateId,
        recipients: [{ mobiles: message.to.replace("+", ""), ...message.vars }],
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok)
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `MSG91 responded ${res.status}`)
  }
}

let override: SmsProvider | undefined
export const setSmsProvider = (p: SmsProvider | undefined) => {
  override = p
}

export function smsProvider(env: NodeJS.ProcessEnv = process.env): SmsProvider {
  if (override) return override
  if (env.SMS_PROVIDER === "msg91") {
    if (!env.MSG91_AUTH_KEY)
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "MSG91_AUTH_KEY is not set")
    return new Msg91SmsProvider(env.MSG91_AUTH_KEY, {
      otp: env.MSG91_TEMPLATE_OTP,
      order_placed: env.MSG91_TEMPLATE_ORDER_PLACED,
      order_shipped: env.MSG91_TEMPLATE_ORDER_SHIPPED,
      order_delivered: env.MSG91_TEMPLATE_ORDER_DELIVERED,
    })
  }
  return new LogSmsProvider()
}
