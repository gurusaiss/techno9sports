import { model } from "@medusajs/framework/utils"

/**
 * One row per order invoice, so the number is issued exactly once and never regenerated: the PDF
 * itself is rendered on demand from the order each time it's downloaded (no binary stored here).
 */
const Invoice = model.define("invoice", {
  id: model.id({ prefix: "inv" }).primaryKey(),
  order_id: model.text().unique(),
  number: model.text().unique(),
  issued_at: model.dateTime(),
  gst_scheme: model.enum(["intra", "inter"]),
})

export default Invoice
