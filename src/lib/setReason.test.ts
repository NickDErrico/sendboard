import { describe, expect, it } from 'vitest';
import type { Exercise } from '../types';
import {
  REASON_CONFIG,
  SET_END_REASONS,
  isSafetySignal,
  reasonApplies,
  reasonsFor,
  summaryReason,
} from './setReason';

function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'x',
    name: 'X',
    focus: 'max-strength',
    isoType: 'yielding',
    equipment: ['hangboard'],
    summary: '',
    howTo: [],
    prescription: '',
    cues: [],
    safetyNotes: [],
    gtgEligible: false,
    ...overrides,
  };
}

describe('reasonApplies', () => {
  it('asks where the plan prescribes a hold', () => {
    expect(reasonApplies(exercise({ holdSeconds: [7, 10] }))).toBe(true);
  });

  it('asks on a hold with nothing numeric to log — the reason is the record there', () => {
    // The PIMA pulls and the wall press: a hold, no metrics, no rest for one of
    // them. D27 covers them deliberately.
    expect(reasonApplies(exercise({ holdSeconds: [5, 5] }))).toBe(true);
  });

  it('does not ask on a rep-based exercise (AC4)', () => {
    expect(reasonApplies(exercise())).toBe(false);
    expect(reasonApplies(exercise({ restSeconds: 120 }))).toBe(false);
  });

  it('does not ask for a missing catalog entry', () => {
    expect(reasonApplies(undefined)).toBe(false);
  });
});

describe('the reason set', () => {
  it('offers exactly four, ordinary outcomes before signals', () => {
    expect(SET_END_REASONS).toEqual(['target', 'dropped', 'form-broke', 'pain']);
  });

  it('has a label for every value', () => {
    for (const reason of SET_END_REASONS) {
      expect(REASON_CONFIG[reason].label.length).toBeGreaterThan(0);
    }
  });

  it('classifies pain and a form breakdown as safety signals, not the other two', () => {
    expect(isSafetySignal('pain')).toBe(true);
    expect(isSafetySignal('form-broke')).toBe(true);
    expect(isSafetySignal('target')).toBe(false);
    expect(isSafetySignal('dropped')).toBe(false);
  });

  it('treats an unrecorded reason as no signal', () => {
    expect(isSafetySignal(undefined)).toBe(false);
  });
});

describe('summaryReason', () => {
  // AC7: holdSec against the prescribed range already says whether a hold hit
  // its target or ran out, so repeating those two would crowd a glance-first card.
  it('repeats only the safety signals', () => {
    expect(summaryReason('pain')).toBe('pain');
    expect(summaryReason('form-broke')).toBe('form');
    expect(summaryReason('target')).toBeNull();
    expect(summaryReason('dropped')).toBeNull();
    expect(summaryReason(undefined)).toBeNull();
  });
});

describe('both spellings of "not recorded"', () => {
  // Stored sets use an optional field (no migration for pre-T14 sets); derived
  // chart points use an explicit null, like the edgeMm beside them.
  it('reads null and undefined identically', () => {
    expect(isSafetySignal(null)).toBe(false);
    expect(isSafetySignal(undefined)).toBe(false);
    expect(summaryReason(null)).toBeNull();
    expect(summaryReason(undefined)).toBeNull();
  });
});

// ── Open holds (T16) ─────────────────────────────────────────────────────────
describe('reasonsFor', () => {
  const ex = (holdSeconds: Exercise['holdSeconds']) => ({ id: 'x', holdSeconds }) as Exercise;

  it('offers all four on a prescribed hold', () => {
    expect(reasonsFor(ex([7, 10]))).toEqual(['target', 'dropped', 'form-broke', 'pain']);
  });

  it('drops "hit target" on an open hold, which has no target to hit', () => {
    expect(reasonsFor(ex('open'))).toEqual(['dropped', 'form-broke', 'pain']);
  });

  it('still lists the safety signals on an open hold — that is the point of asking', () => {
    expect(reasonsFor(ex('open'))).toContain('pain');
    expect(reasonsFor(ex('open'))).toContain('form-broke');
  });
});
