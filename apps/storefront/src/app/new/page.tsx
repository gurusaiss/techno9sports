import type { Metadata } from "next"
import { StaticListing } from "@/components/listing/static-listing"

export const metadata: Metadata = {
  title: "New arrivals",
  description: "The latest activewear and sports frames from Techno9Sports.",
  alternates: { canonical: "/new" },
}

export default function Page(props: PageProps<"/new">) {
  return (
    <StaticListing
      title="New arrivals"
      intro="Fresh drops in activewear and sports frames."
      breadcrumbs={[{ label: "New arrivals" }]}
      scope={{ tags: ["new"] }}
      basePath="/new"
      searchParams={props.searchParams}
      showGender
    />
  )
}
