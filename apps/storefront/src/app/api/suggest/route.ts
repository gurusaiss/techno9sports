import { searchProducts } from "@/lib/catalog"
import { parseListingParams } from "@/lib/listing-params"

/** GET /api/suggest?q=dry  ->  up to 6 product suggestions for the header search. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? ""
  const params = parseListingParams({ q })
  if (params.q.length < 2) return Response.json({ suggestions: [] })
  try {
    const result = await searchProducts({}, { ...params, sort: "relevance", page: 1 }, 6)
    return Response.json(
      {
        suggestions: result.items.map((p) => ({
          label: p.title,
          href: `/products/${p.handle}`,
          kind: "product" as const,
        })),
      },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
    )
  } catch {
    return Response.json({ suggestions: [] })
  }
}
