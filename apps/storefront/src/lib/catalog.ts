import { cacheLife, cacheTag } from "next/cache"
import type { CategoryNode, ContentBlock, StoreProduct, StoreTechnology } from "@t9/types"
import { ApiError, medusa } from "./api"
import { buildSearchBody, HIT_FIELDS, type ListingScope } from "./catalog-query"
import { PAGE_SIZE, type ListingParams } from "./listing-params"
import { mapSearchResult, type ListingResult } from "./search-result"

/**
 * Cached catalogue reads. Each function is its own cache entry keyed by its arguments, and carries
 * tags so the backend can invalidate on product or content changes (see /api/revalidate).
 */

interface RawCategory {
  id: string
  name: string
  handle: string
  category_children?: RawCategory[]
}
const toNode = (c: RawCategory): CategoryNode => ({
  id: c.id,
  name: c.name,
  handle: c.handle,
  children: (c.category_children ?? []).map(toNode),
})

export async function getCategoryTree(): Promise<CategoryNode[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("categories")
  const res = await medusa<{ product_categories: RawCategory[] }>(
    "/store/product-categories?include_descendants_tree=true&parent_category_id=null&limit=100&fields=id,name,handle,*category_children",
  )
  return res.product_categories.map(toNode)
}

export async function getTechnologies(): Promise<StoreTechnology[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("technologies")
  const res = await medusa<{ technologies: StoreTechnology[] }>("/store/catalog/technologies")
  return res.technologies
}

export async function getPageBlocks(page: string): Promise<ContentBlock[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("content", `content:${page}`)
  try {
    const res = await medusa<{ blocks: ContentBlock[] }>(`/store/content/pages/${page}`)
    return res.blocks
  } catch (e) {
    // A content outage should not take the page down; the page renders without blocks.
    if (e instanceof ApiError) return []
    throw e
  }
}

export async function getProduct(handle: string): Promise<StoreProduct | null> {
  "use cache"
  cacheLife("minutes")
  cacheTag("products", `product:${handle}`)
  try {
    const res = await medusa<{ product: StoreProduct }>(
      `/store/catalog/products/${encodeURIComponent(handle)}`,
    )
    return res.product
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}

export async function searchProducts(
  scope: ListingScope,
  params: ListingParams,
  take: number = PAGE_SIZE,
): Promise<ListingResult> {
  "use cache"
  cacheLife("minutes")
  cacheTag("catalog")
  const res = await medusa<{ results: Parameters<typeof mapSearchResult>[0][] }>("/store/search", {
    method: "POST",
    body: JSON.stringify(buildSearchBody(scope, params, take)),
  })
  return mapSearchResult(res.results[0]!, params.page, take)
}

/** Every published handle, for the sitemap. */
export async function getAllProductHandles(): Promise<{ handle: string; updated: string }[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("catalog", "products")
  const out: { handle: string; updated: string }[] = []
  for (let skip = 0; skip < 5000; skip += 100) {
    const res = await medusa<{
      results: { hits: { document: { handle: string; created_at: number | string } }[] }[]
    }>("/store/search", {
      method: "POST",
      body: JSON.stringify({
        entity: "product",
        fields: ["handle", "created_at"],
        pagination: { skip, take: 100 },
      }),
    })
    const hits = res.results[0]!.hits
    for (const h of hits) {
      out.push({
        handle: h.document.handle,
        updated: new Date(h.document.created_at).toISOString(),
      })
    }
    if (hits.length < 100) break
  }
  return out
}

export interface CollectionInfo {
  id: string
  handle: string
  title: string
}

export async function getCollections(): Promise<CollectionInfo[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("catalog", "categories")
  const res = await medusa<{ collections: CollectionInfo[] }>(
    "/store/collections?limit=100&fields=id,handle,title",
  )
  return res.collections
}

/** Cards for specific product ids (wishlist). Not cached: the list is the visitor's own. */
export async function getProductsByIds(ids: string[]): Promise<import("@t9/types").ProductHit[]> {
  const unique = [...new Set(ids)].slice(0, 100)
  if (!unique.length) return []
  const res = await medusa<{ results: Parameters<typeof mapSearchResult>[0][] }>("/store/search", {
    method: "POST",
    body: JSON.stringify({
      entity: "product",
      fields: [...HIT_FIELDS],
      filters: { id: { $in: unique } },
      pagination: { skip: 0, take: unique.length },
    }),
    cache: "no-store",
  })
  const order = new Map(unique.map((id, i) => [id, i]))
  return mapSearchResult(res.results[0]!, 1, unique.length).items.sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  )
}
