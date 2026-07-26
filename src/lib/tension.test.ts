import { describe, expect, it } from 'vitest';
import type { Exercise, LoggedExercise, Routine, SetEntry, Settings, WorkoutLog } from '../types';
import {
  buildEdgeWeekGrid,
  cellText,
  countsAsHold,
  describeTension,
  describeUntimed,
  formatEdge,
  formatTension,
  sumTotals,
} from './tension';
import { EXERCISES } from '../data/exercises';
import { BLOCK_WEEKS } from '../data/blockPhases';

const ROUTINES: Routine[] = [
  { id: 'day-1-fingerboard', name: 'Day 1', dayOfWeek: null, exerciseIds: [] },
  { id: 'day-3-pull-antagonist', name: 'Day 3', dayOfWeek: null, exerciseIds: [] },
  { id: 'baseline-retest', name: '§4E', dayOfWeek: null, inRotation: false, exerciseIds: [] },
];

// A minimal catalog covering the three shapes that matter: a hold, a hold that
// is a warm-up, and a rep-based exercise with no `holdSeconds` at all.
const CATALOG: Exercise[] = [
  ex('max-hang', 'fingers', [7, 10]),
  ex('pima', 'fingers', [3, 5]),
  ex('warm', 'warmup', [10, 10]),
  ex('row', 'pulling', undefined),
];

function ex(
  id: string,
  category: Exercise['category'],
  holdSeconds: [number, number] | 'open' | undefined,
): Exercise {
  return {
    id,
    name: id,
    category,
    isoType: 'none',
    equipment: [],
    summary: '',
    howTo: [],
    prescription: '',
    holdSeconds,
    cues: [],
    safetyNotes: [],
    gtgEligible: false,
  };
}

const at = (local: string) => new Date(local).toISOString();

function set(holdSec: number | undefined, edgeMm?: number): SetEntry {
  return { load: '', reps: '', rpe: null, holdSec, edgeMm };
}
function entry(exerciseId: string, sets: SetEntry[]): LoggedExercise {
  return { exerciseId, sets, notes: '' };
}
function log(
  routineId: string,
  day: string,
  entries: LoggedExercise[] = [],
  completed = true,
): WorkoutLog {
  return {
    id: `${routineId}-${day}-${entries.map((e) => e.exerciseId).join('+')}`,
    routineId,
    startedAt: at(`${day}T18:00`),
    completedAt: completed ? at(`${day}T19:00`) : null,
    entries,
    sessionNotes: '',
  };
}

const NO_SETTINGS: Settings = { installGuideDismissed: false };
const grid = (logs: WorkoutLog[], today: string, settings = NO_SETTINGS) =>
  buildEdgeWeekGrid({ logs, routines: ROUTINES, exercises: CATALOG, settings, today });

// Monday 2026-06-01 is week 1; every later Monday is one week on.
const WEEK_1_MON = '2026-06-01';

describe('countsAsHold gates on the timing declaration, minus warm-ups (AC8)', () => {
  it('counts an exercise that declares holdSeconds', () => {
    expect(countsAsHold(CATALOG[0])).toBe(true);
  });

  it('counts an open hold — §4E’s lock-off is the longest tension in the app', () => {
    expect(countsAsHold(ex('lockoff', 'pulling', 'open'))).toBe(true);
  });

  it('does not count a warm-up hold: §4A is a condition of the work, not the work', () => {
    expect(countsAsHold(CATALOG[2])).toBe(false);
  });

  it('does not count a rep-based exercise or an unknown id', () => {
    expect(countsAsHold(CATALOG[3])).toBe(false);
    expect(countsAsHold(undefined)).toBe(false);
  });

  it('no catalog entry records holdSec without declaring holdSeconds', () => {
    // The gate drops nothing that is actually logged: every entry declaring the
    // `holdSec` metric also declares a hold, so "counted holds" and "recorded
    // seconds" describe one population rather than two (D43b).
    const chartsTime = EXERCISES.filter((e) => e.metrics?.includes('holdSec'));
    expect(chartsTime.length).toBeGreaterThan(0);
    for (const e of chartsTime) expect(e.holdSeconds).toBeDefined();
  });
});

