import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import type { StoreProduct } from "@t9/types"
import { Container } from "@t9/ui"
import { ProductDetail } from "@/components/product/product-detail"
import { RecentlyViewed } from "@/components/product/recently-viewed"
import { RelatedProducts } from "@/components/product/related-products"
import { getAllProductHandles, getProduct } from "@/lib/catalog"
import { categoryHref } from "@/lib/nav"
import { safe } from "@/lib/safe"
import { breadcrumbJsonLd, jsonLdString, productJsonLd } from "@/lib/seo"

export async function generateStaticParams() {
  const handles = await safe(getAllProductHandles, [])
  if (handles.length > 0) {
    return handles.slice(0, 300).map((h) => ({ handle: h.handle }))
  }
  return [{ handle: "_placeholder" }]
}

export async function generateMetadata(props: PageProps<"/products/[handle]">): Promise<Metadata> {
  const { handle } = await props.params
  const p = await getProduct(handle).catch(() => null)
  if (!p) return {}
  const description = (p.description ?? `${p.title} at Techno9Sports`).slice(0, 155)
  return {
    title: p.title,
    description,
    alternates: { canonical: `/products/${p.handle}` },
    openGraph: {
      title: p.title,
      description,
      type: "website",
      images: p.thumbnail ? [{ url: p.thumbnail }] : undefined,
    },
  }
}

function Product({ product }: { product: StoreProduct }) {
  const cat = product.categories[0]
  const crumbs = [
    { label: "Home", href: "/" },
    ...(cat?.parent ? [{ label: cat.parent.name, href: categoryHref(cat.parent.handle) }] : []),
    ...(cat ? [{ label: cat.name, href: categoryHref(cat.handle, cat.parent?.handle) }] : []),
    { label: product.title },
  ]

  return (
    <Container className="py-5 lg:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString([
            productJsonLd(product),
            breadcrumbJsonLd(
              crumbs.map((c) => ({ name: c.label, path: c.href ?? `/products/${product.handle}` })),
            ),
          ]),
        }}
      />
      <BreadcrumbNav items={crumbs} className="mb-4" />
      <ProductDetail product={product} />
      <Suspense fallback={null}>
        <RelatedProducts product={product} />
        <RecentlyViewed excludeHandle={product.handle} />
      </Suspense>
      <div className="h-20 lg:hidden" aria-hidden />
    </Container>
  )
}

export default async function Page(props: PageProps<"/products/[handle]">) {
  // Resolved before anything streams, so an unknown handle is a real 404, not a soft one.
  const { handle } = await props.params
  const product = await safe(() => getProduct(handle), null)
  if (!product) notFound()
  return <Product product={product} />
}
