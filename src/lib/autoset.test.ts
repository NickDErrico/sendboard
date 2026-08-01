import { describe, expect, it } from 'vitest';
import {
  SET_GRACE_MS,
  autoStartPermitted,
  isAutoStartStale,
  restAfterLoggedSet,
  shouldAutoStartSet,
  type AutoStartGate,
} from './autoset';
import { EXERCISES } from '../data/exercises';
import { chainPosition, setSpecOf } from './chain';
import { IDLE_TIMER, startHold, startLeadIn, startRest, type TimerState } from './timer';

const byId = (id: string) => EXERCISES.find((e) => e.id === id);
const barPull = byId('oi-bar-pull-90'); // 3 x 5s, 2 min rest
const wallPress = byId('oi-wall-press'); // 5s x 3, no prescribed rest
const row = byId('kb-single-arm-row'); // rep-based, no hold and no rest
const warmup = byId('abrahangs-no-hang'); // the runner's, not this module's

const T0 = 1_700_000_000_000;
const REST_MS = 120_000;

/** A gate that permits, so each test can change exactly one thing. */
function gateFor(loggedSets = 0, over: Partial<AutoStartGate> = {}): AutoStartGate {
  return {
    exercise: barPull,
    position: chainPosition(loggedSets, setSpecOf(barPull)),
    repArmed: false,
    completed: false,
    warmup: false,
    ...over,
  };
}

/** A rest on the bar pull that finished exactly `late` ms ago. */
function restEnded(late: number): { state: TimerState; now: number } {
  return { state: startRest('oi-bar-pull-90', REST_MS, T0), now: T0 + REST_MS + late };
}

describe('autoStartPermitted', () => {
  it('permits a timed exercise with sets still prescribed', () => {
    expect(autoStartPermitted(startRest('oi-bar-pull-90', REST_MS, T0), gateFor(1))).toBe(true);
  });

  it('refuses an exercise the plan gives no duration', () => {
    // A row is counted, not timed — there is no clock to start, and inventing
    // one would be exactly what D17 forbids.
    expect(autoStartPermitted(startRest('kb-single-arm-row', REST_MS, T0), gateFor(1, {
      exercise: row,
      position: chainPosition(1, setSpecOf(row)),
    }))).toBe(false);
  });

  it('refuses a warm-up, which the runner drives (T23)', () => {
    expect(autoStartPermitted(startRest('abrahangs-no-hang', 20_000, T0), gateFor(1, {
      exercise: warmup,
      warmup: true,
    }))).toBe(false);
  });

  it('refuses an exercise already marked done (D16)', () => {
    expect(autoStartPermitted(startRest('oi-bar-pull-90', REST_MS, T0), gateFor(1, {
      completed: true,
    }))).toBe(false);
  });

  it('leaves the interval between reps to the chain (T31)', () => {
    // Both read the same completed rest. Only `shouldStartNextRep` may act on
    // one inside a set, or the app runs two clocks for one effort.
    expect(autoStartPermitted(startRest('oi-bar-pull-90', 10_000, T0), gateFor(1, {
      repArmed: true,
    }))).toBe(false);
  });

  it('refuses while a measured hold is still unlogged (D16)', () => {
    // Taking the timer slot would discard it — the one thing here that loses a
    // set the app watched happen.
    const pending: TimerState = { ...startRest('oi-bar-pull-90', REST_MS, T0), heldMs: 5000 };
    expect(autoStartPermitted(pending, gateFor(1))).toBe(false);
  });

  it('stops at the prescription’s top, never past it (T32, D23)', () => {
    // 3 of 3 logged: the app has a set to *offer* and no business starting one.
    expect(autoStartPermitted(startRest('oi-bar-pull-90', REST_MS, T0), gateFor(2))).toBe(true);
    expect(autoStartPermitted(startRest('oi-bar-pull-90', REST_MS, T0), gateFor(3))).toBe(false);
    expect(autoStartPermitted(startRest('oi-bar-pull-90', REST_MS, T0), gateFor(9))).toBe(false);
  });

  it('is false for every untimed entry in the catalog', () => {
    const timed = EXERCISES.filter((e) =>
      autoStartPermitted(startRest(e.id, REST_MS, T0), {
        exercise: e,
        position: chainPosition(0, setSpecOf(e)),
        repArmed: false,
        completed: false,
        warmup: false,
      }),
    ).map((e) => e.id);
    // Exactly the entries that declare a duration at the top level; the daily
    // isometrics carry theirs on a tier and are not session exercises.
    expect(timed).toEqual([
      'abrahangs-no-hang',
      'pima-finger-pull-half-crimp',
      'pima-finger-pull-open-hand',
      'max-hang-half-crimp',
      'max-hang-open-hand',
      'oi-bar-pull-extended',
      'oi-bar-pull-90',
      'oi-bar-pull-top',
      'weighted-lockoff-hold',
      'oi-wall-press',
      'test-max-hang-half-crimp',
      'test-max-hang-open-hand',
      'test-lockoff-90-left',
      'test-lockoff-90-right',
    ]);
  });
});

