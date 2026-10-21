import { Module } from "@medusajs/framework/utils"
import SizeChartModuleService from "./service"

export const SIZE_CHART_MODULE = "size_chart"

export default Module(SIZE_CHART_MODULE, { service: SizeChartModuleService })
