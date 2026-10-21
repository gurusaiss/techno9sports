import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "../lib/cn"

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
  /** Swap in a router link (for example next/link). */
  linkAs?: React.ElementType
}

export function Breadcrumb({ items, className, linkAs: Link = "a" }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1">
              {last || !item.href ? (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn(last && "font-semibold text-fg")}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="rounded-control underline-offset-4 hover:text-fg hover:underline"
                >
                  {item.label}
                </Link>
              )}
              {last ? null : <ChevronRight className="size-4" aria-hidden />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
