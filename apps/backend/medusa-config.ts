import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

// Search: Meilisearch when MEILISEARCH_HOST is set, otherwise the in-memory local provider
// (tests and quick starts). The storefront only talks to /store/search, so the engine is swappable.
const searchProvider = process.env.MEILISEARCH_HOST
  ? {
      resolve: "./src/modules/search-meilisearch",
      id: "meilisearch",
      options: {
        host: process.env.MEILISEARCH_HOST,
        apiKey: process.env.MEILISEARCH_API_KEY ?? "",
      },
    }
  : { resolve: "@medusajs/medusa/search-local", id: "local" }

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  modules: [
    { resolve: "./src/modules/fabric-technology" },
    { resolve: "./src/modules/size-chart" },
    {
      resolve: "@medusajs/medusa/search",
      options: { providers: [searchProvider], default_provider: searchProvider.id },
    },
  ],
})
