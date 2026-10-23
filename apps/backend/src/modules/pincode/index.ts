import { Module } from "@medusajs/framework/utils"
import PincodeModuleService from "./service"

export const PINCODE_MODULE = "pincode"

export default Module(PINCODE_MODULE, { service: PincodeModuleService })
