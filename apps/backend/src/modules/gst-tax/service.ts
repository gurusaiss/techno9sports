import type {
  ItemTaxCalculationLine,
  ItemTaxLineDTO,
  ITaxProvider,
  ShippingTaxCalculationLine,
  ShippingTaxLineDTO,
  TaxCalculationContext,
} from "@medusajs/framework/types"
import { SETTING_DEFAULTS, SETTING_SCHEMAS } from "../../lib/settings"
import { gstRateFor, splitGst } from "../../lib/gst"

/** Just the part of knex this provider uses. */
type Knex = {
  (table: string): {
    where: (col: string, val: string) => { first: (...c: string[]) => Promise<any> }
    whereIn: (col: string, vals: string[]) => { select: (...c: string[]) => Promise<any[]> }
  }
}
type Container = { __pg_connection__: Knex; logger: { warn: (m: string) => void } }

const CACHE_MS = 15_000

/**
 * GST for a tax-inclusive price list. The rate follows the configured price bands (or the
 * product-type override), split into CGST + SGST or IGST by delivery state. The provider never
 * trusts a client value: it works only from the cart's own line prices.
 */
export default class GstTaxProvider implements ITaxProvider {
  static identifier = "gst"
  protected container_: Container
  private cache_?: { at: number; config: (typeof SETTING_DEFAULTS)["gst"] }

  constructor(container: Container) {
    this.container_ = container
  }

  getIdentifier() {
    return GstTaxProvider.identifier
  }

  /**
   * A tax module provider only sees its own container, not other modules, so the settings row is
   * read straight from the database (briefly cached). A bad or missing row falls back to defaults.
   */
  private async config() {
    if (this.cache_ && Date.now() - this.cache_.at < CACHE_MS) return this.cache_.config
    let config = SETTING_DEFAULTS.gst
    try {
      const row = await this.container_
        .__pg_connection__("store_setting")
        .where("key", "gst")
        .first("value")
      if (row) {
        const parsed = SETTING_SCHEMAS.gst.safeParse({ ...config, ...(row.value as object) })
        if (parsed.success) config = parsed.data
        else this.container_.logger.warn("Invalid gst setting, using defaults")
      }
    } catch {
      this.container_.logger.warn("Could not read the gst setting, using defaults")
    }
    this.cache_ = { at: Date.now(), config }
    return config
  }

  private async typeValues(ids: string[]): Promise<Map<string, string>> {
    if (!ids.length) return new Map()
    const rows = await this.container_
      .__pg_connection__("product_type")
      .whereIn("id", ids)
      .select("id", "value")
    return new Map(rows.map((r: { id: string; value: string }) => [r.id, r.value]))
  }

  async getTaxLines(
    itemLines: ItemTaxCalculationLine[],
    shippingLines: ShippingTaxCalculationLine[],
    context: TaxCalculationContext,
  ): Promise<(ItemTaxLineDTO | ShippingTaxLineDTO)[]> {
    const config = await this.config()
    const types = await this.typeValues([
      ...new Set(itemLines.map((l) => l.line_item.product_type_id).filter((v): v is string => !!v)),
    ])
    const state = context.address?.province_code ?? null
    const out: (ItemTaxLineDTO | ShippingTaxLineDTO)[] = []
    let highest = 0
    for (const { line_item: item } of itemLines) {
      const rate = gstRateFor(
        config,
        Number(item.unit_price),
        item.product_type_id ? types.get(item.product_type_id) : null,
      )
      highest = Math.max(highest, rate)
      for (const l of splitGst(config, rate, state).lines) {
        out.push({
          rate: l.rate,
          name: l.name,
          code: l.code,
          line_item_id: item.id,
          provider_id: GstTaxProvider.identifier,
        })
      }
    }
    for (const { shipping_line: ship } of shippingLines) {
      for (const l of splitGst(config, highest, state).lines) {
        out.push({
          rate: l.rate,
          name: l.name,
          code: l.code,
          shipping_line_id: ship.id,
          provider_id: GstTaxProvider.identifier,
        })
      }
    }
    return out
  }
}
