import type { WorkoutLog } from '../types';
import { localDayKey } from './rotation';

/**
 * §10D's daily, read out of the log (T34).
 *
 * The addendum reverses §8's "not as a daily habit" clause and prescribes two
 * numbers: the routine runs **twice a day**, **at least six hours apart**. Both
 * are quoted here and neither is enforced — nothing below returns a verdict, a
 * streak, a fraction, or a thing that is owed (D23). What it returns is how many
 * qualifying sessions today holds and how long it has been since the last one,
 * which are facts about the log.
 *
 * Pure, like `rotation.ts` and `checks.ts`: no IndexedDB, so the two rules that
 * matter — what counts as a run, and when the spacing has cleared — are
 * unit-testable and cannot be restated differently by a second surface.
 */

export const DAILY_ROUTINE_ID = 'daily-fingers';

/**
 * The routines whose completion is a run of §10D's routine.
 *
 * Day 1 is here because it opens with exactly these two entries and the addendum
 * says so in as many words: *"a day that opens a session with §4A and Abrahangs
 * has had one of that day's two. It is not owed a third."* Deriving that from the
 * log is D15's derive-don't-store applied again — the alternative is a second
 * record of a session the app already has, which is the disagreement D43(b) is
 * about.
 *
 * Day 3 is deliberately absent: §5 is a pull day and its routine contains
 * neither entry. Membership is asserted against the seed routines in the tests
 * rather than trusted, so an edit that removes the warm-up from Day 1 fails here
 * instead of silently counting a session that did not run it.
 */
export const DAILY_ROUTINE_IDS: readonly string[] = [DAILY_ROUTINE_ID, 'day-1-fingerboard'];

/** §10D: two a day. A prescription that is reported, never a quota (D23). */
export const RUNS_PER_DAY = 2;

/** §10D / §8 / Baar: at least six hours between them. */
export const SPACING_HOURS = 6;
const SPACING_MS = SPACING_HOURS * 3_600_000;

interface DailyStatus {
  /** Qualifying sessions completed on today's local day (D10). */
  runsToday: number;
  /** ISO 8601 instant of the most recent qualifying completion, on any day. */
  lastAt: string | null;
  /** Milliseconds since `lastAt`; null if the routine has never been completed. */
  msSinceLast: number | null;
  /** When `SPACING_HOURS` will have elapsed since `lastAt`; null if never run. */
  clearsAt: Date | null;
  /**
   * True when the spacing §10D states has elapsed — and true when nothing has
   * been run at all, because there is nothing to be spaced from.
   *
   * Nothing reads this as permission: the routine is startable in every state,
   * and this only decides which fact the surface states.
   */
  spacingClear: boolean;
}

/**
 * What the log says about today.
 *
 * Completed logs only, and the instant used throughout is `completedAt` — the
 * same predicate `routineRotation` and `blockPosition` count with, so an
 * abandoned session cannot advance a count here either. On a Day 1 the abrahangs
 * happen near the start rather than the end, which makes `completedAt` the later
 * of the two instants and therefore the conservative one: the spacing is never
 * reported as cleared earlier than it actually is.
 */
export function dailyStatus(logs: WorkoutLog[], now: string | Date): DailyStatus {
  const today = localDayKey(now);
  const at = typeof now === 'string' ? new Date(now) : now;

  let runsToday = 0;
  let lastAt: string | null = null;
  for (const log of logs) {
    if (log.completedAt === null || !DAILY_ROUTINE_IDS.includes(log.routineId)) continue;
    if (localDayKey(log.completedAt) === today) runsToday += 1;
    if (lastAt === null || log.completedAt > lastAt) lastAt = log.completedAt;
  }

  if (lastAt === null) {
    return { runsToday: 0, lastAt: null, msSinceLast: null, clearsAt: null, spacingClear: true };
  }

  const last = new Date(lastAt).getTime();
  // Clamped at zero so a future-dated log — a clock change, an imported backup —
  // reads as "just now" rather than a negative interval.
  const msSinceLast = Math.max(0, at.getTime() - last);
  return {
    runsToday,
    lastAt,
    msSinceLast,
    clearsAt: new Date(last + SPACING_MS),
    spacingClear: msSinceLast >= SPACING_MS,
  };
}

/** "2 runs today" — a count of what happened, never against a target (D23). */
export function describeRunsToday(status: DailyStatus): string {
  if (status.runsToday === 0) return 'Not run today';
  return `${status.runsToday} ${status.runsToday === 1 ? 'run' : 'runs'} today`;
}

/**
 * What the six hours say right now, in facts and §10D's own number.
 *
 * Never "due" and never "wait": the first would be a schedule (D2a) and the
 * second would be the app declining a session the owner decided to run. It
 * states when the interval the addendum names will have elapsed, and after that
 * it states how long ago the last run was.
 */
export function describeSpacing(status: DailyStatus): string {
  if (status.msSinceLast === null) return `${SPACING_HOURS}h apart · §10D`;
  if (!status.spacingClear && status.clearsAt !== null) {
    const time = status.clearsAt.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${SPACING_HOURS}h spacing clears ${time}`;
  }
  return `${formatSince(status.msSinceLast)} since the last run`;
}

/** "4h 10m", "18m", "2 days" — coarsening as it gets less useful to be precise. */
export function formatSince(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
  }
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}
