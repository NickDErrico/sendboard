import type { Check, Exercise, WorkoutLog } from '../types';
import { lastLoadedByExercise, stalest } from './pool';

// Which of a routine's alternating entries is up this session (`rotationGroup`).
//
// §4B and §4C each name a pair of grips and say to alternate between them, but
// both pairs sit in Day 1's list side by side. Nothing in the app said they were
// a choice, so the routine read as four protocols — twice the max finger load §7
// caps at one max-intensity session a week, and four data points per grip where
// the plan intends eight.
//
// This module answers only "which one is up". It does not remove the other, and
// nothing here returns a filtered exercise list: D23's rule is that the app
// demotes and never blocks, which is the same treatment T32 gives a sixth set.
// A surface marks the one that is up and dims its alternate; both stay startable.
//
// Pure, and built on `pool.ts`'s `stalest` rather than a second copy of it, so
// "least recently loaded, catalog order breaks ties" means one thing in this app.

export interface Variation {
  /** The `rotationGroup` string these entries share. */
  group: string;
  /** The member that is up this session. */
  upNext: Exercise;
  /** Its alternates, in catalog order — present so a surface can name them. */
  alternates: Exercise[];
}

/**
 * The variation groups among `exercises`, each with its current pick.
 *
 * Groups of one are returned too. A pair whose partner was dropped from the
 * catalog should still read as "this is what is up" rather than silently
 * becoming an ordinary entry — the marking is how the owner knows the app is
 * tracking the alternation at all.
 */
export function variationsFor(
  exercises: Exercise[],
  logs: WorkoutLog[],
  checks: Check[],
): Variation[] {
  const lastLoaded = lastLoadedByExercise(logs, checks);
  const groups = new Map<string, Exercise[]>();
  for (const exercise of exercises) {
    if (exercise.rotationGroup === undefined) continue;
    const members = groups.get(exercise.rotationGroup);
    if (members === undefined) groups.set(exercise.rotationGroup, [exercise]);
    else members.push(exercise);
  }

  const variations: Variation[] = [];
  for (const [group, members] of groups) {
    const upNext = stalest(members, lastLoaded);
    if (upNext === null) continue; // unreachable with a non-empty group; typed away
    variations.push({
      group,
      upNext,
      alternates: members.filter((m) => m.id !== upNext.id),
    });
  }
  return variations;
}

/**
 * Exercise id → whether it is the member of its group that is up.
 *
 * Entries with no `rotationGroup` are absent from the map entirely rather than
 * present as `true`. A caller asking "should I mark this?" wants three answers —
 * up, alternate, not part of a rotation — and a boolean-only map collapses the
 * last two into the one that renders a dimmed row on an exercise that has no
 * alternate at all.
 */
export function variationStatus(
  exercises: Exercise[],
  logs: WorkoutLog[],
  checks: Check[],
): Map<string, boolean> {
  const status = new Map<string, boolean>();
  for (const variation of variationsFor(exercises, logs, checks)) {
    status.set(variation.upNext.id, true);
    for (const alternate of variation.alternates) status.set(alternate.id, false);
  }
  return status;
}
