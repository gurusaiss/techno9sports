/** Medusa prices are rupees; @t9/ui takes integer paise. Convert only at this boundary. */
export const rupeesToPaise = (rupees: number): number => Math.round(rupees * 100)
