import type { Exercise, SetEntry, WorkoutLog } from '../types';
import { countsAsHold, formatTension, type TensionTotals } from './tension';
import { isSafetySignal } from './setReason';
import { blockFloorKey, phaseFor, weekOf, type BlockPosition } from './block';
import { localDayKey } from './rotation';
import type { BlockPhase } from '../data/blockPhases';

// A session's mark, and the block's story (T27, D44). Pure — a function of
// (log, exercises) — like tension.ts and progress.ts, so the rule that keeps the
// mark honest is a unit test rather than a matter of taste.
//
// D44, restated where it is implemented: every visual property below maps to one
// recorded fact, and the component renders a legend saying which. There is no
// hash, no seed, no random value and nothing derived from the log's id or its
// timestamp — a property that cannot be read back against the log is decoration
// that looks like information, which is exactly the badge D23 forbids.
//
// What this module does not compute: a maximum, a score, a comparison between
// two sessions, or any word describing a session as full, light, strong or
// missed. §4F's deload week is *supposed* to draw the smallest marks on screen.

/**
 * The shared spoke scale, in seconds — a constant, never the session's own
 * longest hold (D44b).
 *
 * 30s covers §4B (3–5s), §4C (7–10s), §5A (5s) and §5B (8–10s) with room above,
 * and clamps only §4E's open lock-off, which is the one protocol with no
 * prescribed ceiling. Normalising per session instead would draw a PIMA session
 * and a max-hang session identically: different work, same picture.
 */
export const SIGIL_MAX_SEC = 30;

/** Geometry constants, exported so the legend and the tests read the same numbers. */
export const SIGIL_INNER = 0.28; // fraction of the radius a spoke starts at
export const SIGIL_OUTER = 1; // fraction a spoke at SIGIL_MAX_SEC reaches
/** Angular share of the circle spent on the gaps between exercises. */
export const SIGIL_GAP_DEG = 6;

interface SigilSpoke {
  /** Index among the session's holds, in logged order. */
  index: number;
  /** Which of the session's hold-exercises this set belongs to, 0-based. */
  group: number;
  /** Recorded seconds, or null when the set carries none (AC4). */
  seconds: number | null;
  /** True for `pain` and `form-broke` — the two reasons a set summary surfaces (D27). */
  signal: boolean;
  /** Degrees clockwise from 12 o'clock. */
  angleDeg: number;
  /** Radius fraction the spoke reaches. `SIGIL_INNER` for an untimed hold. */
  reach: number;
  /** True when the recorded duration was past the shared scale and was clamped. */
  clamped: boolean;
}

export interface Sigil {
  spokes: SigilSpoke[];
  /** Number of hold-exercises, i.e. the number of groups the spokes fall into. */
  groups: number;
}

/**
 * Where a spoke reaches, from its recorded seconds.
 *
 * An untimed hold sits at the inner radius and is drawn in its own form by the
 * component: absent is not the same as brief, and drawing it as a zero-length
 * spoke would claim a measurement that was never taken (D43a, AC4).
 */
export function spokeReach(seconds: number | null): number {
  if (seconds === null) return SIGIL_INNER;
  const clamped = Math.min(Math.max(seconds, 0), SIGIL_MAX_SEC);
  return SIGIL_INNER + (clamped / SIGIL_MAX_SEC) * (SIGIL_OUTER - SIGIL_INNER);
}

function secondsOf(set: SetEntry): number | null {
  return typeof set.holdSec === 'number' && Number.isFinite(set.holdSec) ? set.holdSec : null;
}

/**
 * The session's mark, or null when it contains no holds (AC7).
 *
 * Null rather than an empty mark: a Day 3 session of rows and squats has nothing
 * to draw, and an empty frame would read as a session that failed to record
 * something. The row still reports what the session did contain.
 *
 * Drawn for *any* session — a §4E battery, an unfinished log — because D43's
 * completed/rotating/in-block population governs sums across the block, not
 * whether a session the owner logged can be recognised in a list. What carries
 * over unchanged is `countsAsHold`, so a mark and T26's grid cannot disagree
 * about what a hold is.
 */
export function sigilFor(log: WorkoutLog, exercises: Exercise[]): Sigil | null {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  // Entry order is logged order, which is the order the session happened in.
  const groups = log.entries
    .filter((entry) => countsAsHold(byId.get(entry.exerciseId)) && entry.sets.length > 0)
    .map((entry) => entry.sets);
  const holds = groups.reduce((n, sets) => n + sets.length, 0);
  if (holds === 0) return null;

  // The circle is shared between the spokes and one gap per exercise boundary,
  // so the session's structure is visible without any extra ink (AC2). A single
  // group spends no angle on gaps.
  const gaps = groups.length > 1 ? groups.length : 0;
  const usable = 360 - gaps * SIGIL_GAP_DEG;
  const step = usable / holds;

  const spokes: SigilSpoke[] = [];
  let index = 0;
  let angle = 0;
  groups.forEach((sets, group) => {
    for (const set of sets) {
      const seconds = secondsOf(set);
      spokes.push({
        index,
        group,
        seconds,
        signal: isSafetySignal(set.endReason),
        // Half a step in, so a one-spoke mark points at 12 o'clock rather than
        // sitting on the boundary between the first and last slots.
        angleDeg: angle + step / 2,
        reach: spokeReach(seconds),
        clamped: seconds !== null && seconds > SIGIL_MAX_SEC,
      });
      angle += step;
      index += 1;
    }
    if (gaps > 0) angle += SIGIL_GAP_DEG;
  });

  return { spokes, groups: groups.length };
}

