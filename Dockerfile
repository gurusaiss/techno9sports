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
# .medusa/server's generated package.json has no packageManager field, so without this
# Corepack fetches whatever the latest pnpm major is instead of the version (and its
# onlyBuiltDependencies behavior) the rest of this repo is pinned to and tested against.
RUN corepack prepare pnpm@10.28.0 --activate
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/apps/backend/.medusa/server ./
# @t9/types is only used via `import type`, erased at compile time, but medusa build
# still lists it (workspace:*) in the generated package.json, which can't resolve
# outside the monorepo. Strip any workspace: deps before the standalone install.
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json'));for(const k of ['dependencies','devDependencies']){if(p[k])for(const d of Object.keys(p[k]))if(String(p[k][d]).startsWith('workspace:'))delete p[k][d];}fs.writeFileSync('package.json',JSON.stringify(p,null,2));"
# pnpm 10 blocks native build/postinstall scripts unless allowed via onlyBuiltDependencies
# in a pnpm-workspace.yaml. The package.json "pnpm.onlyBuiltDependencies" field is not
# honored here, so give this standalone install its own single-package workspace file
# (same list the monorepo root already trusts in its own pnpm-workspace.yaml).
RUN printf 'onlyBuiltDependencies:\n  - "@medusajs/telemetry"\n  - "@swc/core"\n  - esbuild\n  - sharp\n  - unrs-resolver\n  - msgpackr-extract\n  - protobufjs\n  - core-js\n' > pnpm-workspace.yaml
RUN pnpm install --prod

EXPOSE 9000
CMD ["pnpm", "start"]
