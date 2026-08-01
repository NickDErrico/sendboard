import { describe, expect, it } from 'vitest';
import type { Exercise, LoggedExercise, SetEntry, WorkoutLog } from '../types';
import {
  SIGIL_GAP_DEG,
  SIGIL_INNER,
  SIGIL_MAX_SEC,
  SIGIL_OUTER,
  describeSessionFacts,
  groupByStory,
  sessionFacts,
  sigilFor,
  spokePoint,
  spokeReach,
} from './sigil';
import { blockPosition } from './block';
import type { Routine, Settings } from '../types';

const CATALOG: Exercise[] = [
  ex('max-hang', 'max-strength', [7, 10]),
  ex('pima', 'max-strength', [3, 5]),
  ex('lockoff', 'general-strength', 'open'),
  ex('warm', 'warm-up', [10, 10]),
  ex('row', 'general-strength', undefined),
];

function ex(
  id: string,
  focus: Exercise['focus'],
  holdSeconds: [number, number] | 'open' | undefined,
): Exercise {
  return {
    id, name: id, focus, isoType: 'none', equipment: [],
    summary: '', howTo: [], prescription: '', holdSeconds,
    cues: [], safetyNotes: [], gtgEligible: false,
  };
}

const at = (local: string) => new Date(local).toISOString();
function set(holdSec: number | null, extra: Partial<SetEntry> = {}): SetEntry {
  return { load: '', reps: '', rpe: null, ...(holdSec === null ? {} : { holdSec }), ...extra };
}
function entry(exerciseId: string, sets: SetEntry[]): LoggedExercise {
  return { exerciseId, sets, notes: '' };
}
function log(id: string, day: string, entries: LoggedExercise[], routineId = 'day-1-fingerboard'): WorkoutLog {
  return {
    id, routineId, startedAt: at(`${day}T18:00`), completedAt: at(`${day}T19:00`),
    entries, sessionNotes: '',
  };
}

describe('sigilFor draws the session and nothing else (AC1, AC2, AC7)', () => {
  it('draws one spoke per hold, in logged order, grouped by exercise', () => {
    const s = sigilFor(
      log('a', '2026-06-03', [
        entry('max-hang', [set(9), set(8), set(7)]),
        entry('pima', [set(4), set(4)]),
      ]),
      CATALOG,
    )!;
    expect(s.spokes).toHaveLength(5);
    expect(s.groups).toBe(2);
    expect(s.spokes.map((k) => k.group)).toEqual([0, 0, 0, 1, 1]);
    expect(s.spokes.map((k) => k.index)).toEqual([0, 1, 2, 3, 4]);
    expect(s.spokes.map((k) => k.seconds)).toEqual([9, 8, 7, 4, 4]);
  });

  it('is identical every time it is drawn for the same log — no hash, no seed (D44a)', () => {
    const l = log('a', '2026-06-03', [entry('max-hang', [set(9), set(7.4)])]);
    expect(sigilFor(l, CATALOG)).toEqual(sigilFor(l, CATALOG));
  });

  it('depends on the sets and not on the log id or its timestamps (D44a)', () => {
    const sets = [entry('max-hang', [set(9), set(7.4)])];
    const a = sigilFor(log('a', '2026-06-03', sets), CATALOG)!;
    const b = sigilFor(log('completely-different-id', '2027-01-19', sets), CATALOG)!;
    expect(a).toEqual(b);
  });

  it('excludes warm-ups and rep-based exercises, exactly as the block count does', () => {
    const s = sigilFor(
      log('a', '2026-06-03', [
        entry('warm', [set(10), set(10)]),
        entry('max-hang', [set(9)]),
        entry('row', [set(null)]),
      ]),
      CATALOG,
    )!;
    expect(s.spokes).toHaveLength(1);
    expect(s.groups).toBe(1);
  });

  it('returns null for a session with no holds rather than an empty mark (AC7)', () => {
    expect(sigilFor(log('a', '2026-06-03', [entry('row', [set(null)])]), CATALOG)).toBeNull();
    expect(sigilFor(log('a', '2026-06-03', []), CATALOG)).toBeNull();
    // An entry with no sets is not a hold: nothing was performed to draw.
    expect(sigilFor(log('a', '2026-06-03', [entry('max-hang', [])]), CATALOG)).toBeNull();
  });

  it('does not throw on an exercise missing from the catalog', () => {
    expect(sigilFor(log('a', '2026-06-03', [entry('gone', [set(9)])]), CATALOG)).toBeNull();
  });

  it('draws a single hold as one spoke, unpadded, pointing at 12 o’clock', () => {
    const s = sigilFor(log('a', '2026-06-03', [entry('max-hang', [set(9)])]), CATALOG)!;
    expect(s.spokes).toHaveLength(1);
    expect(s.spokes[0].angleDeg).toBeCloseTo(180, 10);
  });

  it('spends angle on a gap only where there is a boundary to show', () => {
    const one = sigilFor(log('a', '2026-06-03', [entry('max-hang', [set(9), set(8)])]), CATALOG)!;
    expect(one.spokes[1].angleDeg - one.spokes[0].angleDeg).toBeCloseTo(180, 10);

    const two = sigilFor(
      log('b', '2026-06-03', [entry('max-hang', [set(9)]), entry('pima', [set(4)])]),
      CATALOG,
    )!;
    // Two spokes, two boundaries: the circle less two gaps, split in two.
    const step = (360 - 2 * SIGIL_GAP_DEG) / 2;
    expect(two.spokes[1].angleDeg - two.spokes[0].angleDeg).toBeCloseTo(step + SIGIL_GAP_DEG, 10);
  });
});

