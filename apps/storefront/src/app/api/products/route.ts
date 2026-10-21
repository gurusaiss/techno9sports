import { searchProducts } from "@/lib/catalog"
import { PAGE_SIZE, parseListingParams } from "@/lib/listing-params"
import { keyToScope } from "@/lib/scope"

/** GET /api/products?scope=category:men&page=2&size=M  ->  one more page of results ("load more"). */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const scope = keyToScope(url.searchParams.get("scope") ?? "all")
  if (!scope) return Response.json({ error: "bad scope" }, { status: 400 })
  const raw: Record<string, string[]> = {}
  for (const [k, v] of url.searchParams) {
    if (k !== "scope") (raw[k] ??= []).push(v)
  }
  const params = parseListingParams(raw)
  try {
    const result = await searchProducts(scope, params, PAGE_SIZE)
    return Response.json(
      { items: result.items, page: result.page, pageCount: result.pageCount, total: result.total },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
    )
  } catch {
    return Response.json({ error: "unavailable" }, { status: 502 })
  }
}
