import type { Exercise } from '../types';

// The in-session hold/rest timer (T10), as a pure state machine over
// (state, now). Deliberately has no `Date.now()` inside it, no React import, and
// no storage import — for the same reason checks.ts, session.ts, and rotation.ts
// don't: the interval math has to be testable without a DOM or a clock.
//
// D18: every phase stores the absolute epoch-ms instant it began, and every
// reading is computed as (now - startedAt). Nothing accumulates ticks. That is
// what makes a backgrounded iOS PWA come back with the *correct* time rather
// than one short by however long it was suspended — not persistence, which this
// module deliberately has none of.

export interface HoldSpec {
  min: number; // seconds
  max: number; // seconds; equal to min for a fixed target
}

export type TimerPhase = 'idle' | 'holding' | 'resting';

export interface TimerState {
  phase: TimerPhase;
  /** The exercise the timer belongs to; retained after a hold so its result can be logged. */
  exerciseId: string | null;
  /** Epoch ms the current phase began. Meaningless when idle. */
  startedAt: number;
  /** Resting only: the full prescribed rest, in ms. */
  restMs: number;
  /** Measured duration of the hold that just finished, in ms; null once logged or cleared. */
  heldMs: number | null;
  /**
   * True when `heldMs` came from the timer reaching the prescribed maximum rather
   * than from a manual Stop. Read once, by the set-logging path: an auto-stop
   * knows *why* the hold ended (it hit the target) and records that reason with
   * no tap, where a manual stop is ambiguous and records nothing (D27, AC2/AC3).
   * Ephemeral like every other field here (D18).
   */
  heldAuto: boolean;
}

export const IDLE_TIMER: TimerState = {
  phase: 'idle',
  exerciseId: null,
  startedAt: 0,
  restMs: 0,
  heldMs: null,
  heldAuto: false,
};

/** Reads an exercise's optional timing fields (D17) into the shapes this module uses. */
export function holdSpecOf(exercise: Exercise | undefined): HoldSpec | null {
  if (!exercise?.holdSeconds) return null;
  const [min, max] = exercise.holdSeconds;
  return { min, max };
}
export function restMsOf(exercise: Exercise | undefined): number | null {
  return exercise?.restSeconds == null ? null : exercise.restSeconds * 1000;
}

/** True when the timer bar has anything to show — a running phase or an unlogged result. */
export function isTimerVisible(state: TimerState): boolean {
  return state.phase !== 'idle' || state.heldMs !== null;
}

// ─── Transitions ─────────────────────────────────────────────────────────────

// Starting a hold always takes over the single timer slot, discarding any
// running rest and any unlogged result: there is one timer because there is one
// owner with two hands, and the thing they just tapped is the thing they mean.
export function startHold(exerciseId: string, now: number): TimerState {
  return { phase: 'holding', exerciseId, startedAt: now, restMs: 0, heldMs: null, heldAuto: false };
}

export function startRest(exerciseId: string, restMs: number, now: number): TimerState {
  return { phase: 'resting', exerciseId, startedAt: now, restMs, heldMs: null, heldAuto: false };
}

/**
 * Ends a hold, keeping its measured duration so it can be logged (AC6).
 *
 * With a prescribed rest, the countdown starts in the same transition — the
 * whole ergonomic point is that finishing a hang and starting its 3 minutes is
 * one tap, not two. With none (the wall press), it lands idle but still holding
 * its result, so the log control survives.
 */
export function stopHold(state: TimerState, now: number, restMs: number | null): TimerState {
  if (state.phase !== 'holding') return state;
  const heldMs = Math.max(0, now - state.startedAt);
  if (restMs === null) {
    return { ...IDLE_TIMER, exerciseId: state.exerciseId, heldMs, heldAuto: false };
  }
  return {
    phase: 'resting',
    exerciseId: state.exerciseId,
    startedAt: now,
    restMs,
    heldMs,
    heldAuto: false,
  };
}

/**
 * Ends a hold that reached its prescribed maximum, recording *exactly* that
 * maximum rather than the elapsed time at the moment detection happened.
 *
 * Detection rides on a render tick, and a throttled tick (a backgrounded tab, a
 * busy main thread) can notice a second or more late — which would log "5.9s"
 * for a 5s hold that the app itself ended. The hold did reach the target; the
 * timer was simply slow to look. Recording the target keeps the logged number
 * deterministic and honest, and it is now a charted measurement (T12), so tick
 * jitter would otherwise show up as noise in the trend.
 *
 * A *manual* stop still records real elapsed time (T13 AC6) — there the number
 * is the owner's, not the prescription's.
 */
