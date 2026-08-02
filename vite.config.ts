import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Tauri expects a fixed dev port; `clearScreen: false` keeps Rust errors visible.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.png', 'icon-192.png'],
      manifest: {
        name: "St. Android's Missal",
        short_name: "St. Android's Missal",
        description: 'Traditional Latin Mass and Divine Office reader',
        theme_color: '#7b1e2b',
        background_color: '#f7f3eb',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,png,wasm}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [{
          urlPattern: /\/missal\.db$/,
          // The corpus URL is stable across releases, so the CACHE must be the
          // thing that notices a new one. It previously used CacheFirst under a
          // cache name hardcoded to v1.24.37311: CacheFirst never revalidates,
          // the name never changed, so `cleanupOutdatedCaches` never evicted it
          // — a returning user would have kept the v1.24 corpus forever, taking
          // the new UI with the OLD text. That would have silently defeated the
          // English-Ordinary fix, which lives in the corpus and not in the JS.
          //
          // StaleWhileRevalidate serves the cached copy immediately (so the app
          // still opens instantly and works offline) and revalidates in the
          // background against the ETag nginx already sets for this URL — a 304
          // costs nothing, and a changed corpus lands on the next load. The
          // cache name is deliberately version-free: stamping it per release
          // would force every user to re-download 194 MB on every MINOR bump.
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'standroid-missal-corpus',
            expiration: { maxEntries: 1 },
          },
        }],
      },
    }),
  ],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // The vendored corpus snapshot is ~90k flat-text files; watching it
      // exhausts the OS inotify limit (ENOSPC) and it is never a dev input —
      // the app only ever reads the ingested missal.db.
      ignored: ['**/VENDORED/**', '**/src-tauri/**', '**/assets/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // `dist/` is the durable, versioned release-artifact archive.  Vite empties
    // its outDir by default, so sharing that directory caused every Tauri
    // beforeBuildCommand to delete already-built APK/AAB/deb/AppImage files.
    // Keep disposable web staging physically separate from release artifacts.
    outDir: 'build/web',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    // Web output lives in a clean, disposable `dist-web/` (gitignored via the
    // `dist-*/` rule) so Tauri's `frontendDist` embeds ONLY the web surface —
    // not the multi-GB native release artifacts that accumulate in `dist/`.
    // `dist/` stays append-only (I-0/CC12); `dist-web/` is cleared each build.
    outDir: 'dist-web',
    emptyOutDir: true,
  },
});
