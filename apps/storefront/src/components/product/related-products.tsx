import Link from "next/link"
import type { StoreProduct } from "@t9/types"
import { Container } from "@t9/ui"
import { ProductCardView } from "@/components/product-card-view"
import { getTechnologies, searchProducts } from "@/lib/catalog"
import { parseListingParams } from "@/lib/listing-params"
import { safe } from "@/lib/safe"

/** More from the same category, bestsellers first, excluding the product being viewed. */
export async function RelatedProducts({ product }: { product: StoreProduct }) {
  const category = product.categories[0]
  if (!category) return null
  const [result, technologies] = await Promise.all([
    safe(
      () =>
        searchProducts(
          { categories: [category.handle] },
          { ...parseListingParams({}), sort: "bestseller" },
          9,
        ),
      null,
    ),
    safe(getTechnologies, []),
  ])
  const items = (result?.items ?? []).filter((h) => h.handle !== product.handle).slice(0, 8)
  if (!items.length) return null
  const techNames = Object.fromEntries(technologies.map((t) => [t.handle, t.name]))
  const parent = category.parent
  const href = parent
    ? `/${parent.handle}/${category.handle.slice(parent.handle.length + 1)}`
    : `/${category.handle}`
  return (
    <section aria-labelledby="related" className="mt-12 border-t border-line pt-8">
      <Container className="px-0 lg:px-0">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="related" className="font-display text-2xl font-extrabold">
            You may also like
          </h2>
          <Link href={href} className="font-semibold underline underline-offset-4">
            See all {category.name}
          </Link>
        </div>
        <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0">
          {items.map((hit) => (
            <li key={hit.id} className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-auto">
              <ProductCardView hit={hit} techNames={techNames} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
