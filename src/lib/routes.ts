import { useSyncExternalStore } from 'react';

// Hash-based routing (T6). Chosen over path routing because the app is served
// from the GitHub Pages subpath `/sendboard/`: with hash routes the server path
// never changes (only the `#…` fragment does), so a direct hit on an internal
// route can never 404 on the static host and no `404.html` shim is needed.
//
// NOTE (T6/D2a): these routes are for INTERNAL navigation only. The external
// deep-link was cut by the T0 spike (no iOS path opens the installed PWA), so no
// route here is advertised as an externally-openable URL.

/** The tiers that have a screen of their own (T37, T38). */
export const TIER_ROUTES = ['daily-isometric', 'pool', 'heavy'] as const;
export type TierRoute = (typeof TIER_ROUTES)[number];

/**
 * The tiers whose screen is a list of slots.
 *
 * `heavy` is not one: it is two rotating routines, a block position and a test
 * battery, so it gets its own screen rather than a third branch inside the one
 * that renders `SlotStatus[]` (T38).
 */
export type SlotTier = Exclude<TierRoute, 'heavy'>;

/**
 * The Library's top-level groups (T39).
 *
 * Declared here rather than imported from `membership.ts`, which imports this
 * module for `TierRoute` — the same reason `TIER_ROUTES` is declared here. A
 * test asserts the two lists agree, so the duplication cannot drift.
 */
export const LIBRARY_LANES = ['collagen', 'daily-isometric', 'pool', 'heavy', 'none'] as const;
export type LibraryLane = (typeof LIBRARY_LANES)[number];

export type Route =
  | { name: 'today' }
  /** `null` is the Library's index; a value is one lane's movements. */
  | { name: 'library'; lane: LibraryLane | null }
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
  /** One bundled document, optionally opened at a section (T40, D53). */
  | { name: 'source'; sourceId: string; sectionRef: string | null }
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
type TabName = 'today' | 'library' | 'log' | 'settings';

export function tabFor(route: Route): TabName | null {
  switch (route.name) {
    case 'today':
      return 'today';
    case 'library':
    case 'source':
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
      if (segments[1] === undefined) return { name: 'library', lane: null };
      return LIBRARY_LANES.includes(segments[1] as LibraryLane)
        ? { name: 'library', lane: segments[1] as LibraryLane }
        : { name: 'notFound', path: `/${segments.join('/')}` };
    // T39: the flat catalog list became the Library's lane browse. A bookmark
    // resolves rather than 404ing, as `#/joints` and `#/checks` do.
    case 'exercises':
      return { name: 'library', lane: null };
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
    case 'source':
      // `#/source/plan` is the whole document; `#/source/plan/4B` opens a
      // section. The id is validated by the screen, which owns not-found.
      return segments[1]
        ? { name: 'source', sourceId: segments[1], sectionRef: segments[2] ?? null }
        : { name: 'notFound', path: `/${segments.join('/')}` };
    // T40: the plan was the only document when D42 bundled it, so it had the
    // route to itself. Every citation the catalog writes still points here.
    case 'plan':
      return { name: 'source', sourceId: 'plan', sectionRef: segments[1] ?? null };
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
    case 'library':
      return route.lane === null ? '#/library' : `#/library/${route.lane}`;
    case 'source':
      return route.sectionRef === null
        ? `#/source/${route.sourceId}`
        : `#/source/${route.sourceId}/${route.sectionRef}`;
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
