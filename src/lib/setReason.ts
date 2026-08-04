import type { Exercise, SetEndReason } from '../types';

// Why a hold ended (D27). Pure, like timer.ts and progress.ts, so the two rules
// that carry consequences — which exercises are asked, and which reasons are
// worth repeating in a summary — are unit-testable without a DOM.
//
// This module classifies and never advises. Recording `pain` marks a set as a
// safety signal so a chart can draw it differently and a summary can name it; it
// does not change a prescription, hide an exercise, or raise an alert (D23). The
// surface that quotes §7/§8 when a plan-named stop condition fires is T17's.

interface ReasonConfig {
  /** Chip text, and what a screen reader announces. */
  label: string;
  /** Compact form for a one-line set summary. */
  short: string;
  /**
   * True for the two reasons that say something about tissue rather than about
   * strength. §7 asks the owner to watch for a downward trend "before it becomes
   * an injury", and these are the two that distinguish one kind of short hold
   * from the other.
   */
  safetySignal: boolean;
}

/** Chip order: the two ordinary outcomes first, then the two that are signals. */
export const SET_END_REASONS: SetEndReason[] = ['target', 'dropped', 'form-broke', 'pain'];

export const REASON_CONFIG: Record<SetEndReason, ReasonConfig> = {
  target: { label: 'Hit target', short: 'target', safetySignal: false },
  dropped: { label: 'Dropped', short: 'dropped', safetySignal: false },
  'form-broke': { label: 'Form broke', short: 'form', safetySignal: true },
  pain: { label: 'Pain', short: 'pain', safetySignal: true },
};

/**
 * Whether an exercise is asked why its sets ended.
 *
 * Derived from `holdSeconds` (D17) rather than from a new catalog field: the
 * question is meaningful for a hold and vacuous for 3 × 10 goblet squats, and
 * the existing timing declaration already draws exactly that line. This includes
 * the exercises with a hold but nothing numeric to log — the PIMA pulls, the wall
 * press — where the reason is the only thing worth recording.
 */
export function reasonApplies(exercise: Exercise | undefined): boolean {
  return exercise?.holdSeconds !== undefined;
}

/**
 * The reasons offered for one exercise's sets.
 *
 * All four, except on an **open hold** (T16), where `target` is dropped: §4E's
 * lock-off test prescribes no duration, so there is no target to have hit and the
 * value would be uninterpretable — which is the same standard D27 sets for the
 * enum as a whole. It is also the one value the app can write by itself, and it
 * never does so here, because an open hold is only ever ended by hand.
 */
export function reasonsFor(exercise: Exercise | undefined): SetEndReason[] {
  if (exercise?.holdSeconds === 'open') {
    return SET_END_REASONS.filter((r) => r !== 'target');
  }
  return SET_END_REASONS;
}

/**
 * Both classifiers below accept `null` as well as `undefined`, because the
 * codebase has two deliberate spellings of "not recorded": optional fields on
 * stored data (`SetEntry.endReason`, so a pre-T14 set needs no migration) and
 * explicit `null` on derived values (`ProgressPoint.endReason`, matching the
 * `edgeMm` beside it). Reading either is the classifier's job, not the caller's.
 */
export function isSafetySignal(reason: SetEndReason | null | undefined): boolean {
  return reason == null ? false : REASON_CONFIG[reason].safetySignal;
}

/**
 * The part of a reason worth repeating in a one-line set summary, or null.
 *
 * Only the safety signals survive (AC7). `target` and `dropped` are omitted
 * because `holdSec` against the prescribed range already says which of the two
 * happened — printing them would triple the length of the last-time line to
 * restate what the number beside it already shows.
 */
export function summaryReason(reason: SetEndReason | null | undefined): string | null {
  return isSafetySignal(reason) ? REASON_CONFIG[reason as SetEndReason].short : null;
}
