/** Rupees to integer paise, avoiding float drift. Pricing code must use paise internally. */
export const toPaise = (rupees: number): number => Math.round(rupees * 100)
export const fromPaise = (paise: number): number => paise / 100
