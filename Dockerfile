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
# @t9/types is only used via `import type`, erased at compile time, but medusa build
# still lists it (workspace:*) in the generated package.json, which can't resolve
# outside the monorepo. Strip any workspace: deps before the standalone install.
# Also allow lifecycle/build scripts for native deps pnpm 10 blocks by default outside
# a workspace (no pnpm-workspace.yaml here to carry the root's onlyBuiltDependencies).
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json'));for(const k of ['dependencies','devDependencies']){if(p[k])for(const d of Object.keys(p[k]))if(String(p[k][d]).startsWith('workspace:'))delete p[k][d];}p.pnpm=p.pnpm||{};p.pnpm.onlyBuiltDependencies=['@medusajs/telemetry','@swc/core','esbuild','sharp','unrs-resolver','msgpackr-extract','protobufjs','core-js'];fs.writeFileSync('package.json',JSON.stringify(p,null,2));"
RUN pnpm install --prod

EXPOSE 9000
CMD ["pnpm", "start"]
