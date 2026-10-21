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

## Design system

Tokens in `packages/config/tokens.css` (contrast-tested), components in `packages/ui`, preview at `/design`. See `docs/design/design-system.md`.

## Gotchas

- The cloud sandbox is ephemeral: it was reset once and everything uncommitted AND unbundled was lost. Commit often, send bundles.
- Medusa 2.21.2; Next 16 (read node_modules/next/dist/docs before using new APIs). Medusa stores amounts in major units (rupees), not paise: convert at boundaries.
- Starter migration script `initial-data-seed` seeds sample region/data: replace in Phase 2 (India, INR).
- No Docker daemon in the sandbox: native Postgres at /var/lib/t9pg (needs recreating after a reset), Redis default.
- Never `pkill -f` with a pattern that matches your own command line (kills your shell, exit 144). Kill by PID.
- Radix Dialog only restores focus to a Dialog.Trigger; sheets and the search overlay use `useReturnFocus`. Radix NavigationMenu fails axe; the mega-menu is our own.
- jsdom cannot check colour contrast: run axe in real Chromium (/opt/pw-browsers) via playwright-core.
- Prettier reflows JSX, so scripted string replaces can silently miss: grep after editing.
- Storefront `typecheck` runs `next typegen` first so it works on a clean checkout.

## Status

Phase 0 and 1 rebuilt after the sandbox reset, all checks green. Phase 2 (catalog) not started.
