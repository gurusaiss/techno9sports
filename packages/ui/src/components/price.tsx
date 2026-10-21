import { cn } from "../lib/cn"
import { discountPercent, formatINR } from "../lib/format"

export interface PriceProps {
  /** Selling price in paise, GST inclusive. */
  pricePaise: number
  /** Maximum retail price in paise; shown struck through when higher than the price. */
  mrpPaise?: number
  size?: "sm" | "lg"
  className?: string
}

export function Price({ pricePaise, mrpPaise, size = "sm", className }: PriceProps) {
  const off = discountPercent(pricePaise, mrpPaise)
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span className="sr-only">Price </span>
      <b className={cn("font-extrabold", size === "lg" ? "text-2xl" : "text-[17px]")}>
        {formatINR(pricePaise)}
      </b>
      {off > 0 && mrpPaise ? (
        <>
          <span className="sr-only">, M.R.P. </span>
          <del className={cn("text-muted", size === "lg" ? "text-base" : "text-[13px]")}>
            {formatINR(mrpPaise)}
          </del>
          <span className={cn("font-bold text-sale", size === "lg" ? "text-base" : "text-[13px]")}>
            {off}% off
          </span>
        </>
      ) : null}
    </p>
  )
}
