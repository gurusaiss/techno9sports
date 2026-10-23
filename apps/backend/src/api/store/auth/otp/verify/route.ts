import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, generateJwtToken } from "@medusajs/framework/utils"
import { z } from "zod"
import { normalizeIndianMobile } from "../../../../../lib/phone"
import { LIMITS } from "../../../../../lib/rate-limit"
import { tooManyRequests } from "../../../../../lib/http"
import { verifyOtp } from "../../../../../lib/otp-service"

export const OtpVerifyBody = z.object({
  phone: z.string().min(10).max(16),
  code: z.string().regex(/^\d{6}$/),
})

const MESSAGES = {
  expired: "That code has expired. Ask for a new one.",
  too_many_attempts: "Too many wrong codes. Ask for a new one.",
  already_used: "That code was already used. Ask for a new one.",
  wrong_code: "That code is not right. Check it and try again.",
  no_challenge: "Ask for a code first.",
} as const

/** POST /store/auth/otp/verify: checks the code, finds or creates the customer and returns a bearer token. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = OtpVerifyBody.safeParse(req.body)
  const phone = body.success ? normalizeIndianMobile(body.data.phone) : null
  if (!body.success || !phone) {
    return res
      .status(400)
      .json({ type: "invalid_data", message: "Enter your mobile number and the 6-digit code" })
  }
  if (tooManyRequests(req, res, LIMITS.otpVerifyIp)) return

  const verdict = await verifyOtp(req.scope, { phone, purpose: "login", code: body.data.code })
  if (verdict !== "ok") {
    return res.status(401).json({ type: "invalid_code", code: verdict, message: MESSAGES[verdict] })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: found } = await query.graph({
    entity: "customer",
    fields: ["id", "phone", "email", "first_name"],
    filters: { phone, has_account: true },
    pagination: { take: 1 },
  })
  let customer = found[0] as
    | { id: string; phone: string | null; email: string | null; first_name: string | null }
    | undefined
  const isNew = !customer
  if (!customer) {
    const { Modules } = await import("@medusajs/framework/utils")
    const customers = req.scope.resolve(Modules.CUSTOMER)
    const created = await customers.createCustomers({ phone, has_account: true })
    customer = {
      id: created.id,
      phone: created.phone,
      email: created.email,
      first_name: created.first_name,
    }
  }

  const { http } = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
  const token = generateJwtToken(
    {
      actor_id: customer.id,
      actor_type: "customer",
      auth_identity_id: `phone_${customer.id}`,
      app_metadata: { customer_id: customer.id },
    },
    {
      secret: http.jwtSecret ?? "",
      expiresIn: process.env.CUSTOMER_TOKEN_TTL ?? "7d",
      jwtOptions: http.jwtOptions,
    },
  )
  return res.json({
    token,
    is_new: isNew,
    customer: {
      id: customer.id,
      phone: customer.phone,
      email: customer.email,
      first_name: customer.first_name,
    },
  })
}
