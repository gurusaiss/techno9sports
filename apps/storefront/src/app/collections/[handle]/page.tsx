import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ListingPage, ListingSkeleton } from "@/components/listing/listing-page"
import { getCollections } from "@/lib/catalog"
import { safe } from "@/lib/safe"

export async function generateStaticParams() {
  const collections = await safe(getCollections, [])
  if (collections.length > 0) {
    return collections.map((c) => ({ handle: c.handle }))
  }
  return [{ handle: "_placeholder" }]
}

export async function generateMetadata(
  props: PageProps<"/collections/[handle]">,
): Promise<Metadata> {
  const { handle } = await props.params
  const c = (await getCollections().catch(() => [])).find((x) => x.handle === handle)
  if (!c) return {}
  return {
    title: c.title,
    description: `${c.title}: shop the collection at Techno9Sports. Prices include GST.`,
    alternates: { canonical: `/collections/${handle}` },
  }
}

export default async function Page(props: PageProps<"/collections/[handle]">) {
  const { handle } = await props.params
  const c = (await safe(getCollections, [])).find((x) => x.handle === handle)
  if (!c) notFound()
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <ListingPage
        title={c.title}
        breadcrumbs={[{ label: "Collections" }, { label: c.title }]}
        scope={{ collection: handle }}
        basePath={`/collections/${handle}`}
        searchParams={props.searchParams}
        showGender
      />
    </Suspense>
  )
}
