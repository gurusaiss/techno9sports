import Link from "next/link"
import { Button, Container } from "@t9/ui"

export default function NotFound() {
  return (
    <Container className="grid justify-items-center gap-4 py-16 text-center">
      <p className="font-display text-6xl font-extrabold text-teal">404</p>
      <h1 className="font-display text-3xl font-extrabold">We couldn&apos;t find that page</h1>
      <p className="max-w-[50ch] text-muted">
        The link may be old, or the product may no longer be available. Try a search, or start from
        one of these.
      </p>
      <form action="/search" role="search" className="flex w-full max-w-md gap-2">
        <label htmlFor="nf-q" className="sr-only">
          Search products
        </label>
        <input
          id="nf-q"
          name="q"
          type="search"
          placeholder="Search tees, joggers, frames"
          className="h-12 flex-1 rounded-full border border-line-strong bg-surface px-5 text-base"
        />
        <Button type="submit">Search</Button>
      </form>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild variant="secondary">
          <Link href="/men">Men</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/women">Women</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/frames">Frames</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/bestsellers">Bestsellers</Link>
        </Button>
      </div>
    </Container>
  )
}
