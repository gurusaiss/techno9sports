import type { Metadata } from "next"
import { StaticListing } from "@/components/listing/static-listing"

export const metadata: Metadata = {
  title: "Under ₹499",
  description: "Activewear and accessories under ₹499. Prices include GST.",
  alternates: { canonical: "/under-499" },
}

export default function Page(props: PageProps<"/under-499">) {
  return (
    <StaticListing
      title="Under ₹499"
      intro="Everyday gear that won't dent your wallet."
      breadcrumbs={[{ label: "Under ₹499" }]}
      scope={{ maxPrice: 499 }}
      basePath="/under-499"
      searchParams={props.searchParams}
      showGender
    />
  )
}
