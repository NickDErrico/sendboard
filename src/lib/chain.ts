import type { Exercise } from '../types';
import { variantsFor } from './block';

/**
 * Where you are in an exercise's prescribed sets (T19).
 *
 * Two rules hold this module together, and both are older than it:
 *
 * 1. **It counts logged sets, never attempts.** If a hold is performed and not
 *    recorded, the position does not move — the app must not believe in a set
 *    that no record contains (D16). The button that would advance it ("Log 7.4s
 *    as a set") is already on screen when that happens.
 * 2. **It reports a position, never a score.** Past the prescribed count it says
 *    so and keeps going; it never blocks, completes, congratulates, or computes
 *    an adherence figure (D23). §4F prescribes a lighter week "regardless of the
 *    schedule", so *fewer* sets is as often correct as more, and a UI that
 *    flagged either direction would argue against the plan.
 *
 * Pure, like every other derivation in `lib/` — the position is a function of a
 * count and a declaration, testable without a session or a clock.
 */

interface SetSpec {
  min: number;
  max: number;
}

/**
 * The declared set count, or null where the plan states a duration or reps
 * instead.
 *
 * `week` is T31's addition and changes the answer for exactly one entry pair:
 * §4B states "4–6 sets" for its peak protocol and "5 sets" for the
 * rep-structured one, and `prescribedSets` describes the former. Without the
 * week, weeks 1–4 read "set 3 of 4–6" against a protocol asking for five.
 * Omitted or null → the exercise's own declaration, which is what every caller
 * outside a dated session wants and what nineteen of twenty entries have anyway.
 */
export function setSpecOf(exercise: Exercise | undefined, week: number | null = null): SetSpec | null {
  const declared = variantsFor(exercise, week).live?.sets ?? exercise?.prescribedSets;
  if (!declared) return null;
  const [min, max] = declared;
  return { min, max };
}

export interface ChainPosition {
  /** 1-based number of the set that is next (or currently being performed). */
  current: number;
  spec: SetSpec | null;
  /** True once the prescription's top has already been logged. */
  beyond: boolean;
}

/**
 * The set that comes next, given what is already logged.
 *
 * `loggedCount` is the length of the exercise's recorded sets — so the position
 * moves backwards when one is deleted, with no counter to keep in sync (AC8).
 */
export function chainPosition(loggedCount: number, spec: SetSpec | null): ChainPosition {
  const logged = Math.max(0, loggedCount);
  return {
    current: logged + 1,
    spec,
    beyond: spec !== null && logged >= spec.max,
  };
}

/**
 * True once the prescription's *floor* is logged — the earliest point at which
 * stopping is a choice the plan already allows (T32).
 *
 * The distinction from `beyond` is the whole reason both exist. `beyond` is the
 * top: past it the app has no further set to offer, and the surfaces let the
 * "move on" control take the position the start control had. This is the
 * bottom: from four of §4B's "4–6 sets" the exercise is a legitimate place to
 * stop, so the control is *offered* — small, beside the start — and the
 * prescription's remaining sets keep the emphasis.
 *
 * Neither is a verdict (D23). §4F asks for a lighter week "regardless of the
 * schedule", so this reports where the plan's own range begins and nothing else:
 * no adherence figure, nothing blocked, nothing congratulated.
 *
 * With no declared count, one logged set is the floor — an exercise the plan
 * states as a duration or a rep scheme still becomes finishable the moment it
 * has a record, which is the same rule `isMeaningful` uses to keep the entry.
 */
export function chainSatisfied(position: ChainPosition): boolean {
  const logged = Math.max(0, position.current - 1);
  return logged >= (position.spec === null ? 1 : position.spec.min);
}

/** "5" for a fixed count, "4–6" for a range the plan deliberately left open. */
export function formatSetTarget(spec: SetSpec): string {
  return spec.min === spec.max ? `${spec.max}` : `${spec.min}–${spec.max}`;
}

/**
 * The position as one short phrase, or null when nothing is declared.
 *
 * Three shapes, and the third is the one that carries D23:
 *   "set 3 of 5"            — inside the prescription
 *   "set 3 of 4–6"          — inside a range, still a range
 *   "set 6 (5 prescribed)"  — past it: both numbers, no verdict, nothing blocked
 *
 * The parenthesis rather than a middot is deliberate: these labels are embedded
 * in controls that already carry a `·` separator ("▶ Start set 6 (5 prescribed)
 * · 7–10s"), and three middots in one button is a label nobody reads mid-set.
 */
export function formatChain(position: ChainPosition): string | null {
  const { current, spec, beyond } = position;
  if (spec === null) return null;
  if (beyond) return `set ${current} (${formatSetTarget(spec)} prescribed)`;
  return `set ${current} of ${formatSetTarget(spec)}`;
}

/**
 * The same position, said out loud (T20).
 *
 * Two differences from the printed form, both because a voice cannot punctuate:
 * a range is spoken "4 to 6" rather than "4–6", and past the prescription the
 * parenthetical is dropped — "set 6" — rather than read as a sentence the owner
 * has to unpack mid-session. The screen still carries both numbers, and D23's
 * rule is unchanged either way: it is a position, never a verdict.
 */
export function speakChain(position: ChainPosition): string | null {
  const { current, spec, beyond } = position;
  if (spec === null) return null;
  if (beyond) return `set ${current}`;
  const target = spec.min === spec.max ? `${spec.max}` : `${spec.min} to ${spec.max}`;
  return `set ${current} of ${target}`;
}
