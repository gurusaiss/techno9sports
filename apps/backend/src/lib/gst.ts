import type { Settings } from "./settings"
import { findState } from "./india-states"

export type GstConfig = Settings["gst"]

/** GST rate (percent) for one piece. `unitPrice` is the GST-inclusive selling price in rupees. */
export function gstRateFor(config: GstConfig, unitPrice: number, productType?: string | null) {
  const typeRate = productType ? config.type_rates[productType] : undefined
  if (typeRate !== undefined) return typeRate
  for (const band of config.bands) {
    if (band.upto === undefined || unitPrice <= band.upto) return band.rate
  }
  return config.bands[config.bands.length - 1]!.rate
}

export interface GstSplit {
  scheme: "intra" | "inter"
  lines: { code: string; name: string; rate: number }[]
}

/**
 * Splits a GST rate for the supply. Unknown delivery state is treated as inter-state (IGST), the
 * safe default because it never understates the tax code the buyer sees.
 */
export function splitGst(config: GstConfig, rate: number, deliveryState?: string | null): GstSplit {
  const origin = findState(config.origin_state)
  const dest = findState(deliveryState)
  if (rate === 0) return { scheme: "intra", lines: [] }
  if (origin && dest && origin.code === dest.code) {
    const half = rate / 2
    return {
      scheme: "intra",
      lines: [
        { code: "CGST", name: "CGST", rate: half },
        { code: "SGST", name: "SGST", rate: half },
      ],
    }
  }
  return { scheme: "inter", lines: [{ code: "IGST", name: "IGST", rate }] }
}

/** The tax inside a GST-inclusive amount, rounded to paise. */
export function taxInside(inclusiveAmount: number, ratePercent: number) {
  return Math.round(((inclusiveAmount * ratePercent) / (100 + ratePercent)) * 100) / 100
}
