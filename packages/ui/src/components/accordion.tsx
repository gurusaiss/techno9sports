"use client"

import * as React from "react"
import * as A from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
import { cn } from "../lib/cn"

export const Accordion = A.Root

export const AccordionItem = React.forwardRef<
  React.ComponentRef<typeof A.Item>,
  React.ComponentPropsWithoutRef<typeof A.Item>
>(function AccordionItem({ className, ...props }, ref) {
  return <A.Item ref={ref} className={cn("border-b border-line", className)} {...props} />
})

export const AccordionTrigger = React.forwardRef<
  React.ComponentRef<typeof A.Trigger>,
  React.ComponentPropsWithoutRef<typeof A.Trigger>
>(function AccordionTrigger({ className, children, ...props }, ref) {
  return (
    <A.Header className="flex">
      <A.Trigger
        ref={ref}
        className={cn(
          "group flex min-h-12 flex-1 items-center justify-between gap-3 py-3 text-left font-semibold",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          className="size-5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </A.Trigger>
    </A.Header>
  )
})

export const AccordionContent = React.forwardRef<
  React.ComponentRef<typeof A.Content>,
  React.ComponentPropsWithoutRef<typeof A.Content>
>(function AccordionContent({ className, children, ...props }, ref) {
  return (
    <A.Content ref={ref} className="overflow-hidden text-[15px]" {...props}>
      <div className={cn("pb-4", className)}>{children}</div>
    </A.Content>
  )
})
