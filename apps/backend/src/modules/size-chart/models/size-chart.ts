import { model } from "@medusajs/framework/utils"

/**
 * A size chart shared by many products (for example "Men's tops").
 * `columns` are the measurement headings, `sizes` the row order, and `rows` maps each size to
 * `{ <column>: value }`.
 */
const SizeChart = model.define("size_chart", {
  id: model.id({ prefix: "szch" }).primaryKey(),
  handle: model.text().unique(),
  name: model.text(),
  unit: model.enum(["in", "cm", "mm"]).default("in"),
  columns: model.array(),
  sizes: model.array(),
  rows: model.json(),
  how_to_measure: model.text().nullable(),
  notes: model.text().nullable(),
})

export default SizeChart
