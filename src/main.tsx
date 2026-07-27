import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
// Inter and Phosphor are imported here rather than @import-ed from index.css so
// the bundler resolves them out of node_modules — and so their woff2 files are
// fingerprinted into dist and precached by the service worker, which is what
// makes the typeface and the icons survive an offline launch. Both are trimmed
// at build time by plugins in vite.config.ts; see the note there.
import '@fontsource-variable/inter/wght.css';
import '@phosphor-icons/web/regular';
import '@phosphor-icons/web/fill';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
