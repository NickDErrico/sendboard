import type { TimerState } from './timer';

/**
 * Which single control the focus surface offers right now (T21).
 *
 * The whole point of the surface is that there is exactly *one* thing to hit at
 * any moment, big enough to find by feel — so "which one" is a decision worth
 * making in a tested function rather than in a chain of ternaries inside a view.
 *
 * Two rules it encodes, both older than this task:
 *
 * 1. **An unlogged result outranks a running rest.** The bar shows both; a
 *    surface with one control has to choose, and the set that has not been
 *    recorded is the thing that stops existing if it is not tapped (D16).
 * 2. **A running rest offers nothing.** Not "skip", not "next" — Skip stays a
 *    small secondary control, because a primary button that quietly ends §4C's
 *    3 minutes is how a prescribed rest erodes (T19's rule, restated in a place
 *    where the button would be enormous).
 */
export type FocusAction =
  | 'start' // begin this exercise's next set (a count, per D33)
  | 'cancel' // a count is running
  | 'stop' // a hold is running — the only thing that ends it (D36)
  | 'log' // a measured hold is waiting to be recorded
  | 'start-next' // the rest is over
  | 'wait'; // the rest is running; nothing primary to do

export interface FocusStep {
  action: FocusAction;
  /** True when the timer belongs to a *different* exercise (AC9). */
  otherRunning: boolean;
}

/**
 * @param state the session's one timer, whoever it belongs to
 * @param exerciseId the exercise the surface is focused on
 * @param restDone whether the running rest has reached zero (a clock reading,
 *        passed in rather than computed, so this stays free of `now`)
 */
export function focusStep(
  state: TimerState,
  exerciseId: string,
  restDone: boolean,
): FocusStep {
  // Someone else's clock: this exercise can still be started (that takes the
  // timer, as it always has), but nothing here reports on the other one beyond
  // saying it is running.
  if (state.exerciseId !== null && state.exerciseId !== exerciseId) {
    const otherRunning = state.phase !== 'idle' || state.heldMs !== null;
    return { action: 'start', otherRunning };
  }

  if (state.heldMs !== null) return { action: 'log', otherRunning: false };
  if (state.phase === 'counting') return { action: 'cancel', otherRunning: false };
  if (state.phase === 'holding') return { action: 'stop', otherRunning: false };
  if (state.phase === 'resting') {
    return { action: restDone ? 'start-next' : 'wait', otherRunning: false };
  }
  return { action: 'start', otherRunning: false };
}
