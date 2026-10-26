import type { MedusaContainer } from "@medusajs/framework/types"
import { INVOICES_MODULE } from "../modules/invoices"
import type InvoicesModuleService from "../modules/invoices/service"
import { nextInvoiceNumber } from "./settings"
import { findState } from "./india-states"
import type { Settings } from "./settings"

/** Issues the invoice number for an order exactly once; later calls return the same row. */
export async function ensureInvoice(
  container: Pick<MedusaContainer, "resolve">,
  orderId: string,
  deliveryState: string | null,
  gstConfig: Settings["gst"],
) {
  const service = container.resolve<InvoicesModuleService>(INVOICES_MODULE)
  const [existing] = await service.listInvoices({ order_id: orderId }, { take: 1 })
  if (existing) return existing
  const origin = findState(gstConfig.origin_state)
  const dest = findState(deliveryState)
  const scheme = origin && dest && origin.code === dest.code ? "intra" : "inter"
  const number = await nextInvoiceNumber(container)
  return service.createInvoices({
    order_id: orderId,
    number,
    issued_at: new Date(),
    gst_scheme: scheme,
  })
}
