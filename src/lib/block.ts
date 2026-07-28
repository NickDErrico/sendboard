import type { Exercise, PrescriptionVariant, Routine, Settings, WorkoutLog } from '../types';
import { BLOCK_PHASES, BLOCK_WEEKS, type BlockPhase } from '../data/blockPhases';
import { dateKey, mondayOf } from './storage';
import { daysBetween, localDayKey, rotates } from './rotation';

/**
 * Where the owner is in the 8-week block (T24, D25).
 *
 * Three rules hold this module together, and two of them are older than it:
 *
 * 1. **Derive, don't store.** The position comes from the log — the earliest
 *    completed *rotating* session is week 1 — exactly as "which routine is up
 *    next" comes from the log (D15). The single exception is `blockStartedAt`,
 *    which exists for one event: the owner deliberately beginning a new block.
 * 2. **A week is D10's week.** Monday-anchored, computed from date keys through
 *    `daysBetween`, so a daylight-saving transition cannot move a boundary and
 *    "week 6" cannot disagree with the "Routines this week" line rendered
 *    directly above it.
 * 3. **Past week 8 is a state, not a failure.** `week 8+`, nothing overdue,
 *    nothing behind, nothing blocked — the state D15 already refuses for
 *    routines. §4F prescribes a lighter week "regardless of the schedule above",
 *    which makes a block that runs long as often correct as one that does not
 *    (D23, D25).
 *
 * Pure, like rotation.ts and chain.ts: a function of (logs, routines, settings,
 * today), so every refusal above is a unit test rather than a screenshot.
 */

export { BLOCK_WEEKS };

export interface BlockPosition {
  /** The local day the block is counted from, `yyyy-mm-dd`. */
  startKey: string;
  /**
   * True when the anchor was inferred from the first session rather than set by
   * the owner. Drives the `~` on the week label: the count is arithmetic, the
   * anchor is an inference, and the two should not read alike.
   */
  derived: boolean;
  /** 1-based, uncapped — week 11 of a block that ran long is a real answer. */
  week: number;
  /** True past `BLOCK_WEEKS`. Reported as `week 8+`, never as late. */
  beyond: boolean;
  /** "week 6 of 8" / "~week 6 of 8" / "~week 8+" */
  weekLabel: string;
  /** Completed rotating sessions inside the block, plus a live one if given. */
  sessions: number;
  /** True when `sessions` includes a session that is still in progress. */
  live: boolean;
  /** "Session 11 · ~week 6 of 8" / "10 sessions · ~week 6 of 8" */
  label: string;
}

export interface BlockInput {
  logs: WorkoutLog[];
  routines: Routine[];
  settings: Settings;
  today: string | Date;
  /**
   * A session in progress, to be counted as the block's current one.
   *
   * Home passes nothing: an abandoned log must not advance a count, which is the
   * same reason `routineRotation` ignores in-progress logs. The session screen
   * passes its own log, because "Session 11" there describes the session on
   * screen — and where it is the first session ever, it is also the only thing
   * available to anchor the block to. Nothing is written either way (D16).
   */
  liveLog?: WorkoutLog | null;
}

/** True for logs the block counts: completed, and against a rotating routine (D29). */
function countsAsSession(log: WorkoutLog, rotating: Set<string>): boolean {
  return log.completedAt !== null && rotating.has(log.routineId);
}

function rotatingIds(routines: Routine[]): Set<string> {
  return new Set(routines.filter(rotates).map((r) => r.id));
}

/**
 * The block's position, or null when there is nothing to derive one from.
 *
 * Null is a real answer and the surfaces say so ("the block starts at your first
 * session") rather than showing week 1 of a block that has not begun. A stored
 * marker makes it non-null with zero sessions, because the owner has said the
 * block started even if nothing is logged in it yet.
 */
export function blockPosition(input: BlockInput): BlockPosition | null {
  const { logs, routines, settings, today, liveLog = null } = input;
  const rotating = rotatingIds(routines);

  const marker = settings.blockStartedAt ? settings.blockStartedAt.slice(0, 10) : null;
  const counted = logs.filter((l) => countsAsSession(l, rotating));

  // The live log counts only if its routine rotates: a §4E battery in progress is
  // a measurement, not session N of the block (D29).
  const liveCounts = liveLog !== null && rotating.has(liveLog.routineId);

  const startKey =
    marker ??
    earliestKey([
      ...counted.map((l) => localDayKey(l.completedAt as string)),
      // Only as a last resort: a first-ever session in progress anchors the block
      // to itself, which is what makes it "Session 1 · week 1" while it runs.
      ...(liveCounts ? [localDayKey(liveLog.startedAt)] : []),
    ]);
  if (startKey === null) return null;

  const week = weekOf(startKey, today);
  const beyond = week > BLOCK_WEEKS;

  // Sessions before the anchor are outside the block — which is the entire point
  // of setting a marker, and is why an imported previous block does not inflate
  // the count.
  const inBlock = counted.filter((l) => localDayKey(l.completedAt as string) >= startKey).length;
  const sessions = inBlock + (liveCounts ? 1 : 0);

  const derived = marker === null;
  const weekLabel = formatWeek(week, derived);
  return {
    startKey,
    derived,
    week,
    beyond,
    weekLabel,
    sessions,
    live: liveCounts,
    label: `${describeSessions(sessions, liveCounts)} · ${weekLabel}`,
  };
}

function earliestKey(keys: string[]): string | null {
  let earliest: string | null = null;
  for (const key of keys) if (earliest === null || key < earliest) earliest = key;
  return earliest;
}

/**
 * The 1-based Monday-anchored week `today` falls in, relative to `startKey`.
 *
 * Clamped at 1 rather than allowed to go to zero or negative: a marker dated
 * tomorrow, a clock change, or an imported backup from the future all mean "the
 * block has just started", and no other answer is meaningful.
 */
