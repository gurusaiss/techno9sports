import * as React from "react"
import { cn } from "../lib/cn"

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-control bg-[linear-gradient(90deg,var(--color-teal-soft)_25%,var(--color-teal-mist)_50%,var(--color-teal-soft)_75%)] bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  )
}

export function ProductCardSkeleton() {
  return (
    <div role="status" aria-label="Loading product" className="grid gap-2">
      <Skeleton className="aspect-[4/5] rounded-card" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-5 w-2/3" />
    </div>
  )
}
