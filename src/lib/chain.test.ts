import { describe, expect, it } from 'vitest';
import {
  chainPosition,
  chainSatisfied,
  formatChain,
  formatSetTarget,
  setSpecOf,
  speakChain,
} from './chain';
import { EXERCISES } from '../data/exercises';
import type { Exercise } from '../types';

const byId = (id: string) => EXERCISES.find((e) => e.id === id);

const base: Exercise = {
  id: 'x',
  name: 'X',
  category: 'pulling',
  isoType: 'none',
  equipment: [],
  summary: '',
  howTo: [],
  prescription: '',
  cues: [],
  safetyNotes: [],
  gtgEligible: false,
};

describe('setSpecOf', () => {
  it('reads a declared count', () => {
    expect(setSpecOf({ ...base, prescribedSets: [5, 5] })).toEqual({ min: 5, max: 5 });
  });

  it('reads a range as a range', () => {
    expect(setSpecOf({ ...base, prescribedSets: [4, 6] })).toEqual({ min: 4, max: 6 });
  });

  it('is null where the plan states no set count', () => {
    expect(setSpecOf(base)).toBeNull();
    expect(setSpecOf(undefined)).toBeNull();
  });
});

describe('chainPosition', () => {
  const five = { min: 5, max: 5 };

  it('starts at set 1 with nothing logged', () => {
    expect(chainPosition(0, five)).toEqual({ current: 1, spec: five, beyond: false });
  });

  it('advances with each logged set', () => {
    expect(chainPosition(2, five).current).toBe(3);
  });

  it('is beyond only once the top of the prescription is logged', () => {
    expect(chainPosition(4, five).beyond).toBe(false);
    expect(chainPosition(5, five).beyond).toBe(true);
    expect(chainPosition(9, five).beyond).toBe(true);
  });

  it('uses the top of a range as the threshold, not the bottom', () => {
    const range = { min: 4, max: 6 };
    expect(chainPosition(4, range).beyond).toBe(false);
    expect(chainPosition(6, range).beyond).toBe(true);
  });

  it('moves back when a set is deleted — it is a report, not a counter (AC8)', () => {
    expect(chainPosition(3, five).current).toBe(4);
    expect(chainPosition(2, five).current).toBe(3);
  });

  it('is never beyond without a declaration', () => {
    expect(chainPosition(12, null)).toEqual({ current: 13, spec: null, beyond: false });
  });

  it('treats a nonsense negative count as none logged', () => {
    expect(chainPosition(-1, five).current).toBe(1);
  });
});

describe('formatChain', () => {
  it('reads as a position inside the prescription', () => {
    expect(formatChain(chainPosition(2, { min: 5, max: 5 }))).toBe('set 3 of 5');
  });

  it('keeps a range a range, never rounding it to one target', () => {
    expect(formatChain(chainPosition(2, { min: 4, max: 6 }))).toBe('set 3 of 4–6');
  });

  it('past the count, reports both numbers and passes no judgment (D23)', () => {
    expect(formatChain(chainPosition(5, { min: 5, max: 5 }))).toBe('set 6 (5 prescribed)');
    expect(formatChain(chainPosition(6, { min: 4, max: 6 }))).toBe('set 7 (4–6 prescribed)');
  });

  it('says nothing at all where nothing is declared (AC7)', () => {
    expect(formatChain(chainPosition(2, null))).toBeNull();
  });

  it('never renders a completion, a percentage, or a verdict', () => {
    const phrases = [0, 3, 5, 8].map((n) => formatChain(chainPosition(n, { min: 5, max: 5 })) ?? '');
    for (const p of phrases) {
      expect(p).not.toMatch(/%|complete|done|✓|remaining|left|good|nice/i);
    }
  });
});

