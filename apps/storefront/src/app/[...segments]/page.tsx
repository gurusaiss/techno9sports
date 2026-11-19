import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ListingPage, ListingSkeleton } from "@/components/listing/listing-page"
import { getCategoryTree } from "@/lib/catalog"
import { categoryHref, resolveCategoryHandle } from "@/lib/nav"
import { safe } from "@/lib/safe"

export async function generateStaticParams() {
  const tree = await safe(getCategoryTree, [])
  if (tree.length > 0) {
    return tree.flatMap((top) => [
      { segments: [top.handle] },
      ...top.children.map((c) => ({
        segments: [top.handle, c.handle.slice(top.handle.length + 1)],
      })),
    ])
  }
  return [{ segments: ["_placeholder"] }]
}

async function lookup(segments: string[]) {
  const tree = await safe(getCategoryTree, [])
  const handle = resolveCategoryHandle(segments, tree)
  if (!handle) return null
  const top = tree.find((t) => handle === t.handle || handle.startsWith(`${t.handle}-`))
  if (!top) return null
  const node = handle === top.handle ? top : top.children?.find((c) => c.handle === handle)
  if (!node) return null
  return { top, node, handle }
}

export async function generateMetadata(props: PageProps<"/[...segments]">): Promise<Metadata> {
  const { segments } = await props.params
  const found = await lookup(segments).catch(() => null)
  if (!found) return {}
  const isTop = found.node.handle === found.top.handle
  const title = isTop ? found.node.name : `${found.top.name} ${found.node.name}`
  return {
    title,
    description: `Shop ${title.toLowerCase()} at Techno9Sports. Prices include GST, delivered across India.`,
    alternates: { canonical: `/${segments.join("/")}` },
  }
}

export default async function Page(props: PageProps<"/[...segments]">) {
  // Resolved before anything streams, so an unknown path is a real 404, not a soft one.
  const { segments } = await props.params
  const found = await lookup(segments)
  if (!found) notFound()
  const { top, node } = found
  const isTop = node.handle === top.handle
  const title = isTop ? node.name : `${top.name} ${node.name}`
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <ListingPage
        title={title}
        breadcrumbs={[
          ...(isTop ? [] : [{ label: top.name, href: categoryHref(top.handle) }]),
          { label: node.name },
        ]}
        scope={{ categories: [node.handle] }}
        basePath={`/${segments.join("/")}`}
        searchParams={props.searchParams}
        showGender={top.handle === "accessories" || top.handle === "frames"}
      />
    </Suspense>
  )
}
