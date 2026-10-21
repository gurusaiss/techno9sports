export interface NavLink {
  label: string
  href: string
}

export interface NavColumn {
  title: string
  links: NavLink[]
}

export interface NavItem {
  label: string
  href: string
  /** Rendered in the sale colour. */
  highlight?: boolean
  /** Mega-menu columns. Items without columns are plain links. */
  columns?: NavColumn[]
  /** Optional promo tile inside the mega-menu. */
  feature?: { title: string; text: string; href: string; cta: string }
}
