import { describe, expect, it } from 'vitest';
import type { Check, CheckKind } from '../types';
import { EXERCISES } from '../data/exercises';
import {
  describeGtgToday,
  doneMovementIds,
  gtgKindOf,
  gtgMovements,
  gtgSections,
  gtgToday,
  unnamedKinds,
} from './gtg';

let n = 0;
function mk(kind: CheckKind, date: string, exerciseId?: string): Check {
  return { id: `c${n++}`, kind, date, notes: '', ...(exerciseId ? { exerciseId } : {}) };
}
const TODAY = '2026-07-28';

// The catalog invariants first: everything below reads §8's list out of the
// catalog, so a movement that declares one field and not the other would make
// every reading quietly wrong rather than loudly broken.
describe('the catalog carries §8s committed list (T33)', () => {
  it('declares `gtg` on exactly the entries `gtgEligible` marks', () => {
    for (const e of EXERCISES) {
      expect(e.gtg !== undefined, `${e.id}: gtg vs gtgEligible`).toBe(e.gtgEligible);
    }
  });

  it('is §8s seven movements, split five general / two pulling', () => {
    const [general, pull] = gtgSections(EXERCISES);
    expect(general.movements.map((e) => e.id)).toEqual([
      'kb-goblet-squat',
      'pushups-or-dips',
      'oi-wall-press',
      'external-rotations',
      'wrist-extensor-work',
    ]);
    // Catalog order is §8 table order: the preferred movement above the one the
    // plan names as first to drop.
    expect(pull.movements.map((e) => e.id)).toEqual([
      'scapular-pullups-dead-hangs',
      'bodyweight-pullups',
    ]);
    expect(gtgMovements(EXERCISES)).toHaveLength(7);
  });

  it('gives every movement a non-empty dose and trigger, and both pulling ones a watch class', () => {
    for (const e of gtgMovements(EXERCISES)) {
      expect(e.gtg?.dose.length, e.id).toBeGreaterThan(0);
      expect(e.gtg?.trigger.length, e.id).toBeGreaterThan(0);
      expect(e.gtg?.riskClass, e.id).toBe(gtgKindOf(e) === 'gtg-pull' ? 'watch' : 'free');
    }
  });

  it('marks no Day 1 max protocol eligible (plan §8)', () => {
    const forbidden = ['pima-finger-pull-half-crimp', 'max-hang-half-crimp', 'abrahangs-no-hang'];
    for (const id of forbidden) {
      expect(EXERCISES.find((e) => e.id === id)?.gtg, id).toBeUndefined();
    }
  });
});

describe('doneMovementIds / unnamedKinds', () => {
  it('separates a named movement from a whole-kind check', () => {
    const checks = [
      mk('gtg-general', TODAY, 'pushups-or-dips'),
      mk('gtg-pull', TODAY), // T5b's shape — no movement named
    ];
    expect(doneMovementIds(checks)).toEqual(new Set(['pushups-or-dips']));
    expect(unnamedKinds(checks)).toEqual(new Set(['gtg-pull']));
  });
});

describe('gtgToday (T33 AC2, AC3)', () => {
  it('counts movements, not checks — a re-ticked movement counts once', () => {
    const checks = [
      mk('gtg-general', TODAY, 'pushups-or-dips'),
      mk('gtg-general', TODAY, 'pushups-or-dips'),
      mk('gtg-general', TODAY, 'wrist-extensor-work'),
    ];
    expect(gtgToday(checks, EXERCISES)['gtg-general']).toEqual({
      done: 2,
      listed: 5,
      unnamed: false,
    });
  });

  it('reads a pre-T33 check as the kind happening with no movement named', () => {
    const today = gtgToday([mk('gtg-general', TODAY)], EXERCISES);
    expect(today['gtg-general']).toEqual({ done: 0, listed: 5, unnamed: true });
    expect(today['gtg-pull']).toEqual({ done: 0, listed: 2, unnamed: false });
  });

  it('ignores a movement id that is not on the kind it was checked under', () => {
    // A pull movement recorded under the general kind must not inflate general.
    const today = gtgToday([mk('gtg-general', TODAY, 'bodyweight-pullups')], EXERCISES);
    expect(today['gtg-general'].done).toBe(0);
    expect(today['gtg-pull'].done).toBe(1);
  });

  it('returns the climbing kinds as empty rather than absent (D9)', () => {
    const today = gtgToday([mk('climbing-volume', TODAY)], EXERCISES);
    expect(today['climbing-volume']).toEqual({ done: 0, listed: 0, unnamed: false });
  });
});

describe('describeGtgToday (D23: a fact, never a score)', () => {
  it('states what is recorded and never divides by the list', () => {
    expect(describeGtgToday({ done: 0, listed: 5, unnamed: false })).toBe('Nothing recorded today');
    expect(describeGtgToday({ done: 1, listed: 5, unnamed: false })).toBe('1 movement today');
    expect(describeGtgToday({ done: 3, listed: 5, unnamed: false })).toBe('3 movements today');
    for (const done of [0, 1, 5]) {
      expect(describeGtgToday({ done, listed: 5, unnamed: false })).not.toMatch(/of 5|%|\//);
    }
  });

  it('reports a whole-kind check on its own and alongside movements', () => {
    expect(describeGtgToday({ done: 0, listed: 5, unnamed: true })).toBe('Recorded for today');
    expect(describeGtgToday({ done: 2, listed: 5, unnamed: true })).toBe(
      '2 movements today · plus a whole-kind check',
    );
  });
});
