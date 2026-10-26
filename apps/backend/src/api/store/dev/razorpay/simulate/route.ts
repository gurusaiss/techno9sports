import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { mockRazorpay, razorpayMode } from "../../../../../lib/razorpay"

const Body = z.object({
  order_id: z.string().min(1),
  outcome: z.enum(["success", "failure"]).default("success"),
})

/**
 * POST /store/dev/razorpay/simulate — stands in for the Razorpay Checkout popup in local
 * development, staging demos, and automated tests: "pays" (or fails) a mock order so the rest of
 * the flow (webhook, cart completion, stock, invoice) can be exercised without real test keys.
 * Disabled whenever real Razorpay keys are configured (razorpayMode() is then "test" or "live").
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (razorpayMode() !== "mock") {
    return res
      .status(404)
      .json({ type: "not_found", message: "Not available: real Razorpay keys are configured" })
  }
  const body = Body.safeParse(req.body)
  if (!body.success)
    return res.status(400).json({ type: "invalid_data", message: "order_id is required" })
  const payment = mockRazorpay().simulatePayment(body.data.order_id, body.data.outcome)
  return res.json({ payment })
}
