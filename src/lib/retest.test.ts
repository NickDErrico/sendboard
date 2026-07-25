import { describe, expect, it } from 'vitest';
import type { BodyweightEntry, SetEntry, WorkoutLog } from '../types';
import {
  BATTERY_ROUTINE_ID,
  BATTERY_TESTS,
  batteryOccasions,
  compareOccasions,
  formatDelta,
  formatValue,
  occasionLabel,
  parseEdgeMm,
  timeOfDay,
} from './retest';
import { EXERCISES } from '../data/exercises';
import { ROUTINES } from '../data/routines';
import { BACKUP_SCHEMA_VERSION } from './backup';
import { DB_VERSION } from './storage';

// T16. The rules under test are mostly refusals — which comparison is withheld,
// which condition is derived rather than asked — so they are exactly the ones
// worth pinning: a delta drawn across two different edges is a wrong number that
// looks right, which is the failure D22/D30 exist to prevent.

function log(
  id: string,
  completedAt: string | null,
  entries: { exerciseId: string; sets: Partial<SetEntry>[]; completed?: boolean }[] = [],
  routineId = BATTERY_ROUTINE_ID,
): WorkoutLog {
  return {
    id,
    routineId,
    startedAt: completedAt ?? '2026-08-01T10:00:00.000Z',
    completedAt,
    sessionNotes: '',
    entries: entries.map((e) => ({
      exerciseId: e.exerciseId,
      notes: '',
      completed: e.completed,
      sets: e.sets.map((s) => ({ load: '', reps: '', rpe: null, ...s })),
    })),
  };
}

/** A full battery: both hangs on `edge`, a pull-up load, and both lock-offs. */
function battery(
  id: string,
  completedAt: string,
  opts: { edge: number; halfLb: number; openLb: number; pullLb: number; left: number; right: number },
): WorkoutLog {
  return log(id, completedAt, [
    { exerciseId: 'finger-warmup-progression', sets: [], completed: true },
    {
      exerciseId: 'test-max-hang-half-crimp',
      sets: [{ addedLb: opts.halfLb - 5, edgeMm: opts.edge }, { addedLb: opts.halfLb, edgeMm: opts.edge }],
    },
    { exerciseId: 'test-max-hang-open-hand', sets: [{ addedLb: opts.openLb, edgeMm: opts.edge }] },
    { exerciseId: 'test-max-pullup-load', sets: [{ addedLb: opts.pullLb }] },
    { exerciseId: 'test-lockoff-90-left', sets: [{ holdSec: opts.left }] },
    { exerciseId: 'test-lockoff-90-right', sets: [{ holdSec: opts.right }] },
  ]);
}

describe('catalog wiring', () => {
  it('every battery test names a real catalog entry that declares its metric', () => {
    for (const test of BATTERY_TESTS) {
      const exercise = EXERCISES.find((e) => e.id === test.exerciseId);
      expect(exercise, test.exerciseId).toBeDefined();
      expect(exercise?.metrics, test.exerciseId).toContain(test.metric);
    }
  });

  it('the battery routine exists, is out of rotation, and holds every test plus the warm-up', () => {
    const routine = ROUTINES.find((r) => r.id === BATTERY_ROUTINE_ID);
    expect(routine).toBeDefined();
    expect(routine?.inRotation).toBe(false);
    for (const test of BATTERY_TESTS) {
      expect(routine?.exerciseIds, test.exerciseId).toContain(test.exerciseId);
    }
    expect(routine?.exerciseIds).toContain('finger-warmup-progression');
  });

  it('keeps the test entries out of the two training routines (AC11)', () => {
    const trained = ROUTINES.filter((r) => r.id !== BATTERY_ROUTINE_ID).flatMap(
      (r) => r.exerciseIds,
    );
    for (const test of BATTERY_TESTS) {
      expect(trained, test.exerciseId).not.toContain(test.exerciseId);
    }
  });

  it('never marks a max test as GtG-eligible (plan §8)', () => {
    for (const test of BATTERY_TESTS) {
      expect(EXERCISES.find((e) => e.id === test.exerciseId)?.gtgEligible, test.exerciseId).toBe(
        false,
      );
    }
  });

  it('gives the lock-off tests an open hold and the hang tests a fixed 7s (§4E)', () => {
    expect(EXERCISES.find((e) => e.id === 'test-lockoff-90-left')?.holdSeconds).toBe('open');
    expect(EXERCISES.find((e) => e.id === 'test-lockoff-90-right')?.holdSeconds).toBe('open');
    expect(EXERCISES.find((e) => e.id === 'test-max-hang-half-crimp')?.holdSeconds).toEqual([7, 7]);
  });
});