describe('buildEdgeWeekGrid derives its rows from the block (AC3, AC10)', () => {
  it('returns null when the block has not started', () => {
    expect(grid([], '2026-06-10')).toBeNull();
    // A battery alone does not start a block (D29), so there is still nothing.
    expect(grid([log('baseline-retest', WEEK_1_MON)], '2026-06-10')).toBeNull();
  });

  it('runs rows from week 1 to the full block even when only week 1 is logged', () => {
    const g = grid([log('day-1-fingerboard', WEEK_1_MON, [entry('max-hang', [set(7)])])], WEEK_1_MON)!;
    expect(g.rows).toHaveLength(BLOCK_WEEKS);
    expect(g.rows[0].week).toBe(1);
    expect(g.rows[BLOCK_WEEKS - 1].week).toBe(BLOCK_WEEKS);
  });

  it('keeps an empty week as a row rather than compressing the timeline (AC6)', () => {
    const g = grid(
      [
        log('day-1-fingerboard', WEEK_1_MON, [entry('max-hang', [set(7)])]),
        log('day-1-fingerboard', '2026-06-15', [entry('max-hang', [set(8)])]), // week 3
      ],
      '2026-06-15',
    )!;
    expect(g.rows[1].week).toBe(2);
    expect(g.rows[1].holds).toBe(0);
    expect(g.rows[1].sessions).toBe(0);
    expect(g.rows[2].holds).toBe(1);
  });

  it('extends past week 8 with no week marked late or over (AC7)', () => {
    const g = grid(
      [
        log('day-1-fingerboard', WEEK_1_MON, [entry('max-hang', [set(7)])]),
        log('day-1-fingerboard', '2026-08-03', [entry('max-hang', [set(7)])]), // week 10
      ],
      '2026-08-03',
    )!;
    expect(g.rows).toHaveLength(10);
    expect(g.rows[9].holds).toBe(1);
    expect(g.position.beyond).toBe(true);
  });

  it('extends to a log dated ahead of today rather than clamping it', () => {
    const g = grid(
      [
        log('day-1-fingerboard', WEEK_1_MON, [entry('max-hang', [set(7)])]),
        log('day-1-fingerboard', '2026-09-07', [entry('max-hang', [set(7)])]), // week 15
      ],
      '2026-06-03',
    )!;
    expect(g.rows).toHaveLength(15);
    expect(g.rows[14].holds).toBe(1);
  });

  it('excludes logs before an explicit block marker (T24 AC4)', () => {
    const logs = [
      log('day-1-fingerboard', '2026-05-04', [entry('max-hang', [set(9)])]),
      log('day-1-fingerboard', WEEK_1_MON, [entry('max-hang', [set(7)])]),
    ];
    const g = grid(logs, WEEK_1_MON, { ...NO_SETTINGS, blockStartedAt: WEEK_1_MON })!;
    expect(g.total.holds).toBe(1);
    expect(g.total.seconds).toBe(7);
  });
});

