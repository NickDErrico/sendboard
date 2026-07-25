import { describe, expect, it } from 'vitest';
import type { LoggedExercise, SetEntry, WorkoutLog } from '../types';
import {
  describeWhen,
  formatSet,
  lastPerformance,
  lastPerformanceMap,
  seedForNextSet,
  summarizeSets,
} from './lastTime';

const TODAY = '2026-07-24';
const set = (load: string, reps: string, rpe: number | null = null): SetEntry => ({ load, reps, rpe });
const HANG = set('20mm +10kg', '7s', 8);

function entry(exerciseId: string, sets: SetEntry[], extra: Partial<LoggedExercise> = {}) {
  return { exerciseId, sets, notes: '', ...extra };
}

// Local wall-clock times, so the tests read the same calendar day the app does.
function log(
  id: string,
  completedLocal: string | null,
  entries: LoggedExercise[],
  routineId = 'day-1-fingerboard',
): WorkoutLog {
  const startedAt = new Date(completedLocal ?? '2026-07-24T09:00').toISOString();
  return {
    id,
    routineId,
    startedAt,
    completedAt: completedLocal === null ? null : new Date(completedLocal).toISOString(),
    entries,
    sessionNotes: '',
  };
}

describe('lastPerformance lookup (AC1)', () => {
  it('finds the most recent completed performance and how long ago it was', () => {
    const logs = [
      log('old', '2026-07-14T18:00', [entry('max-hang-half-crimp', [set('20mm +5kg', '7s')])]),
      log('recent', '2026-07-21T18:00', [entry('max-hang-half-crimp', [HANG])]),
    ];
    const found = lastPerformance(logs, 'max-hang-half-crimp', TODAY);
    expect(found?.logId).toBe('recent');
    expect(found?.daysAgo).toBe(3);
    expect(found?.sets).toEqual([HANG]);
  });

  it('returns null when the exercise has never been logged (AC6)', () => {
    const logs = [log('a', '2026-07-21T18:00', [entry('max-hang-half-crimp', [HANG])])];
    expect(lastPerformance(logs, 'kb-turkish-getup', TODAY)).toBeNull();
    expect(lastPerformance([], 'max-hang-half-crimp', TODAY)).toBeNull();
  });

  it('excludes the current in-progress log, so an exercise cannot cite itself', () => {
    const logs = [
      log('current', null, [entry('max-hang-half-crimp', [set('20mm +15kg', '7s')])]),
      log('previous', '2026-07-21T18:00', [entry('max-hang-half-crimp', [HANG])]),
    ];
    expect(lastPerformance(logs, 'max-hang-half-crimp', TODAY, 'current')?.logId).toBe('previous');
  });

  it('ignores abandoned sessions even when they are not the current one', () => {
    const logs = [
      log('abandoned', null, [entry('max-hang-half-crimp', [set('20mm +99kg', '7s')])]),
      log('previous', '2026-07-21T18:00', [entry('max-hang-half-crimp', [HANG])]),
    ];
    expect(lastPerformance(logs, 'max-hang-half-crimp', TODAY)?.logId).toBe('previous');
  });

  it('crosses routines — the most recent log containing the exercise wins', () => {
    const logs = [
      log('day1', '2026-07-20T18:00', [entry('pushups-or-dips', [set('', '15')])]),
      log('day3', '2026-07-22T18:00', [entry('pushups-or-dips', [set('', '12')])], 'day-3-pull-antagonist'),
    ];
    expect(lastPerformance(logs, 'pushups-or-dips', TODAY)?.logId).toBe('day3');
  });

  it('skips a completed-but-set-less entry and keeps looking back', () => {
    const logs = [
      log('marked-only', '2026-07-22T18:00', [entry('oi-wall-press', [], { completed: true })]),
      log('with-sets', '2026-07-18T18:00', [entry('oi-wall-press', [set('', '5s')])]),
    ];
    const found = lastPerformance(logs, 'oi-wall-press', TODAY);
    expect(found?.logId).toBe('with-sets');
    expect(found?.daysAgo).toBe(6);
  });

  it('orders by when work finished, not when it started', () => {
    const lateNight = log('late', '2026-07-22T00:30', [entry('e', [set('B', '1')])]);
    lateNight.startedAt = new Date('2026-07-21T23:30').toISOString();
    const logs = [lateNight, log('earlier', '2026-07-21T20:00', [entry('e', [set('A', '1')])])];
    expect(lastPerformance(logs, 'e', TODAY)?.logId).toBe('late');
  });

  it('builds a map for a whole routine in one pass, omitting exercises never done', () => {
    const logs = [
      log('a', '2026-07-21T18:00', [
        entry('max-hang-half-crimp', [HANG]),
        entry('max-hang-open-hand', [set('20mm +5kg', '8s')]),
      ]),
    ];
    const map = lastPerformanceMap(logs, ['max-hang-half-crimp', 'max-hang-open-hand', 'new'], TODAY);
    expect([...map.keys()]).toEqual(['max-hang-half-crimp', 'max-hang-open-hand']);
    expect(map.get('max-hang-half-crimp')?.sets).toEqual([HANG]);
  });
});

