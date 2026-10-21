"use client"

import * as React from "react"
import type { ProductHit } from "@t9/types"
import { Button, ProductCardSkeleton } from "@t9/ui"
import { ProductCardView } from "@/components/product-card-view"

/**
 * Product grid with "load more". Page 1 is server-rendered; later pages come from /api/products.
 * Without JavaScript the button is a normal link to ?page=N, so every page stays reachable.
 */
export function ProductGrid({
  initialItems,
  total,
  page,
  pageCount,
  scopeKey,
  queryString,
  techNames,
}: {
  initialItems: ProductHit[]
  total: number
  page: number
  pageCount: number
  scopeKey: string
  /** The current filters as a query string, without `page`. */
  queryString: string
  techNames: Record<string, string>
}) {
  const [items, setItems] = React.useState(initialItems)
  const [nextPage, setNextPage] = React.useState(page + 1)
  const [loading, setLoading] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const busy = React.useRef(false)
  const sentinel = React.useRef<HTMLDivElement>(null)
  const hasMore = nextPage <= pageCount

  const loadMore = React.useCallback(async () => {
    if (busy.current || nextPage > pageCount) return
    busy.current = true
    setLoading(true)
    setFailed(false)
    try {
      const qs = new URLSearchParams(queryString)
      qs.set("scope", scopeKey)
      qs.set("page", String(nextPage))
      const res = await fetch(`/api/products?${qs}`)
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as { items: ProductHit[] }
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        return [...prev, ...data.items.filter((p) => !seen.has(p.id))]
      })
      setNextPage((n) => n + 1)
    } catch {
      setFailed(true)
    } finally {
      busy.current = false
      setLoading(false)
    }
  }, [nextPage, pageCount, queryString, scopeKey])

  React.useEffect(() => {
    const el = sentinel.current
    if (!el || !hasMore || failed) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore()
      },
      { rootMargin: "600px 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, failed, loadMore])

  const nextQs = new URLSearchParams(queryString)
  nextQs.set("page", String(nextPage))

  return (
    <div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-7 lg:grid-cols-3 lg:gap-x-5 xl:grid-cols-4">
        {items.map((hit, i) => (
          <li key={hit.id}>
            <ProductCardView
              hit={hit}
              techNames={techNames}
              priority={page === 1 && i < 4}
              headingLevel={2}
            />
          </li>
        ))}
        {loading
          ? Array.from({ length: 4 }, (_, i) => (
              <li key={`s${i}`}>
                <ProductCardSkeleton />
              </li>
            ))
          : null}
      </ul>

      <div className="mt-8 grid justify-items-center gap-3 text-center">
        <p role="status" className="text-sm text-muted">
          Showing {items.length} of {total}
        </p>
        {hasMore ? (
          <>
            <Button asChild variant="secondary">
              <a
                href={`?${nextQs}`}
                onClick={(e) => {
                  e.preventDefault()
                  void loadMore()
                }}
              >
                {loading ? "Loading..." : "Load more"}
              </a>
            </Button>
            <div ref={sentinel} aria-hidden className="h-px w-full" />
          </>
        ) : null}
        {failed ? (
          <p role="alert" className="text-sm text-sale">
            Could not load more products. Try again.
          </p>
        ) : null}
      </div>
    </div>
  )
}
