import { Module } from "@medusajs/framework/utils"
import WebhookEventsModuleService from "./service"

export const WEBHOOK_EVENTS_MODULE = "webhook_events"

export default Module(WEBHOOK_EVENTS_MODULE, { service: WebhookEventsModuleService })