describe('set formatting (AC2)', () => {
  it('renders load, reps, and RPE when present', () => {
    expect(formatSet(HANG)).toBe('20mm +10kg × 7s @8');
    expect(formatSet(set('20mm +10kg', '7s'))).toBe('20mm +10kg × 7s');
  });

  it('degrades gracefully when fields are blank', () => {
    expect(formatSet(set('', '15'))).toBe('15');
    expect(formatSet(set('35lb', ''))).toBe('35lb');
    expect(formatSet(set('', '', 7))).toBe('@7');
    expect(formatSet(set('', ''))).toBe('—');
    expect(formatSet(set('  ', '  '))).toBe('—');
  });

  it('collapses consecutive identical sets — the five-identical-hangs case', () => {
    expect(summarizeSets([HANG, HANG, HANG, HANG, HANG])).toBe('20mm +10kg × 7s @8 ×5');
  });

  it('keeps distinct runs separate and in order', () => {
    expect(summarizeSets([set('a', '1'), set('a', '1'), set('b', '2')])).toBe('a × 1 ×2 · b × 2');
  });

  it('caps a varied list rather than wrapping the card', () => {
    const varied = [set('a', '1'), set('b', '2'), set('c', '3'), set('d', '4'), set('e', '5')];
    expect(summarizeSets(varied)).toBe('a × 1 · b × 2 · c × 3 +2 more');
  });

  it('counts collapsed sets correctly in the overflow tail', () => {
    const sets = [set('a', '1'), set('b', '2'), set('c', '3'), set('d', '4'), set('d', '4')];
    expect(summarizeSets(sets)).toBe('a × 1 · b × 2 · c × 3 +2 more');
  });

  it('renders nothing for an empty list', () => {
    expect(summarizeSets([])).toBe('');
  });

  it('renders a measured set from its numbers, not its free text (T12/D21)', () => {
    const measured = { load: '', reps: '', rpe: 8, edgeMm: 20, addedLb: 35, holdSec: 7.4 };
    expect(formatSet(measured)).toBe('20mm · +35lb · 7.4s @8');
  });

  it('omits measurements that were left blank', () => {
    expect(formatSet({ load: '', reps: '', rpe: null, edgeMm: 18 })).toBe('18mm');
    expect(formatSet({ load: '', reps: '', rpe: null, addedLb: 35, holdSec: 9 })).toBe('+35lb · 9.0s');
  });

  it('reads zero added load as bodyweight', () => {
    expect(formatSet({ load: '', reps: '', rpe: null, addedLb: 0, holdSec: 8 })).toBe('BW · 8.0s');
  });

  it('still renders pre-T12 free-text sets unchanged', () => {
    expect(formatSet(HANG)).toBe('20mm +10kg × 7s @8');
  });

  it('collapses identical measured sets the same way', () => {
    const m = { load: '', reps: '', rpe: null, edgeMm: 20, addedLb: 35 };
    expect(summarizeSets([m, m, m])).toBe('20mm · +35lb ×3');
  });
});

describe('describeWhen', () => {
  it('words the interval like rotation does', () => {
    expect(describeWhen(0)).toBe('today');
    expect(describeWhen(1)).toBe('yesterday');
    expect(describeWhen(5)).toBe('5 days ago');
    expect(describeWhen(-1)).toBe('today');
  });
});

