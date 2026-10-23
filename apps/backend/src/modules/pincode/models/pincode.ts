import { model } from "@medusajs/framework/utils"

/**
 * Delivery area data. `serviceable` and `cod_allowed` are the owner's own switches here;
 * Phase 5 layers live courier serviceability on top.
 */
const Pincode = model.define("pincode", {
  id: model.id({ prefix: "pin" }).primaryKey(),
  pincode: model.text().unique(),
  city: model.text(),
  district: model.text().nullable(),
  state: model.text(),
  state_code: model.text(),
  serviceable: model.boolean().default(true),
  cod_allowed: model.boolean().default(true),
  days_min: model.number().default(3),
  days_max: model.number().default(7),
})

export default Pincode
