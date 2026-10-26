import { MedusaService } from "@medusajs/framework/utils"
import WebhookEvent from "./models/webhook-event"

class WebhookEventsModuleService extends MedusaService({ WebhookEvent }) {}

export default WebhookEventsModuleService
