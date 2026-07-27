/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// `process` exists in Vite's Node-side config context. Declared locally rather
// than adding @types/node, which nothing else in this project needs.
declare const process: { env: Record<string, string | undefined> };

// D7: deployed to GitHub Pages at https://nickderrico.github.io/sendboard/
// The base path is the single most common failure mode for this stack (T1 edge case):
// it must match the Pages subpath or every asset URL and the service-worker scope 404s.
const base = '/sendboard/';

/**
 * Keep only the woff2 source in Phosphor's `@font-face` rules.
 *
 * Each weight ships woff2 + woff + ttf + svg, and the two weights this app loads
 * come to ~9 MB of which ~1.4 MB is ever fetched — every browser that can run an
 * installed PWA takes the woff2. In an offline-first app the rest is not merely
 * unused, it is actively in the way: the SVG fonts are 3 MB each, which is past
 * workbox's precache ceiling, so the service worker refuses to build rather than
 * silently shipping an app whose icons vanish offline.
 */
function phosphorWoff2Only() {
  return {
    name: 'phosphor-woff2-only',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.includes('@phosphor-icons') || !id.includes('.css')) return null;
      return {
        code: code.replace(
          /src:[\s\S]*?;/,
          (src: string) =>
            src.match(/url\("([^"]+\.woff2)"\)/)
              ? `src: url("${(src.match(/url\("([^"]+\.woff2)"\)/) as RegExpMatchArray)[1]}") format("woff2");`
              : src,
        ),
        map: null,
      };
    },
  };
}

/**
 * Keep only the Latin subset of Inter.
 *
 * Fontsource splits the variable font across seven subsets — Cyrillic, Greek,
 * Vietnamese, Latin-ext and Latin — and importing the stylesheet precaches all
 * of them: 218 KB of an offline-first bundle to support alphabets this app has
 * no copy in. Latin alone is 48 KB and covers everything the plan and the UI
 * actually spell, including the em-dashes, curly quotes and § the copy is full
 * of. (`≥`, `→` and `⚠` are outside *every* Inter subset and fall back to the
 * system face either way — that was true of the Google Fonts build too.)
 */
function interLatinOnly() {
  return {
    name: 'inter-latin-only',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.includes('@fontsource-variable/inter') || !id.includes('.css')) return null;
      // Each block is preceded by a `/* inter-<subset>-… */` comment, which is
      // what identifies it — the `unicode-range` would be far more fragile to
      // match on.
      const kept = code
        .split('/* inter-')
        .filter((block) => block.startsWith('latin-wght') || block.startsWith('latin-opsz'))
        .map((block) => `/* inter-${block}`)
        .join('\n');
      return { code: kept, map: null };
    },
  };
}

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // T13 AC2: a build identifier that changes every deploy. `package.json`'s
    // version has never moved off 0.1.0, so an updated app and a stale one used
    // to look identical in Settings — which made deleting and reinstalling the
    // only way to be sure an update landed, taking the whole IndexedDB log with
    // it. Evaluated once at build time (not per page load), so it identifies the
    // build rather than the visit.
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __COMMIT__: JSON.stringify((process.env.GITHUB_SHA ?? 'local').slice(0, 7)),
  },
  plugins: [
    interLatinOnly(),
    phosphorWoff2Only(),
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
        background_color: '#161826',
        theme_color: '#161826',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // woff2 is here because the icons are a font: without it an offline
        // launch renders every glyph as a box.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
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
