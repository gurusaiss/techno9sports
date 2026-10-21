import type { MetadataRoute } from "next"
import {
  getAllProductHandles,
  getCategoryTree,
  getCollections,
  getTechnologies,
} from "@/lib/catalog"
import { categoryHref } from "@/lib/nav"
import { safe } from "@/lib/safe"
import { absoluteUrl } from "@/lib/seo"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tree, collections, technologies, products] = await Promise.all([
    safe(getCategoryTree, []),
    safe(getCollections, []),
    safe(getTechnologies, []),
    safe(getAllProductHandles, []),
  ])
  const entry = (path: string, priority: number, lastModified?: string) => ({
    url: absoluteUrl(path),
    ...(lastModified ? { lastModified } : {}),
    changeFrequency: "daily" as const,
    priority,
  })
  return [
    entry("/", 1),
    entry("/new", 0.7),
    entry("/sale", 0.7),
    entry("/bestsellers", 0.7),
    entry("/under-499", 0.5),
    ...tree.flatMap((top) => [
      entry(categoryHref(top.handle), 0.9),
      ...top.children.map((c) => entry(categoryHref(c.handle, top.handle), 0.8)),
    ]),
    ...collections.map((c) => entry(`/collections/${c.handle}`, 0.6)),
    ...technologies.map((t) => entry(`/technology/${t.handle}`, 0.6)),
    ...products.map((p) => entry(`/products/${p.handle}`, 0.8, p.updated)),
  ]
}