describe('seedForNextSet (AC3, AC4, AC7)', () => {
  const last = {
    logId: 'l',
    performedAt: '2026-07-21T18:00:00.000Z',
    daysAgo: 3,
    sets: [set('20mm +10kg', '7s', 8), set('20mm +10kg', '7s', 9)],
  };

  it('carries the previous set in this session forward first (AC3)', () => {
    const current = [set('20mm +12kg', '7s', 7)];
    expect(seedForNextSet(current, last)).toEqual({ load: '20mm +12kg', reps: '7s', rpe: null });
  });

  it('falls back to the matching set from last time when this session is empty (AC4)', () => {
    expect(seedForNextSet([], last)).toEqual({ load: '20mm +10kg', reps: '7s', rpe: null });
  });

  it('returns a blank row when there is no history at all (AC6)', () => {
    expect(seedForNextSet([], null)).toEqual({ load: '', reps: '', rpe: null });
  });

  it('never carries RPE forward — it is a fresh judgment about a set not yet done', () => {
    expect(seedForNextSet([set('a', 'b', 10)], last).rpe).toBeNull();
    expect(seedForNextSet([], last).rpe).toBeNull();
  });

  it('carries the setup measurements but never the measured hold (T12 AC4)', () => {
    const measured = { load: '', reps: '', rpe: 8, edgeMm: 20, addedLb: 35, holdSec: 7.4 };
    const seeded = seedForNextSet([measured], null);
    expect(seeded.edgeMm).toBe(20);
    expect(seeded.addedLb).toBe(35);
    expect(seeded.holdSec).toBeUndefined();
    expect(seeded.rpe).toBeNull();
  });

  it('carries measurements across sessions when this session is empty', () => {
    const priorMeasured = { ...last, sets: [{ load: '', reps: '', rpe: null, edgeMm: 18, addedLb: 0 }] };
    expect(seedForNextSet([], priorMeasured)).toMatchObject({ edgeMm: 18, addedLb: 0 });
  });

  it('omits a measurement absent from the source rather than writing undefined', () => {
    const seeded = seedForNextSet([{ load: '', reps: '', rpe: null, edgeMm: 20 }], null);
    expect(seeded.edgeMm).toBe(20);
    expect('addedLb' in seeded).toBe(false);
  });

  it('falls back to the first prior set when last time had fewer sets', () => {
    const short = { ...last, sets: [set('20mm +10kg', '7s')] };
    expect(seedForNextSet([], short).load).toBe('20mm +10kg');
  });

  it('produces a blank row from blank history rather than "undefined"', () => {
    const blank = { ...last, sets: [set('', '')] };
    expect(seedForNextSet([], blank)).toEqual({ load: '', reps: '', rpe: null });
  });
});

// ─── Set-end reason in summaries (T14 AC5, AC7) ──────────────────────────────

describe('formatSet with an end reason', () => {
  it('appends a safety signal after the numbers and the rating', () => {
    expect(formatSet({ ...HANG, endReason: 'pain' })).toBe('20mm +10kg × 7s @8 · pain');
    expect(formatSet({ ...HANG, endReason: 'form-broke' })).toBe('20mm +10kg × 7s @8 · form');
  });

  it('omits target and dropped — holdSec against the range already says which', () => {
    expect(formatSet({ ...HANG, endReason: 'target' })).toBe('20mm +10kg × 7s @8');
    expect(formatSet({ ...HANG, endReason: 'dropped' })).toBe('20mm +10kg × 7s @8');
  });

  it('reports a reason on a set with no numbers at all', () => {
    // A PIMA pull logs nothing numeric (D20), so the reason is the whole record.
    expect(formatSet({ load: '', reps: '', rpe: null, endReason: 'pain' })).toBe('pain');
    expect(formatSet({ load: '', reps: '', rpe: null, endReason: 'target' })).toBe('—');
  });

  it('reads a measured set with a reason', () => {
    expect(formatSet({ load: '', reps: '', rpe: null, edgeMm: 18, holdSec: 6, endReason: 'pain' }))
      .toBe('18mm · 6.0s · pain');
  });

  it('keeps two otherwise identical sets distinct in a summary', () => {
    // One hang stopped on pain and one did not are different training facts, so
    // summarizeSets must not collapse them into "×2".
    const clean = { load: '20mm', reps: '7s', rpe: null };
    const hurt = { ...clean, endReason: 'pain' as const };
    expect(summarizeSets([clean, hurt])).toBe('20mm × 7s · 20mm × 7s · pain');
  });
});

describe('seedForNextSet never carries a reason (AC5, D19/D27)', () => {
  it('drops it from the previous set in this session', () => {
    const previous: SetEntry = { load: '20mm', reps: '7s', rpe: 9, endReason: 'pain' };
    expect(seedForNextSet([previous], null).endReason).toBeUndefined();
  });

  it('drops it from the last session too', () => {
    const logs = [log('a', '2026-07-21T18:00', [entry('max-hang-half-crimp', [
      { load: '20mm', reps: '7s', rpe: 8, endReason: 'target' },
    ])])];
    const last = lastPerformance(logs, 'max-hang-half-crimp', TODAY);
    const seed = seedForNextSet([], last);
    expect(seed.endReason).toBeUndefined();
    // The setup it *does* carry is unaffected.
    expect(seed.load).toBe('20mm');
  });
});
