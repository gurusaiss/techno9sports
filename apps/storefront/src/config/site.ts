import type { NavColumn, NavLink } from "@t9/ui"

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
