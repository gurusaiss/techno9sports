import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { normalizeIndianMobile } from "../../../../../lib/phone"
import { LIMITS } from "../../../../../lib/rate-limit"
import { tooManyRequests } from "../../../../../lib/http"
import { requestOtp } from "../../../../../lib/otp-service"

export const OtpRequestBody = z.object({
  phone: z.string().min(10).max(16),
  website: z.string().max(0).optional(),
})

/** POST /store/auth/otp/request: sends a sign-in code. Same answer whether or not the number has an account. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = OtpRequestBody.safeParse(req.body)
  if (!body.success) {
    if (body.error.issues.some((i) => i.path[0] === "website")) return res.json({ ok: true })
    return res.status(400).json({ type: "invalid_data", message: "Enter a valid mobile number" })
  }
  const phone = normalizeIndianMobile(body.data.phone)
  if (!phone)
    return res
      .status(400)
      .json({ type: "invalid_data", message: "Enter a valid 10-digit mobile number" })
  if (tooManyRequests(req, res, LIMITS.otpRequestIp)) return
  if (tooManyRequests(req, res, LIMITS.otpRequestPhone, phone)) return

  try {
    const sent = await requestOtp(req.scope, { phone, purpose: "login" })
    return res.json({
      ok: true,
      expires_in: sent.expiresInSeconds,
      resend_in: sent.resendInSeconds,
    })
  } catch (e) {
    if (e instanceof MedusaError && e.type === MedusaError.Types.NOT_ALLOWED) {
      return res.status(429).json({ type: "too_many_requests", message: e.message })
    }
    throw e
  }
}