describe('spoke length reads off a shared scale (AC3, AC4, D44b)', () => {
  it('maps seconds onto the constant scale, not the session’s own maximum', () => {
    expect(spokeReach(0)).toBeCloseTo(SIGIL_INNER, 10);
    expect(spokeReach(SIGIL_MAX_SEC)).toBeCloseTo(SIGIL_OUTER, 10);
    expect(spokeReach(SIGIL_MAX_SEC / 2)).toBeCloseTo((SIGIL_INNER + SIGIL_OUTER) / 2, 10);
  });

  it('draws the same duration at the same length in two different sessions (D44b)', () => {
    const pima = sigilFor(log('a', '2026-06-03', [entry('pima', [set(4), set(4)])]), CATALOG)!;
    const hang = sigilFor(log('b', '2026-06-04', [entry('max-hang', [set(4), set(10)])]), CATALOG)!;
    // A 4s hold is one length in the app. If the scale were per-session, the
    // PIMA session's 4s would reach the rim and these would differ.
    expect(pima.spokes[0].reach).toBeCloseTo(hang.spokes[0].reach, 10);
    expect(hang.spokes[1].reach).toBeGreaterThan(hang.spokes[0].reach);
  });

  it('clamps a hold past the scale without moving any other spoke', () => {
    const s = sigilFor(
      log('a', '2026-06-03', [entry('lockoff', [set(SIGIL_MAX_SEC * 3), set(6)])]),
      CATALOG,
    )!;
    expect(s.spokes[0].reach).toBeCloseTo(SIGIL_OUTER, 10);
    expect(s.spokes[0].clamped).toBe(true);
    expect(s.spokes[1].reach).toBeCloseTo(spokeReach(6), 10);
    expect(s.spokes[1].clamped).toBe(false);
  });

  it('distinguishes an untimed hold from a zero-second one (AC4)', () => {
    const s = sigilFor(log('a', '2026-06-03', [entry('max-hang', [set(null), set(0)])]), CATALOG)!;
    expect(s.spokes[0].seconds).toBeNull();
    expect(s.spokes[1].seconds).toBe(0);
    // Same reach — the difference is drawn, not measured — but the null is what
    // the component keys its distinct form off.
    expect(s.spokes[0].reach).toBeCloseTo(SIGIL_INNER, 10);
  });

  it('a session whose every hold is untimed still draws every spoke', () => {
    const s = sigilFor(log('a', '2026-06-03', [entry('pima', [set(null), set(null), set(null)])]), CATALOG)!;
    expect(s.spokes).toHaveLength(3);
    expect(s.spokes.every((k) => k.seconds === null)).toBe(true);
  });
});

describe('a spoke tip marks the two safety reasons and no others (AC5, D27)', () => {
  it('marks pain and a form breakdown', () => {
    const s = sigilFor(
      log('a', '2026-06-03', [
        entry('max-hang', [
          set(9, { endReason: 'target' }),
          set(6, { endReason: 'dropped' }),
          set(4, { endReason: 'form-broke' }),
          set(3, { endReason: 'pain' }),
          set(8),
        ]),
      ]),
      CATALOG,
    )!;
    expect(s.spokes.map((k) => k.signal)).toEqual([false, false, true, true, false]);
  });
});

