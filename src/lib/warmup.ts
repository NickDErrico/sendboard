import type { Exercise } from '../types';
import { holdSpecOf, isRestComplete, restMsOf, type TimerState } from './timer';

/**
 * The warm-up runner's decisions (T23).
 *
 * §7 calls cold pulleys "the #1 cause of finger injuries in exactly your grade
 * range" and §4A gives the warm-up 10–15 minutes and four ordered stages. The app
 * gives it a checkbox. This module decides what a runner for it does.
 *
 * Three rules, and the first two are why it is a module rather than a component:
 *
 * 1. **D39: a warm-up round may start itself; a working set never may.** The gate
 *    is `category === 'warmup'` — a property of the *catalog*, not a flag on a
 *    surface — so no max hang or PIMA pull can reach the auto-repeating path
 *    whatever is built on top of this later. T19 AC5 is narrowed, not reversed.
 * 2. **D40: it paces what the plan paces and reports what it does not.** §4A
 *    states both of the abrahangs' intervals, so the app runs exactly those two
 *    numbers. It states only a total for the progression, so the stages advance
 *    on a tap and the app reports elapsed. A countdown reads as a prescription
 *    however it is captioned, and inventing one would be authoring training
 *    content the plan withheld (D6).
 * 3. **D18: nothing here holds state.** A run's start instant and its round count
 *    live in the view for exactly as long as the view does.
 */

/** What form a warm-up's runner takes, decided by what the entry declares. */
export interface StagedPlan {
  form: 'staged';
  /** The plan's ordered stages, as transcribed at T2. */
  stages: string[];
  /** "10–15 min, building to…" — reported beside elapsed, never counted down. */
  prescription: string;
}

export interface CyclePlan {
  form: 'cycle';
  holdSec: number;
  restSec: number;
  prescription: string;
}

export type WarmupPlan = StagedPlan | CyclePlan;

/**
 * The runner offered for an exercise, or null for every exercise that is not a
 * warm-up.
 *
 * The category gate is the whole safety argument for D39, so it is the first
 * thing this function does and the reason it takes an `Exercise` rather than the
 * pieces of one.
 */
export function warmupPlanOf(exercise: Exercise | undefined): WarmupPlan | null {
  if (!exercise || exercise.category !== 'warmup') return null;

  const hold = holdSpecOf(exercise);
  const restMs = restMsOf(exercise);
  // A cycle needs both halves of a cadence. An *open* hold (`max === null`) has
  // no maximum to auto-stop at, so it would repeat forever rather than round —
  // it falls to the staged form, as does a hold the plan gives no rest for.
  if (hold && hold.max !== null && restMs !== null && restMs > 0) {
    return {
      form: 'cycle',
      holdSec: hold.max,
      restSec: restMs / 1000,
      prescription: exercise.prescription,
    };
  }

  if (exercise.howTo.length === 0) return null;
  return { form: 'staged', stages: exercise.howTo, prescription: exercise.prescription };
}

// ─── Staged runs ─────────────────────────────────────────────────────────────

/** The next stage, clamped rather than wrapped — a warm-up ends, it does not loop. */
export function nextStage(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(total - 1, Math.max(0, Math.floor(index)) + 1);
}

/** True on the last stage, where the control finishes the run instead of advancing. */
export function isLastStage(index: number, total: number): boolean {
  return total <= 0 || index >= total - 1;
}

/** "4:12" — how long the warm-up has been running, against a range, never toward one. */
export function formatRun(elapsedMs: number): string {
  const total = Math.floor(Math.max(0, elapsedMs) / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// ─── Cycles ──────────────────────────────────────────────────────────────────

/**
 * How late the app may be in noticing a finished round and still start the next.
 *
 * The mirror of `LEAD_IN_GRACE_MS`, and it exists for the same reason: a
 * backgrounded PWA is suspended, so a rest can end while nothing is running and
 * be noticed minutes later. Starting a round there would be a hang nobody heard
 * begin, and an unattended cycle beeping into an empty room is precisely the
 * failure mode D39's carve-out has to exclude.
 */
export const CYCLE_GRACE_MS = 3000;

/** When the running rest was due to end. Meaningless outside a rest. */
function restEndAt(state: TimerState): number {
  return state.startedAt + state.restMs;
}

/**
 * True the moment an armed cycle should begin its next round.
 *
 * `visible` is passed in rather than read here for the same reason `restDone` is
 * passed to `focusStep`: this module stays free of the DOM and of `Date.now`, so
 * the rule is testable without either.
 */
export function shouldStartNextRound(
  state: TimerState,
  now: number,
  armed: boolean,
  visible: boolean,
): boolean {
  if (!armed || !visible) return false;
  if (!isRestComplete(state, now)) return false;
  return now - restEndAt(state) <= CYCLE_GRACE_MS;
}

/**
 * True when an armed cycle has been left behind by a suspended app.
 *
 * The caller disarms rather than catching up: a cycle that resumes after a
 * five-minute background would run rounds against a board nobody is standing at.
 */
export function isCycleStale(state: TimerState, now: number, armed: boolean): boolean {
  if (!armed || state.phase !== 'resting') return false;
  return now - restEndAt(state) > CYCLE_GRACE_MS;
}

/** "round 3" — a count of what has been run, never a target to reach (D23). */
export function roundLabel(round: number): string {
  return `round ${Math.max(1, Math.floor(round))}`;
}