describe('occasions (AC3)', () => {
  it('labels by completion order, and never by week number', () => {
    expect(occasionLabel(0)).toBe('Baseline');
    expect(occasionLabel(1)).toBe('Retest');
    expect(occasionLabel(2)).toBe('Retest 2');
  });

  it('ignores an abandoned battery and any non-battery session', () => {
    const logs = [
      battery('a', '2026-07-26T08:00:00.000Z', {
        edge: 20,
        halfLb: 30,
        openLb: 20,
        pullLb: 45,
        left: 9,
        right: 8,
      }),
      log('open', null),
      log('day1', '2026-07-28T08:00:00.000Z', [], 'day-1-fingerboard'),
    ];
    const occasions = batteryOccasions(logs);
    expect(occasions).toHaveLength(1);
    expect(occasions[0].label).toBe('Baseline');
  });

  it('orders by completion, so the earliest completed battery is the baseline', () => {
    const later = battery('later', '2026-09-20T08:00:00.000Z', {
      edge: 20,
      halfLb: 35,
      openLb: 25,
      pullLb: 50,
      left: 11,
      right: 10,
    });
    const earlier = battery('earlier', '2026-07-26T08:00:00.000Z', {
      edge: 20,
      halfLb: 30,
      openLb: 20,
      pullLb: 45,
      left: 9,
      right: 8,
    });
    // Supplied newest-first, the order getAllLogs returns.
    const occasions = batteryOccasions([later, earlier]);
    expect(occasions.map((o) => o.logId)).toEqual(['earlier', 'later']);
    expect(occasions[0].label).toBe('Baseline');
  });

  it('promotes the next battery to Baseline when the first is deleted', () => {
    const first = battery('first', '2026-07-26T08:00:00.000Z', {
      edge: 20,
      halfLb: 30,
      openLb: 20,
      pullLb: 45,
      left: 9,
      right: 8,
    });
    const second = battery('second', '2026-09-20T08:00:00.000Z', {
      edge: 20,
      halfLb: 35,
      openLb: 25,
      pullLb: 50,
      left: 11,
      right: 10,
    });
    expect(batteryOccasions([first, second])[1].label).toBe('Retest');
    expect(batteryOccasions([second])[0].label).toBe('Baseline');
  });

  it('reads the best set for each test, and not-recorded where a test was skipped', () => {
    const partial = log('p', '2026-07-26T08:00:00.000Z', [
      { exerciseId: 'test-max-hang-half-crimp', sets: [{ addedLb: 25, edgeMm: 20 }, { addedLb: 30, edgeMm: 20 }] },
    ]);
    const [occasion] = batteryOccasions([partial]);
    const half = occasion.rows.find((r) => r.test.exerciseId === 'test-max-hang-half-crimp');
    expect(half?.value).toBe(30); // heaviest, not the last entered
    expect(occasion.rows.find((r) => r.test.exerciseId === 'test-max-pullup-load')?.value).toBeNull();
  });
});

