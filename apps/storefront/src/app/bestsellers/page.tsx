import type { Metadata } from "next"
import { StaticListing } from "@/components/listing/static-listing"

export const metadata: Metadata = {
  title: "Bestsellers",
  description: "The activewear and sports frames shoppers love most.",
  alternates: { canonical: "/bestsellers" },
}

export default function Page(props: PageProps<"/bestsellers">) {
  return (
    <StaticListing
      title="Bestsellers"
      intro="What everyone is wearing."
      breadcrumbs={[{ label: "Bestsellers" }]}
      scope={{ tags: ["bestseller"] }}
      basePath="/bestsellers"
      searchParams={props.searchParams}
      showGender
    />
  )
}
