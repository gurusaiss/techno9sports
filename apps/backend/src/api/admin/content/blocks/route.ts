import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { BLOCK_TYPES } from "../../../../modules/content/models/content-block"
import { CONTENT_MODULE } from "../../../../modules/content"
import type ContentModuleService from "../../../../modules/content/service"
import { parseBlockData } from "../../../../lib/content-blocks"

export const CreateBlockBody = z.object({
  page: z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/)
    .default("home"),
  type: z.enum(BLOCK_TYPES),
  label: z.string().min(1).max(80),
  position: z.number().int().min(0).max(999).default(0),
  is_active: z.boolean().default(true),
  starts_at: z.coerce.date().nullable().optional(),
  ends_at: z.coerce.date().nullable().optional(),
  data: z.record(z.string(), z.unknown()),
})

/** GET /admin/content/blocks?page=home: every block, including inactive ones. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const page = typeof req.query.page === "string" ? req.query.page : undefined
  const blocks = await service.listContentBlocks(page ? { page } : {}, {
    order: { position: "ASC" },
  })
  res.json({ blocks })
}

/** POST /admin/content/blocks: create a block; its data is validated for its type. */
export async function POST(
  req: MedusaRequest<z.infer<typeof CreateBlockBody>>,
  res: MedusaResponse,
) {
  const body = req.validatedBody
  const parsed = parseBlockData(body.type, body.data)
  if (!parsed.success) throw new MedusaError(MedusaError.Types.INVALID_DATA, parsed.error)
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const block = await service.createContentBlocks({ ...body, data: parsed.data })
  res.status(201).json({ block })
}
