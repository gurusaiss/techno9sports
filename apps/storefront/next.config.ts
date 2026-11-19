import type { NextConfig } from "next"

// Product media is served by the Medusa file provider (local disk in dev, Azure Blob + CDN later).
const mediaUrl =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL &&
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL.trim() !== ""
    ? process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
    : "http://localhost:9000"
const media = new URL(mediaUrl)

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Inline the (small) critical CSS so it does not block first paint.
  experimental: { inlineCss: true },
  transpilePackages: ["@t9/ui", "@t9/types"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: media.protocol.replace(":", "") as "http" | "https",
        hostname: media.hostname,
        ...(media.port ? { port: media.port } : {}),
        pathname: "/static/**",
      },
    ],
    // Next blocks images from private addresses. Only for local development against localhost.
    dangerouslyAllowLocalIP: process.env.ALLOW_LOCAL_IMAGES === "1",
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1600],
    imageSizes: [64, 128, 256, 384],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
