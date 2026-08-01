import type { Exercise, Routine, Settings, WorkoutLog } from '../types';
import { blockFloorKey, blockPosition, weekOf, type BlockPosition } from './block';
import { BLOCK_WEEKS } from '../data/blockPhases';
import { localDayKey, rotates } from './rotation';

// Where the block's work went (T26, D43). Pure — a function of
// (logs, routines, exercises, settings, today) — like block.ts, progress.ts and
// retest.ts, so the three rules that carry consequences are unit tests rather
// than screenshots.
//
// D43, restated where it is implemented:
//
// 1. **Measured, never prescribed.** Seconds come from recorded `holdSec` values
//    and nowhere else. `prescribedSets × holdSeconds` would produce a plausible
//    number describing a session that did not happen — D17's silent-wrong-number
//    machine pointed at the log instead of the catalog.
// 2. **One population, and it is the block's own.** Completed logs against
//    rotating routines, from the block anchor onward — the same predicate
//    `blockPosition` counts sessions with, so the grid and the block label cannot
//    disagree about what a session is (D15, D29).
// 3. **The gap is rendered beside the number.** Holds with no duration recorded
//    are counted separately and surfaced wherever a total is, the way
//    `droppedForNoBodyweight` already is.
//
// And what this module deliberately does not compute: a maximum. No heaviest
// load, no longest hold, no smallest edge reached, no best week. Every one of
// those is a PR, which the narrowed charts non-goal keeps permanently out — not
// because a maximum is uninteresting, but because §7 asks the owner to watch for
// a *falling* number, and a surface that celebrates a maximum trains the eye the
// other way (D23).

/** What a cell, a row, a column and the whole block each report. */
export interface TensionTotals {
  /** Sets on a non-warm-up exercise that declares `holdSeconds`. */
  holds: number;
  /** Sum of the `holdSec` values actually recorded on those sets. */
  seconds: number;
  /** Holds with no `holdSec` recorded, so contributing nothing to `seconds`. */
  untimed: number;
}

export interface TensionRow extends TensionTotals {
  /** 1-based block week (T24). */
  week: number;
  /** Completed rotating sessions that fell in this week. */
  sessions: number;
  /** One cell per entry in `EdgeWeekGrid.edges`, in the same order. */
  cells: TensionTotals[];
}

export interface EdgeWeekGrid {
  /**
   * The edges the block actually recorded, largest first, with `null` last when
   * any hold was logged without one.
   *
   * Largest first because that is the order `Settings.edgesMm` documents for the
   * board's own rungs (D26), and `null` last because "no edge" is not a size and
   * sorting it among sizes would imply one. Nothing is bucketed: 17.5mm and 18mm
   * are two columns, never rounded together (D31).
   */
  edges: (number | null)[];
  /** Week 1 through the furthest week reached, with no gaps (AC6). */
  rows: TensionRow[];
  /** Per-edge totals across the block, aligned with `edges`. */
  columnTotals: TensionTotals[];
  /** The block's totals. Equal to the sum of `rows`, and of `columnTotals`. */
  total: TensionTotals;
  /** Completed rotating sessions inside the block. */
  sessions: number;
  /** Completed §4E batteries inside the block, excluded from every number above. */
  excludedBatteries: number;
  /** The position the rows are numbered against, so a surface can label it (T24). */
  position: BlockPosition;
}

export interface TensionInput {
  logs: WorkoutLog[];
  routines: Routine[];
  exercises: Exercise[];
  settings: Settings;
  today: string | Date;
}

/**
 * Whether a set on this exercise is a "hold" the block counts.
 *
 * Gated on `holdSeconds` for D27's reason — the existing timing declaration
 * already draws the line between a hold and 3 × 10 goblet squats, and a second
 * catalog field would be a second thing to keep in sync. The warm-up carve-out
 * has a precedent rather than a preference: `retest.ts` already treats
 * `finger-warmup-progression` as a *condition* of §4E's tests rather than as one
 * of them, and §4A is preparation for the work, not the work.
 */
