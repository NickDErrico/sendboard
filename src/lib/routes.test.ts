import { describe, expect, it } from 'vitest';
import { TIER_ROUTES, hashFor, parseHash, tabFor, type Route } from './routes';

/**
 * The route table, and the two rules T37 added to it: legacy paths resolve
 * rather than 404, and more routes than tabs still land on the right tab.
 */

describe('parse / build round trip', () => {
  const ROUTES: Route[] = [
    { name: 'today' },
    { name: 'library' },
    { name: 'exercises' },
    { name: 'routines' },
    { name: 'routine', routineId: 'day-1-fingerboard' },
    { name: 'session' },
    { name: 'history' },
    { name: 'block' },
    { name: 'poster' },
    { name: 'retest' },
    { name: 'gtg' },
    { name: 'tier', tier: 'daily-isometric' },
    { name: 'tier', tier: 'pool' },
    { name: 'signals' },
    { name: 'checklog' },
    { name: 'plan', sectionRef: null },
    { name: 'plan', sectionRef: '4B' },
    { name: 'settings' },
    { name: 'install' },
  ];

  for (const route of ROUTES) {
    it(`round-trips ${hashFor(route)}`, () => {
      expect(parseHash(hashFor(route))).toEqual(route);
    });
  }

  it('reads an empty hash as Today', () => {
    expect(parseHash('')).toEqual({ name: 'today' });
    expect(parseHash('#/')).toEqual({ name: 'today' });
  });
});

describe('an exercise citation still resolves (T25 AC8, D42)', () => {
  it('opens the plan at the cited section', () => {
    // The link the catalog writes. A tab reorganisation must not break it.
    expect(parseHash('#/plan/4B')).toEqual({ name: 'plan', sectionRef: '4B' });
    expect(parseHash('#/plan/10A')).toEqual({ name: 'plan', sectionRef: '10A' });
  });
});

describe('routes that existed yesterday (T37 AC11)', () => {
  it('sends #/joints to the tier it opened on', () => {
    // A dead link to a bookmarked screen is a worse answer than a redirect.
    expect(parseHash('#/joints')).toEqual({ name: 'tier', tier: 'daily-isometric' });
  });

  it('sends #/checks to Today, which owns the half of it that was not GtG', () => {
    expect(parseHash('#/checks')).toEqual({ name: 'today' });
  });

  it('never silently defaults an unknown tier', () => {
    // Picking a tier for a typo would show the wrong tendons.
    expect(parseHash('#/tier/elbow')).toEqual({ name: 'notFound', path: '/tier/elbow' });
    expect(parseHash('#/tier')).toEqual({ name: 'notFound', path: '/tier' });
  });

  it('accepts exactly the tiers that have a screen', () => {
    for (const tier of TIER_ROUTES) {
      expect(parseHash(`#/tier/${tier}`)).toEqual({ name: 'tier', tier });
    }
  });
});

describe('which tab a route lights (T37 AC2, AC3)', () => {
  it('files the catalog and the plan under Library', () => {
    expect(tabFor({ name: 'library' })).toBe('library');
    expect(tabFor({ name: 'exercises' })).toBe('library');
    expect(tabFor({ name: 'plan', sectionRef: null })).toBe('library');
    expect(tabFor({ name: 'plan', sectionRef: '4B' })).toBe('library');
  });

  it('files history and the check log under Log', () => {
    expect(tabFor({ name: 'history' })).toBe('log');
    expect(tabFor({ name: 'checklog' })).toBe('log');
  });

  it('lights no tab on a screen you navigated into', () => {
    // A tier detail, a session and a signal are reached *from* somewhere; none
    // of them is a destination the tab bar owns.
    expect(tabFor({ name: 'tier', tier: 'pool' })).toBeNull();
    expect(tabFor({ name: 'signals' })).toBeNull();
    expect(tabFor({ name: 'session' })).toBeNull();
    expect(tabFor({ name: 'gtg' })).toBeNull();
  });

  it('lights exactly one tab for every route that has one', () => {
    const tabs = new Set(['today', 'library', 'log', 'settings']);
    for (const route of [
      { name: 'today' },
      { name: 'library' },
      { name: 'history' },
      { name: 'settings' },
    ] as Route[]) {
      expect(tabs.has(tabFor(route) ?? '')).toBe(true);
    }
  });
});
