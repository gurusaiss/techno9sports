import * as React from "react"
import { cn } from "../lib/cn"

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "mx-auto grid max-w-md justify-items-center gap-3 px-4 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div
          className="grid size-16 place-items-center rounded-full bg-teal-mist text-link"
          aria-hidden
        >
          {icon}
        </div>
      ) : null}
      <h2 className="font-display text-xl font-extrabold">{title}</h2>
      {description ? <p className="text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
