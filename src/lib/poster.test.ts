import { describe, expect, it } from 'vitest';
import type {
  BodyweightEntry,
  Exercise,
  LoggedExercise,
  Routine,
  SetEntry,
  Settings,
  WorkoutLog,
} from '../types';
import { buildPoster, describeOccasions, formatSpan } from './poster';
import { BLOCK_WEEKS } from '../data/blockPhases';

const ROUTINES: Routine[] = [
  { id: 'day-1-fingerboard', name: 'Day 1', dayOfWeek: null, exerciseIds: [] },
  { id: 'day-3-pull-antagonist', name: 'Day 3', dayOfWeek: null, exerciseIds: [] },
  { id: 'baseline-retest', name: '§4E', dayOfWeek: null, inRotation: false, exerciseIds: [] },
];

const CATALOG: Exercise[] = [
  ex('max-hang', 'fingers', [7, 10]),
  ex('warm', 'warmup', [10, 10]),
  ex('row', 'pulling', undefined),
  // §4E's own entries, so a battery log carries holds like the real one does.
  ex('test-max-hang-half-crimp', 'fingers', [7, 7]),
];

function ex(
  id: string,
  category: Exercise['category'],
  holdSeconds: [number, number] | 'open' | undefined,
): Exercise {
  return {
    id, name: id, category, isoType: 'none', equipment: [],
    summary: '', howTo: [], prescription: '', holdSeconds,
    cues: [], safetyNotes: [], gtgEligible: false,
  };
}

const at = (local: string) => new Date(local).toISOString();
const S = (holdSec: number | null, extra: Partial<SetEntry> = {}): SetEntry => ({
  load: '', reps: '', rpe: null, ...(holdSec === null ? {} : { holdSec }), ...extra,
});
const E = (exerciseId: string, sets: SetEntry[]): LoggedExercise => ({
  exerciseId, sets, notes: '',
});
function log(
  id: string, day: string, entries: LoggedExercise[],
  routineId = 'day-1-fingerboard', completed = true,
): WorkoutLog {
  return {
    id, routineId, startedAt: at(`${day}T18:00`),
    completedAt: completed ? at(`${day}T19:00`) : null, entries, sessionNotes: '',
  };
}

const NO_SETTINGS: Settings = { installGuideDismissed: false };
const poster = (
  logs: WorkoutLog[], today: string,
  settings = NO_SETTINGS, bodyweights: BodyweightEntry[] = [],
) => buildPoster({ logs, routines: ROUTINES, exercises: CATALOG, settings, bodyweights, today });

const WEEK_1_MON = '2026-06-01';
const holds = [E('max-hang', [S(8, { edgeMm: 20 })])];

describe('buildPoster assembles rather than derives (AC1, AC2, AC3)', () => {
  it('returns null when there is no block behind it (AC12)', () => {
    expect(poster([], '2026-06-10')).toBeNull();
    // A battery alone does not start a block (D29), so there is still nothing.
    expect(poster([log('b', WEEK_1_MON, holds, 'baseline-retest')], '2026-06-10')).toBeNull();
  });

  it('renders a whole poster from one session rather than a not-enough-data state', () => {
    const p = poster([log('a', WEEK_1_MON, holds)], WEEK_1_MON)!;
    expect(p.weeks).toHaveLength(BLOCK_WEEKS);
    expect(p.weeks[0].logs.map((l) => l.id)).toEqual(['a']);
    expect(p.grid.total.holds).toBe(1);
  });

  it('takes its volume from T26 rather than recomputing it (AC3)', () => {
    const logs = [
      log('a', WEEK_1_MON, [
        E('max-hang', [S(9, { edgeMm: 20 }), S(7, { edgeMm: 20 }), S(null, { edgeMm: 18 })]),
        E('warm', [S(10)]), // §4A — a condition, not the work
        E('row', [S(null)]), // no holdSeconds — not a hold
      ]),
    ];
    const p = poster(logs, WEEK_1_MON)!;
    expect(p.grid.total).toEqual({ holds: 3, seconds: 16, untimed: 1 });
    expect(p.edges).toEqual([20, 18]);
  });

  it('spans the first and last counted sessions, and a battery does not extend it', () => {
    const logs = [
      log('a', WEEK_1_MON, holds),
      log('b', '2026-06-17', holds),
      log('battery', '2026-07-01', holds, 'baseline-retest'),
    ];
    const p = poster(logs, '2026-07-01')!;
    expect(p.firstAt).toBe(WEEK_1_MON);
    expect(p.lastAt).toBe('2026-06-17');
  });
});

