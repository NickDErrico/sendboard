import { useSyncExternalStore } from 'react';

// Hash-based routing (T6). Chosen over path routing because the app is served
// from the GitHub Pages subpath `/sendboard/`: with hash routes the server path
// never changes (only the `#…` fragment does), so a direct hit on an internal
// route can never 404 on the static host and no `404.html` shim is needed.
//
// NOTE (T6/D2a): these routes are for INTERNAL navigation only. The external
// deep-link was cut by the T0 spike (no iOS path opens the installed PWA), so no
// route here is advertised as an externally-openable URL.

export type Route =
  | { name: 'home' }
  | { name: 'exercises' }
  | { name: 'routines' }
  | { name: 'routine'; routineId: string }
  | { name: 'session' }
  | { name: 'history' }
  | { name: 'retest' }
  | { name: 'checks' }
  | { name: 'checklog' }
  | { name: 'settings' }
  | { name: 'install' }
  | { name: 'notFound'; path: string };

// Parse a raw `location.hash` (e.g. "#/routine/day-1-fingerboard") into a Route.
export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '');
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return { name: 'home' };
  switch (segments[0]) {
    case 'exercises':
      return { name: 'exercises' };
    case 'routines':
      return { name: 'routines' };
    case 'routine':
      return segments[1]
        ? { name: 'routine', routineId: segments[1] }
        : { name: 'notFound', path: `/${segments.join('/')}` };
    case 'session':
      return { name: 'session' };
    case 'history':
      return { name: 'history' };
    case 'retest':
      return { name: 'retest' };
    case 'checks':
      return { name: 'checks' };
    case 'checklog':
      return { name: 'checklog' };
    case 'settings':
      return { name: 'settings' };
    case 'install':
      return { name: 'install' };
    default:
      return { name: 'notFound', path: `/${segments.join('/')}` };
  }
}

// The `#…` string for a route. Kept in sync with parseHash.
export function hashFor(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'routine':
      return `#/routine/${route.routineId}`;
    case 'notFound':
      return '#/';
    default:
      return `#/${route.name}`;
  }
}

// Navigate by setting the hash; the hashchange listener re-renders subscribers.
export function go(route: Route): void {
  window.location.hash = hashFor(route);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}
function getSnapshot(): string {
  return window.location.hash;
}

// Subscribe a component to the current route.
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return parseHash(hash);
}
