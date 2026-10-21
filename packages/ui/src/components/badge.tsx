import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/cn"

export const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-5 tracking-wide",
  {
    variants: {
      variant: {
        new: "bg-fg text-bg",
        bestseller: "bg-primary text-on-primary",
        sale: "bg-sale text-white",
        soldOut: "border border-line bg-surface text-fg",
        tech: "bg-surface text-link",
        neutral: "bg-teal-mist text-fg",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
