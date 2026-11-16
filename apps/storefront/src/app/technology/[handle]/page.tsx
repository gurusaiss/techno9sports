import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ListingPage, ListingSkeleton } from "@/components/listing/listing-page"
import { getTechnologies } from "@/lib/catalog"
import { safe } from "@/lib/safe"

export async function generateStaticParams() {
  return (await safe(getTechnologies, [])).map((t) => ({ handle: t.handle }))
}

export async function generateMetadata(
  props: PageProps<"/technology/[handle]">,
): Promise<Metadata> {
  const { handle } = await props.params
  const t = (await getTechnologies().catch(() => [])).find((x) => x.handle === handle)
  if (!t) return {}
  return {
    title: `${t.name} activewear`,
    description: t.tagline ?? `Shop ${t.name} activewear at Techno9Sports.`,
    alternates: { canonical: `/technology/${handle}` },
  }
}

export default async function Page(props: PageProps<"/technology/[handle]">) {
  const { handle } = await props.params
  const t = (await safe(getTechnologies, [])).find((x) => x.handle === handle)
  if (!t) notFound()
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <ListingPage
        title={t.name}
        intro={t.tagline ?? undefined}
        breadcrumbs={[{ label: "Technology" }, { label: t.name }]}
        scope={{ technologies: [handle] }}
        basePath={`/technology/${handle}`}
        searchParams={props.searchParams}
        showGender
      />
    </Suspense>
  )
}
