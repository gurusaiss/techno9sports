# Phase 2 (built, awaiting review): catalogue

Plan and decisions are in `docs/catalog-model.md` and `docs/catalog-csv.md`.

## Delivered

- Backend: India region and INR (GST-inclusive), categories, collections, product types, fabric technology and size chart modules, 46 placeholder products (475 variants with stock), idempotent setup and seed scripts.
- Search: a Meilisearch provider for Medusa's Search module, a product index with our filters and sorts, event-driven sync.
- APIs: product page endpoint, technologies, homepage content (store and admin), catalogue CSV import and export (admin).
- Storefront: homepage from content blocks, listing pages (categories, collections, technologies, new, sale, bestsellers, under 499, search) with URL-synced filters, sort and load-more; product page with colour-aware gallery, size guide, delivery-check shell and sticky mobile bar; search suggestions; sitemap, robots, structured data, 404 with search; on-demand revalidation.

## Known gaps

- Homepage editing screen, fabric-technology and size-chart editing screens and the CSV screen are Phase 6 (APIs and scripts exist now).
- Add to bag, wishlist, delivery estimate and notify-me are stubs until Phases 3, 5 and 6.
- Largest Contentful Paint measures about 3.2 s in Lighthouse's simulated slow-4G mobile test (scores 90 to 99 overall). Tuning is part of Phase 7.
- A never-before-seen unknown URL returns 200 with a "not found" page and `noindex` on its first request, and 404 afterwards (Next's cache components behaviour).
- Price lists starting or ending do not re-index automatically.
- Backend uses in-memory event bus and cache locally; Redis modules for production are set up in Phase 9.
