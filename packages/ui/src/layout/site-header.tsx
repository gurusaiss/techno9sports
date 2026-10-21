"use client"

import * as React from "react"
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react"
import { Container } from "./container"
import { Logo } from "./logo"
import { MegaMenu } from "./mega-menu"
import { MobileDrawer } from "./mobile-drawer"
import { SearchOverlay, type SearchOverlayProps } from "./search-overlay"
import type { NavItem, NavLink } from "./nav-types"

export interface SiteHeaderProps {
  nav: NavItem[]
  secondaryNav?: NavLink[]
  cartCount?: number
  homeHref?: string
  wishlistHref?: string
  accountHref?: string
  cartHref?: string
  search: Omit<SearchOverlayProps, "open" | "onOpenChange">
  /** Slot above the header, for the announcement bar. */
  announcement?: React.ReactNode
  linkAs?: React.ElementType
}

const iconBtn = "relative grid size-11 place-items-center rounded-full hover:bg-teal-mist"

export function SiteHeader({
  nav,
  secondaryNav,
  cartCount = 0,
  homeHref = "/",
  wishlistHref = "/wishlist",
  accountHref = "/account",
  cartHref = "/cart",
  search,
  announcement,
  linkAs: Link = "a",
}: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)

  return (
    <>
      {announcement}
      <header className="sticky top-0 z-40 border-b border-line bg-bg">
        <Container className="flex h-[60px] items-center gap-3">
          <button
            type="button"
            className={`${iconBtn} lg:hidden`}
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-6" aria-hidden />
          </button>
          <Link href={homeHref} className="flex items-center rounded-control">
            <Logo label="Techno9Sports, home" />
          </Link>
          <div className="ml-6 hidden lg:block">
            <MegaMenu items={nav} linkAs={Link} />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden h-11 min-w-56 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm text-muted lg:flex"
            >
              <Search className="size-[18px]" aria-hidden />
              Search tees, joggers, frames
            </button>
            <button
              type="button"
              className={`${iconBtn} lg:hidden`}
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-6" aria-hidden />
            </button>
            <Link href={wishlistHref} className={`${iconBtn} hidden lg:grid`} aria-label="Wishlist">
              <Heart className="size-6" aria-hidden />
            </Link>
            <Link href={accountHref} className={`${iconBtn} hidden lg:grid`} aria-label="Account">
              <User className="size-6" aria-hidden />
            </Link>
            <Link
              href={cartHref}
              className={iconBtn}
              aria-label={
                cartCount > 0
                  ? `Bag, ${cartCount} ${cartCount === 1 ? "item" : "items"}`
                  : "Bag, empty"
              }
            >
              <ShoppingBag className="size-6" aria-hidden />
              {cartCount > 0 ? (
                <span
                  aria-hidden
                  className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-on-primary"
                >
                  {cartCount}
                </span>
              ) : null}
            </Link>
          </div>
        </Container>
      </header>
      <MobileDrawer
        open={menuOpen}
        onOpenChange={setMenuOpen}
        items={nav}
        secondary={secondaryNav}
        linkAs={Link}
      />
      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} {...search} />
    </>
  )
}
