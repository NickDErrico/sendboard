import { describe, expect, it } from 'vitest';
import type { Exercise } from '../types';
import {
  IDLE_TIMER,
  autoStopHold,
  clearHeld,
  clearTimer,
  elapsedMs,
  extendRest,
  formatClock,
  formatHold,
  formatHoldTarget,
  holdBandStart,
  holdFraction,
  holdSpecOf,
  holdStatus,
  isOpenHold,
  isRestComplete,
  isTimerVisible,
  restMsOf,
  restRemainingMs,
  shouldAutoStop,
  startHold,
  startRest,
  stopHold,
  type HoldSpec,
} from './timer';

// Fixed epoch-ms origin; every assertion is now-relative, so these tests never
// touch a real clock (the module has no Date.now() to stub in the first place).
const T0 = 1_700_000_000_000;
const HANG: HoldSpec = { min: 7, max: 10 };
const FIXED: HoldSpec = { min: 5, max: 5 };
const MIN_3 = 180_000;

function exercise(fields: Partial<Exercise>): Exercise {
  return {
    id: 'x',
    name: 'X',
    category: 'fingers',
    isoType: 'yielding',
    equipment: ['hangboard'],
    summary: '',
    howTo: [],
    prescription: '',
    cues: [],
    safetyNotes: [],
    gtgEligible: false,
    ...fields,
  };
}

describe('catalog timing reads (D17)', () => {
  it('reads hold and rest off the typed fields', () => {
    const ex = exercise({ holdSeconds: [7, 10], restSeconds: 180 });
    expect(holdSpecOf(ex)).toEqual({ min: 7, max: 10 });
    expect(restMsOf(ex)).toBe(MIN_3);
  });

  it('treats absent fields as "no timer" rather than inventing a default', () => {
    const untimed = exercise({});
    expect(holdSpecOf(untimed)).toBeNull();
    expect(restMsOf(untimed)).toBeNull();
    expect(holdSpecOf(undefined)).toBeNull();
    expect(restMsOf(undefined)).toBeNull();
  });

  it('reads a hold with no prescribed rest (the wall press)', () => {
    const ex = exercise({ holdSeconds: [5, 5] });
    expect(holdSpecOf(ex)).toEqual({ min: 5, max: 5 });
    expect(restMsOf(ex)).toBeNull();
  });

  it('does not confuse a zero-second rest with an absent one', () => {
    expect(restMsOf(exercise({ restSeconds: 0 }))).toBe(0);
  });
});

describe('hold timing (AC2)', () => {
  it('counts up from zero', () => {
    const s = startHold('max-hang', T0);
    expect(s.phase).toBe('holding');
    expect(elapsedMs(s, T0)).toBe(0);
    expect(elapsedMs(s, T0 + 8_400)).toBe(8_400);
  });

  it('reads zero elapsed when no hold is running', () => {
    expect(elapsedMs(IDLE_TIMER, T0)).toBe(0);
    expect(elapsedMs(startRest('x', MIN_3, T0), T0 + 5_000)).toBe(0);
  });

  it('never reports negative elapsed if the clock steps backwards', () => {
    expect(elapsedMs(startHold('x', T0), T0 - 5_000)).toBe(0);
  });

});

