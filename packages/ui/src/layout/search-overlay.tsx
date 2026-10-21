"use client"

import * as React from "react"
import * as D from "@radix-ui/react-dialog"
import { Clock, Search, X } from "lucide-react"
import { cn } from "../lib/cn"
import { useReturnFocus } from "../lib/use-return-focus"

export interface SearchSuggestion {
  label: string
  href: string
  kind: "product" | "category"
}

export interface SearchOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Return suggestions for the typed query (the storefront calls Meilisearch from Phase 2). */
  getSuggestions?: (query: string) => SearchSuggestion[]
  recentSearches?: string[]
  onClearRecent?: () => void
  /** Called when the user chooses a suggestion or presses Enter on free text. */
  onSelect: (target: { href: string } | { query: string }) => void
}

export function SearchOverlay({ open, onOpenChange, ...rest }: SearchOverlayProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-navy/50 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <SearchPanel open={open} onOpenChange={onOpenChange} {...rest} />
      </D.Portal>
    </D.Root>
  )
}

// Mounts only while open, so useReturnFocus captures the opener at the right moment.
function SearchPanel({
  onOpenChange,
  getSuggestions,
  recentSearches = [],
  onClearRecent,
  onSelect,
}: SearchOverlayProps) {
  const returnFocus = useReturnFocus()
  const [query, setQuery] = React.useState("")
  const [active, setActive] = React.useState(-1)
  const listId = React.useId()
  const suggestions = React.useMemo(
    () => (query.trim() && getSuggestions ? getSuggestions(query.trim()) : []),
    [query, getSuggestions],
  )

  React.useEffect(() => {
    setActive(-1)
  }, [query])

  const choose = (s: SearchSuggestion) => {
    onSelect({ href: s.href })
    onOpenChange(false)
  }
  const submitText = (q: string) => {
    if (!q.trim()) return
    onSelect({ query: q.trim() })
    onOpenChange(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault()
      setActive((i) => (i + 1) % suggestions.length)
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault()
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const s = suggestions[active]
      if (s) choose(s)
      else submitText(query)
    }
  }

  return (
    <D.Content
      onCloseAutoFocus={returnFocus}
      aria-describedby={undefined}
      className="fixed inset-x-0 top-0 z-50 mx-auto flex max-h-dvh w-full max-w-2xl flex-col bg-surface p-4 shadow-pop outline-none lg:top-6 lg:rounded-panel"
    >
      <D.Title className="sr-only">Search products</D.Title>
      <div className="flex items-center gap-2">
        <div className="flex h-12 flex-1 items-center gap-2 rounded-full border border-line-strong px-4 focus-within:border-focus focus-within:ring-2 focus-within:ring-focus">
          <Search className="size-5 text-muted" aria-hidden />
          <input
            role="combobox"
            aria-label="Search"
            aria-expanded={suggestions.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Search tees, joggers, frames"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="min-w-0 flex-1 bg-transparent text-base outline-none"
          />
        </div>
        <D.Close
          aria-label="Close search"
          className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-teal-mist"
        >
          <X className="size-5" aria-hidden />
        </D.Close>
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        className={cn("mt-3 overflow-y-auto", !suggestions.length && "hidden")}
      >
        {suggestions.map((s, i) => (
          <li
            key={s.href}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onClick={() => choose(s)}
            className={cn(
              "flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-control px-3",
              i === active && "bg-teal-mist",
            )}
          >
            <span>{s.label}</span>
            <span className="text-xs uppercase tracking-wider text-muted">{s.kind}</span>
          </li>
        ))}
      </ul>

      {!query.trim() && recentSearches.length ? (
        <section aria-label="Recent searches" className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Recent</h2>
            {onClearRecent ? (
              <button
                type="button"
                onClick={onClearRecent}
                className="min-h-11 px-2 text-sm font-semibold text-link underline"
              >
                Clear
              </button>
            ) : null}
          </div>
          <ul className="flex flex-wrap gap-2">
            {recentSearches.map((r) => (
              <li key={r}>
                <button
                  type="button"
                  onClick={() => submitText(r)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm hover:bg-teal-mist"
                >
                  <Clock className="size-4 text-muted" aria-hidden />
                  {r}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {query.trim() && suggestions.length === 0 ? (
        <p role="status" className="mt-4 text-muted">
          No suggestions. Press Enter to search for “{query.trim()}”.
        </p>
      ) : null}
    </D.Content>
  )
}
