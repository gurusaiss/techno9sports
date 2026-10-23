import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PINCODE_MODULE } from "../../../../modules/pincode"
import type PincodeModuleService from "../../../../modules/pincode/service"
import { deliveryWindow, isPincode } from "../../../../lib/pincode"
import { getSetting } from "../../../../lib/settings"
import { LIMITS } from "../../../../lib/rate-limit"
import { tooManyRequests } from "../../../../lib/http"

/** GET /store/pincodes/:pincode — city/state/serviceability/COD/estimated delivery window. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const pincode = String(req.params.pincode ?? "")
  if (!isPincode(pincode))
    return res.status(400).json({ type: "invalid_data", message: "Enter a 6-digit pincode" })
  if (tooManyRequests(req, res, LIMITS.pincodeIp)) return

  const service = req.scope.resolve<PincodeModuleService>(PINCODE_MODULE)
  const [row] = await service.listPincodes({ pincode }, { take: 1 })
  const shipping = await getSetting(req.scope, "shipping")
  const cod = await getSetting(req.scope, "cod")
  const blocked = cod.blocked_pincodes.includes(pincode)
  const days = row
    ? { min: row.days_min, max: row.days_max }
    : { min: shipping.days_min, max: shipping.days_max }
  const window = deliveryWindow(new Date(), days.min, days.max)

  res.setHeader("Cache-Control", "public, max-age=300")
  return res.json({
    pincode,
    found: !!row,
    city: row?.city ?? null,
    district: row?.district ?? null,
    state: row?.state ?? null,
    state_code: row?.state_code ?? null,
    serviceable: row ? row.serviceable : true,
    cod_allowed: cod.enabled && !blocked && (row ? row.cod_allowed : true),
    delivery: {
      days_min: days.min,
      days_max: days.max,
      earliest: window.earliest,
      latest: window.latest,
    },
  })
}
