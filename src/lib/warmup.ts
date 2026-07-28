import type { Exercise, GripBlock } from '../types';
import {
  holdSpecOf,
  isAutoAdvanceStale,
  restMsOf,
  shouldAutoAdvance,
  type TimerState,
} from './timer';

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
  /**
   * The grip rotation the rounds run through (T29, §10A), or `[]` where the entry
   * declares none — a cadence with no prescribed grips repeats indefinitely
   * exactly as it did before, which is what keeps this additive.
   */
  blocks: GripBlock[];
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
      blocks: exercise.gripSequence ?? [],
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

/**
 * True the moment an armed cycle should begin its next round.
 *
 * The arithmetic is `shouldAutoAdvance`'s, shared with T31's rep chain so one
 * grace window governs both. The *permission* is still this module's: nothing
 * reaches here that `warmupPlanOf` did not gate on `category === 'warmup'`.
 */
export function shouldStartNextRound(
  state: TimerState,
  now: number,
  armed: boolean,
  visible: boolean,
): boolean {
  return shouldAutoAdvance(state, now, armed, visible, CYCLE_GRACE_MS);
}

/**
 * True when an armed cycle has been left behind by a suspended app.
 *
 * The caller disarms rather than catching up: a cycle that resumes after a
 * five-minute background would run rounds against a board nobody is standing at.
 */
export function isCycleStale(state: TimerState, now: number, armed: boolean): boolean {
  return isAutoAdvanceStale(state, now, armed, CYCLE_GRACE_MS);
}

/** "round 3" — a count of what has been run, never a target to reach (D23). */
export function roundLabel(round: number): string {
  return `round ${Math.max(1, Math.floor(round))}`;
}

// ─── Grip rotations (T29) ────────────────────────────────────────────────────

/**
 * Where a round falls in the grip sequence (§10A).
 *
 * The one place in this module where a warm-up *does* have a count to reach, and
 * the exception is the addendum's, not the app's: §10A prescribes twenty hangs in
 * a stated order, so "hang 2 of 6, front-3 open" is quoting a prescription rather
 * than inventing a quota. D23 is untouched — nothing is blocked at the end of the
 * sequence and nothing is graded against it; the owner can stop anywhere and the
 * only thing that changes is which grip the screen names.
 */
export interface GripPosition {
  block: GripBlock;
  /** 0-based index of the block in the sequence. */
  blockIndex: number;
  /** 1-based position within this block: 2 of 6. */
  roundInBlock: number;
  /** The grip that follows this block, or null on the last one. */
  next: GripBlock | null;
}

/** Rounds the whole sequence asks for; 0 where none is declared. */
export function totalRounds(blocks: GripBlock[]): number {
  return blocks.reduce((sum, block) => sum + Math.max(0, Math.floor(block.rounds)), 0);
}

/**
 * How long the sequence takes at a given cadence, in seconds.
 *
 * Exists so §10A's "20 hangs, 10:00" is *checked* rather than transcribed twice:
 * the catalog states the grips and the intervals, and the ten minutes is a
 * consequence of both. A test asserts it; nothing in the UI counts down to it
 * (D40).
 */
export function sequenceDurationSec(plan: CyclePlan): number {
  return totalRounds(plan.blocks) * (plan.holdSec + plan.restSec);
}

/**
 * The grip a 1-based round is taken in, or null when the round falls outside the
 * sequence — past the end, or on a cycle that declares no grips at all.
 *
 * Null is a supported state on both sides: rounds run before the sequence is
 * declared (a plain cadence) and rounds run after it ends (the owner tapped "more
 * rounds") are both legitimate, and neither gets a grip name the plan did not
 * prescribe.
 */
export function gripAt(blocks: GripBlock[], round: number): GripPosition | null {
  const target = Math.floor(round);
  if (target < 1) return null;

  let seen = 0;
  for (let i = 0; i < blocks.length; i += 1) {
    const rounds = Math.max(0, Math.floor(blocks[i].rounds));
    // A zero-round block is skipped rather than treated as a boundary: it would
    // otherwise claim the round belonging to the block after it.
    if (rounds === 0) continue;
    if (target <= seen + rounds) {
      return {
        block: blocks[i],
        blockIndex: i,
        roundInBlock: target - seen,
        next: blocks.slice(i + 1).find((b) => Math.floor(b.rounds) > 0) ?? null,
      };
    }
    seen += rounds;
  }
  return null;
}

/**
 * True once every prescribed round has been run.
 *
 * The cycle stops arming itself here — an auto-repeating cadence that ran past
 * its own prescription would be the app adding training volume, which is the
 * thing D39's carve-out is narrow enough to exclude. Resuming is still one tap on
 * "More rounds", because stopping at twenty is the prescription's decision and
 * continuing is the owner's (D23).
 */
export function isSequenceComplete(blocks: GripBlock[], round: number): boolean {
  const total = totalRounds(blocks);
  return total > 0 && Math.floor(round) >= total;
}

/** "Front-3 open · digits 2–4" — the full name where a surface has room for it. */
export function formatGrip(block: GripBlock): string {
  return block.digits ? `${block.grip} · ${block.digits}` : block.grip;
}

/** "hang 2 of 6" — position within the current grip, which is what §10A counts. */
export function formatGripRound(position: GripPosition): string {
  return `hang ${position.roundInBlock} of ${Math.floor(position.block.rounds)}`;
}
