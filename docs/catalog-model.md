# Catalogue model (Phase 2)

How products, prices, stock, search and homepage content fit together. Written for the next developer
and for the owner's admin work in Phase 6.

## Money

- **Medusa stores prices in rupees** (major units), GST-inclusive for INR (a price preference marks `inr` as tax-inclusive). `@t9/ui` takes integer paise; the storefront converts once, in `apps/storefront/src/lib/money.ts`. Razorpay also needs paise, so convert at that boundary in Phase 4.
- **Selling price** is the variant price. **MRP** is `product.metadata.mrp` (rupees). The discount shown is derived from the two. Price lists (scheduled sales) still work on top: they change the selling price, and the MRP stays.

## Products

| What              | Where                                                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sizes and colours | Product options `Size` and `Color`; one variant per combination                                                                                                       |
| SKU               | `<prefix>-<COLOUR>-<SIZE>`, for example `T9001-NAVY-M`                                                                                                                |
| HSN code          | Native `product.hs_code` (GST invoices, Phase 4)                                                                                                                      |
| Fabric / material | Native `product.material`                                                                                                                                             |
| Gender            | `metadata.gender`: `men`, `women`, `unisex`                                                                                                                           |
| Attributes        | `metadata.attributes`: `fit`, `sleeve`, `neck`, `rise`, `impact` (tops, bottoms, bras); `shape`, `sport`, `lens` (frames)                                             |
| Feature bullets   | `metadata.features` (list of text)                                                                                                                                    |
| Swatch colours    | `metadata.color_hex` (`{ "Navy": "#0f2a43" }`)                                                                                                                        |
| Bestseller order  | `metadata.bestseller_rank` (lower is first) until real sales exist                                                                                                    |
| Images            | Product images, each tagged `metadata.color` and `metadata.view` (`front`, `detail`) so the gallery follows the colour                                                |
| Badges            | Tags `bestseller` and `new`                                                                                                                                           |
| Collections       | Medusa allows **one collection per product**, so collections hold exclusive themes (Everyday essentials, Studio and yoga, Performance training, Layers and outerwear) |
| Under ₹499, Sale  | Computed from price and discount, not stored                                                                                                                          |

Categories are a tree: `men` > `men-t-shirts`. The URL `/men/t-shirts` maps to handle `men-t-shirts`. Products are assigned a leaf category; search indexes the parent too, so `/men` lists everything under it.

**Custom modules** (apps/backend/src/modules):

- `fabric_technology`: owner-editable names, taglines and copy (T9 Dry and so on), linked to products (many to many).
- `size_chart`: a chart shared by many products (`columns`, `sizes`, `rows` keyed by size, unit `in`/`cm`/`mm`).
- `content`: homepage blocks (below).
- `search-meilisearch`: the Meilisearch provider for Medusa's Search module.

Names are placeholders. Links emit no events, so anything that changes them must emit `product.updated` (the CSV importer does).

## Search

Medusa's Search module defines the index (`src/search/product.ts`); our provider talks to Meilisearch. The storefront never calls Meilisearch directly: it posts to `/store/search`, so Algolia or Typesense can replace Meilisearch by swapping the provider in `medusa-config.ts`.

Key index fields: `title`, `technology_names`, `category_names`, `option_values` (searchable); `gender`, `categories`, `collection`, `product_type`, `tags`, `technologies`, `fit`, `sleeve`, `neck`, `shape`, `sport`, `sizes`, `sizes_available`, `colors`, `in_stock` (filter and facet); `min_price_inr`, `mrp`, `discount_percent`, `bestseller_rank`, `created_at`, `in_stock` (sort).

What re-indexes a product: product, variant, option, tag, category, sales channel, inventory level and technology events. **Not covered**: price lists starting or ending (Medusa emits no event; needs a reindex job, Phase 6).

After changing `src/search/product.ts`: `pnpm --filter @t9/backend migrate`, then restart the backend, which fills the new index version.

## Store API (apps/backend/src/api/store)

- `POST /store/search`: Medusa's endpoint (filters, facets, sort, pagination).
- `GET /store/catalog/products/:handle`: the product page in one response: INR price, MRP, per-variant availability (exact stock only when 5 or fewer), colour-tagged images, technology, size chart. Admin-only data (HSN, rank) is never returned.
- `GET /store/catalog/technologies`.
- `GET /store/content/pages/:page`: live homepage blocks (validated, scheduled, in order).
  All need the publishable key header. The shared response types are in `packages/types`.

## Homepage content

`content_block` rows: `page`, `type`, `label`, `position`, `is_active`, `starts_at`/`ends_at`, `data` (validated per type by `src/lib/content-blocks.ts`). Types: `offer_strip`, `hero_carousel`, `usp_strip`, `category_tiles`, `product_rail`, `technology_highlights`, `promo_banner`, `newsletter`. Product rails are queries (tags, collection, categories, technology, price cap, sale, sort), not fixed lists. Admin API: `GET/POST /admin/content/blocks`, `GET/POST/DELETE /admin/content/blocks/:id`. **The editing screen is Phase 6**; until then use the API or the seed script.

## Storefront caching

Pages use Next's `"use cache"` with tags (`products`, `catalog`, `categories`, `technologies`, `content`, `product:<handle>`, `content:<page>`). The backend calls `POST /api/revalidate` (shared secret) when products, categories, stock or content change, batched over 1.5 seconds. First visit after a change shows the old page while it refreshes (stale-while-revalidate); the next shows the new one.

## Seed and reset

`pnpm --filter @t9/backend seed` runs `seed:store` (India, INR, warehouse, publishable key), `seed:catalog` (46 products, 475 variants with stock, generated placeholder images) and `seed:content` (homepage). **Start the backend first** (`pnpm dev`) so the search index is active while seeding. All three are safe to rerun.
