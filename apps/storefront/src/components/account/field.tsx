"use client"

import * as React from "react"
import { cn } from "@t9/ui"

export const Field = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }
>(function Field({ label, error, hint, id, className, ...props }, ref) {
  const auto = React.useId()
  const fid = id ?? auto
  const describedBy = [error ? `${fid}-err` : null, hint ? `${fid}-hint` : null]
    .filter(Boolean)
    .join(" ")
  return (
    <div className="grid gap-1.5">
      <label htmlFor={fid} className="text-sm font-semibold">
        {label}
      </label>
      <input
        ref={ref}
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          "h-12 w-full rounded-control border bg-surface px-4 text-base outline-none focus:border-link",
          error ? "border-sale" : "border-line-strong",
          className,
        )}
        {...props}
      />
      {hint && !error ? (
        <p id={`${fid}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${fid}-err`} role="alert" className="text-[13px] font-semibold text-sale">
          {error}
        </p>
      ) : null}
    </div>
  )
})
