import { describe, expect, it } from 'vitest';
import type { Routine, WorkoutLog } from '../types';
import { daysBetween, describeLastCompleted, routineRotation } from './rotation';

const ROUTINES: Routine[] = [
  { id: 'day-1-fingerboard', name: 'Day 1', dayOfWeek: null, exerciseIds: ['a'] },
  { id: 'day-3-pull-antagonist', name: 'Day 3', dayOfWeek: null, exerciseIds: ['b'] },
];

// Local-time ISO strings, so the tests read the same calendar day the app does.
function log(routineId: string, startedAt: string, completedAt: string | null): WorkoutLog {
  return { id: `${routineId}-${startedAt}`, routineId, startedAt, completedAt, entries: [], sessionNotes: '' };
}
const at = (local: string) => new Date(local).toISOString();

const nextUpOf = (statuses: ReturnType<typeof routineRotation>) =>
  statuses.find((s) => s.isNextUp)?.routineId;
const statusFor = (statuses: ReturnType<typeof routineRotation>, id: string) =>
  statuses.find((s) => s.routineId === id)!;

describe('routineRotation next-up ordering (AC1)', () => {
  it('picks the first routine in seed order when nothing has been logged', () => {
    const statuses = routineRotation(ROUTINES, [], '2026-07-24');
    expect(nextUpOf(statuses)).toBe('day-1-fingerboard');
    expect(statuses.filter((s) => s.isNextUp)).toHaveLength(1);
    expect(statusFor(statuses, 'day-1-fingerboard').lastCompletedAt).toBeNull();
    expect(statusFor(statuses, 'day-1-fingerboard').daysSince).toBeNull();
  });

  it('ranks a never-completed routine ahead of a recently completed one', () => {
    const logs = [log('day-1-fingerboard', at('2026-07-23T18:00'), at('2026-07-23T19:00'))];
    expect(nextUpOf(routineRotation(ROUTINES, logs, '2026-07-24'))).toBe('day-3-pull-antagonist');
  });

  it('picks the routine completed least recently', () => {
    const logs = [
      log('day-1-fingerboard', at('2026-07-20T18:00'), at('2026-07-20T19:00')),
      log('day-3-pull-antagonist', at('2026-07-23T18:00'), at('2026-07-23T19:00')),
    ];
    expect(nextUpOf(routineRotation(ROUTINES, logs, '2026-07-24'))).toBe('day-1-fingerboard');
  });

  it('alternates as sessions are completed', () => {
    const logs = [
      log('day-1-fingerboard', at('2026-07-20T18:00'), at('2026-07-20T19:00')),
      log('day-3-pull-antagonist', at('2026-07-22T18:00'), at('2026-07-22T19:00')),
      log('day-1-fingerboard', at('2026-07-24T18:00'), at('2026-07-24T19:00')),
    ];
    expect(nextUpOf(routineRotation(ROUTINES, logs, '2026-07-25'))).toBe('day-3-pull-antagonist');
  });

  it('uses only the MOST RECENT completion, not the first', () => {
    // day-3 has the older first session but the newer latest one, so day-1 is up.
    const logs = [
      log('day-3-pull-antagonist', at('2026-07-01T18:00'), at('2026-07-01T19:00')),
      log('day-1-fingerboard', at('2026-07-20T18:00'), at('2026-07-20T19:00')),
      log('day-3-pull-antagonist', at('2026-07-23T18:00'), at('2026-07-23T19:00')),
    ];
    expect(nextUpOf(routineRotation(ROUTINES, logs, '2026-07-24'))).toBe('day-1-fingerboard');
  });
});

