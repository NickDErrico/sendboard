import { describe, expect, it } from 'vitest';
import {
  CYCLE_GRACE_MS,
  formatRun,
  isCycleStale,
  isLastStage,
  nextStage,
  roundLabel,
  shouldStartNextRound,
  warmupPlanOf,
} from './warmup';
import { EXERCISES } from '../data/exercises';
import { IDLE_TIMER, startHold, startRest } from './timer';
import type { Exercise } from '../types';

const byId = (id: string) => EXERCISES.find((e) => e.id === id);

const base: Exercise = {
  id: 'x',
  name: 'X',
  category: 'warmup',
  isoType: 'none',
  equipment: [],
  summary: '',
  howTo: ['a', 'b', 'c'],
  prescription: '10–15 min',
  cues: [],
  safetyNotes: [],
  gtgEligible: false,
};

const T0 = 1_700_000_000_000;
const MIN_1 = 60_000;

describe('warmupPlanOf', () => {
  it('runs the plan\'s stages where no cadence is declared (AC2)', () => {
    const plan = warmupPlanOf(byId('finger-warmup-progression'));
    expect(plan?.form).toBe('staged');
    // §4A's four stages, exactly as transcribed at T2 — not reworded, not retimed.
    expect(plan && 'stages' in plan && plan.stages).toEqual(
      byId('finger-warmup-progression')?.howTo,
    );
  });

  it('runs a cadence where the plan states both intervals (AC3)', () => {
    const plan = warmupPlanOf(byId('abrahangs-no-hang'));
    expect(plan).toMatchObject({ form: 'cycle', holdSec: 10, restSec: 50 });
  });

  it('is offered for warm-ups and for nothing else — the D39 gate', () => {
    const offered = EXERCISES.filter((e) => warmupPlanOf(e) !== null).map((e) => e.id);
    expect(offered).toEqual(['finger-warmup-progression', 'abrahangs-no-hang']);
    // Named explicitly, because these are the entries an auto-start must never reach.
    expect(warmupPlanOf(byId('max-hang-half-crimp'))).toBeNull();
    expect(warmupPlanOf(byId('pima-finger-pull-half-crimp'))).toBeNull();
    expect(warmupPlanOf(undefined)).toBeNull();
  });

  it('will not cycle a hold with no maximum to stop at (edge case)', () => {
    const open = warmupPlanOf({ ...base, holdSeconds: 'open', restSeconds: 50 });
    expect(open?.form).toBe('staged');
  });

  it('will not cycle a hold the plan gives no rest for (edge case)', () => {
    expect(warmupPlanOf({ ...base, holdSeconds: [10, 10] })?.form).toBe('staged');
  });

  it('offers nothing where there is neither a cadence nor a stage', () => {
    expect(warmupPlanOf({ ...base, howTo: [] })).toBeNull();
  });
});

describe('staged runs', () => {
  it('advances one stage at a time and stops at the last (edge case)', () => {
    expect(nextStage(0, 4)).toBe(1);
    expect(nextStage(2, 4)).toBe(3);
    // A warm-up ends; it does not loop back to the jugs.
    expect(nextStage(3, 4)).toBe(3);
    expect(nextStage(-2, 4)).toBe(1);
    expect(nextStage(0, 0)).toBe(0);
  });

  it('knows when the control finishes instead of advancing', () => {
    expect(isLastStage(2, 4)).toBe(false);
    expect(isLastStage(3, 4)).toBe(true);
    expect(isLastStage(0, 0)).toBe(true);
  });

  it('reports elapsed rather than counting anything down (AC2)', () => {
    expect(formatRun(0)).toBe('0:00');
    expect(formatRun(252_000)).toBe('4:12');
    expect(formatRun(-5)).toBe('0:00');
    expect(formatRun(63 * MIN_1)).toBe('63:00');
  });
});

describe('the cycle, and the fence around it (D39)', () => {
  const resting = startRest('abrahangs-no-hang', 50_000, T0);
  const restEnd = T0 + 50_000;

  it('starts the next round the moment a rest completes (AC4)', () => {
    expect(shouldStartNextRound(resting, restEnd, true, true)).toBe(true);
  });

  it('does nothing before the rest is over', () => {
    expect(shouldStartNextRound(resting, restEnd - 1, true, true)).toBe(false);
  });

  it('never starts a round while disarmed — leaving the runner stops it (AC9)', () => {
    expect(shouldStartNextRound(resting, restEnd, false, true)).toBe(false);
  });

  it('never starts a round the owner cannot be watching (AC4)', () => {
    expect(shouldStartNextRound(resting, restEnd, true, false)).toBe(false);
  });

  it('drops a transition the app slept through rather than catching up (AC4)', () => {
    const late = restEnd + CYCLE_GRACE_MS + 1;
    expect(shouldStartNextRound(resting, late, true, true)).toBe(false);
    expect(isCycleStale(resting, late, true)).toBe(true);
    // Inside the grace it is merely a slow tick, not a suspended app.
    expect(isCycleStale(resting, restEnd + CYCLE_GRACE_MS, true)).toBe(false);
    expect(shouldStartNextRound(resting, restEnd + CYCLE_GRACE_MS, true, true)).toBe(true);
  });

  it('is never both stale and ready in the same reading', () => {
    for (const at of [restEnd - 1, restEnd, restEnd + 1500, restEnd + 3000, restEnd + 9000]) {
      const go = shouldStartNextRound(resting, at, true, true);
      const stale = isCycleStale(resting, at, true);
      expect(go && stale).toBe(false);
    }
  });

  it('reads nothing off a phase that is not a rest', () => {
    expect(shouldStartNextRound(startHold('abrahangs-no-hang', T0), T0 + MIN_1, true, true)).toBe(
      false,
    );
    expect(shouldStartNextRound(IDLE_TIMER, T0, true, true)).toBe(false);
    expect(isCycleStale(startHold('x', T0), T0 + MIN_1, true)).toBe(false);
    expect(isCycleStale(resting, restEnd + MIN_1, false)).toBe(false);
  });

  it('counts rounds run, never rounds owed (D23)', () => {
    expect(roundLabel(1)).toBe('round 1');
    expect(roundLabel(12)).toBe('round 12');
    // §4A says "~10 min at light intensity" and states no round count, so there
    // is no total for this label to be "of".
    expect(roundLabel(3)).not.toMatch(/of|\/|left|remaining/);
  });
});
