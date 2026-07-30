import type { Check, Exercise, JointTarget, Tier, WorkoutLog } from '../types';
import { daysBetween, localDayKey } from './rotation';

// The joint/tendon rotation (docs/joint-rotation-research.md). Which movement is
// up next for a tendon, and whether that tendon is due at all.
//
// This is `rotation.ts`'s rule one level down. That module answers "which routine
// is next" from history alone — least-recently-completed wins, seed order breaks
// ties — and deliberately has no calendar, no schedule state and no notion of
// being behind. The same three properties are wanted here for the same reasons,
// so the same rule is used, with one addition: a per-target *interval*, because a
// pool target is not merely ordered against its peers, it is either due or it is
// not.
//
// Pure, like rotation.ts and checks.ts: no IndexedDB, so the ordering and the
// due-ness are unit-testable without a database.
//
// What this module deliberately does not do: grade. Nothing returns a streak, a
// compliance percentage or a "you missed this" state. An overdue target reports
// how long it has been and nothing else — D23's rule, and the same reason
// rotation.ts has no missed-day concept.

/**
 * The daily isometric slots (research file §6, tier 2), in the order they are
 * offered.
 *
 * Six, and `fingers` is not among them. That tissue already carries the
 * abrahangs up to twice a day and two finger routines a week; a seventh daily
 * hold on it would be the double-dosing the research file refuses, and the
 * finger-specific rules that forbid it (plan §7, §8) are the one part of this
 * design that comes from the plan rather than from the literature.
 *
 * `wrist` is not among them either, for a different reason: wrist *stability* is
 * rep-based work on a pool interval. The extensor isometric is what holds the
 * daily slot, and `extensors` is the target that carries it.
 */
export const DAILY_ISOMETRIC_SLOTS = [
  'extensors',
  'elbow',
  'shoulder',
  'hip',
  'knee',
  'ankle',
] as const satisfies readonly JointTarget[];

export type DailyIsometricSlot = (typeof DAILY_ISOMETRIC_SLOTS)[number];

/**
 * The pool's targets (research file §6, tier 4).
 *
 * This array is also the membership list — a target with no interval is not in
 * the pool, and `POOL_INTERVAL_DAYS` is typed against it so adding one here
 * without a dose is a compile error rather than a target that silently never
 * comes up. That failure mode is the entire reason this rotation exists.
 */
export const POOL_TARGETS = [
  'extensors',
  'wrist',
  'elbow',
  'shoulder',
  'hip',
  'knee',
  'ankle',
] as const satisfies readonly JointTarget[];

export type PoolTarget = (typeof POOL_TARGETS)[number];

/**
 * Days between loadings for each pool target, from the research file's §4.
 *
 * These are *intervals*, not quotas: nothing is blocked when one elapses and
 * nothing is scored when it does not (D23). They exist to answer "what has gone
 * longest without work", which is the only question a rotation has to answer.
 *
 * Elbow is the shortest at every-other-day, which is Hörst's own frequency for
 * the climber's-elbow work; ankle is the longest, because the proprioceptive
 * evidence found program *duration* mattered more than session frequency, with
 * doses as low as 1x/week effective.
 */
export const POOL_INTERVAL_DAYS: Record<PoolTarget, number> = {
  extensors: 3,
  wrist: 3,
  elbow: 2,
  shoulder: 3,
  hip: 3,
  knee: 3,
  ankle: 4,
};

/** Every catalog entry carrying a dose for `tier`. */
export function movementsForTier(exercises: Exercise[], tier: Tier): Exercise[] {
  return exercises.filter((e) => e.tiers?.some((t) => t.tier === tier));
}

/** Entries in `tier` that load `target`, in catalog order. */
export function movementsForSlot(
  exercises: Exercise[],
  tier: Tier,
  target: JointTarget,
): Exercise[] {
  return movementsForTier(exercises, tier).filter((e) => e.target === target);
}

