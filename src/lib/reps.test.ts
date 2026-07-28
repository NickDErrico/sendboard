import { describe, expect, it } from 'vitest';
import {
  REP_GRACE_MS,
  formatRep,
  formatRepsDone,
  isLastRep,
  isRepChainStale,
  repChainOf,
  repHoldSpec,
  restAfterRep,
  shouldStartNextRep,
  speakRep,
} from './reps';
import { EXERCISES } from '../data/exercises';
import { IDLE_TIMER, startHold, startRest } from './timer';
import type { RepChain } from '../types';

const byId = (id: string) => EXERCISES.find((e) => e.id === id);
const pima = byId('pima-finger-pull-half-crimp');
const CHAIN: RepChain = { reps: 4, holdSec: 3, betweenSec: 10 };

const T0 = 1_700_000_000_000;
const SET_REST_MS = 180_000;

describe('repChainOf', () => {
  it('is §4B’s weeks 1–4 protocol, on both PIMA entries', () => {
    for (const id of ['pima-finger-pull-half-crimp', 'pima-finger-pull-open-hand']) {
      // The four numbers the plan states: 4 reps, 3s, ~10s between them.
      expect(repChainOf(byId(id), 1)).toEqual({ reps: 4, holdSec: 3, betweenSec: 10 });
      expect(repChainOf(byId(id), 4)).toEqual({ reps: 4, holdSec: 3, betweenSec: 10 });
    }
  });

  it('stops at week 5, where §4B becomes a single max effort', () => {
    expect(repChainOf(pima, 5)).toBeNull();
    expect(repChainOf(pima, 8)).toBeNull();
    // Past the last declared range the final variant stays live (D25), so a
    // block that runs long keeps the peak protocol rather than looping back.
    expect(repChainOf(pima, 12)).toBeNull();
  });

  it('claims no protocol without a week (D19)', () => {
    // Nothing logged yet, or still loading. Guessing a week here would pick a
    // protocol on the owner's behalf.
    expect(repChainOf(pima, null)).toBeNull();
  });

  it('is null for every exercise the plan gives no rep structure', () => {
    const chained = EXERCISES.filter((e) => repChainOf(e, 1) !== null).map((e) => e.id);
    expect(chained).toEqual(['pima-finger-pull-half-crimp', 'pima-finger-pull-open-hand']);
    expect(repChainOf(byId('max-hang-half-crimp'), 1)).toBeNull();
    expect(repChainOf(undefined, 1)).toBeNull();
  });

  it('gives weeks 1–4 its own set count, not the peak variant’s', () => {
    // §4B: "5 sets" for the rep-structured protocol, "4–6 sets" for the peak
    // one. `prescribedSets` describes the latter.
    expect(pima?.variants?.[0].sets).toEqual([5, 5]);
    expect(pima?.prescribedSets).toEqual([4, 6]);
  });
});

describe('the rep chain’s intervals', () => {
  it('times a rep at the plan’s one number, with no range', () => {
    // A fixed target: 3s, not 3–5s. The band exists to place an effort inside a
    // window the plan stated, and this protocol states none.
    expect(repHoldSpec(CHAIN)).toEqual({ min: 3, max: 3 });
  });

  it('rests ten seconds between reps and three minutes after the last', () => {
    expect(restAfterRep(CHAIN, 1, SET_REST_MS)).toBe(10_000);
    expect(restAfterRep(CHAIN, 3, SET_REST_MS)).toBe(10_000);
    // The whole bug this task exists for: rep 4 is the one that earns §4B's
    // three minutes, and reps 1–3 must not.
    expect(restAfterRep(CHAIN, 4, SET_REST_MS)).toBe(SET_REST_MS);
  });

  it('knows which rep ends the set', () => {
    expect(isLastRep(CHAIN, 3)).toBe(false);
    expect(isLastRep(CHAIN, 4)).toBe(true);
    // Past the count — a chain left armed through a state it should not reach
    // ends the set rather than running a fifth rep.
    expect(isLastRep(CHAIN, 5)).toBe(true);
  });
});

