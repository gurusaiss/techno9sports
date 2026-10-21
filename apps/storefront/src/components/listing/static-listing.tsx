import { Suspense } from "react"
import { ListingPage, ListingSkeleton, type ListingPageProps } from "./listing-page"

/** A listing page wrapped in Suspense: reading the URL's filters makes it dynamic. */
export function StaticListing(props: ListingPageProps) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <ListingPage {...props} />
    </Suspense>
  )
}