/**
 * The most recent local day each movement was loaded, by exercise id.
 *
 * Two sources, because a tendon does not care which surface recorded the work:
 *
 * 1. A `LoggedExercise` that was marked completed (D16) *or* that carries sets.
 *    Either is evidence the movement happened; requiring both would let a set
 *    logged without the explicit tick read as never done.
 * 2. A `Check` naming the movement (T33). This is how the GtG items land, and
 *    folding them in here is what makes them pool members rather than a parallel
 *    system.
 *
 * In-progress logs count, unlike in `routineRotation`. That module ignores them
 * because an abandoned session must not advance the routine order — but an
 * exercise ticked inside a live session was still performed, and pretending
 * otherwise would offer it again the same day.
 */
export function lastLoadedByExercise(
  logs: WorkoutLog[],
  checks: Check[],
): Map<string, string> {
  const latest = new Map<string, string>();
  const record = (exerciseId: string, day: string) => {
    const known = latest.get(exerciseId);
    if (known === undefined || day > known) latest.set(exerciseId, day);
  };

  for (const log of logs) {
    // An unfinished session is dated by when it started; `dateKey` would read the
    // UTC day off either timestamp, which is why both go through `localDayKey`.
    const day = localDayKey(log.completedAt ?? log.startedAt);
    for (const entry of log.entries) {
      if (entry.completed === true || entry.sets.length > 0) record(entry.exerciseId, day);
    }
  }
  for (const check of checks) {
    // `Check.date` is already a local date-only key (D10), so it is used as-is.
    if (check.exerciseId !== undefined) record(check.exerciseId, check.date);
  }
  return latest;
}

/** Display names for the targets. The slot heading a surface renders. */
export const JOINT_TARGET_LABELS: Record<JointTarget, string> = {
  fingers: 'Fingers',
  extensors: 'Finger extensors',
  wrist: 'Wrist',
  elbow: 'Elbow',
  shoulder: 'Shoulder',
  hip: 'Hip',
  knee: 'Knee',
  ankle: 'Ankle',
};

export interface SlotStatus {
  target: JointTarget;
  /**
   * The movement up next — the stalest of the target's entries for this tier.
   *
   * Null when the catalog carries no entry for the slot. A null is returned
   * rather than the slot being dropped, so an uncovered tendon is visible as a
   * gap instead of vanishing from a surface that claims to cover it.
   */
  exercise: Exercise | null;
  /**
   * The movement for this target already loaded today, if any.
   *
   * Present so a surface can keep showing what was *done* rather than swapping
   * in the next one the instant a slot is ticked. Without it, ticking the
   * shoulder makes that movement the freshest, `exercise` becomes the other
   * shoulder movement, and the row changes under the owner's finger — which
   * reads as the tap having gone to the wrong place.
   */
  doneToday: Exercise | null;
  /**
   * Days since this target was loaded *in this tier*; null if never.
   *
   * Tier-scoped on purpose. Holding the elbow isometric does not make the
   * pronator eccentrics fresh: they are different mechanisms on different
   * intervals, which is the whole reason the tiers are separate. A single
   * per-target clock would let one tier silently satisfy the other.
   */
  daysSince: number | null;
  /** Days the target's schedule allows between loadings. */
  intervalDays: number;
  /** True when the interval has elapsed, or the target has never been loaded. */
  due: boolean;
}

/**
 * The stalest of `candidates`: never-loaded first (in catalog order), then oldest
 * day first. Mirrors `pickNextUp` in rotation.ts, including the `<` that makes
 * catalog order the tie-break among equals.
 *
 * Exported for `variation.ts`, which applies the identical rule to the grip pairs
 * §4B and §4C alternate between. One implementation, so "what is up next" cannot
 * mean two different things in two places.
 */
export function stalest(candidates: Exercise[], lastLoaded: Map<string, string>): Exercise | null {
  let best: Exercise | null = null;
  let bestDay: string | undefined;
  for (const candidate of candidates) {
    const day = lastLoaded.get(candidate.id);
    if (best === null) {
      best = candidate;
      bestDay = day;
      continue;
    }
    if (bestDay === undefined) continue;
    if (day === undefined || day < bestDay) {
      best = candidate;
      bestDay = day;
    }
  }
  return best;
}

