import { readFileSync } from "node:fs"
import type { ExecArgs } from "@medusajs/framework/types"
import { importProductSheet, importStockSheet } from "../lib/catalog-import"

/**
 * Import a catalogue CSV from the command line. Dry run unless you pass "apply".
 *   pnpm --filter @t9/backend exec medusa exec ./src/scripts/import-catalog-csv.ts products ./products.csv
 *   pnpm --filter @t9/backend exec medusa exec ./src/scripts/import-catalog-csv.ts stock ./stock.csv apply
 */
export default async function importCsv({ container, args }: ExecArgs) {
  const [kind, file, mode] = args ?? []
  if ((kind !== "products" && kind !== "stock") || !file) {
    console.error("Usage: import-catalog-csv.ts <products|stock> <file.csv> [apply]")
    process.exitCode = 1
    return
  }
  const csv = readFileSync(file, "utf8")
  const dryRun = mode !== "apply"
  const report =
    kind === "products"
      ? await importProductSheet(container, csv, { dryRun })
      : await importStockSheet(container, csv, { dryRun })
  console.log(JSON.stringify(report, null, 2))
  if (report.errors.length) {
    console.error(`\n${report.errors.length} error(s): nothing was imported.`)
    process.exitCode = 1
  } else if (dryRun) {
    console.log("\nDry run only. Add the word apply to import for real.")
  }
}
