import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import SizeChartModule from "../modules/size-chart"

// Many products share one size chart; each product has at most one.
export default defineLink(
  { linkable: ProductModule.linkable.product, isList: true },
  SizeChartModule.linkable.sizeChart,
)
