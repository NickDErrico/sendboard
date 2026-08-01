import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../data/exercises';
import { ROUTINES } from '../data/routines';
import type { Check, WorkoutLog } from '../types';
import { lanesToday, type LaneInput } from './lanes';

const TODAY = new Date('2026-08-01T09:00:00');

function input(over: Partial<LaneInput> = {}): LaneInput {
  return {
    exercises: EXERCISES,
    routines: ROUTINES,
    logs: [],
    checks: [],
    today: TODAY,
    ...over,
  };
}

function log(routineId: string, completedAt: string | null, startedAt = completedAt): WorkoutLog {
  return {
    id: `${routineId}-${completedAt ?? 'live'}`,
    routineId,
    startedAt: startedAt ?? '2026-08-01T08:00:00',
    completedAt,
    entries: [],
    sessionNotes: '',
  };
}

function jointCheck(exerciseId: string, date: string): Check {
  return { id: `${exerciseId}-${date}`, kind: 'joint', date, notes: '', exerciseId };
}

describe('the lanes themselves (D47)', () => {
  it('returns exactly four, in frequency order', () => {
    expect(lanesToday(input()).map((l) => l.id)).toEqual([
      'collagen',
      'daily-isometric',
      'pool',
      'heavy',
    ]);
  });

  it('keeps that order whatever the log holds', () => {
    // The fixed-ordering rule. A pool target six days stale must not lift the
    // pool lane above the two daily ones — the screen is not a queue of debts.
    const stale = lanesToday(
      input({
        logs: [log('day-1-fingerboard', '2026-08-01T07:00:00')],
        checks: [jointCheck('iso-extensor-hold', '2026-08-01')],
      }),
    );
    expect(stale.map((l) => l.id)).toEqual(['collagen', 'daily-isometric', 'pool', 'heavy']);
  });

  it('never drops a lane', () => {
    // A hidden lane is indistinguishable from a satisfied one.
    expect(lanesToday(input({ exercises: [], routines: [] }))).toHaveLength(4);
  });

  it('gives every lane a name, a cadence, a source, a control and at least one line', () => {
    for (const lane of lanesToday(input())) {
      expect(lane.name.length, `${lane.id} has no name`).toBeGreaterThan(0);
      expect(lane.cadence.length, `${lane.id} has no cadence`).toBeGreaterThan(0);
      expect(lane.source.length, `${lane.id} cites no source`).toBeGreaterThan(0);
      expect(lane.lines.length, `${lane.id} has no state`).toBeGreaterThan(0);
      expect(lane.action.label.length, `${lane.id} has no control`).toBeGreaterThan(0);
    }
  });
});

describe('which lanes have a screen behind them (T38)', () => {
  it('gives every tier but collagen a detail route', () => {
    // Collagen's routine is the whole of that tier, so the title stays inert
    // rather than pointing at a screen that would only repeat the lane.
    const detail = Object.fromEntries(lanesToday(input()).map((l) => [l.id, l.detail]));
    expect(detail).toEqual({
      collagen: undefined,
      'daily-isometric': 'daily-isometric',
      pool: 'pool',
      heavy: 'heavy',
    });
  });

  it('keeps the heavy lane a one-tap start, not a link', () => {
    // Collagen and heavy are tiers you run; the rotations are tiers you tick.
    // Replacing Start with "open the tier" would cost a tap on the surface whose
    // premise is that the likeliest next act is one tap away.
    const heavy = lanesToday(input())[3];
    expect(heavy.action.kind).toBe('start-routine');
  });
});

describe('elevation is cadence, never completion (D49)', () => {
  it('marks the two daily tiers and only those', () => {
    const daily = lanesToday(input())
      .filter((l) => l.daily)
      .map((l) => l.id);
    expect(daily).toEqual(['collagen', 'daily-isometric']);
  });

  it('does not change when a tier has been run today', () => {
    // The property the view raises a lane on cannot vary with the log, or
    // elevation becomes a done-state by the back door.
    const before = lanesToday(input()).map((l) => l.daily);
    const after = lanesToday(
      input({
        logs: [log('daily-fingers', '2026-08-01T07:00:00')],
        checks: [jointCheck('iso-extensor-hold', '2026-08-01')],
      }),
    ).map((l) => l.daily);
    expect(after).toEqual(before);
  });
});

describe('nothing reads more than one lane (D49)', () => {
  it('exposes no field that could carry a cross-lane total', () => {
    // Structural: `lanesToday` returns an array, so there is nowhere for a
    // day-complete flag or a lanes-touched count to live.
    const lanes = lanesToday(input());
    expect(Array.isArray(lanes)).toBe(true);
    const keys = new Set(lanes.flatMap((l) => Object.keys(l)));
    expect([...keys].sort()).toEqual([
      'action',
      'cadence',
      'daily',
      'detail',
      'id',
      'lines',
      'name',
      'source',
    ]);
  });
});

