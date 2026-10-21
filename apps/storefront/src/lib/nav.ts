import type { CategoryNode, StoreTechnology } from "@t9/types"
import type { NavColumn, NavItem } from "@t9/ui"

/**
 * Header navigation, built from the category tree. Category handles are `<parent>-<child>`
 * (men-t-shirts), mapped to the URL /men/t-shirts. How children are grouped into mega-menu
 * columns is presentation, so it lives here; categories the config doesn't know land in "More".
 */
export const COLUMN_GROUPS: Record<string, { title: string; children: string[] }[]> = {
  men: [
    { title: "Tops", children: ["t-shirts", "polos", "tank-tops", "hoodies", "jackets"] },
    { title: "Bottoms", children: ["joggers", "track-pants", "shorts"] },
  ],
  women: [
    { title: "Tops", children: ["t-shirts", "tank-tops", "sports-bras", "hoodies"] },
    { title: "Bottoms", children: ["leggings", "joggers", "shorts"] },
  ],
  frames: [{ title: "By style", children: ["wrap", "round", "rectangle"] }],
}

/** Sports for the frames menu: filter values on the `sport` attribute, not categories. */
export const FRAME_SPORTS = ["Running", "Cycling", "Cricket", "Trail"]

/** Mega-menu promo tile per section: the technology it features. */
const FEATURED_TECH: Record<string, string> = { men: "t9-dry", women: "t9-flex" }

const TOP_ORDER = ["men", "women", "unisex", "frames", "accessories"]

export function categoryHref(handle: string, parent?: string): string {
  if (parent && handle.startsWith(`${parent}-`))
    return `/${parent}/${handle.slice(parent.length + 1)}`
  return `/${handle}`
}

export function buildNav(tree: CategoryNode[], technologies: StoreTechnology[] = []): NavItem[] {
  const tops = [...tree].sort(
    (a, b) =>
      ((TOP_ORDER.indexOf(a.handle) + 100) % 100) - ((TOP_ORDER.indexOf(b.handle) + 100) % 100),
  )
  const items: NavItem[] = tops.map((top) => {
    const byChildSlug = new Map(
      top.children.map((c) => [c.handle.slice(top.handle.length + 1), c] as const),
    )
    const used = new Set<string>()
    const columns: NavColumn[] = []

    for (const group of COLUMN_GROUPS[top.handle] ?? []) {
      const links = group.children.flatMap((slug) => {
        const c = byChildSlug.get(slug)
        if (!c) return []
        used.add(slug)
        return [{ label: c.name, href: categoryHref(c.handle, top.handle) }]
      })
      if (links.length) columns.push({ title: group.title, links })
    }
    const rest = top.children.filter((c) => !used.has(c.handle.slice(top.handle.length + 1)))
    if (rest.length) {
      columns.push({
        title: columns.length ? "More" : "Shop",
        links: rest.map((c) => ({ label: c.name, href: categoryHref(c.handle, top.handle) })),
      })
    }
    if (top.handle === "frames") {
      columns.push({
        title: "By sport",
        links: FRAME_SPORTS.map((s) => ({
          label: s,
          href: `/frames?sport=${encodeURIComponent(s)}`,
        })),
      })
    }

    const tech = technologies.find((t) => t.handle === FEATURED_TECH[top.handle])
    return {
      label: top.name,
      href: `/${top.handle}`,
      ...(columns.length ? { columns } : {}),
      ...(tech
        ? {
            feature: {
              title: tech.name,
              text: tech.tagline ?? "",
              href: `/technology/${tech.handle}`,
              cta: "Shop the tech",
            },
          }
        : {}),
    }
  })
  return [
    ...items,
    { label: "Sale", href: "/sale", highlight: true },
    { label: "New", href: "/new" },
  ]
}

/** Resolve /men or /men/t-shirts to a category handle, or null when it isn't one. */
export function resolveCategoryHandle(segments: string[], tree: CategoryNode[]): string | null {
  const [top, child, ...extra] = segments
  if (!top || extra.length) return null
  const parent = tree.find((c) => c.handle === top)
  if (!parent) return null
  if (!child) return parent.handle
  const handle = `${parent.handle}-${child}`
  return parent.children.some((c) => c.handle === handle) ? handle : null
}
