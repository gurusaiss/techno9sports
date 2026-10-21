"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AnnouncementBar,
  SiteFooter,
  SiteHeader,
  type NavItem,
  type SearchSuggestion,
} from "@t9/ui"
import { footerColumns, secondaryNav } from "@/config/site"

const RECENT_KEY = "t9.recentSearches"
const RECENT_EVENT = "t9:recent-searches"
const EMPTY: string[] = []

// localStorage-backed external store. Falls back to memory when storage is blocked (private mode).
let memoryRaw: string | null = null
let cache: { raw: string | null; value: string[] } = { raw: null, value: EMPTY }

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(RECENT_KEY) ?? memoryRaw
  } catch {
    return memoryRaw
  }
}
function parse(raw: string | null): string[] {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(0, 6)
      : EMPTY
  } catch {
    return EMPTY
  }
}
function getRecent(): string[] {
  const raw = readRaw()
  if (raw !== cache.raw) cache = { raw, value: parse(raw) }
  return cache.value
}
function setRecent(list: string[]) {
  memoryRaw = JSON.stringify(list)
  try {
    window.localStorage.setItem(RECENT_KEY, memoryRaw)
  } catch {
    /* recent searches are a convenience only */
  }
  window.dispatchEvent(new Event(RECENT_EVENT))
}
function subscribeRecent(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(RECENT_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(RECENT_EVENT, onChange)
  }
}

/** Category and section names from the menu, so "tees" can suggest the T-shirts pages. */
function categorySuggestions(nav: NavItem[], q: string): SearchSuggestion[] {
  const needle = q.toLowerCase()
  const out: SearchSuggestion[] = []
  for (const item of nav) {
    for (const col of item.columns ?? []) {
      for (const link of col.links) {
        if (`${item.label} ${link.label}`.toLowerCase().includes(needle)) {
          out.push({ label: `${item.label} ${link.label}`, href: link.href, kind: "category" })
        }
      }
    }
  }
  return out.slice(0, 3)
}

export function SiteHeaderChrome({
  nav,
  announcement,
}: {
  nav: NavItem[]
  announcement?: { text: string; href?: string }
}) {
  const router = useRouter()
  const recent = React.useSyncExternalStore(subscribeRecent, getRecent, () => EMPTY)

  const getSuggestions = React.useCallback(
    async (q: string): Promise<SearchSuggestion[]> => {
      const categories = categorySuggestions(nav, q)
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`)
        const data = (await res.json()) as { suggestions?: SearchSuggestion[] }
        return [...categories, ...(data.suggestions ?? [])]
      } catch {
        return categories
      }
    },
    [nav],
  )

  return (
    <SiteHeader
      nav={nav}
      secondaryNav={secondaryNav}
      cartCount={0}
      linkAs={Link}
      announcement={
        announcement ? (
          <AnnouncementBar>
            {announcement.href ? (
              <Link href={announcement.href} className="underline-offset-4 hover:underline">
                {announcement.text}
              </Link>
            ) : (
              announcement.text
            )}
          </AnnouncementBar>
        ) : null
      }
      search={{
        getSuggestions,
        recentSearches: recent,
        onClearRecent: () => setRecent([]),
        onSelect: (target) => {
          if ("href" in target) {
            router.push(target.href)
          } else {
            const next = [target.query, ...recent.filter((r) => r !== target.query)].slice(0, 6)
            setRecent(next)
            router.push(`/search?q=${encodeURIComponent(target.query)}`)
          }
        },
      }}
    />
  )
}

export function SiteFooterChrome() {
  return (
    <SiteFooter
      linkAs={Link}
      columns={footerColumns}
      tagline="Activewear and sports eyewear, made for Indian summers and Indian streets."
      legal="© Techno9Sports. All rights reserved. Prices include GST."
    />
  )
}
