import type { Settings } from "./settings"

type Shipping = Settings["shipping"]

/**
 * Price rows for the standard delivery option: a flat fee, plus a zero price that applies once the
 * cart's item total reaches the free-shipping threshold. Amounts are rupees.
 */
export function standardShippingPrices(settings: Shipping, regionId: string) {
  type Rule = { attribute: string; operator: "gte"; value: number }
  const rows: (
    | { currency_code: string; amount: number; rules?: Rule[] }
    | { region_id: string; amount: number; rules?: Rule[] }
  )[] = [
    { currency_code: "inr", amount: settings.flat_fee },
    { region_id: regionId, amount: settings.flat_fee },
  ]
  if (settings.free_above !== null) {
    const rules = [
      { attribute: "item_total", operator: "gte" as const, value: settings.free_above },
    ]
    rows.push({ currency_code: "inr", amount: 0, rules }, { region_id: regionId, amount: 0, rules })
  }
  return rows
}
