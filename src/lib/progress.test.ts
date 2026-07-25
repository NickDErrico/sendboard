import { describe, expect, it } from 'vitest';
import type { LoggedExercise, SetEntry, WorkoutLog } from '../types';
import {
  METRIC_CONFIG,
  SERIES_CONFIG,
  buildSeries,
  isSegmentedBy,
  timeFraction,
  valueFraction,
} from './progress';

const EX = 'max-hang-half-crimp';

const set = (fields: Partial<SetEntry>): SetEntry => ({ load: '', reps: '', rpe: null, ...fields });

function log(id: string, completedLocal: string | null, sets: SetEntry[], exerciseId = EX): WorkoutLog {
  const entry: LoggedExercise = { exerciseId, sets, notes: '' };
  return {
    id,
    routineId: 'day-1-fingerboard',
    startedAt: new Date(completedLocal ?? '2026-06-01T18:00').toISOString(),
    completedAt: completedLocal === null ? null : new Date(completedLocal).toISOString(),
    entries: [entry],
    sessionNotes: '',
  };
}

const edges = (s: ReturnType<typeof buildSeries>) => s!.segments.map((seg) => seg.edgeMm);
const counts = (s: ReturnType<typeof buildSeries>) => s!.segments.map((seg) => seg.points.length);
const values = (s: ReturnType<typeof buildSeries>) =>
  s!.segments.flatMap((seg) => seg.points.map((p) => p.value));

describe('session aggregation (AC8)', () => {
  it('takes the best set — longest hold, heaviest load, smallest edge', () => {
    const sets = [
      set({ holdSec: 7.2, addedLb: 35, edgeMm: 20 }),
      set({ holdSec: 9.4, addedLb: 20, edgeMm: 18 }),
    ];
    expect(buildSeries([log('a', '2026-06-02T18:00', sets)], EX, 'holdSec', false)!.min).toBe(9.4);
    expect(buildSeries([log('a', '2026-06-02T18:00', sets)], EX, 'addedLb', false)!.min).toBe(35);
    expect(buildSeries([log('a', '2026-06-02T18:00', sets)], EX, 'edgeMm', false)!.min).toBe(18);
  });

  it('reports the edge of the best set, not the session minimum', () => {
    const sets = [set({ holdSec: 9.4, edgeMm: 20 }), set({ holdSec: 6.0, edgeMm: 18 })];
    const series = buildSeries([log('a', '2026-06-02T18:00', sets)], EX, 'holdSec', true)!;
    expect(series.segments[0].points[0]).toMatchObject({ value: 9.4, edgeMm: 20 });
  });

  it('ignores sets missing the charted metric without dropping the session', () => {
    const sets = [set({ addedLb: 35 }), set({ holdSec: 8.1, addedLb: 35 })];
    expect(buildSeries([log('a', '2026-06-02T18:00', sets)], EX, 'holdSec', false)!.pointCount).toBe(1);
  });

  it('returns null when nothing carries the metric', () => {
    const logs = [log('a', '2026-06-02T18:00', [set({ addedLb: 35 })])];
    expect(buildSeries(logs, EX, 'holdSec', false)).toBeNull();
    expect(buildSeries([], EX, 'holdSec', false)).toBeNull();
  });

  it('never reads a number out of the free-text fields (D21)', () => {
    const logs = [log('a', '2026-06-02T18:00', [set({ load: '20mm +35lb', reps: '8s' })])];
    expect(buildSeries(logs, EX, 'addedLb', false)).toBeNull();
    expect(buildSeries(logs, EX, 'holdSec', false)).toBeNull();
  });

  it('excludes in-progress sessions, matching rotation and carry-forward', () => {
    const logs = [
      log('done', '2026-06-02T18:00', [set({ holdSec: 7 })]),
      log('open', null, [set({ holdSec: 99 })]),
    ];
    expect(values(buildSeries(logs, EX, 'holdSec', false))).toEqual([7]);
  });

  it('ignores other exercises', () => {
    const logs = [log('a', '2026-06-02T18:00', [set({ holdSec: 7 })], 'weighted-lockoff-hold')];
    expect(buildSeries(logs, EX, 'holdSec', false)).toBeNull();
  });

  it('orders oldest first regardless of input order', () => {
    const logs = [
      log('c', '2026-06-20T18:00', [set({ holdSec: 9 })]),
      log('a', '2026-06-02T18:00', [set({ holdSec: 7 })]),
      log('b', '2026-06-10T18:00', [set({ holdSec: 8 })]),
    ];
    expect(values(buildSeries(logs, EX, 'holdSec', false))).toEqual([7, 8, 9]);
  });
});

