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
  /**
   * Seconds; equal to `min` for a fixed target, and **null for an open hold**
   * (T16) — §4E's lock-off test is "longest static hold", so the duration is the
   * measurement and there is no prescription to end it at. An open hold never
   * auto-stops, draws no target band, and can only be ended by hand.
   */
  max: number | null;
}

/** True for §4E's max-duration tests: a running clock with nothing to reach. */
export function isOpenHold(hold: HoldSpec): boolean {
  return hold.max === null;
}

/**
 * `counting` is T20's lead-in: the seconds between the tap and "pull".
 *
 * It is a phase here rather than a `setTimeout` in a component for D18's reason
 * — it is read as `(now - startedAt)` like every other interval in this module,
 * so a throttled tick costs a stale frame and never a drifted count.
 */
export type TimerPhase = 'idle' | 'counting' | 'holding' | 'resting';

export interface TimerState {
  phase: TimerPhase;
  /** The exercise the timer belongs to; retained after a hold so its result can be logged. */
  exerciseId: string | null;
  /** Epoch ms the current phase began. Meaningless when idle. */
  startedAt: number;
  /** Counting only: the full lead-in, in ms (T20). */
  leadInMs: number;
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
  leadInMs: 0,
  restMs: 0,
  heldMs: null,
  heldAuto: false,
};

/** Reads an exercise's optional timing fields (D17) into the shapes this module uses. */
export function holdSpecOf(exercise: Exercise | undefined): HoldSpec | null {
  if (!exercise?.holdSeconds) return null;
  if (exercise.holdSeconds === 'open') return { min: 0, max: null };
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
  return {
    phase: 'holding',
    exerciseId,
    startedAt: now,
    leadInMs: 0,
    restMs: 0,
    heldMs: null,
    heldAuto: false,
  };
}

export function startRest(exerciseId: string, restMs: number, now: number): TimerState {
  return {
    phase: 'resting',
    exerciseId,
    startedAt: now,
    leadInMs: 0,
    restMs,
    heldMs: null,
    heldAuto: false,
  };
}

// ─── Lead-in (T20) ───────────────────────────────────────────────────────────

/**
 * Begins the count that ends in "pull" (D33).
 *
 * Takes over the timer slot exactly as `startHold` does — starting a hold while
 * a count runs restarts the count rather than stacking two, because there is one
 * timer and the thing the owner just tapped is the thing they mean.
 */
export function startLeadIn(exerciseId: string, leadInMs: number, now: number): TimerState {
  return {
    phase: 'counting',
    exerciseId,
    startedAt: now,
    leadInMs,
    restMs: 0,
    heldMs: null,
    heldAuto: false,
  };
}

/**
 * Remaining lead-in in ms; 0 unless a count is running.
 *
 * Clamped at *both* ends, and the upper one is not theoretical: the bar's clock
 * is a 100ms interval, so a count started while the bar is already on screen is
 * first rendered against a `now` read up to a tick *before* it began — which
 * reports 3100ms left of a 3 second count and makes it say "four". A count can
 * never have more left than its own length.
 */
export function leadInRemainingMs(state: TimerState, now: number): number {
  if (state.phase !== 'counting') return 0;
  return Math.min(state.leadInMs, Math.max(0, state.startedAt + state.leadInMs - now));
}

/** Whole seconds still to be counted: 3, 2, 1, then 0 — which is "pull". */
export function leadInSecondsLeft(state: TimerState, now: number): number {
  return Math.ceil(leadInRemainingMs(state, now) / 1000);
}

/** True the instant a running count reaches zero. */
export function isLeadInComplete(state: TimerState, now: number): boolean {
  return state.phase === 'counting' && leadInRemainingMs(state, now) === 0;
}

/**
 * How late the app is in noticing a finished count.
 *
 * A backgrounded PWA is suspended: a count started and then backgrounded can
 * come back long after "pull" would have sounded, and starting a hold there
 * would begin (and, at the maximum, auto-finish) a hang nobody heard begin. Past
 * this grace the count is cancelled instead — the one thing the app must never
 * do is invent a measurement.
 */
export const LEAD_IN_GRACE_MS = 2000;

export function isLeadInStale(state: TimerState, now: number): boolean {
  if (state.phase !== 'counting') return false;
  return now - (state.startedAt + state.leadInMs) > LEAD_IN_GRACE_MS;
}

/**
 * "Pull" — the count becomes the hold.
 *
 * The hold is back-dated to the instant the count actually ended rather than to
 * the tick that noticed it, the same correction `autoStopHold` makes at the other
 * end: a late tick must not lengthen a count or shorten a hold.
 */
