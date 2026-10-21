"use client"

import * as React from "react"

const EVENT = "t9:urlchange"

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange)
  window.addEventListener(EVENT, onChange)
  return () => {
    window.removeEventListener("popstate", onChange)
    window.removeEventListener(EVENT, onChange)
  }
}

/** A query parameter as live state. Null on the server and before hydration, so SSR stays stable. */
export function useUrlParam(name: string): string | null {
  return React.useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  )
}

/** Update a query parameter without navigating or adding a history entry (shareable URL). */
export function setUrlParam(name: string, value: string) {
  const url = new URL(window.location.href)
  url.searchParams.set(name, value)
  window.history.replaceState(null, "", url)
  window.dispatchEvent(new Event(EVENT))
}