describe('the words stay out (D23, D49, AC12)', () => {
  const FORBIDDEN = /\b(due|owed|missed|behind|late|streak|overdue)\b/i;

  const CASES: [string, LaneInput][] = [
    ['an empty store', input()],
    [
      'a day with everything run',
      input({
        logs: [
          log('daily-fingers', '2026-08-01T06:00:00'),
          log('day-1-fingerboard', '2026-08-01T07:30:00'),
        ],
        checks: EXERCISES.filter((e) => e.tiers?.some((t) => t.tier === 'daily-isometric')).map(
          (e) => jointCheck(e.id, '2026-08-01'),
        ),
      }),
    ],
    [
      'a long gap',
      input({ logs: [log('day-3-pull-antagonist', '2026-05-01T09:00:00')] }),
    ],
  ];

  for (const [name, state] of CASES) {
    it(`renders no verdict words on ${name}`, () => {
      for (const lane of lanesToday(state)) {
        for (const line of [...lane.lines, lane.action.label]) {
          expect(line, `${lane.id}: "${line}"`).not.toMatch(FORBIDDEN);
        }
      }
    });

    it(`renders no fraction against a prescribed count on ${name}`, () => {
      // "2 of six slots" is a score out of six, and six is prescribed.
      for (const lane of lanesToday(state)) {
        for (const line of lane.lines) {
          expect(line, `${lane.id}: "${line}"`).not.toMatch(/\d+\s*(of|\/)\s*(\d+|six|two|four)\b/i);
        }
      }
    });
  }
});

describe('each lane reports its own engine', () => {
  it('collagen states runs today and the spacing', () => {
    const [collagen] = lanesToday(input({ logs: [log('daily-fingers', '2026-08-01T06:00:00')] }));
    expect(collagen.lines[0]).toMatch(/run/i);
    expect(collagen.lines.join(' ')).toMatch(/6h|hour|apart|:/i);
  });

  it('the isometric lane names open slots rather than counting them', () => {
    const lanes = lanesToday(input());
    const iso = lanes[1];
    // Nothing loaded, so the first slot is open and named with its movement.
    expect(iso.lines[0]).toContain('—');
    expect(iso.lines[0]).not.toMatch(/^\d/);
  });

  it('the isometric lane says so when every slot is loaded today', () => {
    const checks = EXERCISES.filter((e) => e.tiers?.some((t) => t.tier === 'daily-isometric')).map(
      (e) => jointCheck(e.id, '2026-08-01'),
    );
    const iso = lanesToday(input({ checks }))[1];
    expect(iso.lines[0]).toBe('Every slot loaded today.');
    // Still a live control — a loaded day never withdraws one (D49).
    expect(iso.action.kind).toBe('open-tier');
  });

  it('the pool lane leads with the target poolToday ranks first', () => {
    const pool = lanesToday(input())[2];
    expect(pool.lines[0]).toContain('—');
    expect(pool.lines[1]).toMatch(/then/);
  });

  it('the heavy lane names the routine the rotation puts up next', () => {
    const heavy = lanesToday(
      input({ logs: [log('day-1-fingerboard', '2026-07-30T09:00:00')] }),
    )[3];
    expect(heavy.lines[0]).toContain('Day 3');
    expect(heavy.action).toMatchObject({ kind: 'start-routine', routineId: 'day-3-pull-antagonist' });
  });

  it('the heavy lane ignores the battery and the daily (D15, D29)', () => {
    const heavy = lanesToday(
      input({
        logs: [log('baseline-retest', '2026-08-01T08:00:00'), log('daily-fingers', '2026-08-01T08:30:00')],
      }),
    )[3];
    expect(heavy.lines.join(' ')).not.toMatch(/4E|Baseline|Daily/i);
  });
});

describe('empty and degenerate states', () => {
  it('names an uncovered slot rather than reporting the lane as empty', () => {
    // The rotation tiers declare their slots as constants, so an empty catalog
    // does not empty the lane — it makes every slot uncovered, and saying which
    // tendon has no movement is worth more than saying the tier has none.
    const lanes = lanesToday(input({ exercises: [], routines: [] }));
    expect(lanes[1].lines[0]).toMatch(/no movement declared/i);
    expect(lanes[2].lines[0]).toMatch(/no movement declared/i);
    // Still a live control on both, so the surface that would fix it is reachable.
    expect(lanes[1].action.kind).toBe('open-tier');
    expect(lanes[2].action.kind).toBe('open-tier');
  });

  it('states an empty routine list on the lanes that need one', () => {
    const lanes = lanesToday(input({ exercises: [], routines: [] }));
    expect(lanes[3].lines[0]).toMatch(/no rotating routine/i);
    expect(lanes[0].action.kind).toBe('empty');
    expect(lanes[3].action.kind).toBe('empty');
  });

  it('an in-progress session never advances the heavy rotation', () => {
    const live = lanesToday(input({ logs: [log('day-1-fingerboard', null, '2026-08-01T08:00:00')] }))[3];
    const empty = lanesToday(input())[3];
    expect(live.lines).toEqual(empty.lines);
  });
});

describe('purity (AC13)', () => {
  it('returns an identical result for identical arguments', () => {
    const state = input({ logs: [log('day-1-fingerboard', '2026-07-29T09:00:00')] });
    expect(lanesToday(state)).toEqual(lanesToday(state));
  });

  it('reads the day it is given, not the clock', () => {
    const logs = [log('day-1-fingerboard', '2026-07-29T09:00:00')];
    const near = lanesToday(input({ logs, today: new Date('2026-07-30T09:00:00') }));
    const far = lanesToday(input({ logs, today: new Date('2026-09-30T09:00:00') }));
    expect(near[3].lines).not.toEqual(far[3].lines);
  });
});
