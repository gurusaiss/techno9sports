import PDFDocument from "pdfkit"
import type { Settings } from "./settings"
import { gstRateFor, splitGst } from "./gst"

export interface InvoiceLine {
  title: string
  variant: string | null
  hsCode: string | null
  quantity: number
  unitPrice: number
  productType: string | null
}
export interface InvoiceData {
  number: string
  issuedAt: Date
  order: { displayId: number; email: string | null }
  billTo: {
    name: string
    address1: string
    address2?: string | null
    city: string
    province: string
    postalCode: string
  }
  lines: InvoiceLine[]
  shipping: number
  discount: number
  total: number
  business: Settings["invoice"]
  gst: Settings["gst"]
}

const inr = (n: number) =>
  `Rs ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * A plain, correct GST invoice: invoice number, GSTIN, HSN per line, and the CGST+SGST or IGST
 * breakup for each line (never a single blended "tax" figure). Layout is intentionally simple —
 * this is a generated document for bookkeeping, not a brand artifact.
 */
export function renderInvoicePdf(data: InvoiceData): InstanceType<typeof PDFDocument> {
  const doc = new PDFDocument({ size: "A4", margin: 40 })
  doc.fontSize(16).text(data.business.business_name, { continued: false })
  doc.fontSize(9).text(data.business.business_address)
  doc.text(`GSTIN: ${data.business.gstin}`)
  doc.moveDown()
  doc.fontSize(12).text(`Tax Invoice ${data.number}`, { underline: true })
  doc
    .fontSize(9)
    .text(`Order #${data.order.displayId}  •  Issued ${data.issuedAt.toISOString().slice(0, 10)}`)
  doc.moveDown(0.5)
  doc.text("Bill to:")
  doc.text(data.billTo.name)
  doc.text(data.billTo.address1)
  if (data.billTo.address2) doc.text(data.billTo.address2)
  doc.text(`${data.billTo.city}, ${data.billTo.province} ${data.billTo.postalCode}`)
  if (data.order.email) doc.text(data.order.email)
  doc.moveDown()

  const colX = [40, 230, 300, 340, 400, 460, 520]
  const header = ["Item", "HSN", "Qty", "Rate", "Taxable", "Tax", "Amount"]
  let y = doc.y
  doc.fontSize(8).font("Helvetica-Bold")
  header.forEach((h, i) => doc.text(h, colX[i]!, y, { width: (colX[i + 1] ?? 580) - colX[i]! - 4 }))
  doc.font("Helvetica")
  y += 14
  doc
    .moveTo(40, y - 2)
    .lineTo(555, y - 2)
    .stroke()

  let taxableTotal = 0
  const taxByCode = new Map<string, number>()

  for (const line of data.lines) {
    const rate = gstRateFor(data.gst, line.unitPrice, line.productType)
    const split = splitGst(data.gst, rate, data.billTo.province)
    const lineTotal = line.unitPrice * line.quantity
    const taxable = lineTotal / (1 + rate / 100)
    const tax = lineTotal - taxable
    taxableTotal += taxable
    const perCode = tax / Math.max(1, split.lines.length)
    for (const l of split.lines) taxByCode.set(l.code, (taxByCode.get(l.code) ?? 0) + perCode)

    doc.fontSize(8)
    const row = [
      `${line.title}${line.variant ? ` (${line.variant})` : ""}`,
      line.hsCode ?? "-",
      String(line.quantity),
      inr(line.unitPrice),
      inr(taxable),
      `${rate}%`,
      inr(lineTotal),
    ]
    row.forEach((v, i) => doc.text(v, colX[i]!, y, { width: (colX[i + 1] ?? 580) - colX[i]! - 4 }))
    y += 16
  }

  doc.moveTo(40, y).lineTo(555, y).stroke()
  y += 8
  doc.fontSize(9)
  doc.text(`Taxable value: ${inr(taxableTotal)}`, 340, y)
  y += 14
  for (const [code, amount] of taxByCode) {
    doc.text(`${code}: ${inr(amount)}`, 340, y)
    y += 14
  }
  if (data.shipping) {
    doc.text(`Shipping: ${inr(data.shipping)}`, 340, y)
    y += 14
  }
  if (data.discount) {
    doc.text(`Discount: -${inr(data.discount)}`, 340, y)
    y += 14
  }
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(`Total: ${inr(data.total)}`, 340, y)
  doc.font("Helvetica")
  doc.moveDown(2)
  doc.fontSize(7).fillColor("gray").text("This is a computer-generated invoice.", 40, doc.y)
  doc.end()
  return doc
}
