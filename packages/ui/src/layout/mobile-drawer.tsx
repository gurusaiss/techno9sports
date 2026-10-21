"use client"

import * as React from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/accordion"
import { Sheet, SheetContent } from "../components/sheet"
import { cn } from "../lib/cn"
import type { NavItem, NavLink } from "./nav-types"

export interface MobileDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: NavItem[]
  /** Secondary links shown at the bottom (account, track order, help). */
  secondary?: NavLink[]
  linkAs?: React.ElementType
}

export function MobileDrawer({
  open,
  onOpenChange,
  items,
  secondary,
  linkAs: Link = "a",
}: MobileDrawerProps) {
  const close = () => onOpenChange(false)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" title="Menu">
        <nav aria-label="Mobile">
          <Accordion type="single" collapsible>
            {items.map((item) =>
              item.columns?.length ? (
                <AccordionItem key={item.label} value={item.label}>
                  <AccordionTrigger>{item.label}</AccordionTrigger>
                  <AccordionContent>
                    {item.columns.map((col) => (
                      <div key={col.title} className="mb-3">
                        <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-muted">
                          {col.title}
                        </h3>
                        <ul>
                          {col.links.map((l) => (
                            <li key={l.label}>
                              <Link href={l.href} onClick={close} className="block min-h-11 py-2.5">
                                {l.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    <Link
                      href={item.href}
                      onClick={close}
                      className="block min-h-11 py-2.5 font-bold text-link underline"
                    >
                      Shop all {item.label}
                    </Link>
                  </AccordionContent>
                </AccordionItem>
              ) : (
                <div key={item.label} className="border-b border-line">
                  <Link
                    href={item.href}
                    onClick={close}
                    className={cn(
                      "flex min-h-12 items-center font-semibold",
                      item.highlight && "text-sale",
                    )}
                  >
                    {item.label}
                  </Link>
                </div>
              ),
            )}
          </Accordion>
          {secondary?.length ? (
            <ul className="mt-6 grid gap-1 text-[15px] text-muted">
              {secondary.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} onClick={close} className="block min-h-11 py-2.5">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
