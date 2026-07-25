import type { BodyweightEntry } from '../types';
import { daysBetween, localDayKey } from './rotation';

// Resolving "what did the owner weigh when this session happened" (D24). Pure,
// like progress.ts and lastTime.ts, because the rule is a *refusal* and refusals
// are exactly what needs a test: an added-load percentage computed against the
// wrong denominator is a wrong number that looks right, which is the failure
// D21/D22 exist to prevent on the other two axes.
//
// This module has no opinion about the number. It stores and divides. §4E wants
// bodyweight recorded beside added load; nothing in the plan asks the app to
// comment on it, and D23 forbids it.

/**
 * How stale a reading may be and still describe a session.
 *
 * Fourteen days is a judgment, and it is deliberately generous: the owner weighs
 * in opportunistically (D24), so a two-week-old reading is the realistic case,
 * while a two-month-old one across a training block is not a denominator anyone
 * should divide by silently. Outside the window the point is dropped, not
 * estimated — §4E's whole point about identical conditions is that an invented
 * comparison is worse than a missing one.
 */
export const MAX_STALENESS_DAYS = 14;

/**
 * The bodyweight that applies to an instant, or null.
 *
 * Backwards-looking only. A reading taken *after* the session is ignored even if
 * it is closer in time, because letting a later measurement attach to an earlier
 * performance means Sunday's weigh-in silently rewrites Friday's logged
 * percentage — a record that changes after the fact is not a record.
 *
 * `entries` may be in any order.
 *
 * `at` is normally a `WorkoutLog.completedAt` — a UTC instant — while an entry's
 * `date` is a local day key, so the two are compared through `localDayKey`. Using
 * `dateKey` directly on a timestamp would string-slice its *UTC* day, and west of
 * UTC an evening session would then resolve against tomorrow's weigh-in. That is
 * the bug rotation.ts documents; this is why its helper is shared rather than
 * reimplemented.
 */
export function bodyweightFor(
  entries: BodyweightEntry[],
  at: string | Date,
): BodyweightEntry | null {
  const onOrBefore = localDayKey(at);
  let best: BodyweightEntry | null = null;
  for (const entry of entries) {
    if (entry.date > onOrBefore) continue;
    if (best === null || entry.date > best.date) best = entry;
  }
  if (best === null) return null;
  // Whole local calendar days, so a DST transition inside the window cannot make
  // fourteen days read as 13.96 and round the wrong way (D10).
  return daysBetween(best.date, onOrBefore) <= MAX_STALENESS_DAYS ? best : null;
}

/** The most recent reading overall, or null. Used by the home card, not by the chart. */
export function latestBodyweight(entries: BodyweightEntry[]): BodyweightEntry | null {
  let best: BodyweightEntry | null = null;
  for (const entry of entries) {
    if (best === null || entry.date > best.date) best = entry;
  }
  return best;
}

/**
 * Added load as a percentage of bodyweight, or null when no reading applies.
 *
 * One decimal: the inputs are a whole-pound kettlebell and a bathroom scale, and
 * a second decimal would imply a precision neither has.
 */
export function pctOfBodyweight(
  addedLb: number,
  entries: BodyweightEntry[],
  at: string | Date,
): number | null {
  const bw = bodyweightFor(entries, at);
  if (bw === null || bw.lb <= 0) return null;
  return Math.round((addedLb / bw.lb) * 1000) / 10;
}

/**
 * Validates a typed bodyweight, returning the number or null.
 *
 * Zero and negatives are refused rather than clamped: this value is the
 * denominator of a division, and a plausible-but-wrong one is worse than none.
 * The upper bound only catches a fat-fingered extra digit (1755 for 175.5).
 */
export function parseBodyweight(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n > 1000) return null;
  return Math.round(n * 10) / 10;
}

/** "today" / "yesterday" / "5 days ago", worded like rotation and lastTime. */
export function describeAge(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}
