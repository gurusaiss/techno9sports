import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { MAX_BYTES } from "../../../../lib/catalog-csv"
import { importProductSheet, importStockSheet } from "../../../../lib/catalog-import"

export const ImportBody = z.object({
  kind: z.enum(["products", "stock"]),
  csv: z.string().min(1).max(MAX_BYTES),
  /** Defaults to true: validate and report without changing anything. */
  dry_run: z.boolean().default(true),
})

/**
 * POST /admin/catalog/import  { kind, csv, dry_run }
 * Nothing is written when the sheet has any error, so a bad file never half-imports.
 */
export async function POST(req: MedusaRequest<z.infer<typeof ImportBody>>, res: MedusaResponse) {
  const { kind, csv, dry_run } = req.validatedBody
  const report =
    kind === "products"
      ? await importProductSheet(req.scope, csv, { dryRun: dry_run })
      : await importStockSheet(req.scope, csv, { dryRun: dry_run })
  res.status(report.errors.length ? 422 : 200).json({ report })
}
