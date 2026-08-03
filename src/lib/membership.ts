import type { Exercise, Routine, Tier } from '../types';
import { DAILY_ROUTINE_ID } from './daily';
import { rotates } from './rotation';
import type { LaneId } from './lanes';

/**
 * Which lane a movement is loaded in (T39, D54).
 *
 * D48 said a movement is addressable as `tier → focus → target`. Building the
 * browse proved that wrong: **no catalog entry declares `tier: 'heavy'`**, and
 * eighteen of fifty-six declare no tier at all — including both max hangs, both
 * PIMA pulls, all three overcoming bar pulls and all five §4E tests, which *are*
 * the heavy tier.
 *
 * The reason is in `types.ts` and it is correct. A tier is a property of a
 * **dose**, and `tiers[]` exists only for movements carrying more than one
 * protocol; an entry with a single protocol states it in `prescription` and
 * declares no tier. So the app has always held two notions of tier without
 * naming either: the two rotation lanes read `tiers[]` directly, while the heavy
 * lane never touches it and works entirely off `rotation.ts`.
 *
 * This module names the second notion. It answers "which lane does this movement
 * appear in", which is a different question from "what dose does this movement
 * carry", and it is derived rather than declared — the same rule `rotation.ts`
 * and `block.ts` follow, applied to membership instead of to order.
 *
 * Pure: a function of `(exercise, routines)`, so the ordering below is a unit
 * test rather than an argument.
 */

/** A lane, or none — the second is a real answer, not a gap. See `laneOf`. */
export type Membership = LaneId | null;

/** The tiers a catalog entry can declare a dose for, in the order they decide. */
const DECLARED_TIERS: readonly Tier[] = ['collagen', 'daily-isometric', 'pool'];

/**
 * The lane a movement belongs to.
 *
 * The order is the whole decision, and it is **a declaration beats an
 * inference**:
 *
 * 1. **A declared dose** — an entry saying "here is my pool dose" has stated
 *    which tier loads it, and nothing should overrule that. This is what puts
 *    the three prehab movements inside Day 3 — the wall press, the external
 *    rotations, the wrist extensor work — in the pool rather than in heavy, and
 *    it is the same fact the heavy lane already reports when it says Day 3 is
 *    doing three jobs at once.
 * 2. **The daily routine** — §10D's two entries, which is how the finger warm-up
 *    lands in collagen despite declaring no dose of its own.
 * 3. **A rotating routine** — the heavy tier, defined by the routines that
 *    rotate (D15) rather than by anything in the catalog.
 * 4. **None**, and it is correct rather than missing: the §4E tests are a
 *    measurement (D29) and the climbing days are check-offs (D9). Neither is
 *    loaded on a cadence, so neither belongs to a lane, and a browse that filed
 *    them under one would be asserting a frequency that does not exist.
 */
export function laneOf(exercise: Exercise, routines: Routine[]): Membership {
  const declared = exercise.tiers?.find((t) => DECLARED_TIERS.includes(t.tier));
  if (declared) return declared.tier as LaneId;

  const inRoutine = (id: string) =>
    routines.some((r) => r.id === id && r.exerciseIds.includes(exercise.id));

  if (inRoutine(DAILY_ROUTINE_ID)) return 'collagen';

  const inRotating = routines.some(
    (r) => rotates(r) && r.exerciseIds.includes(exercise.id),
  );
  if (inRotating) return 'heavy';

  return null;
}

export interface LaneGroup {
  lane: Membership;
  exercises: Exercise[];
}

/**
 * The catalog split by lane, in lane order, with the no-lane group last.
 *
 * Every group is returned even when empty, for the reason every lane on Today is
 * rendered even when empty: a hidden group is indistinguishable from one with
 * nothing in it, and the counts are the point. The totals are asserted to sum to
 * the catalog, so a movement cannot fall out by being unreachable from any lane.
 */
export const LANE_ORDER: readonly Membership[] = [
  'collagen',
  'daily-isometric',
  'pool',
  'heavy',
  null,
];

export function groupByLane(exercises: Exercise[], routines: Routine[]): LaneGroup[] {
  return LANE_ORDER.map((lane) => ({
    lane,
    exercises: exercises.filter((e) => laneOf(e, routines) === lane),
  }));
}

/** How the Library names each group. `null` is named, never left blank. */
export const LANE_LABELS: Record<string, string> = {
  collagen: 'Collagen',
  'daily-isometric': 'Daily isometrics',
  pool: 'Rotating pool',
  heavy: 'Heavy',
  none: 'Not in a lane',
};

export function laneLabel(lane: Membership): string {
  return LANE_LABELS[lane ?? 'none'];
}

/** One line on why a group exists, for the two that are not self-evident. */
export const LANE_NOTES: Partial<Record<string, string>> = {
  heavy: 'Derived from the routines that rotate — these entries declare no dose of their own.',
  none: 'A measurement and two check-offs. Neither is loaded on a cadence, so neither belongs to a lane.',
};
