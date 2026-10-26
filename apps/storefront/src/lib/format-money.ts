import { formatINR } from "@t9/ui"
import { rupeesToPaise } from "./money"

/** Rupees (what the API returns) to "₹1,299". */
export const inr = (rupees: number): string => formatINR(rupeesToPaise(rupees))
