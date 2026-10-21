import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { CONTENT_MODULE } from "../../../../../modules/content"
import type ContentModuleService from "../../../../../modules/content/service"
import { parseBlockData } from "../../../../../lib/content-blocks"
import { CreateBlockBody } from "../route"

export const UpdateBlockBody = CreateBlockBody.partial()

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const block = await service.retrieveContentBlock(req.params.id!)
  res.json({ block })
}

export async function POST(
  req: MedusaRequest<z.infer<typeof UpdateBlockBody>>,
  res: MedusaResponse,
) {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  const current = await service.retrieveContentBlock(req.params.id!)
  const body = req.validatedBody
  const type = body.type ?? current.type
  if (body.data !== undefined || body.type !== undefined) {
    const parsed = parseBlockData(type, body.data ?? current.data)
    if (!parsed.success) throw new MedusaError(MedusaError.Types.INVALID_DATA, parsed.error)
    body.data = parsed.data as Record<string, unknown>
  }
  const block = await service.updateContentBlocks({ id: current.id, ...body })
  res.json({ block })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
  await service.deleteContentBlocks(req.params.id!)
  res.json({ id: req.params.id, deleted: true })
}
