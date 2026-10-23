import { MedusaError } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { OTP_MODULE } from "../modules/otp"
import type OtpModuleService from "../modules/otp/service"
import {
  generateOtp,
  hashOtp,
  judgeOtp,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  type OtpVerdict,
} from "./otp"
import { smsProvider } from "./sms"

type Purpose = "login" | "cod"
type Resolver = Pick<MedusaContainer, "resolve">

function secret(): string {
  const s = process.env.OTP_SECRET ?? process.env.JWT_SECRET
  if (!s)
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "OTP_SECRET or JWT_SECRET is not set")
  return s
}

export async function requestOtp(
  container: Resolver,
  input: { phone: string; purpose: Purpose; context?: string },
  now = new Date(),
) {
  const otp = container.resolve<OtpModuleService>(OTP_MODULE)
  const open = await otp.listOtpChallenges(
    { phone: input.phone, purpose: input.purpose, consumed_at: null },
    { order: { created_at: "DESC" } },
  )
  const latest = open[0]
  if (latest && now.getTime() - new Date(latest.created_at).getTime() < OTP_RESEND_COOLDOWN_MS) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Please wait before asking for another code",
    )
  }
  const code = generateOtp()
  for (const o of open) await otp.updateOtpChallenges({ id: o.id, consumed_at: now })
  await otp.createOtpChallenges({
    phone: input.phone,
    purpose: input.purpose,
    code_hash: hashOtp(secret(), input.phone, input.purpose, code),
    expires_at: new Date(now.getTime() + OTP_TTL_MS),
    attempts: 0,
    context: input.context ?? null,
  })
  await smsProvider().send({ to: input.phone, template: "otp", vars: { otp: code } })
  return { expiresInSeconds: OTP_TTL_MS / 1000, resendInSeconds: OTP_RESEND_COOLDOWN_MS / 1000 }
}

export async function verifyOtp(
  container: Resolver,
  input: { phone: string; purpose: Purpose; code: string; context?: string },
  now = new Date(),
): Promise<OtpVerdict> {
  const otp = container.resolve<OtpModuleService>(OTP_MODULE)
  const [challenge] = await otp.listOtpChallenges(
    { phone: input.phone, purpose: input.purpose },
    { order: { created_at: "DESC" }, take: 1 },
  )
  if (!challenge) return "no_challenge"
  if (input.context !== undefined && challenge.context !== input.context) return "no_challenge"
  if (!challenge.consumed_at && challenge.attempts < OTP_MAX_ATTEMPTS) {
    await otp.updateOtpChallenges({ id: challenge.id, attempts: challenge.attempts + 1 })
  }
  const candidate = hashOtp(secret(), input.phone, input.purpose, input.code)
  const verdict = judgeOtp(challenge, candidate, now)
  if (verdict === "ok") await otp.updateOtpChallenges({ id: challenge.id, consumed_at: now })
  return verdict
}