describe('spokePoint puts 12 o’clock up and runs clockwise', () => {
  it('places the cardinal angles where they read', () => {
    const up = spokePoint(0, 1);
    expect(up.x).toBeCloseTo(0, 10);
    expect(up.y).toBeCloseTo(-1, 10);
    const right = spokePoint(90, 1);
    expect(right.x).toBeCloseTo(1, 10);
    expect(right.y).toBeCloseTo(0, 10);
  });
});

describe('sessionFacts reports what the session held (AC11)', () => {
  const l = log('a', '2026-06-03', [
    entry('max-hang', [
      set(9.2, { edgeMm: 20 }),
      set(8.6, { edgeMm: 20 }),
      set(null, { edgeMm: 18 }),
      set(4, { edgeMm: 18, endReason: 'pain' }),
    ]),
    entry('warm', [set(10)]),
    entry('row', [set(null)]),
  ]);

  it('counts holds, sums recorded seconds, and names the untimed remainder', () => {
    const f = sessionFacts(l, CATALOG);
    expect(f.holds).toBe(4);
    expect(f.seconds).toBeCloseTo(21.8, 10);
    expect(f.untimed).toBe(1);
  });

  it('lists the edges the holds used, largest first, without bucketing', () => {
    expect(sessionFacts(l, CATALOG).edges).toEqual([20, 18]);
  });

  it('counts safety signals and reports them as a count, never as an alert', () => {
    expect(sessionFacts(l, CATALOG).signals).toBe(1);
  });

  it('describes the session as facts, with no maximum anywhere in the line', () => {
    const line = describeSessionFacts(sessionFacts(l, CATALOG));
    // 9.2 + 8.6 + 4 = 21.8s, rounded once at display (D43a's exact-sum rule).
    expect(line).toBe('4 holds · 22s · 1 untimed · 20mm / 18mm · 1 pain or form');
    expect(line).not.toMatch(/best|max|PR|longest|heaviest/i);
  });

  it('falls back to the entry count when there are no holds to report (AC7)', () => {
    const none = log('b', '2026-06-03', [entry('row', [set(null)])]);
    expect(describeSessionFacts(sessionFacts(none, CATALOG))).toBe('1 exercise');
    const empty = log('c', '2026-06-03', []);
    expect(describeSessionFacts(sessionFacts(empty, CATALOG))).toBe('Nothing logged');
  });

  it('omits the duration entirely when nothing was timed (D43c)', () => {
    const untimed = log('d', '2026-06-03', [entry('pima', [set(null), set(null)])]);
    expect(describeSessionFacts(sessionFacts(untimed, CATALOG))).toBe('2 holds · 2 untimed');
  });

  it('reads a pre-T12 free-text set as a hold with no seconds (D21)', () => {
    const old = log('e', '2026-06-03', [
      entry('max-hang', [{ load: '20mm +10kg', reps: '1', rpe: 8 }]),
    ]);
    const f = sessionFacts(old, CATALOG);
    expect(f.holds).toBe(1);
    expect(f.untimed).toBe(1);
    expect(f.edges).toEqual([]);
  });
});

