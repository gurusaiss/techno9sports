import type { MedusaContainer } from "@medusajs/framework/types"
import { getSetting } from "./settings"
import { PINCODE_MODULE } from "../modules/pincode"
import type PincodeModuleService from "../modules/pincode/service"

export type CodRejection = "disabled" | "over_limit" | "blocked_pincode" | "product_excluded"

/**
 * Whether COD can be offered for this cart. Checked before a COD payment session is ever created,
 * not inside the provider — a rejected cart never sees a COD option at all.
 */
export async function checkCodEligibility(
  container: Pick<MedusaContainer, "resolve">,
  input: { total: number; postalCode?: string | null; productIds: string[] },
): Promise<{ eligible: true } | { eligible: false; reason: CodRejection }> {
  const cod = await getSetting(container, "cod")
  if (!cod.enabled) return { eligible: false, reason: "disabled" }
  if (input.total > cod.max_order_value) return { eligible: false, reason: "over_limit" }
  if (input.postalCode && cod.blocked_pincodes.includes(input.postalCode)) {
    return { eligible: false, reason: "blocked_pincode" }
  }
  if (input.postalCode) {
    const pincodeService = container.resolve<PincodeModuleService>(PINCODE_MODULE)
    const [row] = await pincodeService.listPincodes({ pincode: input.postalCode }, { take: 1 })
    if (row && !row.cod_allowed) return { eligible: false, reason: "blocked_pincode" }
  }
  return { eligible: true }
}

export const COD_REJECTION_MESSAGE: Record<CodRejection, string> = {
  disabled: "Cash on delivery isn't available right now.",
  over_limit: "Cash on delivery isn't available for orders this large. Please pay online.",
  blocked_pincode: "Cash on delivery isn't available at this address.",
  product_excluded: "One or more items in your bag aren't eligible for cash on delivery.",
}
