/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Injected by Vite `define` from package.json version (see vite.config.ts).
declare const __APP_VERSION__: string;
// T13: build identity, so Settings can prove an update landed without the app
// being reinstalled. Both are fixed at build time.
declare const __BUILD_TIME__: string;
declare const __COMMIT__: string;

// Phosphor publishes its weights as bare CSS behind an exports map, with no
// types beside them. These say "this is a stylesheet, import it for effect" —
// `vite/client` only covers paths that end in `.css`.
declare module '@phosphor-icons/web/regular';
declare module '@phosphor-icons/web/fill';
declare module '@fontsource-variable/inter/wght.css';