// Days since any of `candidates` was loaded — the target's staleness, which is
// not the same as the chosen movement's. A shoulder loaded yesterday by a
// different movement is not due today, however long it has been since this one.
function daysSinceTarget(
  candidates: Exercise[],
  lastLoaded: Map<string, string>,
  today: string | Date,
): number | null {
  let mostRecent: string | undefined;
  for (const candidate of candidates) {
    const day = lastLoaded.get(candidate.id);
    if (day !== undefined && (mostRecent === undefined || day > mostRecent)) mostRecent = day;
  }
  return mostRecent === undefined ? null : daysBetween(mostRecent, today);
}

function statusFor(
  exercises: Exercise[],
  tier: Tier,
  target: JointTarget,
  intervalDays: number,
  lastLoaded: Map<string, string>,
  today: string | Date,
): SlotStatus {
  const candidates = movementsForSlot(exercises, tier, target);
  const since = daysSinceTarget(candidates, lastLoaded, today);
  const todayKey = localDayKey(today);
  return {
    target,
    exercise: stalest(candidates, lastLoaded),
    doneToday: candidates.find((c) => lastLoaded.get(c.id) === todayKey) ?? null,
    daysSince: since,
    intervalDays,
    // A future-dated day (clock change, imported backup) yields a negative
    // `since` and reads as not due, which is the same forgiving direction
    // `routineRotation` takes on the same input.
    due: since === null || since >= intervalDays,
  };
}

/**
 * The six daily isometric slots, in slot order, whatever their state.
 *
 * Every slot is returned every day — that is what "daily" means, and a surface
 * that showed only the incomplete ones would make five slots disappear as they
 * were ticked, leaving no way to see that the day is finished. `due` is what
 * distinguishes them: an interval of one day makes it false only for a slot
 * already loaded today.
 */
export function dailyIsometricsToday(
  exercises: Exercise[],
  logs: WorkoutLog[],
  checks: Check[],
  today: string | Date,
): SlotStatus[] {
  const lastLoaded = lastLoadedByExercise(logs, checks);
  return DAILY_ISOMETRIC_SLOTS.map((target) =>
    statusFor(exercises, 'daily-isometric', target, 1, lastLoaded, today),
  );
}

/**
 * Pool targets, most overdue first, with the never-loaded ahead of everything.
 *
 * Unlike the daily slots this is a *ranking*, because the pool is not a daily
 * obligation: it is a queue, and the useful question is which two or three
 * things have gone longest without attention. Not-yet-due targets are still
 * returned, ranked last, so the surface can show what is coming rather than
 * presenting an empty screen on a day when nothing has elapsed.
 */
export function poolToday(
  exercises: Exercise[],
  logs: WorkoutLog[],
  checks: Check[],
  today: string | Date,
): SlotStatus[] {
  const lastLoaded = lastLoadedByExercise(logs, checks);
  const statuses = POOL_TARGETS.map((target) =>
    statusFor(exercises, 'pool', target, POOL_INTERVAL_DAYS[target], lastLoaded, today),
  );
  // Overdue-ness relative to the target's own interval, so an elbow at 3 days
  // (interval 2) outranks an ankle at 3 days (interval 4). Comparing raw days
  // would rank every long-interval target above every short one forever.
  const overdueBy = (s: SlotStatus) =>
    s.daysSince === null ? Number.POSITIVE_INFINITY : s.daysSince - s.intervalDays;
  return [...statuses].sort((a, b) => overdueBy(b) - overdueBy(a));
}

/**
 * How long a target has gone, in facts only (D23).
 *
 * No "overdue", no "missed": the interval is a schedule the owner set, not a
 * debt, and §4F's lighter-week caveat makes a skipped week correct as often as
 * not. The number is reported; nothing is compared to it in words.
 */
export function describeSlot(status: SlotStatus): string {
  if (status.daysSince === null) return 'Not yet logged';
  if (status.daysSince <= 0) return 'Done today';
  if (status.daysSince === 1) return 'Done yesterday';
  return `Done ${status.daysSince} days ago`;
}