describe('conditions, all derived (AC8)', () => {
  const bodyweights: BodyweightEntry[] = [{ date: '2026-07-25', lb: 178 }];

  it('derives time of day, warm-up, rest, edge and bodyweight from stored data', () => {
    const previous = log('prev', '2026-07-23T18:00:00.000Z', [], 'day-3-pull-antagonist');
    const b = battery('b', '2026-07-26T08:00:00.000Z', {
      edge: 20,
      halfLb: 30,
      openLb: 20,
      pullLb: 45,
      left: 9,
      right: 8,
    });
    const [occasion] = batteryOccasions([previous, b], bodyweights);
    expect(occasion.conditions.warmedUp).toBe(true);
    expect(occasion.conditions.edgeMm).toBe(20);
    expect(occasion.conditions.edgeMixed).toBe(false);
    expect(occasion.conditions.bodyweightLb).toBe(178);
    expect(occasion.conditions.daysSincePrevious).toBe(3);
    // Local wall-clock, matching what the owner would have read off the phone.
    expect(occasion.conditions.timeOfDay).toBe(timeOfDay('2026-07-26T08:00:00.000Z'));
  });

  it('reports no rest figure when nothing preceded the battery', () => {
    const b = battery('b', '2026-07-26T08:00:00.000Z', {
      edge: 20,
      halfLb: 30,
      openLb: 20,
      pullLb: 45,
      left: 9,
      right: 8,
    });
    expect(batteryOccasions([b])[0].conditions.daysSincePrevious).toBeNull();
  });

  it('flags two different edges inside one battery rather than picking one', () => {
    const mixed = log('m', '2026-07-26T08:00:00.000Z', [
      { exerciseId: 'test-max-hang-half-crimp', sets: [{ addedLb: 30, edgeMm: 20 }] },
      { exerciseId: 'test-max-hang-open-hand', sets: [{ addedLb: 20, edgeMm: 18 }] },
    ]);
    const [occasion] = batteryOccasions([mixed]);
    expect(occasion.conditions.edgeMixed).toBe(true);
    expect(occasion.conditions.edgeMm).toBeNull();
  });

  it('reads an unmarked warm-up as not warmed up rather than assuming it', () => {
    const b = log('b', '2026-07-26T08:00:00.000Z', [
      { exerciseId: 'finger-warmup-progression', sets: [] },
    ]);
    expect(batteryOccasions([b])[0].conditions.warmedUp).toBe(false);
  });
});

describe('comparison (AC5–AC7)', () => {
  const bodyweights: BodyweightEntry[] = [
    { date: '2026-07-25', lb: 180 },
    { date: '2026-09-19', lb: 180 },
  ];

  function pair(latestOpts: Parameters<typeof battery>[2]) {
    const base = battery('base', '2026-07-26T08:00:00.000Z', {
      edge: 20,
      halfLb: 30,
      openLb: 20,
      pullLb: 45,
      left: 9,
      right: 8,
    });
    const latest = battery('latest', '2026-09-20T08:00:00.000Z', latestOpts);
    const occasions = batteryOccasions([base, latest], bodyweights);
    return compareOccasions(occasions[0], occasions[1]);
  }

  it('reports the arithmetic difference per test, in pounds and seconds', () => {
    const rows = pair({ edge: 20, halfLb: 35, openLb: 24, pullLb: 50, left: 11.5, right: 8 });
    const byId = (id: string) => rows.find((r) => r.test.exerciseId === id);
    expect(byId('test-max-hang-half-crimp')?.delta).toBe(5);
    expect(byId('test-max-pullup-load')?.delta).toBe(5);
    expect(byId('test-lockoff-90-left')?.delta).toBe(2.5);
    // Unchanged is 0, not blank: "the same" is a result.
    expect(byId('test-lockoff-90-right')?.delta).toBe(0);
  });

  it('adds a share-of-bodyweight difference for the load tests (T15)', () => {
    const rows = pair({ edge: 20, halfLb: 36, openLb: 20, pullLb: 45, left: 9, right: 8 });
    const half = rows.find((r) => r.test.exerciseId === 'test-max-hang-half-crimp');
    // 30/180 = 16.7%, 36/180 = 20.0%
    expect(half?.baseline.pctBw).toBe(16.7);
    expect(half?.latest.pctBw).toBe(20);
    expect(half?.deltaPctBw).toBe(3.3);
    // A hold has no bodyweight share to report.
    expect(rows.find((r) => r.test.exerciseId === 'test-lockoff-90-left')?.deltaPctBw).toBeNull();
  });

  it('withholds the difference on the hangs when the edge changed (AC7)', () => {
    const rows = pair({ edge: 18, halfLb: 35, openLb: 24, pullLb: 50, left: 11, right: 9 });
    const half = rows.find((r) => r.test.exerciseId === 'test-max-hang-half-crimp');
    expect(half?.withheldForEdgeChange).toBe(true);
    expect(half?.delta).toBeNull();
    expect(half?.deltaPctBw).toBeNull();
    // Both values are still shown — the record is intact, only the comparison
    // is refused.
    expect(half?.baseline.value).toBe(30);
    expect(half?.latest.value).toBe(35);
    // Edge-independent tests are unaffected by an edge change.
    expect(rows.find((r) => r.test.exerciseId === 'test-max-pullup-load')?.delta).toBe(5);
  });

  it('leaves a half-recorded row with no difference and no substitute value', () => {
    const base = battery('base', '2026-07-26T08:00:00.000Z', {
      edge: 20,
      halfLb: 30,
      openLb: 20,
      pullLb: 45,
      left: 9,
      right: 8,
    });
    const partial = log('latest', '2026-09-20T08:00:00.000Z', [
      { exerciseId: 'test-max-hang-half-crimp', sets: [{ addedLb: 35, edgeMm: 20 }] },
    ]);
    const occasions = batteryOccasions([base, partial], bodyweights);
    const rows = compareOccasions(occasions[0], occasions[1]);
    const pull = rows.find((r) => r.test.exerciseId === 'test-max-pullup-load');
    expect(pull?.latest.value).toBeNull();
    expect(pull?.delta).toBeNull();
    expect(pull?.withheldForEdgeChange).toBe(false);
  });

  it('omits the %BW figures when no bodyweight is in range, keeping the pounds', () => {
    const base = battery('base', '2026-07-26T08:00:00.000Z', {
      edge: 20,
      halfLb: 30,
      openLb: 20,
      pullLb: 45,
      left: 9,
      right: 8,
    });
    const latest = battery('latest', '2026-09-20T08:00:00.000Z', {
      edge: 20,
      halfLb: 35,
      openLb: 24,
      pullLb: 50,
      left: 11,
      right: 9,
    });
    // Only a reading two months before the baseline — outside the 14-day window.
    const occasions = batteryOccasions([base, latest], [{ date: '2026-05-01', lb: 180 }]);
    const rows = compareOccasions(occasions[0], occasions[1]);
    const half = rows.find((r) => r.test.exerciseId === 'test-max-hang-half-crimp');
    expect(half?.baseline.pctBw).toBeNull();
    expect(half?.deltaPctBw).toBeNull();
    expect(half?.delta).toBe(5);
  });
});