describe('auto-stop at the prescribed maximum (T13 AC4)', () => {
  it('fires exactly at the top of the range, not before', () => {
    const s = startHold('max-hang', T0);
    expect(shouldAutoStop(s, T0 + 9_999, HANG)).toBe(false);
    expect(shouldAutoStop(s, T0 + 10_000, HANG)).toBe(true);
    expect(shouldAutoStop(s, T0 + 12_000, HANG)).toBe(true);
  });

  it('fires at the target for a fixed-target hold', () => {
    const s = startHold('wall-press', T0);
    expect(shouldAutoStop(s, T0 + 4_900, FIXED)).toBe(false);
    expect(shouldAutoStop(s, T0 + 5_000, FIXED)).toBe(true);
  });

  it('never fires when no hold is running', () => {
    expect(shouldAutoStop(IDLE_TIMER, T0 + 60_000, HANG)).toBe(false);
    expect(shouldAutoStop(startRest('x', MIN_3, T0), T0 + 60_000, HANG)).toBe(false);
  });

  it('never fires for an exercise with no hold spec', () => {
    expect(shouldAutoStop(startHold('x', T0), T0 + 600_000, null)).toBe(false);
  });

  it('leaves a manually shortened hold measuring its real duration (AC6)', () => {
    const held = startHold('max-hang', T0);
    expect(shouldAutoStop(held, T0 + 6_200, HANG)).toBe(false);
    expect(stopHold(held, T0 + 6_200, MIN_3).heldMs).toBe(6_200);
  });

  // The regression this guards: detection rides on a render tick, and a
  // throttled tick noticed a 5s hold at 5.9s in the preview browser. Recording
  // the prescription rather than the detection instant makes the logged number
  // deterministic — and it is a charted measurement now (T12).
  it('records exactly the prescribed maximum, however late detection was', () => {
    const held = startHold('max-hang', T0);
    expect(autoStopHold(held, HANG, MIN_3).heldMs).toBe(10_000);
    expect(autoStopHold(held, FIXED, MIN_3).heldMs).toBe(5_000);
  });

  it('starts the rest from when the hold should have ended, not from detection', () => {
    const resting = autoStopHold(startHold('max-hang', T0), HANG, MIN_3);
    expect(resting.phase).toBe('resting');
    // A tick that arrived 900ms late must not hand back a 3:00.9 rest.
    expect(restRemainingMs(resting, T0 + 10_900)).toBe(MIN_3 - 900);
  });

  it('lands idle with its result when the exercise prescribes no rest', () => {
    const stopped = autoStopHold(startHold('wall-press', T0), FIXED, null);
    expect(stopped.phase).toBe('idle');
    expect(stopped.heldMs).toBe(5_000);
    expect(isTimerVisible(stopped)).toBe(true);
  });

  it('is a no-op when no hold is running', () => {
    expect(autoStopHold(IDLE_TIMER, HANG, MIN_3)).toBe(IDLE_TIMER);
  });
});

describe('hold status against the target range (AC2)', () => {
  it('reports under, in, and over across a range', () => {
    expect(holdStatus(3_000, HANG)).toBe('under');
    expect(holdStatus(8_400, HANG)).toBe('in');
    expect(holdStatus(12_000, HANG)).toBe('over');
  });

  it('treats both bounds as inclusive', () => {
    expect(holdStatus(7_000, HANG)).toBe('in');
    expect(holdStatus(10_000, HANG)).toBe('in');
    expect(holdStatus(6_999, HANG)).toBe('under');
    expect(holdStatus(10_001, HANG)).toBe('over');
  });

  it('handles a fixed target, where in-range is a single instant band', () => {
    expect(holdStatus(4_999, FIXED)).toBe('under');
    expect(holdStatus(5_000, FIXED)).toBe('in');
    expect(holdStatus(5_001, FIXED)).toBe('over');
  });

  it('places the band start at min/max, and at 0 for a fixed target', () => {
    expect(holdBandStart(HANG)).toBeCloseTo(0.7);
    expect(holdBandStart(FIXED)).toBe(1);
    expect(holdBandStart({ min: 0, max: 10 })).toBe(0);
  });

  it('clamps the progress fraction to [0, 1]', () => {
    expect(holdFraction(0, HANG)).toBe(0);
    expect(holdFraction(5_000, HANG)).toBeCloseTo(0.5);
    expect(holdFraction(10_000, HANG)).toBe(1);
    expect(holdFraction(30_000, HANG)).toBe(1);
    expect(holdFraction(1_000, { min: 0, max: 0 })).toBe(0);
  });
});

describe('stopping a hold (AC3)', () => {
  it('measures the held duration and starts the prescribed rest in one transition', () => {
    const held = startHold('max-hang', T0);
    const next = stopHold(held, T0 + 8_400, MIN_3);
    expect(next.phase).toBe('resting');
    expect(next.heldMs).toBe(8_400);
    expect(next.exerciseId).toBe('max-hang');
    expect(restRemainingMs(next, T0 + 8_400)).toBe(MIN_3);
  });

  it('lands idle but keeps the result when the exercise prescribes no rest', () => {
    const next = stopHold(startHold('wall-press', T0), T0 + 5_000, null);
    expect(next.phase).toBe('idle');
    expect(next.heldMs).toBe(5_000);
    expect(next.exerciseId).toBe('wall-press');
    expect(isTimerVisible(next)).toBe(true);
  });

  it('is a no-op when no hold is running', () => {
    const resting = startRest('x', MIN_3, T0);
    expect(stopHold(resting, T0 + 1_000, MIN_3)).toBe(resting);
    expect(stopHold(IDLE_TIMER, T0, null)).toBe(IDLE_TIMER);
  });
});

