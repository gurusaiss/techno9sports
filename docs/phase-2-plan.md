# Phase 2 plan: catalog

## Decisions

- **Money:** Medusa stores prices in rupees (major units). Variant price = selling price, GST-inclusive. MRP is `product.metadata.mrp` (rupees). The storefront converts to paise at the boundary for `@t9/ui`.
- **Attributes** (gender, fit, sleeve, neck, frame shape, hsn_code): `product.metadata`. Size and Colour are product options.
- **Custom modules:** `fabric_tech` (admin-editable names) and `size_chart`, linked to products.
- **Search:** a `SearchProvider` interface with a Meilisearch implementation (Algolia-replaceable), synced by subscribers on product events.
- **Homepage:** `content` module with typed blocks plus a store API now; the admin editing screen lands in Phase 6.
- **Images:** generated placeholders until real photos arrive.

## Steps

1. Backend: India region and INR, categories, collections, product types, custom modules, seed 40+ products.
2. Search: Meilisearch provider, indexing, sync, `/store/search`.
3. Storefront: data layer, listing (filters, sort), product page, search page, homepage, SEO basics.
4. Checks: tests, Lighthouse mobile >= 90, bundle backup.