describe('edge segmentation (AC11, AC12, D22)', () => {
  // The owner's progression: build time on an edge, drop to a smaller one,
  // rebuild. As one line this is a sawtooth; segmented, it is three builds.
  const progression = [
    log('s1', '2026-06-01T18:00', [set({ holdSec: 7.0, edgeMm: 20 })]),
    log('s2', '2026-06-04T18:00', [set({ holdSec: 8.2, edgeMm: 20 })]),
    log('s3', '2026-06-08T18:00', [set({ holdSec: 10.0, edgeMm: 20 })]),
    log('s4', '2026-06-12T18:00', [set({ holdSec: 6.2, edgeMm: 18 })]),
    log('s5', '2026-06-16T18:00', [set({ holdSec: 8.8, edgeMm: 18 })]),
    log('s6', '2026-06-20T18:00', [set({ holdSec: 6.5, edgeMm: 16 })]),
  ];

  it('cuts the series at every edge change', () => {
    const series = buildSeries(progression, EX, 'holdSec', true)!;
    expect(edges(series)).toEqual([20, 18, 16]);
    expect(counts(series)).toEqual([3, 2, 1]);
  });

  it('keeps a single-session segment as its own segment (AC12)', () => {
    const series = buildSeries(progression, EX, 'holdSec', true)!;
    expect(series.segments[2].points).toHaveLength(1);
    expect(series.segments[2].points[0].value).toBe(6.5);
  });

  it('treats a return to a previous edge as a new segment, never merging by value', () => {
    const logs = [
      log('a', '2026-06-01T18:00', [set({ holdSec: 8, edgeMm: 18 })]),
      log('b', '2026-06-05T18:00', [set({ holdSec: 6, edgeMm: 16 })]),
      log('c', '2026-06-09T18:00', [set({ holdSec: 9, edgeMm: 18 })]),
    ];
    expect(edges(buildSeries(logs, EX, 'holdSec', true))).toEqual([18, 16, 18]);
  });

  it('gives sessions with no edge their own run rather than absorbing them', () => {
    const logs = [
      log('a', '2026-06-01T18:00', [set({ holdSec: 8, edgeMm: 20 })]),
      log('b', '2026-06-05T18:00', [set({ holdSec: 8.5 })]),
      log('c', '2026-06-09T18:00', [set({ holdSec: 9, edgeMm: 20 })]),
    ];
    expect(edges(buildSeries(logs, EX, 'holdSec', true))).toEqual([20, null, 20]);
  });

  it('produces exactly one segment when the edge never changes', () => {
    const logs = [
      log('a', '2026-06-01T18:00', [set({ holdSec: 7, edgeMm: 20 })]),
      log('b', '2026-06-05T18:00', [set({ holdSec: 8, edgeMm: 20 })]),
    ];
    const series = buildSeries(logs, EX, 'holdSec', true)!;
    expect(series.segments).toHaveLength(1);
    expect(counts(series)).toEqual([2]);
  });

  it('does not segment when segmentation is off', () => {
    const series = buildSeries(progression, EX, 'holdSec', false)!;
    expect(series.segments).toHaveLength(1);
    expect(series.pointCount).toBe(6);
  });

  it('segments load but never edge itself', () => {
    expect(isSegmentedBy('holdSec', ['holdSec', 'addedLb', 'edgeMm'])).toBe(true);
    expect(isSegmentedBy('addedLb', ['holdSec', 'addedLb', 'edgeMm'])).toBe(true);
    expect(isSegmentedBy('edgeMm', ['holdSec', 'addedLb', 'edgeMm'])).toBe(false);
  });

  it('does not segment an exercise that declares no edge (the lock-off)', () => {
    expect(isSegmentedBy('holdSec', ['holdSec', 'addedLb'])).toBe(false);
    expect(isSegmentedBy('addedLb', ['holdSec', 'addedLb'])).toBe(false);
  });
});

