import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { CONTENT_MODULE } from "../../../../../modules/content"
import type ContentModuleService from "../../../../../modules/content/service"
import { isLive, parseBlockData } from "../../../../../lib/content-blocks"

const PAGE = /^[a-z0-9-]{1,40}$/

/**
 * GET /store/content/pages/:page
 * The live blocks for a page, in order. Invalid or out-of-schedule blocks are left out.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const page = String(req.params.page ?? "")
  if (!PAGE.test(page)) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Page not found")

  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const rows = await service.listContentBlocks(
    { page, is_active: true },
    { order: { position: "ASC" } },
  )

  const now = new Date()
  const blocks = rows
    .filter((b) => isLive(b, now))
    .flatMap((b) => {
      const parsed = parseBlockData(b.type, b.data)
      if (!parsed.success) {
        logger.warn(`Content block ${b.id} (${b.label}) skipped: ${parsed.error}`)
        return []
      }
      return [{ id: b.id, type: b.type, data: parsed.data }]
    })

  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30, stale-while-revalidate=300")
  res.json({ page, blocks })
}
