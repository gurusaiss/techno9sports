import { MedusaService } from "@medusajs/framework/utils"
import ContentBlock from "./models/content-block"

class ContentModuleService extends MedusaService({ ContentBlock }) {}

export default ContentModuleService
