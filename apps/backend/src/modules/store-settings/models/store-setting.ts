import { model } from "@medusajs/framework/utils"

/** One validated JSON document per key (see src/lib/settings.ts for the keys and their shape). */
const StoreSetting = model.define("store_setting", {
  id: model.id({ prefix: "sset" }).primaryKey(),
  key: model.text().unique(),
  value: model.json(),
})

export default StoreSetting