describe('rest countdown (AC4, AC5)', () => {
  it('counts down and clamps at zero rather than going negative', () => {
    const s = startRest('max-hang', MIN_3, T0);
    expect(restRemainingMs(s, T0)).toBe(MIN_3);
    expect(restRemainingMs(s, T0 + 13_000)).toBe(167_000);
    expect(restRemainingMs(s, T0 + MIN_3)).toBe(0);
    expect(restRemainingMs(s, T0 + MIN_3 + 60_000)).toBe(0);
  });

  it('reports completion only once the full rest has elapsed', () => {
    const s = startRest('max-hang', MIN_3, T0);
    expect(isRestComplete(s, T0 + MIN_3 - 1)).toBe(false);
    expect(isRestComplete(s, T0 + MIN_3)).toBe(true);
    expect(isRestComplete(IDLE_TIMER, T0)).toBe(false);
    expect(isRestComplete(startHold('x', T0), T0 + MIN_3)).toBe(false);
  });

  it('extends without restarting: +30s adds exactly 30s to what is left', () => {
    const s = startRest('max-hang', MIN_3, T0);
    const extended = extendRest(s, 30);
    expect(restRemainingMs(extended, T0 + 60_000)).toBe(MIN_3 - 60_000 + 30_000);
    expect(extended.startedAt).toBe(s.startedAt);
  });

  it('can extend a rest that has already run out, un-completing it', () => {
    const done = startRest('max-hang', MIN_3, T0);
    expect(isRestComplete(done, T0 + MIN_3 + 5_000)).toBe(true);
    const extended = extendRest(done, 30);
    expect(isRestComplete(extended, T0 + MIN_3 + 5_000)).toBe(false);
    expect(restRemainingMs(extended, T0 + MIN_3 + 5_000)).toBe(25_000);
  });

  it('ignores an extend when not resting', () => {
    const holding = startHold('x', T0);
    expect(extendRest(holding, 30)).toBe(holding);
  });
});

describe('backgrounding (AC7)', () => {
  // The regression this guards: a tick-accumulating timer would come back short
  // by however long iOS suspended the PWA. Readings are (now - startedAt), so a
  // gap in evaluation is invisible to them.
  it('reads correctly after a long gap with no intermediate evaluation', () => {
    const rest = startRest('max-hang', MIN_3, T0);
    expect(restRemainingMs(rest, T0 + 170_000)).toBe(10_000);

    const hold = startHold('max-hang', T0);
    expect(elapsedMs(hold, T0 + 95_000)).toBe(95_000);
  });
});

describe('the single timer slot (edge case)', () => {
  it('starting a hold on another exercise takes over a running rest', () => {
    const resting = startRest('max-hang-half-crimp', MIN_3, T0);
    const next = startHold('max-hang-open-hand', T0 + 20_000);
    expect(next.exerciseId).toBe('max-hang-open-hand');
    expect(next.phase).toBe('holding');
    expect(restRemainingMs(next, T0 + 20_000)).toBe(0);
    expect(resting.exerciseId).toBe('max-hang-half-crimp'); // original untouched
  });

  it('starting a hold discards an unlogged previous result', () => {
    const finished = stopHold(startHold('a', T0), T0 + 5_000, null);
    expect(finished.heldMs).toBe(5_000);
    expect(startHold('b', T0 + 6_000).heldMs).toBeNull();
  });
});

describe('clearing (AC6 follow-through)', () => {
  it('clears the result after it is logged, leaving a running rest alone', () => {
    const resting = stopHold(startHold('a', T0), T0 + 8_400, MIN_3);
    const cleared = clearHeld(resting);
    expect(cleared.heldMs).toBeNull();
    expect(cleared.phase).toBe('resting');
    expect(restRemainingMs(cleared, T0 + 8_400)).toBe(MIN_3);
  });

  it('returns the same object when there is no result to clear', () => {
    const resting = startRest('a', MIN_3, T0);
    expect(clearHeld(resting)).toBe(resting);
  });

  it('dismisses everything', () => {
    expect(clearTimer()).toEqual(IDLE_TIMER);
    expect(isTimerVisible(IDLE_TIMER)).toBe(false);
  });

  it('is visible while a phase runs or a result is unlogged', () => {
    expect(isTimerVisible(startHold('a', T0))).toBe(true);
    expect(isTimerVisible(startRest('a', MIN_3, T0))).toBe(true);
    expect(isTimerVisible({ ...IDLE_TIMER, heldMs: 5_000 })).toBe(true);
  });
});

