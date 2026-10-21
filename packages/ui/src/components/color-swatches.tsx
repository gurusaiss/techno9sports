"use client"

import * as RadioGroup from "@radix-ui/react-radio-group"
import { cn } from "../lib/cn"

export interface ColorOption {
  value: string
  name: string
  hex: string
  soldOut?: boolean
}

export interface ColorSwatchesProps {
  colors: ColorOption[]
  value?: string
  onValueChange?: (value: string) => void
  label?: string
  className?: string
}

export function ColorSwatches({
  colors,
  value,
  onValueChange,
  label = "Select colour",
  className,
}: ColorSwatchesProps) {
  const selected = colors.find((c) => c.value === value)
  return (
    <div className={cn("grid gap-2", className)}>
      <p className="text-sm">
        Colour: <b>{selected?.name ?? "Select"}</b>
      </p>
      <RadioGroup.Root
        aria-label={label}
        value={value}
        onValueChange={onValueChange}
        className="flex flex-wrap gap-3"
      >
        {colors.map((c) => (
          <RadioGroup.Item
            key={c.value}
            value={c.value}
            disabled={c.soldOut}
            aria-label={c.soldOut ? `${c.name} (sold out)` : c.name}
            className={cn(
              "relative grid size-11 place-items-center rounded-full ring-offset-2 ring-offset-bg transition-shadow",
              "data-[state=checked]:ring-2 data-[state=checked]:ring-fg disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            <span
              aria-hidden
              className="size-8 rounded-full border border-navy/25"
              style={{ backgroundColor: c.hex }}
            />
            {c.soldOut ? <span aria-hidden className="absolute h-0.5 w-9 rotate-45 bg-fg" /> : null}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  )
}
