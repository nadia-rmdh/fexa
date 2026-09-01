import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.svg'],
      manifest: {
        name: 'FEXA POS',
        short_name: 'FEXA',
        description: 'Offline-first point of sale for art/fandom market booths',
        start_url: '.',
        display: 'standalone',
        theme_color: '#18181b',
        background_color: '#18181b',
        orientation: 'any',
        // Placeholder icons (flat SVG, "any" size). Swap for branded PNGs before
        // shipping — Android's install prompt can be pickier about SVG than desktop Chrome.
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,png}'],
        // Google Sheets / Identity Services calls are cross-origin and intentionally
        // left unhandled by the service worker (NetworkOnly by omission) — they must
        // never serve stale/cached responses, and are expected to fail offline.
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
