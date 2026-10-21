"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "../lib/cn"
import { Container } from "./container"
import type { NavItem } from "./nav-types"

const itemClass =
  "group inline-flex min-h-11 items-center gap-1 rounded-control px-1 font-semibold hover:text-link aria-expanded:text-link"

/**
 * Desktop navigation using the disclosure pattern: each group is a button with aria-expanded and
 * its panel follows it in the DOM, so Tab flows naturally into the links. Opens on hover or click,
 * closes on Escape (focus returns to the button), outside click, or when focus leaves.
 * Mounted inside the sticky header, so panels anchor to the header's bottom edge.
 */
export function MegaMenu({
  items,
  linkAs: Link = "a",
}: {
  items: NavItem[]
  linkAs?: React.ElementType
}) {
  const [openLabel, setOpenLabel] = React.useState<string | null>(null)
  const navRef = React.useRef<HTMLElement>(null)
  const timer = React.useRef<number | undefined>(undefined)
  const baseId = React.useId()

  const clearTimer = () => window.clearTimeout(timer.current)
  const openSoon = (label: string) => {
    clearTimer()
    timer.current = window.setTimeout(() => setOpenLabel(label), 80)
  }
  const closeSoon = () => {
    clearTimer()
    timer.current = window.setTimeout(() => setOpenLabel(null), 180)
  }
  React.useEffect(() => clearTimer, [])

  React.useEffect(() => {
    if (!openLabel) return
    const onPointerDown = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpenLabel(null)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [openLabel])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Escape" || !openLabel) return
    e.stopPropagation()
    const trigger = navRef.current?.querySelector<HTMLElement>(
      `[data-menu-trigger="${CSS.escape(openLabel)}"]`,
    )
    setOpenLabel(null)
    trigger?.focus()
  }
  const onBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpenLabel(null)
  }

  return (
    <nav
      ref={navRef}
      aria-label="Main"
      className="hidden lg:block"
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <ul className="flex items-center gap-5">
        {items.map((item, i) => {
          const panelId = `${baseId}-panel-${i}`
          const open = openLabel === item.label
          if (!item.columns?.length) {
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cn(itemClass, item.highlight && "text-sale hover:text-sale")}
                >
                  {item.label}
                </Link>
              </li>
            )
          }
          return (
            <li key={item.label} onMouseEnter={() => openSoon(item.label)} onMouseLeave={closeSoon}>
              <button
                type="button"
                data-menu-trigger={item.label}
                aria-expanded={open}
                aria-controls={open ? panelId : undefined}
                onClick={() => {
                  clearTimer()
                  setOpenLabel(open ? null : item.label)
                }}
                className={itemClass}
              >
                {item.label}
                <ChevronDown
                  className={cn("size-4 transition-transform", open && "rotate-180")}
                  aria-hidden
                />
              </button>
              {open ? (
                <div
                  id={panelId}
                  className="absolute inset-x-0 top-full animate-menu-in border-b border-line bg-surface shadow-raised"
                >
                  <Container className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-8 py-8">
                    {item.columns.map((col) => (
                      <div key={col.title}>
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">
                          {col.title}
                        </h3>
                        <ul>
                          {col.links.map((l) => (
                            <li key={l.label}>
                              <Link
                                href={l.href}
                                onClick={() => setOpenLabel(null)}
                                className="block rounded-control py-1.5 hover:text-link hover:underline"
                              >
                                {l.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    <div className="grid content-between gap-4">
                      <Link
                        href={item.href}
                        onClick={() => setOpenLabel(null)}
                        className="font-bold text-link underline underline-offset-4"
                      >
                        Shop all {item.label}
                      </Link>
                      {item.feature ? (
                        <Link
                          href={item.feature.href}
                          onClick={() => setOpenLabel(null)}
                          className="grid content-end gap-1 rounded-card bg-coral-soft p-5 text-fg"
                        >
                          <b className="font-display text-lg">{item.feature.title}</b>
                          <span className="text-sm">{item.feature.text}</span>
                          <span className="mt-1 text-sm font-bold underline underline-offset-4">
                            {item.feature.cta}
                          </span>
                        </Link>
                      ) : null}
                    </div>
                  </Container>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