describe('the population is the block’s own (AC8, AC9, D43b)', () => {
  const logs = [
    log('day-1-fingerboard', WEEK_1_MON, [
      entry('max-hang', [set(7, 20), set(8, 20)]),
      entry('warm', [set(10), set(10)]), // §4A — a condition, not the work
      entry('row', [set(undefined)]), // no holdSeconds — not a hold
    ]),
    log('baseline-retest', '2026-06-02', [entry('max-hang', [set(30, 20)])]), // §4E — excluded
    log('day-3-pull-antagonist', '2026-06-03', [entry('pima', [set(4)])], false), // unfinished
  ];

  it('counts only non-warm-up holds in completed rotating sessions', () => {
    const g = grid(logs, '2026-06-05')!;
    expect(g.total.holds).toBe(2);
    expect(g.total.seconds).toBe(15);
    expect(g.sessions).toBe(1);
  });

  it('names the batteries it left out rather than omitting them silently', () => {
    expect(grid(logs, '2026-06-05')!.excludedBatteries).toBe(1);
  });

  it('counts a baseline logged before the first session, which is where §4E puts it', () => {
    // §4E's baseline is a week-1 event taken "fully rested", so it normally
    // precedes the block's first training session. Flooring at the session
    // anchor undercounted it — found by T28, where the same floor dropped the
    // baseline out of the retest comparison. No volume number moves either way.
    const withEarlyBaseline = [
      log('baseline-retest', '2026-06-02', [entry('max-hang', [set(7, 20)])]), // Tue of week 1
      log('day-1-fingerboard', '2026-06-03', [entry('max-hang', [set(9, 20)])]), // first session
    ];
    const g = grid(withEarlyBaseline, '2026-06-05')!;
    expect(g.position.startKey).toBe('2026-06-03');
    expect(g.excludedBatteries).toBe(1);
    expect(g.total.holds).toBe(1);
  });
});

describe('edges are columns, and nothing is bucketed (AC3, AC4)', () => {
  const logs = [
    log('day-1-fingerboard', WEEK_1_MON, [
      entry('max-hang', [set(7, 20), set(6, 18), set(5, 17.5)]),
      entry('pima', [set(4)]), // §4B declares no edge — the unrecorded column
    ]),
  ];

  it('orders sized edges largest first with the unrecorded column last', () => {
    expect(grid(logs, WEEK_1_MON)!.edges).toEqual([20, 18, 17.5, null]);
  });

  it('keeps 17.5mm and 18mm as separate columns (D31)', () => {
    const g = grid(logs, WEEK_1_MON)!;
    expect(g.columnTotals[1].holds).toBe(1);
    expect(g.columnTotals[2].holds).toBe(1);
  });

  it('carries a hold with no edge in its own column, so a row sums to its total (AC4)', () => {
    const g = grid(logs, WEEK_1_MON)!;
    const row = g.rows[0];
    expect(sumTotals(row.cells)).toEqual({ holds: row.holds, seconds: row.seconds, untimed: 0 });
    expect(row.cells[3].holds).toBe(1);
  });

  it('renders a one-edge block as a one-column grid', () => {
    const g = grid([log('day-1-fingerboard', WEEK_1_MON, [entry('max-hang', [set(7, 20)])])], WEEK_1_MON)!;
    expect(g.edges).toEqual([20]);
  });

  it('column totals and row totals agree with the block total', () => {
    const g = grid(logs, WEEK_1_MON)!;
    expect(sumTotals(g.columnTotals)).toEqual(g.total);
    expect(sumTotals(g.rows)).toEqual(g.total);
  });
});

describe('seconds are measured, never prescribed (AC1, AC2, AC8)', () => {
  it('sums recorded holdSec values exactly and counts the ones that are absent', () => {
    const g = grid(
      [
        log('day-1-fingerboard', WEEK_1_MON, [
          entry('max-hang', [set(5.9, 20), set(7.3, 20), set(undefined, 20)]),
        ]),
      ],
      WEEK_1_MON,
    )!;
    expect(g.total.holds).toBe(3);
    expect(g.total.seconds).toBeCloseTo(13.2, 10);
    expect(g.total.untimed).toBe(1);
  });

  it('treats 0s as a measurement and an absent value as untimed', () => {
    const g = grid(
      [log('day-1-fingerboard', WEEK_1_MON, [entry('max-hang', [set(0, 20), set(undefined, 20)])])],
      WEEK_1_MON,
    )!;
    expect(g.total.holds).toBe(2);
    expect(g.total.untimed).toBe(1);
    expect(g.total.seconds).toBe(0);
  });

  it('never multiplies a prescription: an entry with no sets contributes nothing', () => {
    const g = grid([log('day-1-fingerboard', WEEK_1_MON, [entry('max-hang', [])])], WEEK_1_MON)!;
    expect(g.total).toEqual({ holds: 0, seconds: 0, untimed: 0 });
  });
});

