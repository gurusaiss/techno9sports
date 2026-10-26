import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ensureInvoice } from "../../../../../lib/invoice-number"
import { getSetting } from "../../../../../lib/settings"
import { renderInvoicePdf } from "../../../../../lib/invoice-pdf"

/** GET /store/orders/:id/invoice — renders the GST invoice PDF for an order, on demand. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "shipping_total",
      "discount_total",
      "total",
      "shipping_address.*",
      "items.product_title",
      "items.variant_title",
      "items.quantity",
      "items.unit_price",
      "items.product_type",
      "items.product.hs_code",
    ],
    filters: { id: req.params.id },
  })
  const order = data[0] as unknown as
    | {
        id: string
        display_id: number
        email: string | null
        shipping_total: number
        discount_total: number
        total: number
        shipping_address?: {
          first_name: string
          last_name: string
          address_1: string
          address_2: string | null
          city: string
          province: string
          postal_code: string
        } | null
        items?: {
          product_title: string
          variant_title: string | null
          quantity: number
          unit_price: number
          product_type: string | null
          product?: { hs_code?: string | null } | null
        }[]
      }
    | undefined
  if (!order || !order.shipping_address)
    return res.status(404).json({ type: "not_found", message: "Order not found" })

  const [gst, invoiceSettings] = await Promise.all([
    getSetting(req.scope, "gst"),
    getSetting(req.scope, "invoice"),
  ])
  const invoice = await ensureInvoice(req.scope, order.id, order.shipping_address.province, gst)
  const a = order.shipping_address

  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `inline; filename="${invoice.number}.pdf"`)
  const doc = renderInvoicePdf({
    number: invoice.number,
    issuedAt: invoice.issued_at,
    order: { displayId: Number(order.display_id), email: order.email },
    billTo: {
      name: `${a.first_name} ${a.last_name}`,
      address1: a.address_1,
      address2: a.address_2,
      city: a.city,
      province: a.province,
      postalCode: a.postal_code,
    },
    lines: (order.items ?? []).map((i) => ({
      title: i.product_title,
      variant: i.variant_title,
      hsCode: i.product?.hs_code ?? null,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      productType: i.product_type,
    })),
    shipping: Number(order.shipping_total),
    discount: Number(order.discount_total),
    total: Number(order.total),
    business: invoiceSettings,
    gst,
  })
  doc.pipe(res)
}
