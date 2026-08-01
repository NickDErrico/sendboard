import type { TimerState } from './timer';

/**
 * Which single control the eyes-shut surface offers right now (T21).
 *
 * Named for the surface the app already calls "eyes-shut" — this module was
 * `focus.ts` until D48 gave `Focus` in `types.ts` to the training axis a movement
 * declares. The two subjects shared nothing but a word, and the word belongs to
 * the axis: a catalog field is read far more often than a view's control state.
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
 * 3. **T32: past the prescription's top, "move on" takes the primary.** Once the
 *    fifth of five is logged the app has no further set to *offer* — the big
 *    button asking for a sixth is the wrong default for a surface whose whole
 *    premise is that the likeliest next act is the one you can hit by feel. It
 *    is a demotion, never a block (D23): the start control stays on screen,
 *    small, exactly where Skip lives, and a sixth set is still one tap away.
 */
export type EyesShutAction =
  | 'start' // begin this exercise's next set (a count, per D33)
  | 'cancel' // a count is running
  | 'stop' // a hold is running — the only thing that ends it (D36)
  | 'log' // a measured hold is waiting to be recorded
  | 'start-next' // the rest is over
  | 'advance' // the prescription's top is logged: mark done and move on (T32)
  | 'wait'; // the rest is running; nothing primary to do

export interface EyesShutStep {
  action: EyesShutAction;
  /** True when the timer belongs to a *different* exercise (AC9). */
  otherRunning: boolean;
}

/**
 * @param state the session's one timer, whoever it belongs to
 * @param exerciseId the exercise the surface is showing
 * @param restDone whether the running rest has reached zero (a clock reading,
 *        passed in rather than computed, so this stays free of `now`)
 * @param chainDone whether the prescription's top is already logged
 *        (`chainPosition().beyond`) — a count over the log, passed in for the
 *        same reason, so this stays free of the log as well as of the clock
 */
export function eyesShutStep(
  state: TimerState,
  exerciseId: string,
  restDone: boolean,
  chainDone = false,
): EyesShutStep {
  // Someone else's clock: this exercise can still be started (that takes the
  // timer, as it always has), but nothing here reports on the other one beyond
  // saying it is running.
  if (state.exerciseId !== null && state.exerciseId !== exerciseId) {
    const otherRunning = state.phase !== 'idle' || state.heldMs !== null;
    return { action: chainDone ? 'advance' : 'start', otherRunning };
  }

  // An unrecorded set outranks everything, including a finished chain: the mark
  // this surface would write is a completion, and completing an exercise around
  // a measurement that was never logged is how a hang disappears (D16).
  if (state.heldMs !== null) return { action: 'log', otherRunning: false };
  if (state.phase === 'counting') return { action: 'cancel', otherRunning: false };
  if (state.phase === 'holding') return { action: 'stop', otherRunning: false };
  if (state.phase === 'resting') {
    // A running rest still offers nothing large — rule 2 outranks rule 3, and a
    // full-width "move on" would end §4C's 3 minutes as effectively as a Skip
    // twice its size. It waits for the clock like everything else here.
    if (!restDone) return { action: 'wait', otherRunning: false };
    return { action: chainDone ? 'advance' : 'start-next', otherRunning: false };
  }
  return { action: chainDone ? 'advance' : 'start', otherRunning: false };
}
