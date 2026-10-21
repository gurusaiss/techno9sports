/** Money crosses every boundary as integer paise. Display only here. */
export function formatINR(paise: number): string {
  const rupees = paise / 100
  const whole = Number.isInteger(rupees)
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(rupees)
}

/** Whole-number percent off, or 0 when there is no real discount. */
export function discountPercent(pricePaise: number, mrpPaise?: number): number {
  if (!mrpPaise || mrpPaise <= pricePaise) return 0
  return Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100)
}