describe('groupByStory turns the list into the block’s weeks (AC8, AC10)', () => {
  const ROUTINES: Routine[] = [
    { id: 'day-1-fingerboard', name: 'Day 1', dayOfWeek: null, exerciseIds: [] },
    { id: 'baseline-retest', name: '§4E', dayOfWeek: null, inRotation: false, exerciseIds: [] },
  ];
  const NO_SETTINGS: Settings = { installGuideDismissed: false };
  const position = (logs: WorkoutLog[], today: string, settings = NO_SETTINGS) =>
    blockPosition({ logs, routines: ROUTINES, settings, today });

  const WEEK_1_MON = '2026-06-01';
  const holds = [entry('max-hang', [set(8)])];

  it('groups newest week first and quotes §4F’s row for each (AC8, AC9)', () => {
    const logs = [
      log('w1', WEEK_1_MON, holds),
      log('w1b', '2026-06-05', holds),
      log('w3', '2026-06-15', holds),
    ];
    const groups = groupByStory(logs, position(logs, '2026-06-15'));
    expect(groups.map((g) => g.label)).toEqual(['Week 3', 'Week 1']);
    expect(groups[0].logs.map((l) => l.id)).toEqual(['w3']);
    expect(groups[1].logs.map((l) => l.id)).toEqual(['w1b', 'w1']); // newest first
    expect(groups[0].phase?.focus).toBe('Increase to 90–95% effort');
  });

  it('emits no heading for a week with no sessions', () => {
    const logs = [log('w1', WEEK_1_MON, holds), log('w3', '2026-06-15', holds)];
    expect(groupByStory(logs, position(logs, '2026-06-15')).map((g) => g.week)).toEqual([3, 1]);
  });

  it('keeps sessions before the anchor in their own group, not in week 1 (D25)', () => {
    const logs = [log('old', '2026-05-04', holds), log('w1', WEEK_1_MON, holds)];
    const groups = groupByStory(logs, position(logs, WEEK_1_MON, {
      ...NO_SETTINGS,
      blockStartedAt: WEEK_1_MON,
    }));
    expect(groups.map((g) => g.label)).toEqual(['Week 1', 'Before this block']);
    expect(groups[1].week).toBeNull();
    expect(groups[1].logs.map((l) => l.id)).toEqual(['old']);
  });

  it('renders ungrouped when no block position can be derived (AC10)', () => {
    const logs = [log('b', '2026-06-03', holds, 'baseline-retest')];
    const groups = groupByStory(logs, position(logs, '2026-06-03'));
    expect(groups).toHaveLength(1);
    expect(groups[0].week).toBeNull();
    expect(groups[0].label).toBe('');
  });

  it('includes a §4E battery in the week it happened (AC12, D29)', () => {
    const logs = [
      log('w1', WEEK_1_MON, holds),
      log('battery', '2026-06-02', holds, 'baseline-retest'),
    ];
    const groups = groupByStory(logs, position(logs, '2026-06-02'));
    expect(groups.map((g) => g.label)).toEqual(['Week 1']);
    expect(groups[0].logs.map((l) => l.id)).toEqual(['battery', 'w1']);
  });

  it('puts a §4E baseline logged before the first session in week 1, not before the block', () => {
    // §4E's baseline is a week-1 event taken "fully rested", so it normally
    // precedes the block's first training session. Grouping it under "Before
    // this block" would separate it from the block it is the baseline *of*.
    const logs = [
      log('baseline', '2026-06-02', holds, 'baseline-retest'), // Tue of week 1
      log('w1', '2026-06-03', holds), // the first session is the day after
    ];
    const groups = groupByStory(logs, position(logs, '2026-06-03'));
    expect(groups.map((g) => g.label)).toEqual(['Week 1']);
    expect(groups[0].logs.map((l) => l.id)).toEqual(['w1', 'baseline']);
  });

  it('still groups a log from before week 1 under its own heading', () => {
    const logs = [
      log('old', '2026-05-24', holds, 'baseline-retest'), // the week before week 1
      log('w1', WEEK_1_MON, holds),
    ];
    const groups = groupByStory(logs, position(logs, WEEK_1_MON));
    expect(groups.map((g) => g.label)).toEqual(['Week 1', 'Before this block']);
  });

  it('excludes in-progress sessions, which the list pins separately (AC13)', () => {
    const live: WorkoutLog = {
      id: 'live', routineId: 'day-1-fingerboard', startedAt: at('2026-06-08T18:00'),
      completedAt: null, entries: holds, sessionNotes: '',
    };
    const logs = [log('w1', WEEK_1_MON, holds), live];
    const groups = groupByStory(logs, position(logs, '2026-06-08'));
    expect(groups.flatMap((g) => g.logs).map((l) => l.id)).toEqual(['w1']);
  });

  it('returns nothing at all when there are no completed sessions', () => {
    expect(groupByStory([], null)).toEqual([]);
  });

  it('places a Sunday-evening session in its own local week (D10)', () => {
    const logs = [
      log('w1', WEEK_1_MON, holds),
      log('sun', '2026-06-07', holds), // Sunday of week 1
      log('mon', '2026-06-08', holds), // Monday of week 2
    ];
    const groups = groupByStory(logs, position(logs, '2026-06-08'));
    expect(groups.map((g) => g.label)).toEqual(['Week 2', 'Week 1']);
    expect(groups[0].logs.map((l) => l.id)).toEqual(['mon']);
    expect(groups[1].logs.map((l) => l.id)).toEqual(['sun', 'w1']);
  });
});
