import type { ListingScope } from "./catalog-query"

/**
 * A listing's scope as a short string, for the load-more endpoint (which must not accept arbitrary
 * filters from the URL). Examples: category:men-t-shirts, collection:everyday-essentials, tag:new,
 * tech:t9-dry, sale, under:499, all.
 */
const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function scopeToKey(scope: ListingScope): string {
  if (scope.categories?.length === 1) return `category:${scope.categories[0]}`
  if (scope.collection) return `collection:${scope.collection}`
  if (scope.tags?.length === 1) return `tag:${scope.tags[0]}`
  if (scope.technologies?.length === 1) return `tech:${scope.technologies[0]}`
  if (scope.onSale) return "sale"
  if (scope.maxPrice !== undefined) return `under:${scope.maxPrice}`
  return "all"
}

export function keyToScope(key: string): ListingScope | null {
  if (key === "all") return {}
  if (key === "sale") return { onSale: true }
  const [kind, value] = key.split(":")
  if (!kind || !value) return null
  if (kind === "under") {
    const n = Number(value)
    return Number.isInteger(n) && n > 0 && n <= 100000 ? { maxPrice: n } : null
  }
  if (!HANDLE.test(value)) return null
  if (kind === "category") return { categories: [value] }
  if (kind === "collection") return { collection: value }
  if (kind === "tag") return { tags: [value] }
  if (kind === "tech") return { technologies: [value] }
  return null
}
