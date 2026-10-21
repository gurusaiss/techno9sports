import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { LoaderCircle } from "lucide-react"
import { cn } from "../lib/cn"

export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 rounded-full font-bold transition-[transform,background-color,color,opacity] duration-150 ease-standard active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:brightness-95",
        secondary: "border-2 border-fg bg-transparent text-fg hover:bg-fg hover:text-bg",
        dark: "bg-fg text-bg hover:bg-navy-soft",
        ghost: "text-fg hover:bg-teal-mist",
        link: "min-h-0 rounded-control px-0 text-link underline underline-offset-4 hover:no-underline",
      },
      size: {
        sm: "min-h-10 px-4 text-sm",
        md: "min-h-12 px-6 text-[15px]",
        lg: "min-h-14 px-8 text-base",
        icon: "size-11 p-0",
      },
      full: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", full: false },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Render the child element (for example a Link) with button styling. */
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, full, asChild, loading, disabled, children, type, ...props },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size, full }), className)
  if (asChild) {
    return (
      <Slot ref={ref} className={classes} {...props}>
        {children}
      </Slot>
    )
  }
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  )
})
