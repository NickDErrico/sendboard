import { useSyncExternalStore } from 'react';

// Hash-based routing (T6). Chosen over path routing because the app is served
// from the GitHub Pages subpath `/sendboard/`: with hash routes the server path
// never changes (only the `#…` fragment does), so a direct hit on an internal
// route can never 404 on the static host and no `404.html` shim is needed.
//
// NOTE (T6/D2a): these routes are for INTERNAL navigation only. The external
// deep-link was cut by the T0 spike (no iOS path opens the installed PWA), so no
// route here is advertised as an externally-openable URL.

/** The tiers that have a screen of their own (T37). */
export const TIER_ROUTES = ['daily-isometric', 'pool'] as const;
export type TierRoute = (typeof TIER_ROUTES)[number];

export type Route =
  | { name: 'today' }
  | { name: 'library' }
  | { name: 'exercises' }
  | { name: 'routines' }
  | { name: 'routine'; routineId: string }
  | { name: 'session' }
  | { name: 'history' }
  | { name: 'block' }
  | { name: 'poster' }
  | { name: 'retest' }
  | { name: 'gtg' }
  /** One tier's own detail — what `#/joints` used to render two of at once. */
  | { name: 'tier'; tier: TierRoute }
  /** The plan's stop signals. Not a tier: a signal changes every tier. */
  | { name: 'signals' }
  | { name: 'checklog' }
  | { name: 'plan'; sectionRef: string | null }
  | { name: 'settings' }
  | { name: 'install' }
  | { name: 'notFound'; path: string };

/**
 * Which tab a route belongs under (T37 AC2, AC3).
 *
 * Four tabs, and more routes than tabs — the exercise catalog and the plan are
 * both read rather than done, and history and the check log are both the record
 * of what happened. A route with no tab (a session, a tier detail) highlights
 * none, which is what a screen you have navigated *into* should do.
 */
export type TabName = 'today' | 'library' | 'log' | 'settings';

export function tabFor(route: Route): TabName | null {
  switch (route.name) {
    case 'today':
      return 'today';
    case 'library':
    case 'exercises':
    case 'plan':
      return 'library';
    case 'history':
    case 'checklog':
      return 'log';
    case 'settings':
      return 'settings';
    default:
      return null;
  }
}

// Parse a raw `location.hash` (e.g. "#/routine/day-1-fingerboard") into a Route.
export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '');
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return { name: 'today' };
  switch (segments[0]) {
    case 'library':
      return { name: 'library' };
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
    case 'block':
      return { name: 'block' };
    case 'poster':
      return { name: 'poster' };
    case 'retest':
      return { name: 'retest' };
    case 'gtg':
      return { name: 'gtg' };
    case 'tier':
      return TIER_ROUTES.includes(segments[1] as TierRoute)
        ? { name: 'tier', tier: segments[1] as TierRoute }
        : // Never a silently-defaulted tier: an unknown one is a typo or a stale
          // link, and picking a tier for it would show the wrong tendons.
          { name: 'notFound', path: `/${segments.join('/')}` };
    case 'signals':
      return { name: 'signals' };
    // T37: two routes that existed yesterday. A dead link to a screen the owner
    // bookmarked is a worse answer than a redirect, so they resolve to whichever
    // successor owns what they used to show — `#/joints` opened on the daily
    // slots, and `#/checks`' non-GtG half is Today's climbing strip.
    case 'joints':
      return { name: 'tier', tier: 'daily-isometric' };
    case 'checks':
      return { name: 'today' };
    case 'checklog':
      return { name: 'checklog' };
    case 'plan':
      // `#/plan` is the whole document; `#/plan/4B` opens a section, which is how
      // an exercise's typed citation resolves (T25 AC8).
      return { name: 'plan', sectionRef: segments[1] ?? null };
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
    case 'today':
      return '#/';
    case 'routine':
      return `#/routine/${route.routineId}`;
    case 'tier':
      return `#/tier/${route.tier}`;
    case 'plan':
      return route.sectionRef === null ? '#/plan' : `#/plan/${route.sectionRef}`;
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