describe('weeks are D10 weeks', () => {
  it('places a Sunday-evening session in the week its local day falls in', () => {
    // 2026-06-07 is the Sunday of week 1; the following Monday starts week 2.
    const g = grid(
      [
        log('day-1-fingerboard', WEEK_1_MON, [entry('max-hang', [set(7)])]),
        log('day-3-pull-antagonist', '2026-06-07', [entry('pima', [set(4)])]),
        log('day-1-fingerboard', '2026-06-08', [entry('max-hang', [set(7)])]),
      ],
      '2026-06-08',
    )!;
    expect(g.rows[0].holds).toBe(2);
    expect(g.rows[0].sessions).toBe(2);
    expect(g.rows[1].holds).toBe(1);
  });

  it('re-numbers every row when the earliest session is deleted (D15)', () => {
    const all = [
      log('day-1-fingerboard', WEEK_1_MON, [entry('max-hang', [set(7)])]),
      log('day-1-fingerboard', '2026-06-15', [entry('max-hang', [set(8)])]),
    ];
    expect(grid(all, '2026-06-15')!.rows[2].holds).toBe(1);
    expect(grid(all.slice(1), '2026-06-15')!.rows[0].holds).toBe(1);
  });
});

describe('formatting reports facts and never a verdict (AC1, AC2)', () => {
  it('formats a duration in the largest units it needs', () => {
    expect(formatTension(0)).toBe('0s');
    expect(formatTension(48)).toBe('48s');
    expect(formatTension(382)).toBe('6m22s');
    expect(formatTension(3850)).toBe('1h04m10s');
  });

  it('rounds only at the point of display', () => {
    expect(formatTension(13.2)).toBe('13s');
    expect(formatTension(59.6)).toBe('1m00s');
  });

  it('names an unrecorded edge rather than leaving it blank', () => {
    expect(formatEdge(20)).toBe('20mm');
    expect(formatEdge(17.5)).toBe('17.5mm');
    expect(formatEdge(null)).toBe('no edge');
  });

  it('describes the block as two facts, with no comparison in the string', () => {
    expect(describeTension({ holds: 41, seconds: 382, untimed: 0 })).toBe(
      '41 holds · 6m22s under tension',
    );
    expect(describeTension({ holds: 1, seconds: 7, untimed: 0 })).toBe('1 hold · 7s under tension');
    expect(describeTension({ holds: 0, seconds: 0, untimed: 0 })).toBe('No holds recorded yet');
    expect(describeTension({ holds: 3, seconds: 0, untimed: 3 })).toBe('3 holds · no time recorded');
  });

  it('reports the untimed remainder beside the total, and nothing when there is none', () => {
    expect(describeUntimed({ holds: 10, seconds: 60, untimed: 3 })).toBe(
      '3 of them with no time recorded',
    );
    expect(describeUntimed({ holds: 10, seconds: 60, untimed: 0 })).toBeNull();
  });

  it('reads one cell two ways from the same sets (AC5)', () => {
    const cell = { holds: 5, seconds: 38, untimed: 0 };
    expect(cellText(cell, 'holds')).toBe('5');
    expect(cellText(cell, 'seconds')).toBe('38s');
    expect(cellText({ holds: 0, seconds: 0, untimed: 0 }, 'holds')).toBeNull();
    // Every hold untimed: the count is real, the duration was never measured.
    expect(cellText({ holds: 2, seconds: 0, untimed: 2 }, 'seconds')).toBe('—');
    expect(cellText({ holds: 2, seconds: 0, untimed: 2 }, 'holds')).toBe('2');
  });
});