describe('starting the next rep (D39, narrowed)', () => {
  const gap = startRest('pima-finger-pull-half-crimp', 10_000, T0);
  const gapEnd = T0 + 10_000;

  it('starts the next rep the moment the gap closes', () => {
    expect(shouldStartNextRep(gap, gapEnd, true, true)).toBe(true);
  });

  it('does nothing before the gap is over', () => {
    expect(shouldStartNextRep(gap, gapEnd - 1, true, true)).toBe(false);
  });

  it('never starts a rep for a chain that is not armed', () => {
    // Which is what a manual Stop leaves behind: the set ended, and the next rep
    // is not owed.
    expect(shouldStartNextRep(gap, gapEnd, false, true)).toBe(false);
  });

  it('never starts a rep the owner cannot be watching', () => {
    expect(shouldStartNextRep(gap, gapEnd, true, false)).toBe(false);
  });

  it('drops a gap the app slept through rather than firing a 90% effort late', () => {
    const late = gapEnd + REP_GRACE_MS + 1;
    expect(shouldStartNextRep(gap, late, true, true)).toBe(false);
    expect(isRepChainStale(gap, late, true)).toBe(true);
    // Inside the grace it is a slow tick, not a suspended app.
    expect(isRepChainStale(gap, gapEnd + REP_GRACE_MS, true)).toBe(false);
    expect(shouldStartNextRep(gap, gapEnd + REP_GRACE_MS, true, true)).toBe(true);
  });

  it('is never both stale and ready in the same reading', () => {
    for (const at of [gapEnd - 1, gapEnd, gapEnd + 1500, gapEnd + 3000, gapEnd + 9000]) {
      expect(shouldStartNextRep(gap, at, true, true) && isRepChainStale(gap, at, true)).toBe(false);
    }
  });

  it('reads nothing off a phase that is not a rest', () => {
    expect(shouldStartNextRep(startHold('x', T0), T0 + 60_000, true, true)).toBe(false);
    expect(shouldStartNextRep(IDLE_TIMER, T0, true, true)).toBe(false);
    expect(isRepChainStale(startHold('x', T0), T0 + 60_000, true)).toBe(false);
  });
});

describe('what the chain says', () => {
  it('reports a position inside the set', () => {
    expect(formatRep(CHAIN, 1)).toBe('rep 1 of 4');
    expect(formatRep(CHAIN, 4)).toBe('rep 4 of 4');
    // Clamped rather than allowed past the count: there is no rep 5 to name.
    expect(formatRep(CHAIN, 7)).toBe('rep 4 of 4');
    expect(formatRep(CHAIN, 0)).toBe('rep 1 of 4');
  });

  it('says the later reps and stays quiet on the first', () => {
    // Rep 1 follows the owner's own tap and the count-in already speaks over it.
    expect(speakRep(CHAIN, 1)).toBeNull();
    expect(speakRep(CHAIN, 2)).toBe('rep 2 of 4');
    // Unpunctuated and lower-cased: `restDonePhrase` sentence-cases it and adds
    // the stop, so a finished phrase here would end up "Rep 2 of 4.."
    expect(speakRep(CHAIN, 3)).not.toMatch(/\.$/);
    expect(speakRep(CHAIN, 3)?.[0]).toBe('r');
  });

  it('records what the set actually did, not what was prescribed', () => {
    expect(formatRepsDone(CHAIN, 4, 3)).toBe('4 x 3.0s');
    // §4F makes a short set as often correct as a full one, so a set stopped at
    // two says two — rounding it up would be a lie the week-8 retest reads.
    expect(formatRepsDone(CHAIN, 2, 3)).toBe('2 of 4 x 3.0s');
    expect(formatRepsDone(CHAIN, 0, 3)).toBe('0 of 4 x 3.0s');
  });

  it('names the last rep only when the clock did not end it', () => {
    // Reps 1–3 always end at three seconds because the timer ends them. A manual
    // Stop measures the fourth (T13 AC6), and reporting *that* number as every
    // rep's length would invent three measurements the app never took.
    expect(formatRepsDone(CHAIN, 2, 1.8)).toBe('2 of 4 x 3.0s, last 1.8s');
    expect(formatRepsDone(CHAIN, 4, 2.4)).toBe('4 x 3.0s, last 2.4s');
    // Tick jitter around the auto-stop is not a short rep.
    expect(formatRepsDone(CHAIN, 4, 3.02)).toBe('4 x 3.0s');
  });
});