describe('scales (AC7, AC10, flat-line edge case)', () => {
  const series = (metric: 'holdSec' | 'edgeMm', vals: number[]) =>
    buildSeries(
      vals.map((v, i) =>
        log(`s${i}`, `2026-06-0${i + 1}T18:00`, [set({ [metric]: v } as Partial<SetEntry>)]),
      ),
      EX,
      metric,
      false,
    )!;

  it('maps a higher value higher for a normal metric', () => {
    const s = series('holdSec', [6, 8, 10]);
    expect(valueFraction(6, s)).toBe(0);
    expect(valueFraction(10, s)).toBe(1);
    expect(valueFraction(8, s)).toBeCloseTo(0.5);
  });

  it('inverts the axis for edge size, so a smaller edge reads as progress', () => {
    const s = series('edgeMm', [20, 18, 16]);
    expect(valueFraction(20, s)).toBe(0);
    expect(valueFraction(16, s)).toBe(1);
  });

  it('centres a flat series rather than inventing a slope or dividing by zero', () => {
    const s = series('holdSec', [8, 8, 8]);
    expect(s.min).toBe(s.max);
    expect(valueFraction(8, s)).toBe(0.5);
    expect(Number.isFinite(valueFraction(8, s))).toBe(true);
  });

  it('spaces x by elapsed time, so a gap reads as a gap', () => {
    const start = '2026-06-01T00:00:00.000Z';
    const end = '2026-06-11T00:00:00.000Z';
    expect(timeFraction(start, start, end)).toBe(0);
    expect(timeFraction(end, start, end)).toBe(1);
    // Day 3 of 10 sits at 0.2, not at the 0.5 an evenly-spaced index would give.
    expect(timeFraction('2026-06-03T00:00:00.000Z', start, end)).toBeCloseTo(0.2);
  });

  it('collapses a zero-length span instead of dividing by zero', () => {
    const at = '2026-06-01T00:00:00.000Z';
    expect(timeFraction(at, at, at)).toBe(0);
  });
});

describe('metric formatting', () => {
  it('renders each unit, with zero added load as bodyweight', () => {
    expect(METRIC_CONFIG.holdSec.format(7.25)).toBe('7.3s');
    expect(METRIC_CONFIG.addedLb.format(35)).toBe('+35lb');
    expect(METRIC_CONFIG.addedLb.format(0)).toBe('BW');
    expect(METRIC_CONFIG.edgeMm.format(20)).toBe('20mm');
  });

  it('marks only edge size as lower-is-better', () => {
    expect(METRIC_CONFIG.edgeMm.lowerIsBetter).toBe(true);
    expect(METRIC_CONFIG.holdSec.lowerIsBetter).toBe(false);
    expect(METRIC_CONFIG.addedLb.lowerIsBetter).toBe(false);
  });
});

// ─── End reason on a charted point (T14 AC6) ─────────────────────────────────

describe('end reason travels with the point', () => {
  const point = (s: ReturnType<typeof buildSeries>) => s!.segments[0].points[0];

  it('carries the reason of the best set', () => {
    const sets = [set({ holdSec: 6, edgeMm: 18, endReason: 'pain' })];
    expect(point(buildSeries([log('a', '2026-06-02T18:00', sets)], EX, 'holdSec', true)).endReason)
      .toBe('pain');
  });

  it('reads an unrecorded reason as null, so pre-T14 sets still plot', () => {
    const sets = [set({ holdSec: 7.5, edgeMm: 20 })];
    expect(point(buildSeries([log('a', '2026-06-02T18:00', sets)], EX, 'holdSec', true)).endReason)
      .toBeNull();
  });

  it('does not exclude or downweight a set that ended on pain', () => {
    // §7 asks the owner to watch for a downward trend; dropping the low points
    // would erase the only thing that makes one visible. The point is marked in
    // the chart, never removed here.
    const sets = [set({ holdSec: 9, edgeMm: 18 }), set({ holdSec: 11, edgeMm: 18, endReason: 'pain' })];
    const series = buildSeries([log('a', '2026-06-02T18:00', sets)], EX, 'holdSec', true)!;
    expect(series.max).toBe(11);
    expect(point(series).endReason).toBe('pain');
  });

  it('takes the reason from the best set, not from another set in the session', () => {
    const sets = [set({ holdSec: 5, edgeMm: 18, endReason: 'pain' }), set({ holdSec: 9, edgeMm: 18 })];
    const series = buildSeries([log('a', '2026-06-02T18:00', sets)], EX, 'holdSec', true)!;
    expect(series.max).toBe(9);
    expect(point(series).endReason).toBeNull();
  });
});

