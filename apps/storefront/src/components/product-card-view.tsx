"use client"

import * as React from "react"
import Link from "next/link"
import type { ProductHit } from "@t9/types"
import { ProductCard } from "@t9/ui"
import { parseSwatches } from "@/lib/colors"
import { rupeesToPaise } from "@/lib/money"
import { ProductImage } from "./product-image"
import { useWishlist } from "./wishlist-provider"

const QuickAddSheet = React.lazy(() =>
  import("./quick-add").then((m) => ({ default: m.QuickAddSheet })),
)

/** A search hit as a product card. Technology names come from the technologies list. */
export function ProductCardView({
  hit,
  techNames,
  priority = false,
  headingLevel = 3,
}: {
  hit: ProductHit
  techNames: Record<string, string>
  priority?: boolean
  headingLevel?: 2 | 3
}) {
  const wishlist = useWishlist()
  const [quickOpen, setQuickOpen] = React.useState(false)
  const [quickMounted, setQuickMounted] = React.useState(false)
  const price = hit.min_price_inr ?? 0
  const badge = hit.tags.includes("bestseller")
    ? ({ label: "Bestseller", variant: "bestseller" } as const)
    : hit.tags.includes("new")
      ? ({ label: "New", variant: "new" } as const)
      : undefined
  const meta = [hit.product_type, hit.fit].filter(Boolean).join(" · ")
  return (
    <>
      <ProductCard
        title={hit.title}
        href={`/products/${hit.handle}`}
        linkAs={Link}
        headingLevel={headingLevel}
        meta={meta || undefined}
        pricePaise={rupeesToPaise(price)}
        mrpPaise={hit.mrp ? rupeesToPaise(hit.mrp) : undefined}
        media={
          hit.thumbnail ? (
            <ProductImage
              src={hit.thumbnail}
              alt=""
              sizes="(min-width: 1024px) 25vw, 50vw"
              priority={priority}
            />
          ) : null
        }
        badge={badge}
        tech={hit.technologies[0] ? techNames[hit.technologies[0]] : undefined}
        colors={parseSwatches(hit.color_swatches)}
        soldOut={!hit.in_stock}
        wishlisted={wishlist.has(hit.id)}
        onWishlistToggle={() => void wishlist.toggle(hit.id)}
        onQuickAdd={() => {
          setQuickMounted(true)
          setQuickOpen(true)
        }}
      />
      {quickMounted ? (
        <React.Suspense fallback={null}>
          <QuickAddSheet handle={hit.handle} open={quickOpen} onOpenChange={setQuickOpen} />
        </React.Suspense>
      ) : null}
    </>
  )
}
