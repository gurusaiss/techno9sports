import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { exportProductSheet, exportStockSheet } from "../../../../lib/catalog-import"

/** GET /admin/catalog/export?kind=products|stock  ->  a CSV you can edit and import again. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const kind = req.query.kind
  if (kind !== "products" && kind !== "stock") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "kind must be products or stock")
  }
  const csv =
    kind === "products" ? await exportProductSheet(req.scope) : await exportStockSheet(req.scope)
  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader("Content-Disposition", `attachment; filename="${kind}.csv"`)
  res.send(csv)
}