export function autoStopHold(
  state: TimerState,
  hold: HoldSpec,
  restMs: number | null,
): TimerState {
  if (state.phase !== 'holding') return state;
  const heldMs = hold.max * 1000;
  if (restMs === null) {
    return { ...IDLE_TIMER, exerciseId: state.exerciseId, heldMs, heldAuto: true };
  }
  // Rest starts from the instant the hold *should* have ended, for the same
  // reason: a late tick must not silently shorten the prescribed rest.
  return {
    phase: 'resting',
    exerciseId: state.exerciseId,
    startedAt: state.startedAt + heldMs,
    restMs,
    heldMs,
    heldAuto: true,
  };
}

/** Pushes the rest target out without restarting it — the remaining time grows by `seconds`. */
export function extendRest(state: TimerState, seconds: number): TimerState {
  if (state.phase !== 'resting') return state;
  return { ...state, restMs: state.restMs + seconds * 1000 };
}

/** Drops the result after it has been written to a set, leaving any running phase alone. */
export function clearHeld(state: TimerState): TimerState {
  return state.heldMs === null ? state : { ...state, heldMs: null, heldAuto: false };
}

/** Dismisses the timer entirely (Skip, or done with a finished rest). */
export function clearTimer(): TimerState {
  return IDLE_TIMER;
}

// ─── Readings ────────────────────────────────────────────────────────────────

/** Elapsed hold time in ms; 0 unless a hold is running. Never negative. */
export function elapsedMs(state: TimerState, now: number): number {
  if (state.phase !== 'holding') return 0;
  return Math.max(0, now - state.startedAt);
}

/** Remaining rest in ms, clamped at 0; 0 unless a rest is running. */
export function restRemainingMs(state: TimerState, now: number): number {
  if (state.phase !== 'resting') return 0;
  return Math.max(0, state.startedAt + state.restMs - now);
}

export function isRestComplete(state: TimerState, now: number): boolean {
  return state.phase === 'resting' && restRemainingMs(state, now) === 0;
}

export type HoldStatus = 'under' | 'in' | 'over';

/**
 * True once a running hold has reached the top of its prescribed range (T13 AC4).
 *
 * T10 deliberately let the hold run past its target, on the reasoning that the
 * owner decides when to drop off. The owner reversed that on 2026-07-24: the
 * timer now ends the hold at the prescribed maximum. A manual Stop before then
 * still measures the real elapsed time (AC6), so cutting a hold short is
 * unaffected — only overrunning is.
 *
 * `over` therefore remains reachable in `holdStatus` for the brief window
 * between the threshold and the stop landing, and for holds with no spec.
 */
export function shouldAutoStop(state: TimerState, now: number, hold: HoldSpec | null): boolean {
  if (state.phase !== 'holding' || hold === null) return false;
  return elapsedMs(state, now) >= hold.max * 1000;
}

/**
 * Where an elapsed hold sits against its target range.
 *
 * Both bounds are inclusive, so a 7–10s hang reads "in range" at exactly 7.0s
 * and still at exactly 10.0s.
 */
export function holdStatus(elapsed: number, hold: HoldSpec): HoldStatus {
  if (elapsed < hold.min * 1000) return 'under';
  if (elapsed <= hold.max * 1000) return 'in';
  return 'over';
}

/** Fraction of the way to the top of the range, clamped to [0, 1], for the progress bar. */
export function holdFraction(elapsed: number, hold: HoldSpec): number {
  if (hold.max <= 0) return 0;
  return Math.min(1, Math.max(0, elapsed / (hold.max * 1000)));
}

/** Where the target band starts, as a fraction of the bar. 0 for a fixed target. */
export function holdBandStart(hold: HoldSpec): number {
  if (hold.max <= 0) return 0;
  return Math.min(1, Math.max(0, hold.min / hold.max));
}

// ─── Formatting ──────────────────────────────────────────────────────────────

/** "8.4s" — one decimal, which is the honest resolution for a hand-stopped hold. */
export function formatHold(ms: number): string {
  return `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
}

/**
 * "2:47" — for a countdown, so it reads 3:00 the instant a 3 min rest starts and
 * only reaches 0:00 when the rest is actually over.
 */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/** "7–10s" / "5s" — the target as shown next to the running count. */
export function formatHoldTarget(hold: HoldSpec): string {
  return hold.min === hold.max ? `${hold.max}s` : `${hold.min}–${hold.max}s`;
}
