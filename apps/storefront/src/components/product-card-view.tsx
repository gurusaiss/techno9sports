"use client"

import Link from "next/link"
import type { ProductHit } from "@t9/types"
import { ProductCard } from "@t9/ui"
import { parseSwatches } from "@/lib/colors"
import { rupeesToPaise } from "@/lib/money"
import { ProductImage } from "./product-image"

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
  const price = hit.min_price_inr ?? 0
  const badge = hit.tags.includes("bestseller")
    ? ({ label: "Bestseller", variant: "bestseller" } as const)
    : hit.tags.includes("new")
      ? ({ label: "New", variant: "new" } as const)
      : undefined
  const meta = [hit.product_type, hit.fit].filter(Boolean).join(" · ")
  return (
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
    />
  )
}
