import type { Exercise } from '../types';
import type { ChainPosition } from './chain';
import {
  holdSpecOf,
  isAutoAdvanceStale,
  restMsOf,
  shouldAutoAdvance,
  type TimerState,
} from './timer';

/**
 * A timed working set starting itself when its rest is over (T35).
 *
 * This reverses D39, which said a working set may never start itself, and it is
 * worth writing down why rather than quietly deleting the rule.
 *
 * D39's objection was never "the app must not run the clock" — it was that a set
 * beginning unannounced starts a maximal effort against a board nobody is
 * standing at. T23 and T31 had already narrowed it twice on that reasoning: a
 * warm-up round and a rep inside a set may both auto-advance, because T30 counts
 * the last five seconds of the interval out loud and a rep ten seconds away is
 * announced before it arrives rather than discovered once it has.
 *
 * The owner's amendment (2026-07-30) applies the same argument to the last case
 * left: a *timed* set is one the app can measure, so the app is the thing that
 * knows when it should begin, and asking for a tap between every rest and every
 * hang is asking the owner to hold a phone they have put on the floor. Untimed
 * work is untouched — there is nothing to start there, and a rep scheme goes at
 * the owner's pace by design.
 *
 * Three fences survive the amendment, and they are the whole of what made the
 * earlier carve-outs safe:
 *
 * 1. **Announced before it arrives.** T30's five-second countdown and the
 *    rest-end tone already run; auto-start rides on the same instant, so nothing
 *    begins that the owner has not been counted into.
 * 2. **A grace window and a visibility check.** Shared with the warm-up cycle
 *    and the rep chain via `shouldAutoAdvance`, so one rule governs all three. A
 *    suspended app comes back to a *stopped* rest and a manual Start, never to a
 *    hang it began while nobody was there.
 * 3. **Nothing unlogged is discarded.** Starting a hold takes the timer slot,
 *    which would drop a measured hang that has not been written to a set — the
 *    exact way a set disappears (D16). A pending result blocks the auto-start
 *    and the "Log …" button stays where it is.
 *
 * Pure, like `warmup.ts` and `reps.ts` next to it: a function of a timer
 * reading, a declaration and a count.
 */

/**
 * How late the app may be in noticing a finished rest and still start the set.
 *
 * The same three seconds as the warm-up cycle's and the rep chain's, for the
 * same reason and deliberately not a different number — past it the rest ended
 * while the app was suspended, and the fence exists so that the effort begins
 * where the countdown that announced it did.
 */
export const SET_GRACE_MS = 3000;

/**
 * Everything outside the clock that decides whether an auto-start is allowed.
 *
 * Passed in rather than derived here for the reason every module in `lib/`
 * takes its inputs this way: the permission is a function of the session's log
 * and catalog, and this file is testable without either.
 */
export interface AutoStartGate {
  /** The exercise the timer belongs to, from the catalog. */
  exercise: Exercise | undefined;
  /** Where its logged sets sit against the prescription (`chainPosition`). */
  position: ChainPosition;
  /** True while a rep chain owns this interval — `shouldStartNextRep` has it. */
  repArmed: boolean;
  /** True where the exercise is already marked completed (D16's explicit tap). */
  completed: boolean;
  /** True for the warm-up entries, which `WarmupRunner` drives instead (T23). */
  warmup: boolean;
}

/**
 * May a completed rest start the next working set by itself?
 *
 * Everything here is a *permission*, never the arithmetic — `shouldAutoAdvance`
 * owns the clock, and this file owns which exercises may ask it. That split is
 * the one `timer.ts` asks every caller to keep, and it is what stops a shared
 * grace window from quietly widening the set of things allowed to fire.
 */
export function autoStartPermitted(state: TimerState, gate: AutoStartGate): boolean {
  // Nothing to start: an exercise with no prescribed duration has no hold, and
  // the app has no business inventing one (D17).
  if (holdSpecOf(gate.exercise) === null) return false;
  // The warm-up runner is its own surface with its own cadence (T23), and two
  // things driving one timer is how a round starts twice.
  if (gate.warmup) return false;
  // A finished exercise is finished. The mark is an explicit tap (D16), and
  // starting a set after it would argue with the owner about their own record.
  if (gate.completed) return false;
  // Between reps, the chain's own advance is the thing that fires (T31). Both
  // read the same rest; only one may act on it.
  if (gate.repArmed) return false;
  // A hang that was measured and not written to a set is the one thing here
  // that can be lost: taking the timer slot discards it (D16). The Log control
  // is already on screen, and the rest simply ends.
  if (state.heldMs !== null) return false;
  // Past the prescription's top the app has no further set to *offer* — which
  // is exactly the rule the surfaces already encode when they hand the primary
  // control to "mark done and move on" (T32). Offering is one thing; starting
  // one unasked is another, and D23 forbids the app deciding either way.
  if (gate.position.beyond) return false;
  return true;
}

/**
 * True the instant a rest should hand over to the next set's clock.
 *
 * The arithmetic is `shouldAutoAdvance`'s, shared with T23's cycle and T31's
 * chain so one grace window and one visibility rule govern all three.
 */
export function shouldAutoStartSet(
  state: TimerState,
  now: number,
  gate: AutoStartGate,
  visible: boolean,
): boolean {
  return shouldAutoAdvance(state, now, autoStartPermitted(state, gate), visible, SET_GRACE_MS);
}

/**
 * True when a permitted auto-start has been left behind by a suspended app.
 *
 * The caller does nothing but stop waiting: what is on screen afterwards is a
 * finished rest with its manual Start control, which is where the app stood
 * before T35 and is the correct place to land. Reported separately from
 * `shouldAutoStartSet` so the surfaces can say the count is not coming rather
 * than leave a rest that reads "go" and then does nothing.
 */
export function isAutoStartStale(state: TimerState, now: number, gate: AutoStartGate): boolean {
  return isAutoAdvanceStale(state, now, autoStartPermitted(state, gate), SET_GRACE_MS);
}

/**
 * The rest a logged set drops into, or null where the plan prescribes none.
 *
 * The other half of the owner's amendment: a set that is *counted* rather than
 * timed still has an interval after it, and the tap that records the set is the
 * moment the app learns the interval began. Where the entry declares no
 * `restSeconds` — which is every rep-based entry in the catalog as it stands —
 * this returns null and nothing starts, because inventing the number is the
 * fabrication D17 exists to prevent.
 *
 * `timer` is the session's one clock, and this is the one transition that can be
 * triggered without looking at it — a row typed into a card, possibly the wrong
 * card. So it may only start into an idle slot or over this exercise's own
 * running rest. A count or a hold is never replaced, whoever it belongs to:
 * there is one timer because there is one owner with two hands, and typing a
 * number must not end an effort that is under way.
 */
export function restAfterLoggedSet(
  exercise: Exercise | undefined,
  timer: TimerState,
): number | null {
  const restMs = restMsOf(exercise);
  if (restMs === null || exercise === undefined) return null;
  // An unlogged measurement outranks this: its own rest is already running, and
  // replacing it would restart an interval that is half spent — and the "Log …"
  // control the owner has not tapped yet would go with it (D16).
  if (timer.heldMs !== null) return null;
  if (timer.phase === 'counting' || timer.phase === 'holding') return null;
  if (timer.phase === 'resting' && timer.exerciseId !== exercise.id) return null;
  return restMs;
}