export function countsAsHold(exercise: Exercise | undefined): boolean {
  return exercise?.holdSeconds !== undefined && exercise.focus !== 'warm-up';
}

function emptyTotals(): TensionTotals {
  return { holds: 0, seconds: 0, untimed: 0 };
}

function add(into: TensionTotals, seconds: number | undefined): void {
  into.holds += 1;
  // 0 is a measurement and `undefined` is not: a hold that ended instantly is a
  // zero-second hold, and only an absent value is untimed.
  if (typeof seconds === 'number' && Number.isFinite(seconds)) into.seconds += seconds;
  else into.untimed += 1;
}

/** Column key for an edge, so `null` and the numbers share one map. */
function edgeKey(edge: number | null): string {
  return edge === null ? '' : String(edge);
}

/**
 * The grid, or null when there is no block to build one over.
 *
 * Null is a real answer with its own copy ("the block starts at your first
 * logged session"), exactly as `blockPosition` returns null rather than
 * inventing week 1 — and it is why no entry point to this surface is rendered
 * when there is nothing behind it (AC10).
 */
export function buildEdgeWeekGrid(input: TensionInput): EdgeWeekGrid | null {
  const { logs, routines, exercises, settings, today } = input;

  // No `liveLog`: an unfinished session has authored nothing yet (D16), the same
  // reason Home passes none.
  const position = blockPosition({ logs, routines, settings, today });
  if (position === null) return null;

  const rotating = new Set(routines.filter(rotates).map((r) => r.id));
  const holdIds = new Set(exercises.filter(countsAsHold).map((e) => e.id));

  const inBlock = logs.filter(
    (l) =>
      l.completedAt !== null &&
      rotating.has(l.routineId) &&
      localDayKey(l.completedAt) >= position.startKey,
  );

  // A log dated ahead of today extends the grid rather than being clamped: an
  // imported backup is not corrected by inference (T24's own future-marker rule).
  let lastWeek = Math.max(position.week, BLOCK_WEEKS);
  const weekOfLog = new Map<string, number>();
  for (const log of inBlock) {
    // `completedAt` is a UTC instant and `weekOf` reads a date *key*: handing it
    // the raw timestamp would attribute an evening session to the UTC day, which
    // west of UTC puts a Sunday-evening hang in next Monday's week. This is the
    // conversion `rotation.localDayKey` exists for, and skipping it is how the
    // bug it documents comes back (D10).
    const week = weekOf(position.startKey, localDayKey(log.completedAt as string));
    weekOfLog.set(log.id, week);
    if (week > lastWeek) lastWeek = week;
  }

  // Two passes: the first discovers which edges the block used, because a column
  // must exist before any row can have a cell in it.
  const edgeSeen = new Set<string>();
  const edgeValues: (number | null)[] = [];
  for (const log of inBlock) {
    for (const entry of log.entries) {
      if (!holdIds.has(entry.exerciseId)) continue;
      for (const set of entry.sets) {
        const edge = typeof set.edgeMm === 'number' && Number.isFinite(set.edgeMm) ? set.edgeMm : null;
        const key = edgeKey(edge);
        if (edgeSeen.has(key)) continue;
        edgeSeen.add(key);
        edgeValues.push(edge);
      }
    }
  }
  const edges = sortEdges(edgeValues);
  const columnOf = new Map(edges.map((e, i) => [edgeKey(e), i]));

  const rows: TensionRow[] = [];
  for (let week = 1; week <= lastWeek; week += 1) {
    rows.push({
      week,
      sessions: 0,
      holds: 0,
      seconds: 0,
      untimed: 0,
      cells: edges.map(emptyTotals),
    });
  }

  for (const log of inBlock) {
    const row = rows[(weekOfLog.get(log.id) as number) - 1];
    row.sessions += 1;
    for (const entry of log.entries) {
      if (!holdIds.has(entry.exerciseId)) continue;
      for (const set of entry.sets) {
        const edge = typeof set.edgeMm === 'number' && Number.isFinite(set.edgeMm) ? set.edgeMm : null;
        add(row.cells[columnOf.get(edgeKey(edge)) as number], set.holdSec);
        add(row, set.holdSec);
      }
    }
  }

  const columnTotals = edges.map((_, i) => sumTotals(rows.map((r) => r.cells[i])));
  return {
    edges,
    rows,
    columnTotals,
    total: sumTotals(rows),
    sessions: rows.reduce((n, r) => n + r.sessions, 0),
    // Counted so the surface can name what it left out rather than silently
    // omitting it (D29, D43c).
    //
    // `blockFloorKey`, not `startKey`: §4E's baseline is normally logged the day
    // *before* the block's first session, and flooring at the session anchor
    // undercounted it. Nothing about the volume moves either way, because a
    // battery has never contributed to it (D29).
    excludedBatteries: logs.filter(
      (l) =>
        l.completedAt !== null &&
        !rotating.has(l.routineId) &&
        localDayKey(l.completedAt) >= blockFloorKey(position),
    ).length,
    position,
  };
}

