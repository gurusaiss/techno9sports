# Techno9Sports

Activewear and sports eyewear store for India. Monorepo: Next.js storefront + Medusa v2 backend/admin.
Rules and decisions: `CLAUDE.md`. Docs: `docs/`.

## Prerequisites

Node 22 (`.nvmrc`), pnpm 10, Docker (or native Postgres 16 + Redis).

## First-time setup

```bash
pnpm install
pnpm infra:up                                   # Postgres, Redis, Meilisearch, Azurite, Mailpit
cp apps/backend/.env.example apps/backend/.env  # set AUTH_MFA_ENCRYPTION_KEY (openssl rand -hex 32), secrets
cp apps/storefront/.env.example apps/storefront/.env.local
pnpm --filter @t9/backend migrate
pnpm --filter @t9/backend exec medusa user -e you@example.com -p 'a-strong-password'
```

## Run

```bash
pnpm dev     # storefront :8000, API :9000, admin :9000/app
```

## Checks (same as CI)

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