describe('routineRotation edge cases', () => {
  it('ignores an in-progress log, so an abandoned session never advances the rotation', () => {
    const logs = [log('day-1-fingerboard', at('2026-07-24T18:00'), null)];
    const statuses = routineRotation(ROUTINES, logs, '2026-07-24');
    expect(nextUpOf(statuses)).toBe('day-1-fingerboard');
    expect(statusFor(statuses, 'day-1-fingerboard').lastCompletedAt).toBeNull();
  });

  it('still designates exactly one next-up when both were completed today', () => {
    const logs = [
      log('day-1-fingerboard', at('2026-07-24T08:00'), at('2026-07-24T09:00')),
      log('day-3-pull-antagonist', at('2026-07-24T17:00'), at('2026-07-24T18:00')),
    ];
    const statuses = routineRotation(ROUTINES, logs, '2026-07-24');
    expect(statuses.filter((s) => s.isNextUp)).toHaveLength(1);
    // The earlier completion is up next; neither is locked out.
    expect(nextUpOf(statuses)).toBe('day-1-fingerboard');
    expect(statuses.every((s) => s.daysSince === 0)).toBe(true);
  });

  it('ignores logs whose routineId is no longer in the catalog', () => {
    const logs = [
      log('deleted-routine', at('2026-07-24T08:00'), at('2026-07-24T09:00')),
      log('day-1-fingerboard', at('2026-07-20T18:00'), at('2026-07-20T19:00')),
    ];
    const statuses = routineRotation(ROUTINES, logs, '2026-07-24');
    expect(statuses).toHaveLength(2);
    expect(nextUpOf(statuses)).toBe('day-3-pull-antagonist');
  });

  it('returns statuses in seed order regardless of which is next up', () => {
    const logs = [log('day-1-fingerboard', at('2026-07-23T18:00'), at('2026-07-23T19:00'))];
    const statuses = routineRotation(ROUTINES, logs, '2026-07-24');
    expect(statuses.map((s) => s.routineId)).toEqual([
      'day-1-fingerboard',
      'day-3-pull-antagonist',
    ]);
  });
});

describe('doneThisWeek (AC3, D10 Monday-start week)', () => {
  it('counts a completion earlier in the same Monday week', () => {
    // 2026-07-20 is a Monday; 2026-07-24 is the Friday of that week.
    const logs = [log('day-1-fingerboard', at('2026-07-20T18:00'), at('2026-07-20T19:00'))];
    const statuses = routineRotation(ROUTINES, logs, '2026-07-24');
    expect(statusFor(statuses, 'day-1-fingerboard').doneThisWeek).toBe(true);
  });

  it('excludes the previous week — Sunday and Monday are different weeks', () => {
    // 2026-07-19 is the Sunday before that Monday.
    const logs = [log('day-1-fingerboard', at('2026-07-19T18:00'), at('2026-07-19T19:00'))];
    const sunday = routineRotation(ROUTINES, logs, '2026-07-19');
    const monday = routineRotation(ROUTINES, logs, '2026-07-20');
    expect(statusFor(sunday, 'day-1-fingerboard').doneThisWeek).toBe(true);
    expect(statusFor(monday, 'day-1-fingerboard').doneThisWeek).toBe(false);
  });
});

describe('daysBetween (D10: calendar days, not millisecond deltas)', () => {
  it('counts whole calendar days', () => {
    expect(daysBetween('2026-07-20', '2026-07-24')).toBe(4);
    expect(daysBetween('2026-07-24', '2026-07-24')).toBe(0);
  });

  it('counts one day across a late-night → early-morning boundary', () => {
    expect(daysBetween(at('2026-07-23T23:30'), at('2026-07-24T00:30'))).toBe(1);
  });

  it('is unaffected by the daylight-saving transition', () => {
    // US spring-forward 2026-03-08: that week is 167 wall-clock hours, not 168.
    expect(daysBetween('2026-03-06', '2026-03-10')).toBe(4);
  });
});

describe('describeLastCompleted', () => {
  const status = (daysSince: number | null) => ({
    routineId: 'r',
    lastCompletedAt: daysSince === null ? null : '2026-07-24T00:00:00.000Z',
    daysSince,
    doneThisWeek: false,
    isNextUp: false,
  });

  it('reads naturally and never implies lateness', () => {
    expect(describeLastCompleted(status(null))).toBe('Never done');
    expect(describeLastCompleted(status(0))).toBe('Done today');
    expect(describeLastCompleted(status(1))).toBe('Done yesterday');
    expect(describeLastCompleted(status(5))).toBe('Done 5 days ago');
  });
});
