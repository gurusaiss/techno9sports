"use client"

import Link from "next/link"
import { Container, Price } from "@t9/ui"
import { ProductImage } from "@/components/product-image"
import { rupeesToPaise } from "@/lib/money"
import { useRecentlyViewed } from "@/lib/recently-viewed"

export function RecentlyViewed({ excludeHandle }: { excludeHandle?: string }) {
  const items = useRecentlyViewed()
    .filter((i) => i.handle !== excludeHandle)
    .slice(0, 8)
  if (items.length === 0) return null
  return (
    <section aria-labelledby="recent-heading" className="py-10">
      <Container>
        <h2 id="recent-heading" className="mb-4 font-display text-xl font-extrabold">
          Recently viewed
        </h2>
        <ul className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
          {items.map((i) => (
            <li key={i.handle} className="w-36 shrink-0 snap-start sm:w-44">
              <Link href={`/products/${i.handle}`} className="grid gap-1.5">
                <span className="relative block aspect-[4/5] overflow-hidden rounded-card bg-teal-soft">
                  {i.thumbnail ? <ProductImage src={i.thumbnail} alt="" sizes="176px" /> : null}
                </span>
                <span className="line-clamp-2 text-sm font-semibold leading-snug">{i.title}</span>
                {i.price ? (
                  <Price
                    pricePaise={rupeesToPaise(i.price)}
                    mrpPaise={i.mrp ? rupeesToPaise(i.mrp) : undefined}
                  />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
