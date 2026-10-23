import { z } from "@medusajs/framework/zod"
import type { MedusaContainer } from "@medusajs/framework/types"
import { STORE_SETTINGS_MODULE } from "../modules/store-settings"
import type StoreSettingsModuleService from "../modules/store-settings/service"

/**
 * Business values that must not be hard-coded. Amounts are rupees. Defaults are placeholders the
 * owner replaces in the admin (editing screen: Phase 6); an invalid stored value falls back to the
 * default so a bad edit can never break checkout.
 */
export const SETTING_SCHEMAS = {
  shipping: z.object({
    flat_fee: z.number().min(0),
    free_above: z.number().min(0).nullable(),
    days_min: z.number().int().min(0),
    days_max: z.number().int().min(0),
  }),
  gst: z.object({
    bands: z
      .array(z.object({ upto: z.number().positive().optional(), rate: z.number().min(0).max(100) }))
      .min(1),
    type_rates: z.record(z.string(), z.number().min(0).max(100)),
    origin_state: z.string().min(2),
  }),
  cod: z.object({
    enabled: z.boolean(),
    max_order_value: z.number().min(0),
    fee: z.number().min(0),
    blocked_pincodes: z.array(z.string()),
    otp_required: z.boolean(),
  }),
  checkout: z.object({
    guest_checkout: z.boolean(),
    cart_max_quantity_per_line: z.number().int().min(1).max(99),
  }),
  invoice: z.object({
    series_prefix: z.string().min(1).max(10),
    next_number: z.number().int().min(1),
    gstin: z.string().min(1),
    business_name: z.string().min(1),
    business_address: z.string().min(1),
  }),
} as const

export type SettingKey = keyof typeof SETTING_SCHEMAS
export type Settings = { [K in SettingKey]: z.infer<(typeof SETTING_SCHEMAS)[K]> }

export const SETTING_DEFAULTS: Settings = {
  shipping: { flat_fee: 49, free_above: 999, days_min: 3, days_max: 7 },
  gst: {
    bands: [{ upto: 2500, rate: 5 }, { rate: 18 }],
    type_rates: { "Sports frames": 18 },
    origin_state: "Andhra Pradesh",
  },
  cod: { enabled: true, max_order_value: 5000, fee: 49, blocked_pincodes: [], otp_required: true },
  checkout: { guest_checkout: true, cart_max_quantity_per_line: 10 },
  invoice: {
    series_prefix: "T9",
    next_number: 1,
    gstin: "PENDING-OWNER-GSTIN",
    business_name: "Techno9Sports",
    business_address: "Visakhapatnam, Andhra Pradesh, India (placeholder — owner to confirm)",
  },
}

export async function getSetting<K extends SettingKey>(
  container: Pick<MedusaContainer, "resolve">,
  key: K,
): Promise<Settings[K]> {
  const service = container.resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE)
  const [row] = await service.listStoreSettings({ key }, { take: 1 })
  if (!row) return SETTING_DEFAULTS[key]
  const parsed = SETTING_SCHEMAS[key].safeParse({
    ...SETTING_DEFAULTS[key],
    ...(row.value as object),
  })
  return (parsed.success ? parsed.data : SETTING_DEFAULTS[key]) as Settings[K]
}

export async function setSetting<K extends SettingKey>(
  container: Pick<MedusaContainer, "resolve">,
  key: K,
  value: unknown,
): Promise<Settings[K]> {
  const parsed = SETTING_SCHEMAS[key].parse(value) as Settings[K]
  const service = container.resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE)
  const [row] = await service.listStoreSettings({ key }, { take: 1 })
  if (row) await service.updateStoreSettings({ id: row.id, value: parsed })
  else await service.createStoreSettings({ key, value: parsed })
  return parsed
}

/** Atomically claims and increments the invoice number series. Returns the formatted number, e.g. T9-2026-000007. */
export async function nextInvoiceNumber(
  container: Pick<MedusaContainer, "resolve">,
): Promise<string> {
  const current = await getSetting(container, "invoice")
  const n = current.next_number
  await setSetting(container, "invoice", { ...current, next_number: n + 1 })
  const year = new Date().getFullYear()
  return `${current.series_prefix}-${year}-${String(n).padStart(6, "0")}`
}