describe('formatting', () => {
  it('signs a delta without colouring it a verdict', () => {
    expect(formatDelta(5, 'addedLb')).toBe('+5lb');
    expect(formatDelta(-1.4, 'holdSec')).toBe('−1.4s');
    expect(formatDelta(0, 'addedLb')).toBe('0lb');
  });

  it('shows an unloaded test as BW rather than +0lb', () => {
    expect(formatValue(0, 'addedLb')).toBe('BW');
    expect(formatValue(35, 'addedLb')).toBe('+35lb');
    expect(formatValue(9.25, 'holdSec')).toBe('9.3s');
  });

  it('refuses an edge that cannot be one, and keeps a half-millimetre', () => {
    expect(parseEdgeMm('20')).toBe(20);
    expect(parseEdgeMm(' 17.5 ')).toBe(17.5);
    expect(parseEdgeMm('')).toBeNull();
    expect(parseEdgeMm('0')).toBeNull();
    expect(parseEdgeMm('-20')).toBeNull();
    expect(parseEdgeMm('2000')).toBeNull();
    expect(parseEdgeMm('twenty')).toBeNull();
  });
});

describe('compatibility (AC12)', () => {
  it('adds no schema version anywhere — the battery is a log and the edge is a setting', () => {
    // T15 left both at 2. T16 stores nothing new except one optional Settings
    // field, which the backup already passes through whole, so a file exported
    // before this task imports unchanged and simply has no battery in it.
    expect(DB_VERSION).toBe(2);
    expect(BACKUP_SCHEMA_VERSION).toBe(2);
  });

  it('reads a log set that predates the battery as no occasions at all', () => {
    const older = [
      log('a', '2026-06-01T10:00:00.000Z', [], 'day-1-fingerboard'),
      log('b', '2026-06-04T10:00:00.000Z', [], 'day-3-pull-antagonist'),
    ];
    expect(batteryOccasions(older)).toEqual([]);
  });
});
