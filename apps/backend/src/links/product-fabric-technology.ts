import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import FabricTechnologyModule from "../modules/fabric-technology"

// A product can carry several technologies; a technology applies to many products.
export default defineLink(
  { linkable: ProductModule.linkable.product, isList: true },
  { linkable: FabricTechnologyModule.linkable.fabricTechnology, isList: true },
)
