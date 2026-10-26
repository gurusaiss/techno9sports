import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ensureInvoice } from "../lib/invoice-number"
import { getSetting } from "../lib/settings"
import { smsProvider } from "../lib/sms"
import { normalizeIndianMobile } from "../lib/phone"

/**
 * On order placement: issue the invoice number (so it exists before anyone asks to download it)
 * and send the order-confirmation SMS. Email confirmation follows the same log-provider pattern
 * once Resend is connected (owner action item); logged here in the meantime.
 */
export default async function orderPlacedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "total",
      "metadata",
      "shipping_address.province",
      "shipping_address.phone",
      "payment_collections.payment_sessions.provider_id",
    ],
    filters: { id: event.data.id },
  })
  const order = data[0]
  if (!order) return

  const gst = await getSetting(container, "gst")
  await ensureInvoice(container, order.id, order.shipping_address?.province ?? null, gst)

  // COD's handling fee is a courier-collected surcharge, not merchandise value, so it never appears
  // on the GST invoice; it's recorded on the order's metadata instead, as the one durable place the
  // confirmation page, admin and the Phase 5 Shiprocket "amount to collect" field all read it from.
  const providerId = order.payment_collections?.[0]?.payment_sessions?.[0]?.provider_id
  let amountDue = Number(order.total)
  if (providerId === "pp_cod_cod") {
    const cod = await getSetting(container, "cod")
    amountDue = Number(order.total) + cod.fee
    const orderModule = container.resolve(Modules.ORDER)
    await orderModule.updateOrders(order.id, {
      metadata: { ...(order.metadata ?? {}), cod_fee: cod.fee },
    })
  }

  const phone = normalizeIndianMobile(order.shipping_address?.phone)
  if (phone) {
    await smsProvider()
      .send({
        to: phone,
        template: "order_placed",
        vars: { order: String(order.display_id), amount: String(amountDue) },
      })
      .catch(() => logger.warn(`Could not send order-placed SMS for order ${order.id}`))
  }
  logger.info(`Order ${order.display_id} placed, invoice issued, confirmation sent`)
}

export const config: SubscriberConfig = { event: "order.placed" }