describe('chainSatisfied (T32)', () => {
  const at = (logged: number, spec: { min: number; max: number } | null) =>
    chainSatisfied(chainPosition(logged, spec));

  it('turns on at the floor of a range, not at its top', () => {
    const pima = { min: 4, max: 6 };
    expect(at(3, pima)).toBe(false);
    expect(at(4, pima)).toBe(true);
    expect(at(6, pima)).toBe(true);
    expect(at(7, pima)).toBe(true);
  });

  // Where the plan states one count, the floor and the top are the same instant
  // — which is why the max hangs flip both this and `beyond` on the fifth set.
  it('coincides with beyond for a fixed count', () => {
    const hang = { min: 5, max: 5 };
    expect(at(4, hang)).toBe(false);
    expect(at(5, hang)).toBe(true);
    expect(chainPosition(5, hang).beyond).toBe(true);
  });

  it('takes one logged set as the floor where the plan declares no count', () => {
    expect(at(0, null)).toBe(false);
    expect(at(1, null)).toBe(true);
  });

  it('is never true before anything is logged', () => {
    expect(at(0, { min: 0, max: 3 })).toBe(true); // a floor of zero is already met
    expect(at(0, { min: 1, max: 3 })).toBe(false);
    expect(at(-2, { min: 1, max: 3 })).toBe(false);
  });
});

describe('formatSetTarget', () => {
  it('prints a fixed count and a range differently', () => {
    expect(formatSetTarget({ min: 3, max: 3 })).toBe('3');
    expect(formatSetTarget({ min: 3, max: 5 })).toBe('3–5');
  });
});

describe('the seeded catalog', () => {
  it('declares the counts the training plan states', () => {
    expect(byId('max-hang-half-crimp')?.prescribedSets).toEqual([5, 5]);
    expect(byId('pima-finger-pull-half-crimp')?.prescribedSets).toEqual([4, 6]);
    expect(byId('oi-bar-pull-90')?.prescribedSets).toEqual([3, 3]);
    expect(byId('external-rotations')?.prescribedSets).toEqual([2, 2]);
    expect(byId('test-max-hang-half-crimp')?.prescribedSets).toEqual([3, 5]);
    expect(byId('test-lockoff-90-left')?.prescribedSets).toEqual([1, 1]);
  });

  it('declares none where the plan states a duration, a rep count, or a habit', () => {
    // A warm-up is a duration; Abrahangs are 10 minutes of a cycle; the get-up is
    // "2–3 per side" (reps); §4E's max pull-up is worked up to with no set count;
    // GtG is a daily habit, not a session (D11); climbing is never logged (D9).
    for (const id of [
      'finger-warmup-progression',
      'abrahangs-no-hang',
      'kb-turkish-getup',
      'test-max-pullup-load',
      'bodyweight-pullups',
      'climbing-limit-boulder',
    ]) {
      expect(byId(id)?.prescribedSets).toBeUndefined();
    }
  });

  it('never declares a count of zero or an inverted range', () => {
    for (const ex of EXERCISES) {
      const spec = setSpecOf(ex);
      if (spec === null) continue;
      expect(spec.min).toBeGreaterThan(0);
      expect(spec.max).toBeGreaterThanOrEqual(spec.min);
    }
  });
});

// T20: the same position, said out loud. A voice cannot punctuate, so a range
// becomes "4 to 6" and the parenthetical past the prescription is dropped —
// the screen still carries both numbers.
describe('speakChain', () => {
  it('speaks a fixed count as "of N"', () => {
    expect(speakChain(chainPosition(2, { min: 5, max: 5 }))).toBe('set 3 of 5');
  });

  it('speaks a range as a range, not a dash', () => {
    expect(speakChain(chainPosition(2, { min: 4, max: 6 }))).toBe('set 3 of 4 to 6');
  });

  it('drops the parenthetical past the prescription rather than reading it aloud', () => {
    const beyond = chainPosition(5, { min: 5, max: 5 });
    expect(formatChain(beyond)).toBe('set 6 (5 prescribed)');
    expect(speakChain(beyond)).toBe('set 6');
  });

  it('says nothing where the plan declares no count', () => {
    expect(speakChain(chainPosition(3, null))).toBeNull();
  });
});