/** Largest edge first, with the unrecorded column last (never sorted among sizes). */
function sortEdges(edges: (number | null)[]): (number | null)[] {
  const sized = edges.filter((e): e is number => e !== null).sort((a, b) => b - a);
  return edges.includes(null) ? [...sized, null] : sized;
}

export function sumTotals(parts: TensionTotals[]): TensionTotals {
  return parts.reduce<TensionTotals>(
    (acc, p) => ({
      holds: acc.holds + p.holds,
      seconds: acc.seconds + p.seconds,
      untimed: acc.untimed + p.untimed,
    }),
    emptyTotals(),
  );
}

/**
 * "48s" / "6m22s" / "1h04m10s" — seconds as a duration, rounded only here.
 *
 * `holdSec` is fractional (the timer records 5.9s), so the sum is kept exact and
 * rounded once at the point of display; rounding per set would drift a block's
 * total by whole seconds.
 */
export function formatTension(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}h${pad(m)}m${pad(s)}s`;
  if (m > 0) return `${m}m${pad(s)}s`;
  return `${s}s`;
}

/** "20mm" / "no edge" — an unrecorded edge is named, never blank (AC4). */
export function formatEdge(edge: number | null): string {
  return edge === null ? 'no edge' : `${edge}mm`;
}

/**
 * "41 holds · 6m22s under tension" — the block as two facts (D23's corollary).
 *
 * Two numbers rather than one because a hold is not a unit: §4B is 3–5s, §4C is
 * 7–10s, §5B is 8–10s and §4E's lock-off is open-ended, so a count alone
 * under-describes the week it came from. Neither number is compared to anything.
 */
export function describeTension(totals: TensionTotals): string {
  if (totals.holds === 0) return 'No holds recorded yet';
  const holds = `${totals.holds} hold${totals.holds === 1 ? '' : 's'}`;
  if (totals.seconds === 0 && totals.untimed === totals.holds) return `${holds} · no time recorded`;
  return `${holds} · ${formatTension(totals.seconds)} under tension`;
}

/**
 * "3 of them with no time recorded", or null when every hold was timed.
 *
 * Rendered wherever a total is (D43c). A total quietly missing a third of its
 * sets is worse than no total, because it looks complete — and the fix, logging
 * the duration, is the owner's to make.
 */
export function describeUntimed(totals: TensionTotals): string | null {
  if (totals.untimed === 0) return null;
  return `${totals.untimed} of them with no time recorded`;
}

/** What a cell reports. Both readings are derived from the same sets (AC5). */
export type CellMode = 'holds' | 'seconds';

export const CELL_MODES: { mode: CellMode; label: string }[] = [
  { mode: 'holds', label: 'Holds' },
  { mode: 'seconds', label: 'Under tension' },
];

/** A cell's text in the selected reading, or null when nothing was recorded. */
export function cellText(totals: TensionTotals, mode: CellMode): string | null {
  if (totals.holds === 0) return null;
  if (mode === 'holds') return String(totals.holds);
  // A cell whose every hold was untimed reads as untimed rather than as 0s,
  // which would claim a measurement that was never taken.
  if (totals.untimed === totals.holds) return '—';
  return formatTension(totals.seconds);
}
