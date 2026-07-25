import type { Routine, WorkoutLog } from '../types';
import { dateKey, mondayOf } from './storage';
import { keyToLocalDate } from './checks';

// Which routine is "up next" (D15). The two strength routines alternate, so the
// answer is derivable from history alone: whichever was completed least recently.
// There is deliberately no calendar, no schedule state, and no notion of a missed
// or late day — training plan §3 ("rest 2–3 days") and §4F ("take a lighter week
// regardless of the schedule") both make a fixed weekday assignment wrong, and a
// "you're behind" state would repeat the mistake T5b's no-streak-mechanics
// non-goal fences off.
//
// Pure, like checks.ts and session.ts: no IndexedDB, so the ordering rules are
// unit-testable. The only imports are the local-calendar helpers (D10).

export interface RoutineStatus {
  routineId: string;
  lastCompletedAt: string | null; // ISO 8601, or null if never completed
  daysSince: number | null; // whole local calendar days; 0 = today; null if never
  doneThisWeek: boolean; // completed within the current Monday-start week (D10)
  isNextUp: boolean;
}

// Most recent completedAt for a routine. In-progress logs (completedAt === null)
// are ignored on purpose: an abandoned session must not advance the rotation
// (the Home resume banner is what surfaces those).
function lastCompletedAt(logs: WorkoutLog[], routineId: string): string | null {
  let latest: string | null = null;
  for (const log of logs) {
    if (log.routineId !== routineId || log.completedAt === null) continue;
    if (latest === null || log.completedAt > latest) latest = log.completedAt;
  }
  return latest;
}

/**
 * The local calendar day an input falls on, as a `yyyy-mm-dd` key.
 *
 * Exported because every module that compares a stored date key against a
 * `WorkoutLog` timestamp needs this exact conversion (T15's bodyweight matching
 * is the second). Reimplementing it is how the bug below gets reintroduced.
 *
 * This exists because rotation consumes two different shapes. A `Check.date` is
 * already a local date-only key, but `WorkoutLog.completedAt` is a full UTC
 * instant (`new Date().toISOString()`) — and `storage.dateKey` string-slices the
 * first 10 characters, which for a timestamp reads the *UTC* day. West of UTC an
 * evening session would then be attributed to tomorrow, and a Sunday-evening one
 * would land in next Monday's week, corrupting both "days ago" and D10 grouping.
 * Routing timestamps through `new Date()` first makes `dateKey` take its
 * local-getters path instead.
 */
export function localDayKey(input: string | Date): string {
  if (typeof input === 'string' && input.includes('T')) return dateKey(new Date(input));
  return dateKey(input);
}

// Whole calendar days between two local dates. Computed from date keys rather
// than a millisecond delta so a daylight-saving transition can't produce 0.96 or
// 1.04 days and round the wrong way (D10).
export function daysBetween(from: string | Date, to: string | Date): number {
  const a = keyToLocalDate(localDayKey(from));
  const b = keyToLocalDate(localDayKey(to));
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Status for every routine, in seed order, with exactly one flagged `isNextUp`.
 *
 * Ranking: never-completed routines first (in seed order), then the rest oldest
 * `completedAt` first. Both-done-today still yields exactly one next-up — there
 * is no rest-day state and neither routine is ever locked.
 */
export function routineRotation(
  routines: Routine[],
  logs: WorkoutLog[],
  today: string | Date,
): RoutineStatus[] {
  const weekStart = dateKey(mondayOf(localDayKey(today)));

  const statuses: RoutineStatus[] = routines.map((routine) => {
    const completedAt = lastCompletedAt(logs, routine.id);
    return {
      routineId: routine.id,
      lastCompletedAt: completedAt,
      daysSince: completedAt === null ? null : daysBetween(completedAt, today),
      // Same week iff it shares this week's Monday. A future-dated log (clock
      // change, imported backup) simply reads as not-this-week rather than
      // throwing off the comparison.
      doneThisWeek:
        completedAt !== null && dateKey(mondayOf(localDayKey(completedAt))) === weekStart,
      isNextUp: false,
    };
  });

  const nextUp = pickNextUp(statuses);
  return statuses.map((s) => (s.routineId === nextUp ? { ...s, isNextUp: true } : s));
}

// Seed order is the tie-break, so `statuses` must arrive in seed order.
function pickNextUp(statuses: RoutineStatus[]): string | null {
  let best: RoutineStatus | null = null;
  for (const s of statuses) {
    if (best === null) {
      best = s;
      continue;
    }
    // Never completed outranks any completed routine; among two never-completed
    // the earlier (seed order) wins, which is what `>` rather than `>=` gives.
    if (best.lastCompletedAt === null) continue;
    if (s.lastCompletedAt === null || s.lastCompletedAt < best.lastCompletedAt) best = s;
  }
  return best?.routineId ?? null;
}

// "never" / "today" / "yesterday" / "N days ago". Kept here rather than in the
// component so the wording is covered by the rotation tests.
export function describeLastCompleted(status: RoutineStatus): string {
  if (status.daysSince === null) return 'Never done';
  if (status.daysSince <= 0) return 'Done today';
  if (status.daysSince === 1) return 'Done yesterday';
  return `Done ${status.daysSince} days ago`;
}