describe('formatting', () => {
  it('renders a hold to one decimal', () => {
    expect(formatHold(8_449)).toBe('8.4s');
    expect(formatHold(0)).toBe('0.0s');
    expect(formatHold(10_000)).toBe('10.0s');
    expect(formatHold(-500)).toBe('0.0s');
  });

  it('renders a countdown as m:ss, rounding up so it starts at the full value', () => {
    expect(formatClock(MIN_3)).toBe('3:00');
    expect(formatClock(167_000)).toBe('2:47');
    expect(formatClock(59_400)).toBe('1:00');
    expect(formatClock(1)).toBe('0:01');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(-1_000)).toBe('0:00');
  });

  it('renders a target as a range, or a single value when fixed', () => {
    expect(formatHoldTarget(HANG)).toBe('7–10s');
    expect(formatHoldTarget(FIXED)).toBe('5s');
  });
});

// ─── heldAuto (T14 AC2/AC3) ──────────────────────────────────────────────────
// The one bit that tells the set logger whether the app ended the hold or the
// owner did. It exists so an auto-stop can record `endReason: 'target'` without
// a tap, while a manual stop stays ambiguous and records nothing (D27).

describe('heldAuto', () => {
  it('is true after an auto-stop, with and without a prescribed rest', () => {
    const holding = startHold('max-hang-half-crimp', T0);
    expect(autoStopHold(holding, HANG, MIN_3).heldAuto).toBe(true);
    expect(autoStopHold(holding, HANG, null).heldAuto).toBe(true);
  });

  it('is false after a manual stop, even one that happens to land on the target', () => {
    const holding = startHold('max-hang-half-crimp', T0);
    expect(stopHold(holding, T0 + 6_000, MIN_3).heldAuto).toBe(false);
    // Exactly 10.000s by hand is still the owner's number, not the prescription's.
    expect(stopHold(holding, T0 + 10_000, MIN_3).heldAuto).toBe(false);
    expect(stopHold(holding, T0 + 6_000, null).heldAuto).toBe(false);
  });

  it('is false while a phase is running and on the idle timer', () => {
    expect(IDLE_TIMER.heldAuto).toBe(false);
    expect(startHold('x', T0).heldAuto).toBe(false);
    expect(startRest('x', MIN_3, T0).heldAuto).toBe(false);
  });

  it('is cleared with the result it describes', () => {
    const auto = autoStopHold(startHold('x', T0), FIXED, MIN_3);
    const cleared = clearHeld(auto);
    expect(cleared.heldMs).toBeNull();
    expect(cleared.heldAuto).toBe(false);
    // The running rest is untouched — only the result is dropped.
    expect(cleared.phase).toBe('resting');
  });
});

// ── Open holds (T16) ─────────────────────────────────────────────────────────
// §4E's lock-off test is "longest static hold": the duration is the measurement,
// so the app must never end it. Every reading below is the refusal, not a
// different number — a truncated max is a wrong measurement that looks right.
describe('open hold', () => {
  const OPEN: HoldSpec = { min: 0, max: null };
  const openExercise = {
    id: 'test-lockoff-90-left',
    holdSeconds: 'open',
  } as unknown as Exercise;

  it('is what an exercise declaring holdSeconds: open reads as', () => {
    expect(holdSpecOf(openExercise)).toEqual({ min: 0, max: null });
    expect(isOpenHold(OPEN)).toBe(true);
    expect(isOpenHold({ min: 7, max: 10 })).toBe(false);
  });

  it('never auto-stops, however long it runs', () => {
    const holding = startHold('test-lockoff-90-left', T0);
    expect(shouldAutoStop(holding, T0 + 10_000, OPEN)).toBe(false);
    expect(shouldAutoStop(holding, T0 + 600_000, OPEN)).toBe(false);
  });

  it('leaves the state untouched if autoStopHold is somehow reached', () => {
    const holding = startHold('test-lockoff-90-left', T0);
    expect(autoStopHold(holding, OPEN, null)).toBe(holding);
  });

  it('records real elapsed time on a manual stop, with heldAuto false', () => {
    const stopped = stopHold(startHold('test-lockoff-90-left', T0), T0 + 12_400, null);
    expect(stopped.heldMs).toBe(12_400);
    expect(stopped.heldAuto).toBe(false);
  });

  it('has no range to be under or over, and draws no bar', () => {
    expect(holdStatus(0, OPEN)).toBe('in');
    expect(holdStatus(60_000, OPEN)).toBe('in');
    expect(holdFraction(30_000, OPEN)).toBe(0);
    expect(holdBandStart(OPEN)).toBe(0);
  });

  it('shows "max" rather than a target it does not have', () => {
    expect(formatHoldTarget(OPEN)).toBe('max');
    expect(formatHoldTarget({ min: 7, max: 10 })).toBe('7–10s');
    expect(formatHoldTarget({ min: 5, max: 5 })).toBe('5s');
  });
});
