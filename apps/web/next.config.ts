import type { NextConfig } from "next";

const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080");
const apiRemotePattern = {
  protocol: apiUrl.protocol.replace(":", "") as "http" | "https",
  hostname: apiUrl.hostname,
  ...(apiUrl.port ? { port: apiUrl.port } : {}),
  pathname: "/uploads/**",
};

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Next otherwise advertises a five-minute client Router Cache lifetime for
    // prefetched/static routes. Keep browser navigation freshness aligned with
    // the storefront's 60-second server-side fallback policy.
    staleTimes: { dynamic: 0, static: 60 },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "cocowyo.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      apiRemotePattern,
    ],
  },
};

export default nextConfig;