describe('the constellation reads forward and keeps its gaps (AC4, AC6)', () => {
  const logs = [
    log('w1a', WEEK_1_MON, holds),
    log('w1b', '2026-06-03', holds),
    log('w3', '2026-06-15', holds),
  ];

  it('runs week 1 first, oldest session first inside each week', () => {
    const p = poster(logs, '2026-06-15')!;
    expect(p.weeks.map((w) => w.week)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    // History renders these newest-first; a poster is read forward (D45).
    expect(p.weeks[0].logs.map((l) => l.id)).toEqual(['w1a', 'w1b']);
  });

  it('keeps an empty week as a week with nothing in it (AC6)', () => {
    const p = poster(logs, '2026-06-15')!;
    expect(p.weeks[1].logs).toEqual([]);
    expect(p.weeks[1].sessions).toBe(0);
    expect(p.weeks[2].logs.map((l) => l.id)).toEqual(['w3']);
  });

  it('quotes §4F’s row for each week (AC4)', () => {
    const p = poster(logs, '2026-06-15')!;
    expect(p.weeks[0].phase?.focus).toBe('Establish baselines, moderate effort (80%)');
    expect(p.weeks[6].phase?.focus).toBe('Deload — half the volume, same intensity');
  });

  it('extends past week 8 with nothing marked extra or over (AC9)', () => {
    const long = [log('w1', WEEK_1_MON, holds), log('w11', '2026-08-10', holds)];
    const p = poster(long, '2026-08-10')!;
    expect(p.weeks.map((w) => w.week)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(p.weeks[10].logs.map((l) => l.id)).toEqual(['w11']);
    expect(p.grid.position.beyond).toBe(true);
  });

  it('carries a battery in the constellation while it contributes no volume (AC7)', () => {
    const withBattery = [
      log('w1', WEEK_1_MON, holds),
      log('battery', '2026-06-02', [E('test-max-hang-half-crimp', [S(7, { edgeMm: 20 })])], 'baseline-retest'),
    ];
    const p = poster(withBattery, '2026-06-02')!;
    expect(p.weeks[0].logs.map((l) => l.id)).toEqual(['w1', 'battery']);
    expect(p.batteryLogIds.has('battery')).toBe(true);
    // The volume counted the training session only.
    expect(p.grid.total.holds).toBe(1);
    expect(p.weeks[0].sessions).toBe(1);
  });

  it('omits an in-progress session, which has not happened yet (D16)', () => {
    const live = [log('w1', WEEK_1_MON, holds), log('live', '2026-06-03', holds, 'day-1-fingerboard', false)];
    const p = poster(live, '2026-06-03')!;
    expect(p.weeks.flatMap((w) => w.logs).map((l) => l.id)).toEqual(['w1']);
  });

  it('excludes sessions before an explicit block marker (T24 AC4)', () => {
    const logs2 = [log('old', '2026-05-04', holds), log('w1', WEEK_1_MON, holds)];
    const p = poster(logs2, WEEK_1_MON, { ...NO_SETTINGS, blockStartedAt: WEEK_1_MON })!;
    expect(p.weeks.flatMap((w) => w.logs).map((l) => l.id)).toEqual(['w1']);
    expect(p.firstAt).toBe(WEEK_1_MON);
  });

  it('redraws from a moved anchor when the earliest session is deleted (D15)', () => {
    const all = [log('early', WEEK_1_MON, holds), log('later', '2026-06-15', holds)];
    expect(poster(all, '2026-06-15')!.weeks[2].logs.map((l) => l.id)).toEqual(['later']);
    expect(poster(all.slice(1), '2026-06-15')!.weeks[0].logs.map((l) => l.id)).toEqual(['later']);
  });
});

describe('§4E is reported, never scheduled (AC7, AC8)', () => {
  const battery = (id: string, day: string, addedLb: number, edgeMm = 20) =>
    log(id, day, [E('test-max-hang-half-crimp', [S(7, { edgeMm, addedLb })])], 'baseline-retest');

  it('collects the occasions falling inside the block, oldest first', () => {
    const logs = [
      log('w1', WEEK_1_MON, holds),
      battery('b1', '2026-06-02', 50),
      battery('b2', '2026-07-20', 58),
    ];
    const p = poster(logs, '2026-07-20')!;
    expect(p.occasions.map((o) => o.label)).toEqual(['Baseline', 'Retest']);
  });

  it('admits a baseline logged before the first session, which is where §4E puts it', () => {
    // §4E: "Do this once in week 1 (fully rested, after a thorough warm-up)" —
    // so the baseline normally precedes the block's first training session. A
    // floor at the session anchor would drop the one occasion the comparison
    // depends on, which is what the browser pass caught.
    const logs = [
      battery('baseline', '2026-06-02', 50), // Tuesday of week 1
      log('w1', '2026-06-03', holds), // the first *session* is the day after
      battery('retest', '2026-07-21', 58),
    ];
    const p = poster(logs, '2026-07-21')!;
    expect(p.grid.position.startKey).toBe('2026-06-03');
    expect(p.occasions.map((o) => o.label)).toEqual(['Baseline', 'Retest']);
  });

  it('still leaves a previous block’s battery out, being weeks before week 1', () => {
    const logs = [battery('old', '2026-05-01', 50), log('w1', WEEK_1_MON, holds)];
    const p = poster(logs, WEEK_1_MON, { ...NO_SETTINGS, blockStartedAt: WEEK_1_MON })!;
    expect(p.occasions).toEqual([]);
  });

  it('states what is recorded and never that one is due (AC8, D2a)', () => {
    expect(describeOccasions([])).toBe('No §4E battery recorded in this block.');
    for (const line of [
      describeOccasions([]),
      describeOccasions([{ label: 'Baseline' } as never]),
      describeOccasions([{ label: 'Baseline' } as never, { label: 'Retest' } as never]),
    ]) {
      expect(line).not.toMatch(/due|overdue|missed|late|behind|should/i);
    }
    expect(describeOccasions([{ label: 'Baseline' } as never])).toContain('needs two');
  });
});

describe('formatSpan states when the work happened, and nothing about how long', () => {
  // Asserted by structure rather than by exact text: the app formats dates
  // through `toLocaleDateString` everywhere, so the wording is the runtime's and
  // pinning "3 Jun 2026" would pin the test machine's locale instead of the rule.
  it('formats a range as two dates and a single day as one', () => {
    const range = formatSpan('2026-06-03', '2026-07-21') as string;
    expect(range.split(' – ')).toHaveLength(2);
    expect(range).toMatch(/2026.*2026/);

    const single = formatSpan('2026-06-03', '2026-06-03') as string;
    expect(single).not.toContain('–');
    expect(single).toMatch(/2026/);
  });

  it('returns null when nothing is counted', () => {
    expect(formatSpan(null, null)).toBeNull();
  });

  it('never expresses the span as a fraction of the block (D45b)', () => {
    const s = formatSpan('2026-06-03', '2026-07-21') as string;
    expect(s).not.toMatch(/of 8|remaining|complete|to go|%/i);
  });
});
