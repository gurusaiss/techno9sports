# Catalogue CSV: bulk edit in a spreadsheet

Two sheets. Both are validated before anything is written: if **any** row has an error, **nothing** is imported and every error is listed with its line number. Templates: `docs/templates/`.

## Workflow

1. Export the current sheet: `GET /admin/catalog/export?kind=products` (or `stock`).
2. Edit it in Excel or Google Sheets and save as **CSV UTF-8**.
3. Check it: `POST /admin/catalog/import` with `{ "kind": "products", "csv": "...", "dry_run": true }`. This is the default; it reports what would be created, changed or left alone.
4. Apply it with `"dry_run": false`.

From the command line: `pnpm --filter @t9/backend exec medusa exec ./src/scripts/import-catalog-csv.ts products ./products.csv` (dry run), add `apply` to import. A screen in the admin comes in Phase 6.

Limits: 500 rows and 2 MB per file. Spreadsheet formulas (text starting with `=`, `+`, `@`) are neutralised in exports.

## Product sheet (one row per product)

| Column                                              | Required | Notes                                                                                                  |
| --------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| handle                                              | yes      | lowercase letters, numbers, hyphens. Matches an existing product to update it, otherwise creates one   |
| title                                               | yes      |                                                                                                        |
| status                                              | no       | `draft` (default) or `published`. New products have no images: add them in the admin before publishing |
| gender                                              | yes      | `men`, `women`, `unisex`                                                                               |
| categories                                          | yes      | category handles separated by `\|`, for example `men-t-shirts`                                         |
| collection                                          | no       | one collection handle                                                                                  |
| type                                                | yes      | an existing product type, for example `T-shirt`                                                        |
| tags                                                | no       | `\|` separated; `bestseller` and `new` drive badges                                                    |
| technologies                                        | no       | technology handles, `\|` separated                                                                     |
| size_chart                                          | no       | size chart handle                                                                                      |
| sizes, colors                                       | yes      | `\|` separated lists (1 to 12 each). New products get one variant per size and colour                  |
| color_hex                                           | no       | `Navy:#0f2a43\|Coral:#ff6b4a`; known colours have defaults                                             |
| price, mrp                                          | yes      | rupees, like `449` or `449.50`. MRP must be at least the price. GST-inclusive                          |
| hsn_code                                            | no       | 4, 6 or 8 digits                                                                                       |
| fabric, description, features                       | no       | features separated by `\|`                                                                             |
| fit, sleeve, neck, shape, sport, rise, impact, lens | no       | attributes used for filters                                                                            |
| sku_prefix                                          | yes      | 2 to 12 capitals or digits, unique per product; SKUs become `PREFIX-COLOUR-SIZE`                       |
| weight_g, bestseller_rank                           | no       | whole numbers                                                                                          |

Updating an existing product changes its details, categories, tags, technologies, size chart and the price of **every** variant. It does **not** add or remove sizes or colours (you get a warning); do that in the admin. Attributes the sheet has no column for are kept.

## Stock sheet (one row per SKU)

`sku,quantity` (an exported sheet also has `product` and `variant` columns for reading; they are ignored). The quantity is the **absolute** stock at the warehouse, not a change. Unknown SKUs are errors. A quantity below what open orders have reserved is allowed but flagged.
