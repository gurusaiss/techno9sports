# Design system: Coastal

Approved direction: **B, Coastal** (navy, coral, teal, sand; Sora headings, Manrope body; rounded cards and pill buttons; golden-hour outdoor imagery). Preview in the running storefront at `/design` (not indexed).

## Where things live

| What                                          | Where                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| Tokens (colour, type, radius, shadow, motion) | `packages/config/tokens.css`, imported by `apps/storefront/src/app/globals.css` |
| Components                                    | `packages/ui/src` (`components/`, `layout/`), exported from `@t9/ui`            |
| Sample nav, footer, search data               | `apps/storefront/src/config/site.ts` (admin-driven from Phase 2)                |
| Placeholder product art                       | `apps/storefront/src/components/placeholder-media.tsx`                          |

Change a colour in `tokens.css` and run `pnpm --filter @t9/config test`: 26 checks verify the pairs we use against WCAG 2.1 AA.

## Rules

- Use colour roles (`bg`, `surface`, `fg`, `muted`, `line`, `primary`, `link`, `focus`, `sale`) in components; brand names only for decoration. Coral and teal are fills, never body text on light backgrounds.
- Radius: `rounded-control` 10px, `rounded-card` 18px, `rounded-panel` 28px, `rounded-full` for buttons and badges. The header switches to the desktop layout at `lg` (1024px).
- Components that render links take `linkAs` (the storefront passes `next/link`). `ProductCard` takes a `media` node (the storefront passes `next/image`).

## Components

ImageGallery (swipe, thumbnails, zoom lightbox), SizeChartTable, FilterGroups (shared by the mobile drawer and desktop sidebar), Button, Badge, Price (paise in, GST-inclusive, MRP and % off), Skeleton, EmptyState, ErrorState, Breadcrumb, ProductCard, SizeSelector, ColorSwatches, FilterDrawer, Sheet, BottomSheet, Toast, Accordion, Tabs, Carousel, Container, Logo (placeholder artwork), AnnouncementBar, UspStrip, SiteHeader (mega-menu, mobile drawer, search overlay), SiteFooter.

`ProductCard` takes `headingLevel` (2 under a page h1, 3 under a section h2). `SiteHeader` loads the mobile drawer and search overlay on first use.

## Accessibility (WCAG 2.1 AA)

Radix primitives for dialogs, tabs, accordion, radio groups, checkboxes, toast. The mega-menu is our own disclosure pattern because Radix NavigationMenu fails axe (`aria-hidden-focus`). Dialogs return focus to the control that opened them (`useReturnFocus`). Touch targets are at least 44px, with a visible 3px focus ring and a skip link. Tested with 30 unit tests including axe on open dialogs and keyboard flows. Real-browser axe (colour contrast) found 0 violations at 390, 768 and 1280px before the rebuild; re-run it after any visual change.

## Known gaps

Logo is placeholder artwork. Sample copy such as "free shipping above ₹999" and "7-day returns" is not a business decision. Links to pages that do not exist yet return 404 (prefetch noise in the console). No testing with real screen readers yet (Phase 7).
