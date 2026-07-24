import { describe, expect, it } from 'vitest';
import type { Check, CheckKind } from '../types';
import {
  dailyGtgStatus,
  last7DayGtgCounts,
  summarizePastWeeks,
  weekClimbingStatus,
  weekEndKey,
} from './checks';

let n = 0;
function mk(kind: CheckKind, date: string): Check {
  return { id: `c${n++}`, kind, date, notes: '' };
}

// Reference day: Thu 2026-07-23 → week Mon 2026-07-20 .. Sun 2026-07-26.
const TODAY = '2026-07-23';

describe('weekClimbingStatus (AC1, AC3, two-day edge)', () => {
  it('is not complete with neither day', () => {
    expect(weekClimbingStatus([])).toEqual({ volume: false, limit: false, complete: false });
  });
  it('is not complete with only a volume day', () => {
    expect(weekClimbingStatus([mk('climbing-volume', TODAY)])).toMatchObject({
      volume: true,
      limit: false,
      complete: false,
    });
  });
  it('is complete with both, and two volume days still read as done once', () => {
    const checks = [
      mk('climbing-volume', '2026-07-20'),
      mk('climbing-volume', '2026-07-22'),
      mk('climbing-limit', '2026-07-24'),
    ];
    expect(weekClimbingStatus(checks)).toEqual({ volume: true, limit: true, complete: true });
  });
});

describe('dailyGtgStatus (AC5)', () => {
  it('reflects which GtG kinds are present today', () => {
    expect(dailyGtgStatus([mk('gtg-general', TODAY)])).toEqual({ general: true, pull: false });
  });
});

describe('last7DayGtgCounts (AC6)', () => {
  it('counts distinct days per kind within the last 7', () => {
    const checks = [
      mk('gtg-general', '2026-07-23'),
      mk('gtg-general', '2026-07-23'), // same day → counts once
      mk('gtg-general', '2026-07-21'),
      mk('gtg-pull', '2026-07-22'),
      mk('gtg-general', '2026-07-10'), // outside the 7-day window
    ];
    expect(last7DayGtgCounts(checks, TODAY)).toEqual({ general: 2, pull: 1 });
  });
});

describe('summarizePastWeeks (AC7, empty-week edge)', () => {
  it('includes zero-check weeks in the range and orders newest-first', () => {
    // checks two weeks apart: 2026-07-06 week and the current 2026-07-20 week
    const checks = [
      mk('climbing-volume', '2026-07-06'),
      mk('gtg-general', '2026-07-07'),
      mk('gtg-general', '2026-07-08'),
      mk('climbing-limit', '2026-07-22'),
    ];
    const weeks = summarizePastWeeks(checks, TODAY);
    expect(weeks.map((w) => w.weekStartKey)).toEqual(['2026-07-20', '2026-07-13', '2026-07-06']);
    // middle week has no checks but is present (explicit empty)
    expect(weeks[1]).toEqual({
      weekStartKey: '2026-07-13',
      volume: false,
      limit: false,
      gtgGeneralDays: 0,
      gtgPullDays: 0,
    });
    // earliest week: volume done, 2 distinct GtG-general days
    expect(weeks[2]).toMatchObject({ volume: true, gtgGeneralDays: 2 });
    // current week: limit done
    expect(weeks[0]).toMatchObject({ limit: true, volume: false });
  });

  it('always includes the current week even with no checks', () => {
    expect(summarizePastWeeks([], TODAY)).toEqual([
      { weekStartKey: '2026-07-20', volume: false, limit: false, gtgGeneralDays: 0, gtgPullDays: 0 },
    ]);
  });
});

describe('weekEndKey', () => {
  it('returns the Sunday six days after the Monday', () => {
    expect(weekEndKey('2026-07-20')).toBe('2026-07-26');
  });
});
