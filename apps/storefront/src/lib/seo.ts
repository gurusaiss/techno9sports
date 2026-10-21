import type { StoreProduct } from "@t9/types"
import { env } from "./env"

export const SITE_NAME = "Techno9Sports"

export const absoluteUrl = (path: string): string =>
  new URL(path, env.siteUrl.endsWith("/") ? env.siteUrl : `${env.siteUrl}/`).toString()

const AVAILABILITY = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  out_of_stock: "https://schema.org/OutOfStock",
} as const

/** schema.org Product with an aggregate offer in INR. Reviews are added in Phase 6. */
export function productJsonLd(p: StoreProduct) {
  const prices = p.variants.map((v) => v.price).filter((x): x is number => x !== null)
  const urls = Array.from(new Set(p.images.map((i) => i.url)))
  const available = p.variants.some((v) => v.availability.status !== "out_of_stock")
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.description ?? undefined,
    sku: p.variants[0]?.sku ?? undefined,
    image: urls.length ? urls : undefined,
    brand: { "@type": "Brand", name: SITE_NAME },
    category: p.categories[0]?.name,
    material: p.fabric ?? undefined,
    url: absoluteUrl(`/products/${p.handle}`),
    offers: prices.length
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: Math.min(...prices),
          highPrice: Math.max(...prices),
          offerCount: p.variants.length,
          availability: available ? AVAILABILITY.in_stock : AVAILABILITY.out_of_stock,
          itemCondition: "https://schema.org/NewCondition",
          url: absoluteUrl(`/products/${p.handle}`),
        }
      : undefined,
  }
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  }
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    // Logo, contact details and sameAs links are added once the owner supplies them.
  }
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: absoluteUrl("/search?q={search_term_string}"),
      "query-input": "required name=search_term_string",
    },
  }
}

/** JSON for a <script type="application/ld+json">. `<` is escaped so content can't close the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
