import { cloudflare } from "@cloudflare/vite-plugin";
import preact from "@preact/preset-vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    preact(),
    cloudflare(),
    // Service worker (design §H): precaches the app shell only. The API is never cached here.
    VitePWA({
      manifest: false, // each group has its own manifest (API #13)
      injectRegister: false, // registered in main.tsx, so there is no inline script (CSP)
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /\/manifest\.webmanifest$/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    // Never inline assets as data: URLs or inline code, so the strict CSP stays simple (design §I).
    assetsInlineLimit: 0,
  },
});
