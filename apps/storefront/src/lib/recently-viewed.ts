"use client"

import * as React from "react"

export interface RecentItem {
  handle: string
  title: string
  thumbnail: string | null
  price: number | null
  mrp: number | null
}

const KEY = "t9.recentlyViewed"
const EVENT = "t9:recently-viewed"
const MAX = 12
const EMPTY: RecentItem[] = []

let memoryRaw: string | null = null
let cache: { raw: string | null; value: RecentItem[] } = { raw: null, value: EMPTY }

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY) ?? memoryRaw
  } catch {
    return memoryRaw
  }
}
function parse(raw: string | null): RecentItem[] {
  try {
    const v: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(v)) return EMPTY
    return v.filter(
      (x): x is RecentItem =>
        !!x &&
        typeof x === "object" &&
        typeof (x as RecentItem).handle === "string" &&
        typeof (x as RecentItem).title === "string",
    )
  } catch {
    return EMPTY
  }
}
function getSnapshot(): RecentItem[] {
  const raw = readRaw()
  if (raw !== cache.raw) cache = { raw, value: parse(raw) }
  return cache.value
}
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(EVENT, onChange)
  }
}

/** Remembers a product page visit in this browser (no account, nothing sent to the server). */
export function trackRecentlyViewed(item: RecentItem) {
  const next = [item, ...getSnapshot().filter((i) => i.handle !== item.handle)].slice(0, MAX)
  memoryRaw = JSON.stringify(next)
  try {
    window.localStorage.setItem(KEY, memoryRaw)
  } catch {
    /* a convenience only */
  }
  window.dispatchEvent(new Event(EVENT))
}

export function useRecentlyViewed(): RecentItem[] {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)
}
