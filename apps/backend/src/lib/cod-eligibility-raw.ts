import { MedusaError } from "@medusajs/framework/utils"
import { SETTING_DEFAULTS, SETTING_SCHEMAS } from "./settings"
import { COD_REJECTION_MESSAGE, type CodRejection } from "./cod-eligibility"

/** Just the part of knex the COD provider's isolated container exposes (same constraint as the tax provider). */
type Knex = {
  (table: string): {
    where: (col: string, val: string) => { first: (...c: string[]) => Promise<any> }
  }
}
type Container = { __pg_connection__: Knex }

/**
 * The COD provider can't resolve the store-settings or pincode modules (a payment provider only
 * sees its own container), so eligibility is re-checked here from the raw connection, using the
 * same `cod` setting the storefront reads via `/store/catalog/cart/:id` for the UI-level check.
 * This is the enforcing check: it runs inside `initiatePayment`, so an ineligible COD session can
 * never be created even if a client skips or lies about the UI-level check.
 */
export async function assertCodEligible(
  container: Container,
  input: { total: number; postalCode?: string | null },
) {
  let cod = SETTING_DEFAULTS.cod
  try {
    const row = await container
      .__pg_connection__("store_setting")
      .where("key", "cod")
      .first("value")
    if (row) {
      const parsed = SETTING_SCHEMAS.cod.safeParse({ ...cod, ...(row.value as object) })
      if (parsed.success) cod = parsed.data
    }
  } catch {
    // fall back to defaults
  }
  const reject = (reason: CodRejection) => {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, COD_REJECTION_MESSAGE[reason])
  }
  if (!cod.enabled) reject("disabled")
  if (input.total > cod.max_order_value) reject("over_limit")
  if (input.postalCode) {
    if (cod.blocked_pincodes.includes(input.postalCode)) reject("blocked_pincode")
    try {
      const row = await container
        .__pg_connection__("pincode")
        .where("pincode", input.postalCode)
        .first("cod_allowed")
      if (row && row.cod_allowed === false) reject("blocked_pincode")
    } catch {
      // unknown pincode table state: don't block on an infra hiccup, the storefront already warned
    }
  }
}
