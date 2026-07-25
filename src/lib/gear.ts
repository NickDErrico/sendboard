import type { Settings } from '../types';
import { parseEdgeMm } from './retest';

/**
 * Gear — what the owner's board and plate rack actually contain (D26, T18).
 *
 * The one rule this module exists to enforce is D31: **gear offers, it never
 * restricts.** Every function here answers "what is one tap?" and none of them
 * answers "what is allowed?" — a value the list does not contain is still typed,
 * still stored, and still displayed exactly as it was recorded. A picker that
 * cannot express a borrowed board would force either a wrong number or no
 * number, and both destroy the measurement §7 asks the owner to watch.
 *
 * Pure, so the normalisation and step arithmetic are testable without IndexedDB
 * or a rendered component (`npm run test -- gear`).
 */

/** The gear slice of `Settings`, plus the standard edge it marks (D30). */
export interface Gear {
  edgesMm?: number[];
  loadStepLb?: number;
  standardEdgeMm?: number;
}

export function gearOf(settings: Settings): Gear {
  return {
    edgesMm: settings.edgesMm,
    loadStepLb: settings.loadStepLb,
    standardEdgeMm: settings.standardEdgeMm,
  };
}

/** Every measurement in the app is stored to 0.1 (D21) — steps included. */
function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * The board, normalised: deduped and largest-first.
 *
 * Largest-first because that is the order the rungs sit in and the direction
 * progression moves — §4E's "drop to a smaller edge" makes smaller harder, so a
 * descending list reads as easiest-to-hardest left to right.
 */
export function normalizeEdges(edges: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const mm of edges) {
    if (!Number.isFinite(mm) || mm <= 0) continue;
    const v = round1(mm);
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out.sort((a, b) => b - a);
}

/**
 * An edge list typed as prose: "20, 18, 15, 10", "20 18 15", "20mm/18mm".
 *
 * Junk is dropped rather than stored as `NaN`, and each entry goes through
 * `parseEdgeMm` so the bounds that guard the standard edge guard the board too.
 * Returns `[]` when nothing parses, which callers treat as "leave what is
 * stored alone" — clearing a board by mistyping it would be a silent loss.
 */
export function parseEdgeList(raw: string): number[] {
  const parts = raw.split(/[^0-9.]+/).filter((p) => p !== '');
  const parsed: number[] = [];
  for (const part of parts) {
    const mm = parseEdgeMm(part);
    if (mm !== null) parsed.push(mm);
  }
  return normalizeEdges(parsed);
}

/**
 * The smallest load the owner can add, in pounds.
 *
 * Deliberately permissive about size (D31): a 50lb step is not an error, it is a
 * kettlebell, and the app does not know the rack better than its owner. The
 * bounds reject only what cannot be a load increment at all — zero, negative,
 * and figures no plate reaches.
 */
export function parseLoadStep(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n > 500) return null;
  return round1(n);
}

/**
 * The edges offered for one cell, in board order.
 *
 * Three sources, in order of authority: the configured board; failing that, the
 * standard edge alone (D30 — one known rung beats no picker at all, and it is
 * the one §4E says every hang in the block should be on); and always the value
 * already in the cell, so a set recorded on a rung that is not on this board is
 * shown as itself rather than snapped to a neighbour (D31, AC6).
 */
export function edgeOptions(gear: Gear, current?: number): number[] {
  const configured =
    gear.edgesMm && gear.edgesMm.length > 0
      ? gear.edgesMm
      : typeof gear.standardEdgeMm === 'number'
        ? [gear.standardEdgeMm]
        : [];
  if (configured.length === 0) return [];
  return normalizeEdges(
    typeof current === 'number' ? [...configured, current] : [...configured],
  );
}

/** True when the edge cell has something to offer — otherwise it stays a text input (AC5). */
export function hasEdgePicker(gear: Gear, current?: number): boolean {
  return edgeOptions(gear, current).length > 0;
}

/** True when the load cell can step — a step is the only thing that makes ± meaningful. */
export function hasLoadStepper(gear: Gear): boolean {
  return typeof gear.loadStepLb === 'number' && gear.loadStepLb > 0;
}

/**
 * One tap on − or +, applied to the value that is already there (D32).
 *
 * From an empty cell the two directions land on the two values a first set is
 * actually likely to be: `+` records one increment, `−` records 0 — bodyweight,
 * which is where §5B's lock-off starts and what `METRIC_CONFIG.addedLb` already
 * formats as `BW`. Neither invents a number the owner did not tap for, and the
 * app never pre-moves the value when the panel opens.
 *
 * Clamped at 0 (negative added load is not a thing) and rounded to 0.1, so a
 * 2.5 step from 32.5 stores 35 rather than 35.000000000000004.
 */
export function stepLoad(
  current: number | undefined,
  step: number,
  direction: 1 | -1,
): number {
  if (typeof current !== 'number' || !Number.isFinite(current)) {
    return direction > 0 ? round1(step) : 0;
  }
  return Math.max(0, round1(current + direction * step));
}

/**
 * The RPE values offered as chips.
 *
 * Not gear — a ten-point scale is not equipment, so this needs no configuration
 * and appears on every set (AC4). The range is narrowed to what a max-effort
 * protocol actually produces: §4C's max hangs are "very hard by rep 3" and §4B's
 * PIMA runs at 95–100% effort, so a 3 is a mistyped 8 far more often than it is
 * a real rating. Anything outside the range is still typeable in the same panel
 * (D31) and anything already recorded is displayed as stored.
 */
export const RPE_OPTIONS = [6, 7, 8, 9, 10] as const;