export function holdFromLeadIn(state: TimerState): TimerState {
  if (state.phase !== 'counting' || state.exerciseId === null) return state;
  return {
    phase: 'holding',
    exerciseId: state.exerciseId,
    startedAt: state.startedAt + state.leadInMs,
    leadInMs: 0,
    restMs: 0,
    heldMs: null,
    heldAuto: false,
  };
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
    leadInMs: 0,
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
  // An open hold has no prescribed maximum to record, so there is nothing this
  // function can honestly write; `shouldAutoStop` never fires for one either.
  if (state.phase !== 'holding' || hold.max === null) return state;
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
    leadInMs: 0,
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

/**
 * Elapsed rest in ms; 0 unless a rest is running. Never negative.
 *
 * The counterpart to `restRemainingMs`, and the one T22's reading position is
 * built on: how far *into* the interval the owner is does not change when the
 * rest is extended, where how far from the end of it does.
 */
export function restElapsedMs(state: TimerState, now: number): number {
  if (state.phase !== 'resting') return 0;
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

/**
 * How long before a rest ends the app starts counting it out (T30).
 *
 * The rest-end tone fires at the instant the owner is meant to already be *on*
 * the board — chalked, hands on the edge, ready to pull — which is a moment too
 * late to start walking back to it. Five seconds is that walk.
 */
export const REST_COUNTDOWN_SEC = 5;

/**
 * Seconds left inside a rest's closing countdown: 5, 4, 3, 2, 1 — and 0
 * everywhere else, including the instant the rest is actually over, which
 * belongs to `beepRestEnd` and says something different.
 *
 * Derived from `restRemainingMs` rather than tracked, like every other reading
 * here (D18): a rest that was backgrounded through its own countdown comes back
 * on the second the clock says, and there is no armed timer to cancel.
 */
export function restCountdownSecondsLeft(state: TimerState, now: number): number {
  // A rest no longer than the countdown would be entirely countdown — there is
  // no interval left to warn about, so it simply runs and ends. Which is also
  // what keeps a short warm-up cycle rest (T23) from ticking end to end.
  if (state.phase !== 'resting' || state.restMs <= REST_COUNTDOWN_SEC * 1000) return 0;
  const remaining = restRemainingMs(state, now);
  if (remaining === 0) return 0;
  const seconds = Math.ceil(remaining / 1000);
  return seconds <= REST_COUNTDOWN_SEC ? seconds : 0;
}

// ─── Auto-advance (T23's cycle, T31's rep chain) ─────────────────────────────

/**
 * The rule two cadences share: when may a completed rest start the next effort
 * *without* a tap?
 *
 * The mechanism lives here so the warm-up cycle (T23) and the rep chain (T31)
 * cannot drift apart — one grace window, one visibility rule, one place to
 * change them. **What does not live here is permission.** Each caller keeps its
 * own gate: `warmupPlanOf` will not build a cycle for anything outside
 * `category === 'warmup'`, and a rep chain exists only on a variant that
 * declares one. D39 is a statement about which exercises may advance
 * themselves, and sharing the arithmetic does not widen it.
 *
 * `visible` is passed in rather than read here for the same reason nothing in
 * this module reads `Date.now`: the rule stays testable without a DOM.
 */
export function shouldAutoAdvance(
  state: TimerState,
  now: number,
  armed: boolean,
  visible: boolean,
  graceMs: number,
): boolean {
  if (!armed || !visible) return false;
  if (!isRestComplete(state, now)) return false;
  return now - (state.startedAt + state.restMs) <= graceMs;
}

/**
 * True when an armed cadence has been left behind by a suspended app.
 *
 * The caller disarms rather than catching up: a backgrounded PWA can come back
 * minutes after a rest ended, and starting an effort there would be one nobody
 * heard begin — which is the failure mode the grace window exists to exclude.
 */
export function isAutoAdvanceStale(
  state: TimerState,
  now: number,
  armed: boolean,
  graceMs: number,
): boolean {
  if (!armed || state.phase !== 'resting') return false;
  return now - (state.startedAt + state.restMs) > graceMs;
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
  // An open hold (T16) is never ended by the app: cutting §4E's max-duration
  // test short at an invented ceiling would truncate the measurement itself.
  if (state.phase !== 'holding' || hold === null || hold.max === null) return false;
  return elapsedMs(state, now) >= hold.max * 1000;
}

/**
 * Where an elapsed hold sits against its target range.
 *
 * Both bounds are inclusive, so a 7–10s hang reads "in range" at exactly 7.0s
 * and still at exactly 10.0s.
 */
export function holdStatus(elapsed: number, hold: HoldSpec): HoldStatus {
  // An open hold has no range to be under or over: every second of it counts,
  // which is the whole point of the test.
  if (hold.max === null) return 'in';
  if (elapsed < hold.min * 1000) return 'under';
  if (elapsed <= hold.max * 1000) return 'in';
  return 'over';
}

/** Fraction of the way to the top of the range, clamped to [0, 1], for the progress bar. */
export function holdFraction(elapsed: number, hold: HoldSpec): number {
  if (hold.max === null || hold.max <= 0) return 0;
  return Math.min(1, Math.max(0, elapsed / (hold.max * 1000)));
}

/** Where the target band starts, as a fraction of the bar. 0 for a fixed target. */
export function holdBandStart(hold: HoldSpec): number {
  if (hold.max === null || hold.max <= 0) return 0;
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

/** "7–10s" / "5s" / "max" — the target as shown next to the running count. */
export function formatHoldTarget(hold: HoldSpec): string {
  if (hold.max === null) return 'max';
  return hold.min === hold.max ? `${hold.max}s` : `${hold.min}–${hold.max}s`;
}