/** Cartesian point on the unit circle for a spoke, 12 o'clock = up, clockwise. */
export function spokePoint(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

interface SessionFacts extends TensionTotals {
  /** Distinct edges recorded on this session's holds, largest first. */
  edges: number[];
  /** Holds that ended for pain or a form breakdown (D27). */
  signals: number;
  /** Exercises marked done or carrying sets — what the row reported before T27. */
  entries: number;
}

/**
 * What one session held, in the same terms T26 counts the block in.
 *
 * Facts only, and deliberately no maximum: the heaviest load and the longest
 * hold are both one line away and both PRs (D23). What a row needs is what the
 * session *was*, not how it placed.
 */
export function sessionFacts(log: WorkoutLog, exercises: Exercise[]): SessionFacts {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const facts: SessionFacts = {
    holds: 0,
    seconds: 0,
    untimed: 0,
    edges: [],
    signals: 0,
    entries: log.entries.length,
  };
  const edges = new Set<number>();

  for (const entry of log.entries) {
    if (!countsAsHold(byId.get(entry.exerciseId))) continue;
    for (const set of entry.sets) {
      facts.holds += 1;
      const seconds = secondsOf(set);
      if (seconds === null) facts.untimed += 1;
      else facts.seconds += seconds;
      if (isSafetySignal(set.endReason)) facts.signals += 1;
      if (typeof set.edgeMm === 'number' && Number.isFinite(set.edgeMm)) edges.add(set.edgeMm);
    }
  }
  facts.edges = [...edges].sort((a, b) => b - a);
  return facts;
}

/**
 * The row's line: "9 holds · 1m37s · 20mm · 1 pain or form".
 *
 * Replaces "6 exercises", which counted catalog entries touched rather than work
 * done — a two-set deload session and a full Day 1 rendered identically. A
 * session with no holds falls back to the entry count, which is then the only
 * true thing there is to say about it (AC7, AC11).
 */
export function describeSessionFacts(facts: SessionFacts): string {
  if (facts.holds === 0) {
    return facts.entries === 0
      ? 'Nothing logged'
      : `${facts.entries} exercise${facts.entries === 1 ? '' : 's'}`;
  }
  const parts = [`${facts.holds} hold${facts.holds === 1 ? '' : 's'}`];
  if (facts.untimed < facts.holds) parts.push(formatTension(facts.seconds));
  if (facts.untimed > 0) parts.push(`${facts.untimed} untimed`);
  if (facts.edges.length > 0) parts.push(facts.edges.map((e) => `${e}mm`).join(' / '));
  // Named, never alarmed: recording pain marks a set as a signal, and the
  // surface that acts on one is T17's, not this list's (D27, D23).
  if (facts.signals > 0) parts.push(`${facts.signals} pain or form`);
  return parts.join(' · ');
}

/**
 * A group of sessions in the History list — one block week, newest first.
 *
 * `week` is null for the sessions that predate the block anchor. They keep their
 * own heading rather than being counted into week 1, which is the same refusal
 * T24 makes when a marker is set: logs outside the block are outside it (D25).
 */
export interface StoryGroup {
  week: number | null;
  label: string;
  phase: BlockPhase | null;
  logs: WorkoutLog[];
}

/**
 * Completed sessions grouped by the block week they happened in (AC8).
 *
 * Returns a single unlabelled group when no block position can be derived, so
 * the list renders exactly as it did before this task rather than under an
 * invented week 1 (AC10). Empty weeks are *not* emitted: an empty heading is
 * noise in a list, where an empty row in T26's grid was a fact about the block.
 *
 * Grouping only — no session is ranked, and nothing about a group is compared to
 * another group (D23).
 */
export function groupByStory(
  logs: WorkoutLog[],
  position: BlockPosition | null,
): StoryGroup[] {
  const completed = logs
    .filter((l) => l.completedAt !== null)
    .sort((a, b) => (b.completedAt as string).localeCompare(a.completedAt as string));
  if (completed.length === 0) return [];
  if (position === null) {
    return [{ week: null, label: '', phase: null, logs: completed }];
  }

  const byWeek = new Map<number | null, WorkoutLog[]>();
  for (const log of completed) {
    // `completedAt` is a UTC instant and `weekOf` reads a date key: the
    // conversion `rotation.localDayKey` exists for, skipped at the cost of
    // putting a Sunday-evening session in next Monday's week (D10).
    const key = localDayKey(log.completedAt as string);
    // `blockFloorKey`, not `startKey`: a §4E baseline is normally logged the day
    // *before* the block's first session (§4E puts it in week 1, fully rested),
    // and it belongs in week 1's group rather than under "Before this block".
    // Only batteries can fall in that window — every counted session is at or
    // after `startKey` by construction (D10, D29).
    const week = key < blockFloorKey(position) ? null : weekOf(position.startKey, key);
    const bucket = byWeek.get(week);
    if (bucket) bucket.push(log);
    else byWeek.set(week, [log]);
  }

  const weeks = [...byWeek.keys()]
    .filter((w): w is number => w !== null)
    .sort((a, b) => b - a);
  const groups: StoryGroup[] = weeks.map((week) => ({
    week,
    label: `Week ${week}`,
    phase: phaseFor(week),
    logs: byWeek.get(week) as WorkoutLog[],
  }));
  const before = byWeek.get(null);
  if (before) {
    groups.push({ week: null, label: 'Before this block', phase: null, logs: before });
  }
  return groups;
}
