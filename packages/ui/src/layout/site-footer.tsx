import * as React from "react"
import { Container } from "./container"
import { Logo } from "./logo"
import type { NavColumn } from "./nav-types"

export interface SiteFooterProps {
  columns: NavColumn[]
  tagline?: string
  /** Legal line, for example "© Techno9Sports". */
  legal: string
  linkAs?: React.ElementType
}

export function SiteFooter({ columns, tagline, legal, linkAs: Link = "a" }: SiteFooterProps) {
  return (
    <footer className="mt-12 bg-navy pt-10 text-sand">
      <Container className="grid grid-cols-2 gap-8 lg:grid-cols-[1.6fr_repeat(3,1fr)]">
        <div className="col-span-2 lg:col-span-1">
          <Logo tone="light" />
          {tagline ? <p className="mt-3 max-w-[36ch] text-sm opacity-85">{tagline}</p> : null}
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest opacity-75">
              {col.title}
            </h2>
            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="block min-h-11 py-2.5 text-[15px] hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <Container className="mt-8 border-t border-white/15 py-5 text-xs opacity-80">
        {legal}
      </Container>
    </footer>
  )
}
