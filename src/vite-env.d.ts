/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Injected by Vite `define` from package.json version (see vite.config.ts).
declare const __APP_VERSION__: string;
// T13: build identity, so Settings can prove an update landed without the app
// being reinstalled. Both are fixed at build time.
declare const __BUILD_TIME__: string;
declare const __COMMIT__: string;
