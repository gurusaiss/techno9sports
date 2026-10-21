"use client"

import * as React from "react"
import * as T from "@radix-ui/react-tabs"
import { cn } from "../lib/cn"

export const Tabs = T.Root

export const TabsList = React.forwardRef<
  React.ComponentRef<typeof T.List>,
  React.ComponentPropsWithoutRef<typeof T.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <T.List
      ref={ref}
      className={cn("flex gap-6 overflow-x-auto border-b border-line", className)}
      {...props}
    />
  )
})

export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof T.Trigger>,
  React.ComponentPropsWithoutRef<typeof T.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <T.Trigger
      ref={ref}
      className={cn(
        "-mb-px min-h-12 whitespace-nowrap border-b-2 border-transparent font-semibold text-muted transition-colors",
        "hover:text-fg data-[state=active]:border-primary data-[state=active]:text-fg",
        className,
      )}
      {...props}
    />
  )
})

export const TabsContent = React.forwardRef<
  React.ComponentRef<typeof T.Content>,
  React.ComponentPropsWithoutRef<typeof T.Content>
>(function TabsContent({ className, ...props }, ref) {
  return <T.Content ref={ref} className={cn("pt-4 text-[15px]", className)} {...props} />
})
