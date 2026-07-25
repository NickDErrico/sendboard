import type { BodyweightEntry, ProgressMetric, SetEndReason, WorkoutLog } from '../types';
import { bodyweightFor, pctOfBodyweight } from './bodyweight';
import { sessionValue } from './progress';
import { daysBetween } from './rotation';

// §4E's baseline / retest battery (T16). Pure, like progress.ts, rotation.ts and
// bodyweight.ts — a function of (logs, bodyweights) with no IndexedDB and no DOM,
// because the rules worth testing here are all *refusals*: which comparison is
// valid, which is withheld, and which conditions may be derived rather than
// asked.
//
// This module reports and cites (D23). It computes differences between two
// recorded numbers, which is arithmetic; it never says whether the block went
// well. §4E's interpretation rubric is quoted to the owner verbatim and applied
// by the owner — a "good block" badge would be the app grading eight weeks of the
// owner's training on three numbers, and §7 reads a *falling* number as the
// signal to deload, which no cheerful arrow can express.

export const BATTERY_ROUTINE_ID = 'baseline-retest';

/** §4E's interpretation lines, quoted rather than applied (D23). */
export const INTERPRETATION_QUOTE = [
  'A 10–20% improvement in max hang load is a good block.',
  'Flat numbers with better climbing means the gains were technical.',
  'Declining numbers mean you accumulated fatigue faster than adaptation — that’s the signal to deload, not to push harder.',
] as const;

export interface BatteryTest {
  exerciseId: string;
  /** Short row label for a 390px-wide table; the catalog holds the full name. */
  label: string;
  metric: ProgressMetric;
  /**
   * True where §4E records an edge alongside the number. On these, a comparison
   * across two different edges is not a worse comparison — it is not one at all
   * (D22/D30), so the delta is withheld rather than annotated.
   */
  edgeDependent: boolean;
}

// §4E's table order. The warm-up is part of the battery routine but not a test:
// it is a *condition* (see `Conditions.warmedUp`), which is why it is absent here.
export const BATTERY_TESTS: BatteryTest[] = [
  {
    exerciseId: 'test-max-hang-half-crimp',
    label: 'Max hang · half-crimp',
    metric: 'addedLb',
    edgeDependent: true,
  },
  {
    exerciseId: 'test-max-hang-open-hand',
    label: 'Max hang · open-hand',
    metric: 'addedLb',
    edgeDependent: true,
  },
  {
    exerciseId: 'test-max-pullup-load',
    label: 'Max pull-up load',
    metric: 'addedLb',
    edgeDependent: false,
  },
  {
    exerciseId: 'test-lockoff-90-left',
    label: 'Lock-off 90° · left',
    metric: 'holdSec',
    edgeDependent: false,
  },
  {
    exerciseId: 'test-lockoff-90-right',
    label: 'Lock-off 90° · right',
    metric: 'holdSec',
    edgeDependent: false,
  },
];

/** The conditions a battery was produced under — every one derived (D29b). */
export interface Conditions {
  /** Local wall-clock time of day, "07:15". §4E asks for the same time of day both times. */
  timeOfDay: string;
  /** D16's completed flag on the warm-up entry — §4E's "after a thorough warm-up". */
  warmedUp: boolean;
  /** Whole local days since the previous completed session — §4E's "fully rested". */
  daysSincePrevious: number | null;
  /** The edge the max-hang tests were recorded on, or null if none was. */
  edgeMm: number | null;
  /** True when the two max-hang tests were recorded on *different* edges. */
  edgeMixed: boolean;
  /** The bodyweight that applies to this battery (T15's ±14-day rule), or null. */
  bodyweightLb: number | null;
}

export interface OccasionRow {
  test: BatteryTest;
  /** Best set for the metric, or null when this test was not recorded. */
  value: number | null;
  edgeMm: number | null;
  endReason: SetEndReason | null;
  /** Added load as a share of bodyweight, where both exist (T15). */
  pctBw: number | null;
}

export interface Occasion {
  logId: string;
  /** ISO completedAt. Only completed batteries become occasions. */
  at: string;
  /** 0 = the baseline. */
  index: number;
  label: string;
  rows: OccasionRow[];
  conditions: Conditions;
}

const WARMUP_EXERCISE_ID = 'finger-warmup-progression';

/**
 * "Baseline" / "Retest" / "Retest 2".
 *
 * Never a week number: block position is derived from the first *session* (D25,
 * T24), not from a test, and a battery run in week 6 during a lighter week (§4F)
 * would be mislabelled by any counting this module could do. Never "due",
 * "overdue" or "missed" either — D2a removed scheduling and D23 forbids the
 * reproach.
 */
export function occasionLabel(index: number): string {
  if (index === 0) return 'Baseline';
  return index === 1 ? 'Retest' : `Retest ${index}`;
}

