import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { checkRateLimit, type Limit } from "./rate-limit"

export function clientIp(req: MedusaRequest): string {
  return req.ip ?? "unknown"
}

export function tooManyRequests(
  req: MedusaRequest,
  res: MedusaResponse,
  limit: Limit,
  subject: string = clientIp(req),
): boolean {
  const verdict = checkRateLimit(limit, subject)
  if (verdict.allowed) return false
  res.setHeader("Retry-After", String(verdict.retryAfterSeconds))
  res.status(429).json({
    type: "too_many_requests",
    message: "Too many attempts. Please wait a few minutes and try again.",
  })
  return true
}
