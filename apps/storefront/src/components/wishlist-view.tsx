"use client"

import * as React from "react"
import Link from "next/link"
import { Heart } from "lucide-react"
import type { ProductHit } from "@t9/types"
import { Button, EmptyState } from "@t9/ui"
import { getProductsByIdsAction } from "@/app/actions/catalog"
import { ProductCardView } from "./product-card-view"
import { useWishlist } from "./wishlist-provider"

export function WishlistView({ techNames }: { techNames: Record<string, string> }) {
  const { ids } = useWishlist()
  const [hits, setHits] = React.useState<ProductHit[] | null>(null)
  const key = [...ids].join(",")

  React.useEffect(() => {
    let cancelled = false
    if (!key) return
    void getProductsByIdsAction(key.split(",")).then((h) => {
      if (!cancelled) setHits(h)
    })
    return () => {
      cancelled = true
    }
  }, [key])

  if (key && hits === null) return <p className="text-muted">Loading…</p>
  const visible = (hits ?? []).filter((h) => ids.has(h.id))
  if (visible.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="size-7" />}
        title="Your wishlist is empty"
        description="Tap the heart on anything you like and it will wait for you here."
        action={
          <Button asChild>
            <Link href="/new">Browse new arrivals</Link>
          </Button>
        }
      />
    )
  }
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-8 lg:grid-cols-4">
      {visible.map((h) => (
        <li key={h.id}>
          <ProductCardView hit={h} techNames={techNames} headingLevel={2} />
        </li>
      ))}
    </ul>
  )
}
