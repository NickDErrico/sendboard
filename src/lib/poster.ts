import type { BodyweightEntry, Exercise, Routine, Settings, WorkoutLog } from '../types';
import { buildEdgeWeekGrid, type EdgeWeekGrid } from './tension';
import { groupByStory, type StoryGroup } from './sigil';
import { batteryOccasions, type Occasion } from './retest';
import { blockFloorKey, phaseFor } from './block';
// `completedAt` is a UTC instant and every comparison below is against a local
// date key. This is the conversion `rotation.localDayKey` exists for — see T26's
// amendment for what skipping it costs (D10).
import { localDayKey, rotates } from './rotation';

// The whole block on one surface (T28, D45). Assembly, not derivation: every
// number here is owned by a module that already computes and tests it — the span
// and the label by `block.ts`, the volume by `tension.ts`, the marks by
// `sigil.ts`, §4E's comparison by `retest.ts`. What this module adds is the
// composition and the two rules that only exist once things are put together:
// the order is chronological, and a week with nothing in it is still a week.
//
// What it deliberately does not compute: a summary sentence, a grade, an
// adherence figure, a maximum of any kind, or any comparison between two
// sessions. §4E's rubric is the one interpretation on the screen and it is
// quoted by `RetestComparison`, applied by the owner (D23, D44).

export interface PosterWeek {
  week: number;
  /** §4F's row for this week, quoted where it renders (D23). */
  phase: ReturnType<typeof phaseFor>;
  /** The week's sessions, oldest first. Empty is a real and rendered state. */
  logs: WorkoutLog[];
  /** Completed rotating sessions in this week, from T26's grid. */
  sessions: number;
}

export interface Poster {
  /** T24's position, unmodified — the one place the block's span is decided. */
  grid: EdgeWeekGrid;
  /** Week 1 through the furthest week reached, oldest first, gaps included. */
  weeks: PosterWeek[];
  /** Local day keys of the first and last counted sessions, or null with none. */
  firstAt: string | null;
  lastAt: string | null;
  /** Sized edges the block's holds used, largest first. Never a "smallest reached". */
  edges: number[];
  /** §4E occasions falling inside the block, oldest first (D29). */
  occasions: Occasion[];
  /** Ids of the logs that are §4E batteries, so the layout can mark them. */
  batteryLogIds: Set<string>;
}

export interface PosterInput {
  logs: WorkoutLog[];
  routines: Routine[];
  exercises: Exercise[];
  settings: Settings;
  bodyweights: BodyweightEntry[];
  today: string | Date;
}

/**
 * The poster, or null when there is no block to draw one of.
 *
 * Null is why no entry point is rendered with an empty log, exactly as T26's
 * grid decides the same thing for the same reason (AC12). One session is *not*
 * null: a block with one session in it is a real block position, and a
 * "not enough data yet" state would be the app deciding when the owner is
 * allowed to look at their own log.
 */
export function buildPoster(input: PosterInput): Poster | null {
  const { logs, routines, exercises, settings, bodyweights, today } = input;

  const grid = buildEdgeWeekGrid({ logs, routines, exercises, settings, today });
  if (grid === null) return null;

  const rotating = new Set(routines.filter(rotates).map((r) => r.id));
  // Every log inside the block, batteries included: the constellation shows what
  // the owner did, and D43's population governs the *volume*, not the layout.
  // The battery still contributes nothing to any number, because every number
  // comes from `grid`, which excluded it.
  const floor = blockFloorKey(grid.position);
  const inBlock = logs.filter(
    (l) => l.completedAt !== null && localDayKey(l.completedAt) >= floor,
  );
  // Reuse T27's grouping so a session cannot land in one week here and another
  // there, then flip to chronological — a poster reads forward, the way §4F's own
  // table runs, where History reads back from now.
  const groups = groupByStory(inBlock, grid.position);
  const byWeek = new Map<number, StoryGroup>();
  for (const g of groups) if (g.week !== null) byWeek.set(g.week, g);

  const weeks: PosterWeek[] = grid.rows.map((row) => ({
    week: row.week,
    phase: phaseFor(row.week),
    // Oldest first within the week, reversing T27's newest-first order.
    logs: [...(byWeek.get(row.week)?.logs ?? [])].reverse(),
    sessions: row.sessions,
  }));

  // The span is over *counted* sessions only, so it agrees with the label above
  // it: a battery on the last day does not extend the block's work.
  const counted = inBlock
    .filter((l) => rotating.has(l.routineId))
    .map((l) => localDayKey(l.completedAt as string))
    .sort();

  return {
    grid,
    weeks,
    firstAt: counted[0] ?? null,
    lastAt: counted[counted.length - 1] ?? null,
    edges: grid.edges.filter((e): e is number => e !== null),
    // The same floor the constellation uses, so §4E's baseline cannot be in the
    // comparison and absent from the story it is part of (`blockFloorKey`).
    occasions: batteryOccasions(logs, bodyweights).filter((o) => localDayKey(o.at) >= floor),
    batteryLogIds: new Set(inBlock.filter((l) => !rotating.has(l.routineId)).map((l) => l.id)),
  };
}

/**
 * "3 Jun 2026 – 21 Jul 2026", or null when nothing is counted yet.
 *
 * A span, never a duration with a target: the poster says when the block's work
 * happened and does not compare that to eight weeks (D45b).
 */
export function formatSpan(firstAt: string | null, lastAt: string | null): string | null {
  if (firstAt === null || lastAt === null) return null;
  const day = (key: string) =>
    new Date(`${key}T00:00`).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  return firstAt === lastAt ? day(firstAt) : `${day(firstAt)} – ${day(lastAt)}`;
}

/**
 * What §4E has on record inside this block, as a statement of fact (AC8).
 *
 * Never "due", "missing", "overdue" or a countdown: §4E's battery is a thing the
 * owner runs when the conditions are right, and T16 already refused to schedule
 * it (D2a, D23).
 */
export function describeOccasions(occasions: Occasion[]): string {
  if (occasions.length === 0) return 'No §4E battery recorded in this block.';
  if (occasions.length === 1) {
    return 'One §4E battery recorded in this block — the comparison needs two.';
  }
  return `${occasions.length} §4E batteries recorded in this block.`;
}