/** "07:15" from an instant, in local wall-clock time. */
export function timeOfDay(at: string | Date): string {
  const d = typeof at === 'string' ? new Date(at) : at;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * The most recent completed session of any kind *before* this one.
 *
 * Any kind, deliberately: §4E says "fully rested", and a Day 3 pulling session
 * two days before a lock-off test compromises it exactly as much as another
 * battery would.
 */
function daysSincePrevious(log: WorkoutLog, logs: WorkoutLog[]): number | null {
  let previous: string | null = null;
  for (const other of logs) {
    if (other.id === log.id || other.completedAt === null) continue;
    if (log.completedAt !== null && other.completedAt >= log.completedAt) continue;
    if (previous === null || other.completedAt > previous) previous = other.completedAt;
  }
  if (previous === null || log.completedAt === null) return null;
  return daysBetween(previous, log.completedAt);
}

function rowsFor(log: WorkoutLog, bodyweights: BodyweightEntry[]): OccasionRow[] {
  return BATTERY_TESTS.map((test) => {
    const point = sessionValue(log, test.exerciseId, test.metric);
    if (point === null) {
      return { test, value: null, edgeMm: null, endReason: null, pctBw: null };
    }
    return {
      test,
      value: point.value,
      edgeMm: point.edgeMm,
      endReason: point.endReason,
      pctBw:
        test.metric === 'addedLb' ? pctOfBodyweight(point.value, bodyweights, point.at) : null,
    };
  });
}

function conditionsFor(
  log: WorkoutLog,
  logs: WorkoutLog[],
  rows: OccasionRow[],
  bodyweights: BodyweightEntry[],
): Conditions {
  const edges = rows
    .filter((r) => r.test.edgeDependent && r.edgeMm !== null)
    .map((r) => r.edgeMm as number);
  const distinct = [...new Set(edges)];
  const at = log.completedAt ?? log.startedAt;
  return {
    timeOfDay: timeOfDay(at),
    warmedUp: log.entries.find((e) => e.exerciseId === WARMUP_EXERCISE_ID)?.completed === true,
    daysSincePrevious: daysSincePrevious(log, logs),
    edgeMm: distinct.length === 1 ? distinct[0] : null,
    edgeMixed: distinct.length > 1,
    bodyweightLb: bodyweightFor(bodyweights, at)?.lb ?? null,
  };
}

/**
 * Every completed battery, oldest first, labelled by completion order.
 *
 * An abandoned battery (`completedAt === null`) is not an occasion: it is not a
 * measurement, and the home resume banner is what surfaces it. The label is
 * derived from the surviving order rather than stored, so deleting the baseline
 * promotes the next one instead of leaving a dangling flag (D15's method).
 */
export function batteryOccasions(
  logs: WorkoutLog[],
  bodyweights: BodyweightEntry[] = [],
): Occasion[] {
  return logs
    .filter((l) => l.routineId === BATTERY_ROUTINE_ID && l.completedAt !== null)
    .sort((a, b) => (a.completedAt as string).localeCompare(b.completedAt as string))
    .map((log, index) => {
      const rows = rowsFor(log, bodyweights);
      return {
        logId: log.id,
        at: log.completedAt as string,
        index,
        label: occasionLabel(index),
        rows,
        conditions: conditionsFor(log, logs, rows, bodyweights),
      };
    });
}

export interface ComparisonRow {
  test: BatteryTest;
  baseline: OccasionRow;
  latest: OccasionRow;
  /** Arithmetic difference, or null when either side is missing or the edge changed. */
  delta: number | null;
  /** The same difference in shares of bodyweight, where both sides have one. */
  deltaPctBw: number | null;
  /** True when both sides exist but were recorded on different edges (D22/D30). */
  withheldForEdgeChange: boolean;
}

/**
 * Baseline against the latest occasion, test by test.
 *
 * A row with nothing on one side reads as not recorded and contributes no
 * difference — and no average, completion percentage, or count of "tests passed"
 * is computed across rows (D23). Five independent facts stay five facts.
 */
export function compareOccasions(baseline: Occasion, latest: Occasion): ComparisonRow[] {
  return BATTERY_TESTS.map((test, i) => {
    const b = baseline.rows[i];
    const l = latest.rows[i];
    const bothPresent = b.value !== null && l.value !== null;
    // The condition changed, so there is no comparison to draw — §4E: "changing
    // edge size invalidates the comparison more than any training variable."
    const withheldForEdgeChange =
      bothPresent && test.edgeDependent && b.edgeMm !== l.edgeMm;
    const comparable = bothPresent && !withheldForEdgeChange;
    return {
      test,
      baseline: b,
      latest: l,
      delta: comparable ? round1((l.value as number) - (b.value as number)) : null,
      deltaPctBw:
        comparable && b.pctBw !== null && l.pctBw !== null ? round1(l.pctBw - b.pctBw) : null,
      withheldForEdgeChange,
    };
  });
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** "+5lb" / "−1.4s" / "0" — a signed fact, with no colour and no verdict attached. */
export function formatDelta(value: number, metric: ProgressMetric): string {
  const unit = metric === 'holdSec' ? 's' : 'lb';
  if (value === 0) return `0${unit}`;
  return `${value > 0 ? '+' : '−'}${Math.abs(value)}${unit}`;
}

/** "+35lb" / "BW" / "7.4s" — a recorded value, in the unit its test records. */
export function formatValue(value: number, metric: ProgressMetric): string {
  if (metric === 'holdSec') return `${round1(value)}s`;
  return value === 0 ? 'BW' : `+${round1(value)}lb`;
}

/**
 * Validates a typed edge size in millimetres.
 *
 * §4E recommends 14–20mm but does not forbid anything outside it, and a board
 * with a 25mm rung is not an error — so the bounds here only reject values that
 * cannot be an edge at all. Refusing rather than clamping, for D24's reason: this
 * number is the condition every max-hang comparison in the block rests on, and a
 * plausible-but-wrong one is worse than none.
 */
export function parseEdgeMm(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n > 100) return null;
  return Math.round(n * 10) / 10;
}
