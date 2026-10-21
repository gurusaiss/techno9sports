import type { NavColumn, NavItem, NavLink } from "@t9/ui"

/**
 * Sample navigation. From Phase 2 this comes from admin-managed categories.
 * Frames = sports eyewear.
 */
export const nav: NavItem[] = [
  {
    label: "Men",
    href: "/men",
    columns: [
      {
        title: "Tops",
        links: [
          { label: "T-shirts", href: "/men/t-shirts" },
          { label: "Polos", href: "/men/polos" },
          { label: "Tank tops", href: "/men/tank-tops" },
          { label: "Hoodies & sweatshirts", href: "/men/hoodies" },
          { label: "Jackets", href: "/men/jackets" },
        ],
      },
      {
        title: "Bottoms",
        links: [
          { label: "Joggers", href: "/men/joggers" },
          { label: "Track pants", href: "/men/track-pants" },
          { label: "Shorts", href: "/men/shorts" },
        ],
      },
      {
        title: "More",
        links: [
          { label: "Innerwear", href: "/men/innerwear" },
          { label: "New arrivals", href: "/men/new" },
        ],
      },
    ],
    feature: {
      title: "T9 Dry",
      text: "Sweat-wicking tees from ₹299",
      href: "/technology/t9-dry",
      cta: "Shop the tech",
    },
  },
  {
    label: "Women",
    href: "/women",
    columns: [
      {
        title: "Tops",
        links: [
          { label: "T-shirts", href: "/women/t-shirts" },
          { label: "Tank tops", href: "/women/tank-tops" },
          { label: "Sports bras", href: "/women/sports-bras" },
          { label: "Hoodies & sweatshirts", href: "/women/hoodies" },
        ],
      },
      {
        title: "Bottoms",
        links: [
          { label: "Leggings", href: "/women/leggings" },
          { label: "Joggers", href: "/women/joggers" },
          { label: "Shorts", href: "/women/shorts" },
        ],
      },
    ],
    feature: {
      title: "T9 Flex",
      text: "4-way stretch for every move",
      href: "/technology/t9-flex",
      cta: "Shop the tech",
    },
  },
  { label: "Unisex", href: "/unisex" },
  {
    label: "Frames",
    href: "/frames",
    columns: [
      {
        title: "By style",
        links: [
          { label: "Wrap", href: "/frames/wrap" },
          { label: "Round", href: "/frames/round" },
          { label: "Rectangle", href: "/frames/rectangle" },
        ],
      },
      {
        title: "By sport",
        links: [
          { label: "Running", href: "/frames/running" },
          { label: "Cycling", href: "/frames/cycling" },
          { label: "Cricket", href: "/frames/cricket" },
        ],
      },
    ],
  },
  { label: "Accessories", href: "/accessories" },
  { label: "Sale", href: "/sale", highlight: true },
]

export const secondaryNav: NavLink[] = [
  { label: "Track order", href: "/track-order" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "My account", href: "/account" },
  { label: "Help & contact", href: "/contact" },
]

/** Legal pages are templates until the owner supplies business details. */
export const footerColumns: NavColumn[] = [
  {
    title: "Shop",
    links: [
      { label: "Men", href: "/men" },
      { label: "Women", href: "/women" },
      { label: "Frames", href: "/frames" },
      { label: "Sale", href: "/sale" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Track order", href: "/track-order" },
      { label: "Returns & refunds", href: "/returns" },
      { label: "Size guide", href: "/size-guide" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
      { label: "Grievance officer", href: "/grievance" },
    ],
  },
]

/** Sample search data; replaced by Meilisearch in Phase 2. */
export const sampleSuggestions = [
  { label: "Everyday Dry Tee", href: "/products/everyday-dry-tee", kind: "product" as const },
  {
    label: "Flex Training Joggers",
    href: "/products/flex-training-joggers",
    kind: "product" as const,
  },
  { label: "Pace Sports Frames", href: "/products/pace-sports-frames", kind: "product" as const },
  { label: "Men T-shirts", href: "/men/t-shirts", kind: "category" as const },
  { label: "Women Leggings", href: "/women/leggings", kind: "category" as const },
  { label: "Frames", href: "/frames", kind: "category" as const },
]
