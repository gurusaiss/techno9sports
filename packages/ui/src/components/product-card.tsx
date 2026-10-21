"use client"

import * as React from "react"
import { Heart } from "lucide-react"
import { cn } from "../lib/cn"
import { Badge, type BadgeProps } from "./badge"
import { Button } from "./button"
import { Price } from "./price"

export interface ProductCardProps {
  title: string
  href: string
  /** Short line under the title, for example "Round neck · Regular fit". */
  meta?: string
  pricePaise: number
  mrpPaise?: number
  /** Image or placeholder; the storefront passes next/image here. */
  media: React.ReactNode
  badge?: { label: string; variant?: BadgeProps["variant"] }
  /** Fabric technology label, for example "T9 Dry". */
  tech?: string
  colors?: { name: string; hex: string }[]
  soldOut?: boolean
  wishlisted?: boolean
  onWishlistToggle?: () => void
  onNotify?: () => void
  /** Swap in a router link (for example next/link). */
  linkAs?: React.ElementType
  /** Heading level of the title: 2 on listing pages (under the page h1), 3 under a section h2. */
  headingLevel?: 2 | 3
  className?: string
}

export function ProductCard({
  title,
  href,
  meta,
  pricePaise,
  mrpPaise,
  media,
  badge,
  tech,
  colors,
  soldOut,
  wishlisted,
  onWishlistToggle,
  onNotify,
  linkAs: Link = "a",
  headingLevel = 3,
  className,
}: ProductCardProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3"
  return (
    <article className={cn("group relative", className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-teal-soft shadow-card">
        <div
          className={cn(
            "size-full transition-transform duration-300 ease-standard group-hover:scale-[1.03]",
            soldOut && "opacity-55",
          )}
        >
          {media}
        </div>
        {soldOut ? (
          <Badge variant="soldOut" className="absolute left-2 top-2">
            Sold out
          </Badge>
        ) : badge ? (
          <Badge variant={badge.variant} className="absolute left-2 top-2">
            {badge.label}
          </Badge>
        ) : null}
        {tech ? (
          <Badge variant="tech" className="absolute bottom-2 left-2">
            {tech}
          </Badge>
        ) : null}
        {onWishlistToggle ? (
          <button
            type="button"
            onClick={onWishlistToggle}
            aria-pressed={wishlisted ?? false}
            aria-label={wishlisted ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`}
            className="absolute right-1 top-1 z-10 grid size-11 place-items-center rounded-full"
          >
            <span className="grid size-9 place-items-center rounded-full bg-white/90 text-navy">
              <Heart className={cn("size-5", wishlisted && "fill-sale text-sale")} aria-hidden />
            </span>
          </button>
        ) : null}
      </div>
      <Heading className="mt-3 text-[15px] font-semibold leading-snug">
        <Link
          href={href}
          className="rounded-control after:absolute after:inset-0 after:content-['']"
        >
          {title}
        </Link>
      </Heading>
      {meta ? <p className="text-[13px] text-muted">{meta}</p> : null}
      <Price pricePaise={pricePaise} mrpPaise={mrpPaise} className="mt-1" />
      {colors?.length ? (
        <ul className="mt-2 flex gap-1.5" aria-label="Available colours">
          {colors.map((c) => (
            <li key={c.name}>
              <span
                className="block size-4 rounded-full border border-navy/25"
                style={{ backgroundColor: c.hex }}
              >
                <span className="sr-only">{c.name}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {soldOut && onNotify ? (
        <Button variant="link" size="sm" className="relative z-10 mt-1 min-h-11" onClick={onNotify}>
          Notify me
        </Button>
      ) : null}
    </article>
  )
}
