import { readFileSync } from "node:fs"
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { PINCODE_MODULE } from "../modules/pincode"
import type PincodeModuleService from "../modules/pincode/service"
import { parsePincodeCsv } from "../lib/pincode"

/**
 * Loads or updates pincodes from a CSV. Without an argument it loads the bundled sample sheet.
 *   pnpm --filter @t9/backend exec medusa exec ./src/scripts/import-pincodes.ts [path/to/sheet.csv]
 * For all-India coverage import the India Post directory (data.gov.in) reshaped to these columns.
 */
export default async function importPincodes({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const path = args?.[0] ?? `${__dirname}/../seed/pincodes-sample.csv`
  const { rows, errors } = parsePincodeCsv(readFileSync(path, "utf8"))
  if (errors.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Pincode sheet has errors:\n${errors.slice(0, 20).join("\n")}`,
    )
  }
  const service = container.resolve<PincodeModuleService>(PINCODE_MODULE)
  const existing = await service.listPincodes(
    { pincode: rows.map((r) => r.pincode) },
    { take: rows.length },
  )
  const byCode = new Map(existing.map((e) => [e.pincode, e.id]))
  const toUpdate = rows
    .filter((r) => byCode.has(r.pincode))
    .map((r) => ({ id: byCode.get(r.pincode)!, ...r }))
  const toCreate = rows.filter((r) => !byCode.has(r.pincode))
  if (toCreate.length) await service.createPincodes(toCreate)
  if (toUpdate.length) await service.updatePincodes(toUpdate)
  logger.info(`Pincodes: ${toCreate.length} added, ${toUpdate.length} updated`)
}
