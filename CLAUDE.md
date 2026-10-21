# Techno9Sports: project memory

Spec: the owner's `TECHNO9SPORTS_BUILD_PROMPT.md` (kept by the owner, not in this repo). Domain: techno9sports.in. Reference UX only: technosport.in (never copy its brand assets, copy, or fabric names).

## Priorities

1. Money / stock / order correctness. 2. Security. 3. Mobile speed. 4. Maintainability.

## Stack (fixed unless owner approves a change)

pnpm + Turborepo; Next.js App Router + TS strict + Tailwind + shadcn/Radix; Medusa v2 (+ admin); PostgreSQL; Redis; Meilisearch; Azure Blob (Azurite locally); Razorpay + COD; Shiprocket; Resend; MSG91; GA4/Meta; App Insights + Sentry; Vitest/Jest, Supertest, Playwright, k6; GitHub Actions -> ACR -> Azure Container Apps; Bicep; Key Vault. Own Medusa modules for Razorpay/Shiprocket unless a plugin passes review.

## Rules

- NO PUSH: never push to any remote, open PRs, or deploy until the owner explicitly says so (after all phases). Local work only. Backups: send the owner a `git bundle` through chat at each milestone (owner-approved).
- Phases 0-11; STOP at the end of each phase; write the plan and wait for "go" before each.
- Azure deploy and go-live are last (phases 9-10).
- Server computes all amounts. Webhooks verified and idempotent. No card/PII in logs.
- Business values (shipping, COD, returns, GST bands, coupons, fabric names) are config/admin settings, never hard-coded.
- Never commit secrets; keep `.env.example` documented. Conventional Commits; feature branches -> `develop`; `main` = production.
- Ask the owner for brand/policy/business details (see docs/open-questions.md). Razorpay test mode only until Phase 10. Seed 40+ placeholder products; placeholder images only.

## Commands

`pnpm dev` | `pnpm lint` | `pnpm typecheck` | `pnpm test` | `pnpm build` | `pnpm format`. Backend: `pnpm --filter @t9/backend migrate`.

## Decisions (owner)

Frames = sports eyewear (own category and attributes). Kids = later. IaC = Bicep. Coastal design direction approved.

## Catalogue

Products, prices (rupees), search, content blocks and CSV: docs/catalog-model.md and docs/catalog-csv.md. API contract types live in `packages/types`.

## Design system

Tokens in `packages/config/tokens.css` (contrast-tested), components in `packages/ui`, preview at `/design`. See `docs/design/design-system.md`.

## Gotchas

- The cloud sandbox is ephemeral: it was reset once and everything uncommitted AND unbundled was lost. Commit often, send bundles.
- Medusa 2.21.2; Next 16 (read node_modules/next/dist/docs before using new APIs). Medusa stores amounts in major units (rupees), not paise: convert at boundaries.
- Dev data: `pnpm --filter @t9/backend seed` (store, catalogue, homepage). Start the backend first so the search index is active. Reset = drop the `t9` DB, delete the Meilisearch indexes, migrate, create the admin user, seed.
- Meilisearch runs natively here (/opt/meili/meilisearch, data /var/lib/t9meili); it is not in Docker. Restart it and Postgres/Redis after a container reset.
- Medusa model changes need `medusa db:generate <module>`; delete the module's migrations folder INCLUDING `.snapshot-*.json` before regenerating, or you get an ALTER instead of a CREATE.
- Search index schema change: `pnpm --filter @t9/backend migrate`, then restart the backend (it seeds the new version).
- Next 16 cache components: pass client components, not functions like `next/link`, from server components; read `searchParams` inside Suspense; `NEXT_PUBLIC_*` env is baked in at build, so server-only values use plain names (MEDUSA_PUBLISHABLE_KEY).
- Turbopack can serve stale workspace-package code: `rm -rf apps/storefront/.next` before judging a change.
- Find servers by PID file or listening port, never `pkill -f`/`ps | awk` patterns (they match your own shell).
- The sandbox blocks `rm -rf <dir>/*`; remove files individually or leave them.
- No Docker daemon in the sandbox: native Postgres at /var/lib/t9pg (needs recreating after a reset), Redis default.
- Never `pkill -f` with a pattern that matches your own command line (kills your shell, exit 144). Kill by PID.
- Radix Dialog only restores focus to a Dialog.Trigger; sheets and the search overlay use `useReturnFocus`. Radix NavigationMenu fails axe; the mega-menu is our own.
- jsdom cannot check colour contrast: run axe in real Chromium (/opt/pw-browsers) via playwright-core.
- Prettier reflows JSX, so scripted string replaces can silently miss: grep after editing.
- Storefront `typecheck` runs `next typegen` first so it works on a clean checkout.

## Status

Phases 0 and 1 done. Phase 2 (catalogue) built, awaiting owner review: see docs/phase-2-plan.md, docs/catalog-model.md, docs/catalog-csv.md.
