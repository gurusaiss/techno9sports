import * as React from "react"
import { Container } from "./container"

export interface UspItem {
  icon: React.ReactNode
  title: string
  text: string
}

export function UspStrip({ items }: { items: UspItem[] }) {
  return (
    <section aria-label="Why shop with us" className="border-b border-line bg-surface">
      <Container>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-4 py-4 lg:grid-cols-4">
          {items.map((u) => (
            <li key={u.title} className="grid grid-cols-[28px_1fr] items-center gap-x-2.5 text-sm">
              <span className="row-span-2 text-link" aria-hidden>
                {u.icon}
              </span>
              <b>{u.title}</b>
              <span className="text-[13px] text-muted">{u.text}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
