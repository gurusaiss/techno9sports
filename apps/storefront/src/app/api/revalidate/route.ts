import { timingSafeEqual } from "node:crypto"
import { revalidateTag } from "next/cache"

const ALLOWED =
  /^(products|catalog|categories|technologies|content|product:[a-z0-9-]+|content:[a-z0-9-]+)$/

function sameSecret(given: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * POST /api/revalidate  { "tags": ["products", "product:everyday-dry-tee"] }
 * Called by the backend when products or content change. Marks the tagged data stale; the next
 * visit refreshes it while serving the old copy (stale-while-revalidate).
 */
export async function POST(request: Request) {
  if (!sameSecret(request.headers.get("x-revalidate-secret"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }
  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null
  const tags = Array.isArray(body?.tags) ? body.tags : []
  const valid = tags
    .filter((t): t is string => typeof t === "string" && ALLOWED.test(t))
    .slice(0, 50)
  if (!valid.length) return Response.json({ error: "no valid tags" }, { status: 400 })
  for (const tag of valid) revalidateTag(tag, "max")
  return Response.json({ revalidated: valid })
}