export function weekOf(startKey: string, today: string | Date): number {
  const days = daysBetween(dateKey(mondayOf(startKey)), dateKey(mondayOf(today)));
  return Math.max(1, Math.floor(days / 7) + 1);
}

/**
 * The earliest local day that belongs to the block — the **Monday of week 1**.
 *
 * Distinct from `startKey`, which is the day of the first counted *session*, and
 * the distinction only ever matters for one record: §4E's battery. §4E puts the
 * baseline in week 1 "fully rested, after a thorough warm-up", which in practice
 * means the day *before* the block's first training session — so a floor at
 * `startKey` excludes the one occasion the whole retest comparison depends on.
 * Found by T28, where that floor silently dropped the baseline and the poster
 * reported "the comparison needs two" with two on record.
 *
 * Lowering the floor to the week boundary admits *only* batteries: every counted
 * rotating session is at or after `startKey` by construction. It is also the
 * boundary the week arithmetic already uses (`weekOf` runs off `mondayOf`), so
 * this makes membership agree with the numbering rather than introducing a new
 * rule (D10, D29).
 */
export function blockFloorKey(position: BlockPosition): string {
  return dateKey(mondayOf(position.startKey));
}

/** "week 6 of 8", "~week 6 of 8", "~week 8+" — the tilde marks a derived anchor. */
export function formatWeek(week: number, derived: boolean): string {
  const tilde = derived ? '~' : '';
  return week > BLOCK_WEEKS ? `${tilde}week ${BLOCK_WEEKS}+` : `${tilde}week ${week} of ${BLOCK_WEEKS}`;
}

/**
 * "Session 11" while one is running, "10 sessions" while none is.
 *
 * A count, never a quota: there is no target number of sessions in a block and
 * nothing here is compared against one (D23).
 */
export function describeSessions(sessions: number, live: boolean): string {
  if (live) return `Session ${sessions}`;
  if (sessions === 0) return 'No sessions yet';
  return `${sessions} session${sessions === 1 ? '' : 's'}`;
}

/**
 * §4F's row for a week, clamped to the table's last row past week 8.
 *
 * Quoted, never applied (D23): the app renders the plan's own focus for the week
 * it derived and says nothing about whether the owner trained that way.
 */
export function phaseFor(week: number): BlockPhase | null {
  if (BLOCK_PHASES.length === 0) return null;
  const found = BLOCK_PHASES.find((p) => week >= p.weeks[0] && week <= p.weeks[1]);
  if (found) return found;
  return week < BLOCK_PHASES[0].weeks[0] ? BLOCK_PHASES[0] : BLOCK_PHASES[BLOCK_PHASES.length - 1];
}

/** "Weeks 1–2" / "Week 7", for labelling the quoted row. */
export function formatPhaseWeeks(phase: BlockPhase): string {
  const [min, max] = phase.weeks;
  return min === max ? `Week ${min}` : `Weeks ${min}–${max}`;
}

export interface VariantView {
  /** The variant the plan prescribes for this week, or null when no week is known. */
  live: PrescriptionVariant | null;
  /** Every other declared variant, in declaration order — readable, never hidden. */
  others: PrescriptionVariant[];
  /**
   * The variant `holdSeconds` / `prescribedSets` describe, when it is *not* the
   * live one — so the surface can say which variant the timer and set count
   * follow instead of the owner discovering the mismatch mid-set (D41).
   */
  timedElsewhere: PrescriptionVariant | null;
}

const NO_VARIANTS: VariantView = { live: null, others: [], timedElsewhere: null };

/**
 * Which of an exercise's variants is live, given the derived week.
 *
 * Three cases, and the middle one is the one D19 cares about:
 *   no variants declared → nothing (callers fall back to `prescription`)
 *   variants but no week  → all of them, in order, none emphasised
 *   variants and a week   → the matching one first, the rest still readable
 *
 * Past the last declared range the final variant stays live: §4B's weeks-5–8
 * protocol does not expire in week 9, and guessing "none" there would hide the
 * plan (D25).
 */
export function variantsFor(
  exercise: Exercise | undefined,
  week: number | null,
): VariantView {
  const variants = exercise?.variants;
  if (!variants || variants.length === 0) return NO_VARIANTS;
  if (week === null) return { live: null, others: variants, timedElsewhere: null };

  const live =
    variants.find((v) => week >= v.weeks[0] && week <= v.weeks[1]) ??
    (week < variants[0].weeks[0] ? variants[0] : variants[variants.length - 1]);
  const others = variants.filter((v) => v !== live);
  return {
    live,
    others,
    timedElsewhere: isTimed(live) ? null : (others.find(isTimed) ?? null),
  };
}

/**
 * Whether the clock follows a variant.
 *
 * Two ways to be the timed one, and the second is T31's: `timed` marks the
 * variant that the exercise's own `holdSeconds` and `prescribedSets` describe,
 * and a variant carrying a `repChain` brings its timings with it. Both are the
 * live protocol while they are live — which is what retires D41's "the timer
 * follows the other one" note for §4B's weeks 1–4 rather than leaving it on
 * screen contradicting a clock that now runs the reps.
 */
function isTimed(variant: PrescriptionVariant): boolean {
  return variant.timed === true || variant.repChain !== undefined;
}

/**
 * The one line to show where a full prescription does not fit — the focus surface
 * at board-legible size, and the timer bar.
 *
 * The live variant's text if there is one, otherwise the `prescription` string
 * exactly as T10 through T23 render it.
 */
export function livePrescription(exercise: Exercise | undefined, week: number | null): string {
  if (!exercise) return '';
  return variantsFor(exercise, week).live?.text ?? exercise.prescription;
}
