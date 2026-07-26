// §4F's "Weeks 1–8 Progression" table, transcribed once (T24, D6).
//
// Code-seeded like the catalog and for the same reasons: it is plan content
// authored by the owner, it changes rarely, and reading it out of
// `docs/training-plan.md` at runtime is T25's job, not this one's (D38). Every
// string below is the plan's own wording — this file authors no training copy,
// and a row is quoted with its `§` reference wherever it is rendered (D23).
//
// What it is NOT: a schedule. Nothing here is compared against what the owner
// did, nothing is marked done or missed, and the caveat at the bottom is part of
// the plan rather than a softener added by the app.

export const BLOCK_WEEKS = 8;

export interface BlockPhase {
  weeks: [min: number, max: number]; // inclusive, as the plan's table is
  focus: string;
  note: string;
}

export const BLOCK_PHASES: BlockPhase[] = [
  {
    weeks: [1, 2],
    focus: 'Establish baselines, moderate effort (80%)',
    note: 'Let tendons adapt to load before pushing intensity',
  },
  {
    weeks: [3, 4],
    focus: 'Increase to 90–95% effort',
    note: 'Add small load increments (1–3%)',
  },
  {
    weeks: [5, 6],
    focus: 'Peak intensity, PIMA at true max effort',
    note: 'This is where rate-of-force gains show up',
  },
  {
    weeks: [7, 7],
    focus: 'Deload — half the volume, same intensity',
    note: 'Prevents accumulated tendon strain',
  },
  {
    weeks: [8, 8],
    focus: 'Retest max hang load / PIMA feel',
    note: 'Compare to week 1',
  },
];

/**
 * §4F's own qualifier on the table above, quoted rather than paraphrased.
 *
 * It is rendered beside every week label, which is deliberate: it is the sentence
 * that makes a *shorter* or *longer* week correct as often as the table, and
 * therefore the reason the app has no opinion about either (D23, D25).
 */
export const LIGHTER_WEEK_CAVEAT =
  'Every 3rd week, take a lighter week regardless of the schedule above if fingers feel beat up. This is non-negotiable at your training age — pulley injuries end seasons, plateaus don’t.';
