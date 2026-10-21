import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { FABRIC_TECHNOLOGY_MODULE } from "../../../../modules/fabric-technology"
import type FabricTechnologyModuleService from "../../../../modules/fabric-technology/service"

/** GET /store/catalog/technologies: the active fabric technologies, for menus and filters. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: FabricTechnologyModuleService = req.scope.resolve(FABRIC_TECHNOLOGY_MODULE)
  const list = await service.listFabricTechnologies(
    { is_active: true },
    { order: { sort_order: "ASC" } },
  )
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=600")
  res.json({
    technologies: list.map((t) => ({
      handle: t.handle,
      name: t.name,
      tagline: t.tagline,
      description: t.description,
    })),
  })
}
