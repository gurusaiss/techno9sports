# Builds the Medusa backend (apps/backend) for Fly.io.
# Build context is the repo root (pnpm workspace), output is the standalone
# .medusa/server bundle Medusa produces, which gets its own prod-only install.

FROM node:22-slim AS build
RUN corepack enable
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/backend ./apps/backend

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/backend
# medusa-config.ts picks the search provider at build time based on MEILISEARCH_HOST.
# Without it set, it falls back to @medusajs/medusa/search-local, whose subpath doesn't
# resolve under pnpm's strict node_modules layout. Any truthy value steers the build to
# the real (./src/modules/search-meilisearch) provider instead; the real host/key are set
# as runtime secrets separately and used at request time, not baked into this build.
ENV MEILISEARCH_HOST=https://build-placeholder.invalid
RUN pnpm build

FROM node:22-slim AS runner
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/apps/backend/.medusa/server ./
RUN pnpm install --prod

EXPOSE 9000
CMD ["pnpm", "start"]
