import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../data/exercises';
import { ROUTINES } from '../data/routines';
import type { Exercise } from '../types';
import { LANE_ORDER, groupByLane, laneLabel, laneOf } from './membership';

const byId = (id: string): Exercise => {
  const found = EXERCISES.find((e) => e.id === id);
  if (!found) throw new Error(`no such exercise: ${id}`);
  return found;
};

const lane = (id: string) => laneOf(byId(id), ROUTINES);

describe('a declaration beats an inference (D54 AC1, AC2)', () => {
  it('puts a declared pool dose in the pool even inside a heavy routine', () => {
    // The three prehab movements Day 3 carries. Routine membership would file
    // them under heavy; their own declaration says otherwise, and it wins.
    for (const id of ['oi-wall-press', 'external-rotations', 'wrist-extensor-work']) {
      expect(lane(id), id).toBe('pool');
      expect(
        ROUTINES.find((r) => r.id === 'day-3-pull-antagonist')?.exerciseIds,
        `${id} is no longer in Day 3 — this test has stopped proving anything`,
      ).toContain(id);
    }
  });

  it('puts declared daily-isometric doses in that lane', () => {
    expect(lane('iso-extensor-hold')).toBe('daily-isometric');
    expect(lane('iso-scapular-retraction-hold')).toBe('daily-isometric');
  });

  it('puts the abrahangs in collagen from their own dose', () => {
    expect(lane('abrahangs-no-hang')).toBe('collagen');
  });
});

describe('routine membership decides what the catalog does not (AC1)', () => {
  it('puts the finger warm-up in collagen via the daily routine', () => {
    // It declares no dose and sits in three routines; the daily one decides.
    expect(byId('finger-warmup-progression').tiers).toBeUndefined();
    expect(lane('finger-warmup-progression')).toBe('collagen');
  });

  it('puts the undeclared max work in heavy', () => {
    for (const id of [
      'max-hang-half-crimp',
      'max-hang-open-hand',
      'pima-finger-pull-half-crimp',
      'oi-bar-pull-90',
      'weighted-lockoff-hold',
      'kb-single-arm-row',
      'kb-turkish-getup',
    ]) {
      expect(byId(id).tiers, `${id} now declares a dose — re-read D54`).toBeUndefined();
      expect(lane(id), id).toBe('heavy');
    }
  });
});

describe('no lane is a real answer (AC3)', () => {
  it('leaves the §4E battery out — it is a measurement, not a cadence (D29)', () => {
    for (const id of [
      'test-max-hang-half-crimp',
      'test-max-hang-open-hand',
      'test-max-pullup-load',
      'test-lockoff-90-left',
      'test-lockoff-90-right',
    ]) {
      expect(lane(id), id).toBeNull();
    }
  });

  it('leaves the climbing days out — they are check-offs (D9)', () => {
    expect(lane('climbing-volume-technique')).toBeNull();
    expect(lane('climbing-limit-boulder')).toBeNull();
  });

  it('names the group rather than leaving it blank', () => {
    expect(laneLabel(null)).toBe('Not in a lane');
  });
});

describe('every movement is reachable from exactly one lane (AC9)', () => {
  const groups = groupByLane(EXERCISES, ROUTINES);

  it('accounts for the whole catalog', () => {
    const total = groups.reduce((n, g) => n + g.exercises.length, 0);
    expect(total).toBe(EXERCISES.length);
  });

  it('places every movement exactly once', () => {
    const ids = groups.flatMap((g) => g.exercises.map((e) => e.id));
    expect(new Set(ids).size).toBe(EXERCISES.length);
  });

  it('splits the catalog the way D54 records', () => {
    // Named numbers rather than a shape check: if the catalog or the routines
    // change, this should fail and make someone look, because the split is what
    // the Library's top level renders.
    const counts = Object.fromEntries(
      groups.map((g) => [g.lane ?? 'none', g.exercises.length]),
    );
    expect(counts).toEqual({
      collagen: 2,
      'daily-isometric': 7,
      pool: 23,
      heavy: 10,
      none: 7,
    });
  });

  it('returns every group even when one is empty', () => {
    const empty = groupByLane([], ROUTINES);
    expect(empty).toHaveLength(LANE_ORDER.length);
    expect(empty.every((g) => g.exercises.length === 0)).toBe(true);
  });
});

describe('purity', () => {
  it('is a function of the routines it is given', () => {
    // With no routines, only declared doses survive — which is the proof that
    // the heavy lane is inference and the others are declaration.
    expect(laneOf(byId('max-hang-half-crimp'), [])).toBeNull();
    expect(laneOf(byId('iso-extensor-hold'), [])).toBe('daily-isometric');
    expect(laneOf(byId('finger-warmup-progression'), [])).toBeNull();
  });
});

describe('the route table and the lane list agree (T39)', () => {
  it('declares the same lanes in both places', async () => {
    // `routes.ts` cannot import this module — it is imported *by* `lanes.ts` —
    // so the two lists are declared separately. This is what stops them drifting.
    const { LIBRARY_LANES } = await import('./routes');
    expect([...LIBRARY_LANES]).toEqual(LANE_ORDER.map((l) => l ?? 'none'));
  });
});
