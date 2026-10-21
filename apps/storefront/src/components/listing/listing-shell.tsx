"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SlidersHorizontal, X } from "lucide-react"
import { Button, type FilterGroup, type FilterState } from "@t9/ui"
import {
  activeFilterCount,
  type ListingParams,
  SORT_KEYS,
  type SortKey,
  toSearchParams,
} from "@/lib/listing-params"
import { activeChips, paramsFromState, stateFromParams } from "./filter-state"

// Filter UI code (accordion, checkboxes, drawer) loads only when it is shown: the sidebar at
// desktop width, the drawer after the first tap on "Filters". Keeps phone hydration light.
const FilterGroupsLazy = React.lazy(() =>
  import("@t9/ui/src/components/filter-groups").then((m) => ({ default: m.FilterGroups })),
)
const FilterDrawerLazy = React.lazy(() =>
  import("@t9/ui/src/components/filter-drawer").then((m) => ({ default: m.FilterDrawer })),
)

const DESKTOP = "(min-width: 1024px)"
function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP)
  mq.addEventListener("change", onChange)
  return () => mq.removeEventListener("change", onChange)
}

const SORT_LABEL: Record<SortKey, string> = {
  relevance: "Recommended",
  bestseller: "Bestsellers",
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  discount: "Biggest discount",
}

/**
 * Filters, sort and active chips for a listing. The URL is the source of truth: every change
 * rewrites the query string (debounced for typing), the server re-renders, and the parent
 * remounts this component with fresh props (key = query string).
 */
export function ListingShell({
  params,
  groups,
  total,
  basePath,
  techNames,
  hideRelevance,
  children,
}: {
  params: ListingParams
  groups: FilterGroup[]
  total: number
  basePath: string
  techNames: Record<string, string>
  /** Browsing pages have no text query, so "Recommended" is the bestseller order. */
  hideRelevance?: boolean
  children: React.ReactNode
}) {
  const router = useRouter()
  const [state, setState] = React.useState<FilterState>(() => stateFromParams(params))
  const [drawer, setDrawer] = React.useState(false)
  const [drawerEver, setDrawerEver] = React.useState(false)
  const isDesktop = React.useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  )
  const [pending, startTransition] = React.useTransition()
  const timer = React.useRef<number | undefined>(undefined)
  React.useEffect(() => () => window.clearTimeout(timer.current), [])

  const go = React.useCallback(
    (next: ListingParams) => {
      const qs = toSearchParams(next).toString()
      startTransition(() => router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false }))
    },
    [basePath, router],
  )

  const onFilters = (next: FilterState) => {
    setState(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => go(paramsFromState(next, params)), 250)
  }

  const chips = activeChips(params, groups, techNames)
  const count = activeFilterCount(params)
  const sorts = SORT_KEYS.filter((k) => k !== "relevance" || params.q || !hideRelevance)

  const sort = (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Sort by</span>
      <select
        value={params.sort}
        onChange={(e) => go({ ...params, sort: e.target.value as SortKey, page: 1 })}
        className="h-11 rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold"
      >
        {sorts.map((k) => (
          <option key={k} value={k}>
            {k === "relevance" && !params.q ? "Recommended" : SORT_LABEL[k]}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <div className="lg:grid lg:grid-cols-[250px_1fr] lg:gap-8">
      <aside aria-label="Filters" className="hidden lg:block">
        <div className="sticky top-[84px] max-h-[calc(100dvh-100px)] overflow-y-auto pr-2">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold">Filters</h2>
            {count > 0 ? (
              <button
                type="button"
                className="min-h-11 text-sm font-semibold text-link underline"
                onClick={() => onFilters({ options: {}, ranges: {} })}
              >
                Clear all
              </button>
            ) : null}
          </div>
          {isDesktop ? (
            <React.Suspense fallback={<div className="h-64" aria-hidden />}>
              <FilterGroupsLazy
                groups={groups}
                value={state}
                onChange={onFilters}
                defaultOpen={groups.slice(0, 3).map((g) => g.id)}
              />
            </React.Suspense>
          ) : null}
        </div>
      </aside>

      <div
        aria-busy={pending}
        className={pending ? "opacity-70 transition-opacity" : "transition-opacity"}
      >
        <div className="sticky top-[60px] z-30 -mx-4 flex items-center justify-between gap-3 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden"
            onClick={() => {
              setDrawerEver(true)
              setDrawer(true)
            }}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filters{count ? ` (${count})` : ""}
          </Button>
          <p className="hidden text-sm text-muted lg:block" role="status">
            {total} {total === 1 ? "product" : "products"}
          </p>
          {sort}
        </div>

        {chips.length ? (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Active filters">
            {chips.map((c) => (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => onFilters(c.remove(state))}
                  aria-label={`Remove filter ${c.label}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-teal-mist px-4 text-sm font-semibold hover:bg-teal-soft"
                >
                  {c.label}
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4">{children}</div>
      </div>

      {drawerEver ? (
        <React.Suspense fallback={null}>
          <FilterDrawerLazy
            open={drawer}
            onOpenChange={setDrawer}
            groups={groups}
            value={state}
            onChange={onFilters}
            resultCount={total}
          />
        </React.Suspense>
      ) : null}
    </div>
  )
}
