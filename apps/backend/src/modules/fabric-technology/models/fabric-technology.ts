import { model } from "@medusajs/framework/utils"

/**
 * A fabric technology such as "T9 Dry". Names and copy are owner-editable placeholders,
 * never hard-coded in the storefront.
 */
const FabricTechnology = model.define("fabric_technology", {
  id: model.id({ prefix: "ftech" }).primaryKey(),
  handle: model.text().unique(),
  name: model.text(),
  tagline: model.text().nullable(),
  description: model.text().nullable(),
  sort_order: model.number().default(0),
  is_active: model.boolean().default(true),
})

export default FabricTechnology
