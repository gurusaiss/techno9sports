import { Module } from "@medusajs/framework/utils"
import FabricTechnologyModuleService from "./service"

export const FABRIC_TECHNOLOGY_MODULE = "fabric_technology"

export default Module(FABRIC_TECHNOLOGY_MODULE, { service: FabricTechnologyModuleService })
