"use client"

import * as React from "react"
import { Button } from "./button"
import { FilterGroups, type FilterGroup, type FilterState } from "./filter-groups"
import { Sheet, SheetContent } from "./sheet"

export type { FilterGroup, FilterOption, FilterState } from "./filter-groups"

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
        <FilterGroups groups={groups} value={value} onChange={onChange} />
      </SheetContent>
    </Sheet>
  )
}