describe('shouldAutoStartSet', () => {
  it('fires the instant the rest reaches zero', () => {
    const { state, now } = restEnded(0);
    expect(shouldAutoStartSet(state, now, gateFor(1), true)).toBe(true);
  });

  it('does not fire while the rest is still running', () => {
    const state = startRest('oi-bar-pull-90', REST_MS, T0);
    expect(shouldAutoStartSet(state, T0 + REST_MS - 1, gateFor(1), true)).toBe(false);
  });

  it('fires inside the grace window and not past it', () => {
    for (const late of [0, 1000, SET_GRACE_MS]) {
      const { state, now } = restEnded(late);
      expect(shouldAutoStartSet(state, now, gateFor(1), true)).toBe(true);
    }
    const { state, now } = restEnded(SET_GRACE_MS + 1);
    expect(shouldAutoStartSet(state, now, gateFor(1), false)).toBe(false);
  });

  it('never fires while the app is off screen', () => {
    // A hang begun against a board nobody is standing at is the whole of what
    // D39 objected to, and it is the fence that survived the amendment.
    const { state, now } = restEnded(0);
    expect(shouldAutoStartSet(state, now, gateFor(1), false)).toBe(false);
  });

  it('never fires on a hold or on an idle timer', () => {
    expect(shouldAutoStartSet(startHold('oi-bar-pull-90', T0), T0 + 9000, gateFor(1), true)).toBe(
      false,
    );
    expect(shouldAutoStartSet(IDLE_TIMER, T0, gateFor(1), true)).toBe(false);
  });
});

describe('isAutoStartStale', () => {
  it('reports a rest the app slept through, and only that', () => {
    const inside = restEnded(SET_GRACE_MS);
    expect(isAutoStartStale(inside.state, inside.now, gateFor(1))).toBe(false);

    const outside = restEnded(SET_GRACE_MS + 1);
    expect(isAutoStartStale(outside.state, outside.now, gateFor(1))).toBe(true);
  });

  it('is false where nothing was permitted to start anyway', () => {
    const { state, now } = restEnded(60_000);
    expect(isAutoStartStale(state, now, gateFor(3))).toBe(false);
  });
});

describe('restAfterLoggedSet', () => {
  it('is the exercise’s prescribed rest, into an idle slot', () => {
    expect(restAfterLoggedSet(barPull, IDLE_TIMER)).toBe(REST_MS);
  });

  it('is null where the plan prescribes no rest', () => {
    // §5D states none for the wall press, and every rep-based entry in the
    // catalog is the same — the number does not exist to start.
    expect(restAfterLoggedSet(wallPress, IDLE_TIMER)).toBeNull();
    expect(restAfterLoggedSet(row, IDLE_TIMER)).toBeNull();
    expect(restAfterLoggedSet(undefined, IDLE_TIMER)).toBeNull();
  });

  it('restarts this exercise’s own running rest', () => {
    // A second row logged during the rest is a set that just ended; its
    // interval starts now.
    expect(restAfterLoggedSet(barPull, startRest('oi-bar-pull-90', REST_MS, T0))).toBe(REST_MS);
  });

  it('never takes a clock running on another exercise', () => {
    expect(restAfterLoggedSet(barPull, startHold('max-hang-half-crimp', T0))).toBeNull();
    expect(restAfterLoggedSet(barPull, startRest('max-hang-half-crimp', REST_MS, T0))).toBeNull();
  });

  it('never replaces an effort under way, even this exercise’s own', () => {
    // A row typed into a card is the one transition here that can happen without
    // looking at the timer, so it must not be able to end a hang or a count.
    expect(restAfterLoggedSet(barPull, startHold('oi-bar-pull-90', T0))).toBeNull();
    expect(restAfterLoggedSet(barPull, startLeadIn('oi-bar-pull-90', 3000, T0))).toBeNull();
  });

  it('leaves an unlogged measurement’s own rest alone', () => {
    const pending: TimerState = { ...startRest('oi-bar-pull-90', REST_MS, T0), heldMs: 5000 };
    expect(restAfterLoggedSet(barPull, pending)).toBeNull();
  });
});
