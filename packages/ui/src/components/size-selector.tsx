"use client"

import * as RadioGroup from "@radix-ui/react-radio-group"
import { cn } from "../lib/cn"

export interface SizeOption {
  value: string
  label?: string
  soldOut?: boolean
}

export interface SizeSelectorProps {
  sizes: SizeOption[]
  value?: string
  onValueChange?: (value: string) => void
  label?: string
  className?: string
}

export function SizeSelector({
  sizes,
  value,
  onValueChange,
  label = "Select size",
  className,
}: SizeSelectorProps) {
  return (
    <RadioGroup.Root
      aria-label={label}
      value={value}
      onValueChange={onValueChange}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {sizes.map((s) => (
        <RadioGroup.Item
          key={s.value}
          value={s.value}
          disabled={s.soldOut}
          className={cn(
            "grid h-12 min-w-12 place-items-center rounded-control border border-line-strong bg-surface px-3 font-semibold transition-colors",
            "hover:border-fg data-[state=checked]:border-fg data-[state=checked]:bg-fg data-[state=checked]:text-bg",
            "disabled:cursor-not-allowed disabled:text-muted disabled:line-through disabled:hover:border-line-strong",
            "disabled:bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--color-line)_6px_7px)]",
          )}
        >
          {s.label ?? s.value}
          {s.soldOut ? (
            <>
              {" "}
              <span className="sr-only">(sold out)</span>
            </>
          ) : null}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}
