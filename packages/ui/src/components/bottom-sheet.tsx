"use client"

import * as React from "react"
import { Sheet, SheetContent } from "./sheet"

export interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  footer?: React.ReactNode
  children: React.ReactNode
}

/** Mobile-first modal anchored to the bottom edge (size picker, quick add, sort). */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
}: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" title={title} description={description} footer={footer}>
        {children}
      </SheetContent>
    </Sheet>
  )
}
