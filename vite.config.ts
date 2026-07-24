/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// D7: deployed to GitHub Pages at https://nickderrico.github.io/sendboard/
// The base path is the single most common failure mode for this stack (T1 edge case):
// it must match the Pages subpath or every asset URL and the service-worker scope 404s.
const base = '/sendboard/';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Let the plugin generate manifest.webmanifest so icon/start_url paths are
      // rewritten with `base` automatically. A hand-authored manifest with absolute
      // paths would break under the GitHub Pages subpath — exactly T1's called-out risk.
      manifest: {
        name: 'Sendboard',
        short_name: 'Sendboard',
        description: 'Personal climbing training tracker for the 8-week overcoming-isometrics block.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
