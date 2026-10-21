import { describe, expect, it } from "vitest"
import type { StoreProduct } from "@t9/types"
import { absoluteUrl, breadcrumbJsonLd, jsonLdString, productJsonLd } from "../seo"

const product = {
  id: "p1",
  handle: "everyday-dry-tee",
  title: "Everyday Dry Tee",
  description: "A tee",
  fabric: "100% polyester",
  categories: [{ handle: "men-t-shirts", name: "T-shirts", parent: null }],
  images: [
    { url: "http://x/a.webp", color: "Navy", view: "front" },
    { url: "http://x/a.webp", color: "Navy", view: "front" },
    { url: "http://x/b.webp", color: null, view: null },
  ],
  variants: [
    {
      id: "v1",
      sku: "T9001-S",
      title: "S",
      size: "S",
      color: "Navy",
      price: 449,
      availability: { status: "in_stock" },
    },
    {
      id: "v2",
      sku: "T9001-M",
      title: "M",
      size: "M",
      color: "Navy",
      price: 499,
      availability: { status: "out_of_stock" },
    },
  ],
} as unknown as StoreProduct

describe("productJsonLd", () => {
  const ld = productJsonLd(product)
  it("describes the product with an INR aggregate offer", () => {
    expect(ld["@type"]).toBe("Product")
    expect(ld.offers).toMatchObject({
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: 449,
      highPrice: 499,
      offerCount: 2,
      availability: "https://schema.org/InStock",
    })
    expect(ld.brand).toEqual({ "@type": "Brand", name: "Techno9Sports" })
  })
  it("de-duplicates images and links the canonical product URL", () => {
    expect(ld.image).toEqual(["http://x/a.webp", "http://x/b.webp"])
    expect(ld.url).toMatch(/\/products\/everyday-dry-tee$/)
  })
  it("reports out of stock when every variant is sold out", () => {
    const sold = {
      ...product,
      variants: product.variants.map((v) => ({ ...v, availability: { status: "out_of_stock" } })),
    } as unknown as StoreProduct
    expect((productJsonLd(sold).offers as { availability: string }).availability).toBe(
      "https://schema.org/OutOfStock",
    )
  })
  it("makes no offer when nothing has a price, and no rating until reviews exist", () => {
    const none = { ...product, variants: [] } as unknown as StoreProduct
    expect(productJsonLd(none).offers).toBeUndefined()
    expect(JSON.stringify(ld)).not.toContain("aggregateRating")
  })
})

describe("breadcrumbJsonLd and helpers", () => {
  it("numbers items from 1 with absolute URLs", () => {
    const ld = breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Men", path: "/men" },
    ])
    expect(ld.itemListElement.map((i) => i.position)).toEqual([1, 2])
    expect(ld.itemListElement[1]!.item).toBe(absoluteUrl("/men"))
  })
  it("escapes < so JSON-LD can't close its script tag", () => {
    expect(jsonLdString({ name: "</script><script>alert(1)" })).not.toContain("</script>")
  })
})
