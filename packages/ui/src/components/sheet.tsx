"use client"

import * as React from "react"
import * as D from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "../lib/cn"
import { useReturnFocus } from "../lib/use-return-focus"

export const Sheet = D.Root
export const SheetTrigger = D.Trigger
export const SheetClose = D.Close

const sheetVariants = cva("fixed z-50 flex flex-col bg-surface text-fg shadow-pop outline-none", {
  variants: {
    side: {
      bottom:
        "inset-x-0 bottom-0 mx-auto max-h-[88dvh] w-full max-w-lg rounded-t-panel data-[state=open]:animate-sheet-bottom-in data-[state=closed]:animate-sheet-bottom-out",
      left: "inset-y-0 left-0 h-dvh w-[88%] max-w-sm data-[state=open]:animate-sheet-left-in data-[state=closed]:animate-sheet-left-out",
      right:
        "inset-y-0 right-0 h-dvh w-full max-w-sm data-[state=open]:animate-sheet-right-in data-[state=closed]:animate-sheet-right-out",
    },
  },
  defaultVariants: { side: "bottom" },
})

export interface SheetContentProps
  extends
    Omit<React.ComponentPropsWithoutRef<typeof D.Content>, "title">,
    VariantProps<typeof sheetVariants> {
  /** Required: the accessible name of the dialog. */
  title: string
  description?: string
  /** Visually hide the title (still read by screen readers). */
  hideTitle?: boolean
  /** Fixed footer area, for primary actions. */
  footer?: React.ReactNode
}

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof D.Content>,
  SheetContentProps
>(function SheetContent(props, ref) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-navy/50 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <SheetPanel ref={ref} {...props} />
    </D.Portal>
  )
})

// Mounts only while open, so useReturnFocus captures the opener at the right moment.
const SheetPanel = React.forwardRef<React.ComponentRef<typeof D.Content>, SheetContentProps>(
  function SheetPanel(
    {
      side,
      title,
      description,
      hideTitle,
      footer,
      className,
      children,
      onCloseAutoFocus,
      ...props
    },
    ref,
  ) {
    const returnFocus = useReturnFocus(onCloseAutoFocus)
    return (
      <D.Content
        ref={ref}
        className={cn(sheetVariants({ side }), className)}
        onCloseAutoFocus={returnFocus}
        {...(description ? {} : { "aria-describedby": undefined })}
        {...props}
      >
        <header
          className={cn(
            "flex items-center justify-between gap-3 px-5 pb-2 pt-4",
            hideTitle && "sr-only",
          )}
        >
          <D.Title className="font-display text-lg font-extrabold">{title}</D.Title>
          <D.Close
            aria-label="Close"
            className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-teal-mist"
          >
            <X className="size-5" aria-hidden />
          </D.Close>
        </header>
        {description ? (
          <D.Description className="px-5 pb-2 text-sm text-muted">{description}</D.Description>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer ? <div className="border-t border-line bg-surface p-4">{footer}</div> : null}
      </D.Content>
    )
  },
)
