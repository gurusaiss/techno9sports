import type { Metadata } from "next"
import { StaticListing } from "@/components/listing/static-listing"

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
}

export default function Page(props: PageProps<"/search">) {
  return (
    <StaticListing
      title={(p) => (p.q ? `Results for “${p.q}”` : "All products")}
      breadcrumbs={[{ label: "Search" }]}
      scope={{}}
      basePath="/search"
      searchParams={props.searchParams}
      showGender
      noindex
    />
  )
}
