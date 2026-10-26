import { model } from "@medusajs/framework/utils"

/**
 * One row per externally-delivered event we've acted on, keyed so a retried/duplicate delivery is
 * a safe no-op. `key` is provider-specific (for Razorpay: `<event>:<entity id>`).
 */
const WebhookEvent = model
  .define("webhook_event", {
    id: model.id({ prefix: "whev" }).primaryKey(),
    provider: model.text(),
    key: model.text(),
    payload: model.json().nullable(),
  })
  .indexes([{ on: ["provider", "key"], unique: true }])

export default WebhookEvent