// ─── % of bodyweight (T15 AC3, AC4, AC5) ─────────────────────────────────────

describe('addedPctBw series', () => {
  const bw = (date: string, lb: number) => ({ date, lb });
  const loadLog = (id: string, when: string, addedLb: number, edgeMm?: number) =>
    log(id, when, [set(edgeMm === undefined ? { addedLb } : { addedLb, edgeMm })]);

  it('divides each session by the bodyweight that applied to it', () => {
    const logs = [loadLog('a', '2026-07-16T18:00', 35), loadLog('b', '2026-07-23T18:00', 35)];
    // Same added load, lighter climber: a higher share of bodyweight.
    const series = buildSeries(logs, EX, 'addedPctBw', false, [
      bw('2026-07-15', 180),
      bw('2026-07-22', 170),
    ])!;
    expect(values(series)).toEqual([19.4, 20.6]);
    expect(series.kind).toBe('addedPctBw');
  });

  it('omits a session with no bodyweight in range, and counts what it dropped', () => {
    const logs = [
      loadLog('old', '2026-05-01T18:00', 35),
      loadLog('recent', '2026-07-16T18:00', 35),
    ];
    const series = buildSeries(logs, EX, 'addedPctBw', false, [bw('2026-07-15', 180)])!;
    expect(series.pointCount).toBe(1);
    expect(series.droppedForNoBodyweight).toBe(1);
  });

  it('is null when no session can be converted at all', () => {
    const logs = [loadLog('a', '2026-07-16T18:00', 35)];
    expect(buildSeries(logs, EX, 'addedPctBw', false, [])).toBeNull();
  });

  it('reports nothing dropped on a plain measurement series', () => {
    const series = buildSeries([loadLog('a', '2026-07-16T18:00', 35)], EX, 'addedLb', false)!;
    expect(series.droppedForNoBodyweight).toBe(0);
  });

  it('still breaks the series at every edge change (D22)', () => {
    const logs = [
      loadLog('a', '2026-07-16T18:00', 35, 20),
      loadLog('b', '2026-07-17T18:00', 35, 18),
    ];
    const series = buildSeries(logs, EX, 'addedPctBw', true, [bw('2026-07-15', 180)])!;
    expect(edges(series)).toEqual([20, 18]);
  });

  it('segments only the surviving points when a dropped session sat between them', () => {
    const logs = [
      loadLog('a', '2026-07-16T18:00', 35, 20),
      loadLog('gap', '2026-06-01T18:00', 35, 18),
      loadLog('c', '2026-07-17T18:00', 40, 20),
    ];
    const series = buildSeries(logs, EX, 'addedPctBw', true, [bw('2026-07-15', 180)])!;
    // The 18mm session is out of range and gone, so the two 20mm sessions are one
    // contiguous run — and getting there must not throw.
    expect(edges(series)).toEqual([20]);
    expect(counts(series)).toEqual([2]);
    expect(series.droppedForNoBodyweight).toBe(1);
  });

  it('is segmented by the same rule as the pounds it came from', () => {
    expect(isSegmentedBy('addedPctBw', ['holdSec', 'addedLb', 'edgeMm'])).toBe(true);
    expect(isSegmentedBy('addedPctBw', ['holdSec', 'addedLb'])).toBe(false);
  });

  it('formats as a percentage, with bodyweight-only reading BW', () => {
    expect(SERIES_CONFIG.addedPctBw.format(19.9)).toBe('+19.9%');
    expect(SERIES_CONFIG.addedPctBw.format(0)).toBe('BW');
  });
});
