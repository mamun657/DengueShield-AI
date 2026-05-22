import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["dengue-icon.png", "icons.svg", "offline-fallback.html"],
      manifest: {
        name: "DengueShield AI — Rural Telehealth",
        short_name: "DengueShield",
        description:
          "Offline-capable dengue clinical risk estimation and WHO-aligned telehealth for low-connectivity regions.",
        theme_color: "#2563eb",
        background_color: "#061120",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        categories: ["health", "medical"],
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/favicon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,json}"],
        // Do NOT set a global navigateFallback. Instead rely on a NetworkFirst
        // runtime route for navigations which will only fallback when both
        // network and cache miss.
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Dashboard and reports pages (prefer network, fallback to cache)
          {
            urlPattern: /^\/(?:dashboard|reports)(?:\/.*)?$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "dashboard-pages",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\/api\/health\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-health-cache",
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 },
            },
          },
          {
            urlPattern: /\/api\/reports/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-reports-cache",
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\.(?:woff2|woff|ttf|eot)$/, 
            handler: "CacheFirst",
            options: {
              cacheName: "font-cache",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-assets",
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
