import type { Metadata } from "next"
import { StaticListing } from "@/components/listing/static-listing"

export const metadata: Metadata = {
  title: "Sale",
  description: "Activewear and sports frames at reduced prices. Prices include GST.",
  alternates: { canonical: "/sale" },
}

export default function Page(props: PageProps<"/sale">) {
  return (
    <StaticListing
      title="Sale"
      intro="Everything with a price cut."
      breadcrumbs={[{ label: "Sale" }]}
      scope={{ onSale: true }}
      basePath="/sale"
      searchParams={props.searchParams}
      showGender
    />
  )
}
