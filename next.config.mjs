import { Fallback } from "@radix-ui/react-avatar";
import withPWA from "next-pwa";

const withPWAFn = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: { document: "/offline.html" },
  runtimeCaching: [
    // API GET -> SWR
    {
      urlPattern: ({ url, request }) =>
        url.pathname.startsWith("/api/") && request.method === "GET",
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "api-cache",
        cacheableResponse: { statuses: [0, 200 ] },
        expiration: { maxEntries: 200, maxAge: 3600 },
      },
    },
    // Avatar/images → CacheFirst
    {
      urlPattern: ({ request, url }) =>
        request.destination === "image" && url.pathname.startsWith("/uploads/avatars"),
      handler: "CacheFirst",
      options: {
        cacheName: "avatar-local",
        cacheableResponse: { statuses: [0, 200] },
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    // Google Fonts
    { urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i, handler: "StaleWhileRevalidate", options:{cacheName:"google-fonts-stylesheets",cacheableResponse:{statuses:[0,200]}} },
    { urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i, handler: "CacheFirst", options:{cacheName:"google-fonts-webfonts",cacheableResponse:{statuses:[0,200]},expiration:{maxEntries:30,maxAgeSeconds:31536000}} },
    // === Background Sync untuk POST /api/transactions ===
    {
      urlPattern: ({ url, request }) =>
        url.pathname === "/api/transactions" && request.method === "POST",
      handler: "NetworkOnly",
      options: {
        backgroundSync: {
          name: "tx-queue",
          options: { maxRetentionTime: 24 * 60 } // menit
        }
      }
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

export default withPWAFn(nextConfig);
