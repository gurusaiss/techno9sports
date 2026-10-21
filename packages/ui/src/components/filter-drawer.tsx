"use client"

import * as React from "react"
import * as Checkbox from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion"
import { Button } from "./button"
import { Sheet, SheetContent } from "./sheet"

export interface FilterOption {
  value: string
  label: string
  count?: number
  /** Optional colour dot for colour filters. */
  swatch?: string
}

export type FilterGroup =
  | { id: string; label: string; kind: "options"; options: FilterOption[] }
  | { id: string; label: string; kind: "range"; min: number; max: number; unit?: string }

export interface FilterState {
  options: Record<string, string[]>
  ranges: Record<string, { min?: number; max?: number }>
}

export interface FilterDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: FilterGroup[]
  value: FilterState
  onChange: (next: FilterState) => void
  /** Number of products matching the current selection, shown on the apply button. */
  resultCount?: number
}

export function FilterDrawer({
  open,
  onOpenChange,
  groups,
  value,
  onChange,
  resultCount,
}: FilterDrawerProps) {
  const toggle = (groupId: string, optionValue: string, checked: boolean) => {
    const current = value.options[groupId] ?? []
    const next = checked ? [...current, optionValue] : current.filter((v) => v !== optionValue)
    onChange({ ...value, options: { ...value.options, [groupId]: next } })
  }
  const setRange = (groupId: string, edge: "min" | "max", raw: string) => {
    const n = raw === "" ? undefined : Number(raw)
    onChange({
      ...value,
      ranges: { ...value.ranges, [groupId]: { ...value.ranges[groupId], [edge]: n } },
    })
  }
  const clearAll = () => onChange({ options: {}, ranges: {} })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        title="Filters"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={clearAll}>
              Clear all
            </Button>
            <Button className="flex-[2]" onClick={() => onOpenChange(false)}>
              {resultCount === undefined ? "Show results" : `Show ${resultCount} results`}
            </Button>
          </div>
        }
      >
        <Accordion type="multiple" defaultValue={groups.map((g) => g.id)}>
          {groups.map((g) => (
            <AccordionItem key={g.id} value={g.id}>
              <AccordionTrigger>{g.label}</AccordionTrigger>
              <AccordionContent>
                {g.kind === "options" ? (
                  <ul className="grid gap-1">
                    {g.options.map((o) => {
                      const id = `f-${g.id}-${o.value}`
                      const checked = (value.options[g.id] ?? []).includes(o.value)
                      return (
                        <li key={o.value} className="flex min-h-11 items-center gap-3">
                          <Checkbox.Root
                            id={id}
                            checked={checked}
                            onCheckedChange={(c) => toggle(g.id, o.value, c === true)}
                            className="grid size-6 shrink-0 place-items-center rounded-[7px] border border-line-strong bg-surface data-[state=checked]:border-fg data-[state=checked]:bg-fg data-[state=checked]:text-bg"
                          >
                            <Checkbox.Indicator>
                              <Check className="size-4" aria-hidden />
                            </Checkbox.Indicator>
                          </Checkbox.Root>
                          <label
                            htmlFor={id}
                            className="flex flex-1 cursor-pointer items-center gap-2"
                          >
                            {o.swatch ? (
                              <span
                                aria-hidden
                                className="size-4 rounded-full border border-navy/25"
                                style={{ backgroundColor: o.swatch }}
                              />
                            ) : null}
                            {o.label}
                            {o.count !== undefined ? (
                              <span className="text-sm text-muted">({o.count})</span>
                            ) : null}
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <div className="flex items-center gap-3">
                    <label className="grid flex-1 gap-1 text-sm text-muted">
                      Min {g.unit ?? ""}
                      <input
                        inputMode="numeric"
                        type="number"
                        min={g.min}
                        max={g.max}
                        placeholder={String(g.min)}
                        value={value.ranges[g.id]?.min ?? ""}
                        onChange={(e) => setRange(g.id, "min", e.target.value)}
                        className="h-12 rounded-control border border-line-strong bg-surface px-3 text-base text-fg"
                      />
                    </label>
                    <span aria-hidden className="mt-6">
                      –
                    </span>
                    <label className="grid flex-1 gap-1 text-sm text-muted">
                      Max {g.unit ?? ""}
                      <input
                        inputMode="numeric"
                        type="number"
                        min={g.min}
                        max={g.max}
                        placeholder={String(g.max)}
                        value={value.ranges[g.id]?.max ?? ""}
                        onChange={(e) => setRange(g.id, "max", e.target.value)}
                        className="h-12 rounded-control border border-line-strong bg-surface px-3 text-base text-fg"
                      />
                    </label>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </SheetContent>
    </Sheet>
  )
}
