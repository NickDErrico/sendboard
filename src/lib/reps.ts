import type { Exercise, RepChain } from '../types';
import { variantsFor } from './block';
import {
  isAutoAdvanceStale,
  shouldAutoAdvance,
  type HoldSpec,
  type TimerState,
} from './timer';

/**
 * Sets built from several short efforts (T31).
 *
 * §4B's weeks-1–4 protocol is "5 sets x 4 reps x 3 sec at ~90% effort, ~10 sec
 * between reps, 3 min between sets". Every other timed exercise in the plan has
 * one hold per set, so the app had one too: it ran a single effort and dropped
 * into the three minutes, and the owner counted the other three reps.
 *
 * Three rules decide everything below.
 *
 * 1. **The set starts on a tap; the reps inside it do not.** D39 said a working
 *    set may never start itself, and T10 and T23 both declined to build this for
 *    that reason. T31 narrows the refusal rather than dropping it: the *set* is
 *    still a deliberate tap, and what auto-advances is the interval inside a set
 *    already under way. What made that safe is T30 — a rep ten seconds out is
 *    announced by the rest countdown five seconds before it starts, so it can no
 *    longer begin unheard. That was D39's actual objection.
 * 2. **The chain drives the clock only while its variant is live.** In weeks 5–8
 *    §4B is a single 3–5s max effort and nothing here applies. Which protocol is
 *    live is `variantsFor`'s answer, never a second derivation (D41).
 * 3. **A set is one record.** Four reps produce one `SetEntry`, because §4B
 *    counts five sets and not twenty — logging each rep would make "set 3 of 5"
 *    disagree with the plan and double every chart.
 *
 * Pure, like every other derivation in `lib/`: a function of a declaration, a
 * week, and a timer reading.
 */

/**
 * How late the app may be in noticing a finished inter-rep rest and still start
 * the next rep.
 *
 * Deliberately the same three seconds as the warm-up cycle's, and for the same
 * reason: past it, the rest ended while the app was suspended and the rep would
 * begin against a board nobody is standing at. It matters more here — this is
 * ~90% effort rather than a warm-up — which is an argument for the fence, not
 * for a longer one.
 */
export const REP_GRACE_MS = 3000;

/**
 * The rep chain in force for an exercise in a given week, or null.
 *
 * Null is the overwhelmingly common answer: nineteen of twenty entries declare
 * no variants at all, and §4B's peak variant declares no chain. A null week —
 * nothing logged yet, or still loading — also yields null rather than guessing a
 * protocol, exactly as `variantsFor` refuses to emphasise one (D19).
 */
export function repChainOf(exercise: Exercise | undefined, week: number | null): RepChain | null {
  if (!exercise || week === null) return null;
  return variantsFor(exercise, week).live?.repChain ?? null;
}

/**
 * The hold a rep is measured against: fixed at the chain's own duration.
 *
 * `min === max`, so the hold auto-stops at three seconds and draws no target
 * band — the plan states one number here, not a window, and a band would invent
 * the range it is missing.
 */
export function repHoldSpec(chain: RepChain): HoldSpec {
  return { min: chain.holdSec, max: chain.holdSec };
}

/** True on the rep that ends the set — the one the between-sets rest follows. */
export function isLastRep(chain: RepChain, rep: number): boolean {
  return Math.floor(rep) >= chain.reps;
}

/**
 * The rest that follows a rep: the gap inside the set, or the set's own rest on
 * the last one.
 *
 * `setRestMs` is passed in rather than read off the exercise so the choice
 * between the two intervals is visible in one expression — this is the line the
 * whole task turns on, and burying it behind a lookup is how it silently becomes
 * three minutes again.
 */
export function restAfterRep(chain: RepChain, rep: number, setRestMs: number | null): number | null {
  return isLastRep(chain, rep) ? setRestMs : chain.betweenSec * 1000;
}

/**
 * True the moment an armed chain should begin its next rep.
 *
 * Shares `shouldAutoAdvance` with the warm-up cycle. The caller supplies the
 * permission: it fires only while a chain is live, a set is under way, and the
 * rep just finished was not the last.
 */
export function shouldStartNextRep(
  state: TimerState,
  now: number,
  armed: boolean,
  visible: boolean,
): boolean {
  return shouldAutoAdvance(state, now, armed, visible, REP_GRACE_MS);
}

/** True when an armed chain has been left behind by a suspended app. */
export function isRepChainStale(state: TimerState, now: number, armed: boolean): boolean {
  return isAutoAdvanceStale(state, now, armed, REP_GRACE_MS);
}

/** "rep 2 of 4" — a position inside the set, the same shape as `formatChain`. */
export function formatRep(chain: RepChain, rep: number): string {
  return `rep ${clampRep(chain, rep)} of ${chain.reps}`;
}

/**
 * The same position said out loud (T20/D34), or null where there is nothing new
 * to say.
 *
 * Silent on the first rep: that one follows the owner's own tap and the count-in
 * already speaks. The later ones arrive on their own, which is exactly when the
 * number is worth hearing.
 *
 * Lower-cased and unpunctuated, exactly like `speakChain`: `restDonePhrase`
 * sentence-cases what it is given and adds the stop, so a finished phrase here
 * would come out "Rest done. Rep 2 of 4.."
 */
export function speakRep(chain: RepChain, rep: number): string | null {
  const at = clampRep(chain, rep);
  return at <= 1 ? null : `rep ${at} of ${chain.reps}`;
}

/**
 * What a completed chain writes into a set's free-text `reps` field.
 *
 * The PIMA entries declare no `metrics`, so nothing here is charted (D20) and
 * this is a record rather than a measurement. It reports what was *done*: a set
 * cut short at two reps says two, because §4F makes stopping early as often
 * correct as finishing and a record that rounded it up would be a lie the retest
 * later reads (D23).
 */
export function formatRepsDone(chain: RepChain, repsDone: number, lastSec: number): string {
  const done = Math.max(0, Math.floor(repsDone));
  const each = `${chain.holdSec.toFixed(1)}s`;
  const count = done === chain.reps ? `${done} x ${each}` : `${done} of ${chain.reps} x ${each}`;
  // Every rep but the last one ended at the prescribed three seconds, because the
  // clock ended it. Only the last can differ — a manual Stop measures what
  // actually elapsed (T13 AC6) — so only the last is worth naming. Reporting the
  // measured value as *every* rep's length, which is what a single number here
  // would do, would be the app inventing three measurements it never took.
  const short = Math.abs(lastSec - chain.holdSec) >= 0.05;
  return short ? `${count}, last ${lastSec.toFixed(1)}s` : count;
}

function clampRep(chain: RepChain, rep: number): number {
  return Math.min(chain.reps, Math.max(1, Math.floor(rep)));
}
