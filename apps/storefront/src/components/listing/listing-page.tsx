import { Search } from "lucide-react"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { Button, Container, EmptyState, ProductCardSkeleton } from "@t9/ui"
import Link from "next/link"
import { getTechnologies, searchProducts } from "@/lib/catalog"
import type { ListingScope } from "@/lib/catalog-query"
import {
  activeFilterCount,
  parseListingParams,
  toSearchParams,
  type RawSearchParams,
} from "@/lib/listing-params"
import { safe } from "@/lib/safe"
import { scopeToKey } from "@/lib/scope"
import { breadcrumbJsonLd, jsonLdString } from "@/lib/seo"
import { groupsFromFacets } from "./filter-state"
import { ListingShell } from "./listing-shell"
import { ProductGrid } from "./product-grid"
import { notFound } from "next/navigation"

export function ListingSkeleton() {
  return (
    <Container className="py-6" aria-busy>
      <div className="h-8 w-56 animate-pulse rounded-control bg-teal-soft" />
      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 lg:grid-cols-4 lg:gap-x-5">
        {Array.from({ length: 8 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </Container>
  )
}

export interface ListingPageProps {
  /** A function lets a page title itself from the URL, e.g. the search page quotes the query. */
  title: string | ((p: ReturnType<typeof parseListingParams>) => string)
  intro?: string
  breadcrumbs: { label: string; href?: string }[]
  scope: ListingScope
  basePath: string
  searchParams: Promise<RawSearchParams>
  /** Show a "For" (men, women, unisex) filter: useful on pages that span genders. */
  showGender?: boolean
  /** Text search pages are never indexed. */
  noindex?: boolean
}

/** A product listing: heading, filters, sort, grid and load-more, all driven by the URL. */
export async function ListingPage({
  title,
  intro,
  breadcrumbs,
  scope,
  basePath,
  searchParams,
  showGender,
  noindex,
}: ListingPageProps) {
  const params = parseListingParams(await searchParams)
  const heading = typeof title === "function" ? title(params) : title
  const result = await searchProducts(scope, params)
  if (params.page > result.pageCount) notFound()

  const technologies = await safe(getTechnologies, [])
  const techNames = Object.fromEntries(technologies.map((t) => [t.handle, t.name]))
  const groups = groupsFromFacets(result, { techNames, showGender: Boolean(showGender) })
  const filtered = activeFilterCount(params) > 0 || params.sort !== "relevance"

  const queryString = toSearchParams({ ...params, page: 1 }).toString()
  const crumbs = [{ label: "Home", href: "/" }, ...breadcrumbs]

  return (
    <Container className="py-5 lg:py-8">
      {noindex || filtered ? <meta name="robots" content="noindex,follow" /> : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(
            breadcrumbJsonLd(crumbs.map((c) => ({ name: c.label, path: c.href ?? basePath }))),
          ),
        }}
      />
      <BreadcrumbNav items={crumbs} />
      <div className="mb-5 mt-3">
        <h1 className="font-display text-[clamp(28px,4vw,40px)] font-extrabold leading-tight">
          {heading}
        </h1>
        {intro ? <p className="mt-1 max-w-[70ch] text-muted">{intro}</p> : null}
      </div>

      <ListingShell
        key={queryString}
        params={params}
        groups={groups}
        total={result.total}
        basePath={basePath}
        techNames={techNames}
        hideRelevance={!params.q}
      >
        {result.items.length ? (
          <ProductGrid
            key={queryString}
            initialItems={result.items}
            total={result.total}
            page={params.page}
            pageCount={result.pageCount}
            scopeKey={scopeToKey(scope)}
            queryString={queryString}
            techNames={techNames}
          />
        ) : (
          <EmptyState
            icon={<Search className="size-7" />}
            title="No products match"
            description={
              params.q
                ? `We couldn't find anything for “${params.q}”. Check the spelling or try a broader search.`
                : "Try removing a filter or two."
            }
            action={
              <Button asChild variant="secondary">
                <Link href={params.q ? "/" : basePath}>
                  {params.q ? "Back to home" : "Clear all filters"}
                </Link>
              </Button>
            }
          />
        )}
      </ListingShell>
    </Container>
  )
}
