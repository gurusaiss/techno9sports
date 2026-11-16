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
RUN pnpm build

FROM node:22-slim AS runner
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/apps/backend/.medusa/server ./
RUN pnpm install --prod

EXPOSE 9000
CMD ["pnpm", "start"]
