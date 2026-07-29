import { describe, expect, it } from 'vitest';
import type { WorkoutLog } from '../types';
import { ROUTINES } from '../data/routines';
import {
  DAILY_ROUTINE_ID,
  DAILY_ROUTINE_IDS,
  RUNS_PER_DAY,
  SPACING_HOURS,
  dailyStatus,
  describeRunsToday,
  describeSpacing,
  formatSince,
} from './daily';
import { rotates } from './rotation';

// Local-time ISO strings throughout, so the tests read the same calendar day the
// app does (rotation.test.ts's convention).
function log(routineId: string, startedAt: string, completedAt: string | null): WorkoutLog {
  return {
    id: `${routineId}-${startedAt}`,
    routineId,
    startedAt,
    completedAt,
    entries: [],
    sessionNotes: '',
  };
}
const at = (local: string) => new Date(local).toISOString();
const now = (local: string) => new Date(local);

describe('the daily routine as seeded (T34, §10D)', () => {
  const daily = ROUTINES.find((r) => r.id === DAILY_ROUTINE_ID);

  it('exists and holds §4A’s warm-up followed by §10A’s abrahangs, in that order', () => {
    expect(daily?.exerciseIds).toEqual(['finger-warmup-progression', 'abrahangs-no-hang']);
  });

  it('does not rotate — running it never changes which training routine is up next', () => {
    expect(daily && rotates(daily)).toBe(false);
  });

  // The whole basis for counting a Day 1 as one of the day's two runs. If an
  // edit ever removes either entry from Day 1, this fails here rather than
  // silently crediting a session that did not run them.
  it('counts a routine as a run only where that routine actually contains both entries', () => {
    for (const id of DAILY_ROUTINE_IDS) {
      const routine = ROUTINES.find((r) => r.id === id);
      expect(routine, id).toBeDefined();
      for (const exerciseId of daily?.exerciseIds ?? []) {
        expect(routine?.exerciseIds, `${id} → ${exerciseId}`).toContain(exerciseId);
      }
    }
  });

  it('does not count Day 3, which contains neither entry', () => {
    expect(DAILY_ROUTINE_IDS).not.toContain('day-3-pull-antagonist');
  });

  it('quotes §10D’s two numbers and invents neither', () => {
    expect(RUNS_PER_DAY).toBe(2);
    expect(SPACING_HOURS).toBe(6);
  });
});

describe('dailyStatus (AC1, AC2)', () => {
  it('reads as never run on an empty log, with the spacing clear', () => {
    const status = dailyStatus([], now('2026-07-29T09:00'));
    expect(status).toEqual({
      runsToday: 0,
      lastAt: null,
      msSinceLast: null,
      clearsAt: null,
      spacingClear: true,
    });
  });

  it('counts today’s completed runs', () => {
    const logs = [
      log(DAILY_ROUTINE_ID, at('2026-07-29T07:00'), at('2026-07-29T07:12')),
      log(DAILY_ROUTINE_ID, at('2026-07-29T19:00'), at('2026-07-29T19:11')),
    ];
    expect(dailyStatus(logs, now('2026-07-29T21:00')).runsToday).toBe(2);
  });

  it('counts a completed Day 1 as one of the day’s runs (§10D)', () => {
    const logs = [log('day-1-fingerboard', at('2026-07-29T17:00'), at('2026-07-29T18:30'))];
    const status = dailyStatus(logs, now('2026-07-29T19:00'));
    expect(status.runsToday).toBe(1);
    expect(status.lastAt).toBe(at('2026-07-29T18:30'));
  });

  it('does not count a Day 3, which runs neither entry', () => {
    const logs = [log('day-3-pull-antagonist', at('2026-07-29T17:00'), at('2026-07-29T18:00'))];
    expect(dailyStatus(logs, now('2026-07-29T19:00')).runsToday).toBe(0);
  });

  it('ignores an in-progress session, as every other count does', () => {
    const logs = [log(DAILY_ROUTINE_ID, at('2026-07-29T07:00'), null)];
    const status = dailyStatus(logs, now('2026-07-29T09:00'));
    expect(status.runsToday).toBe(0);
    expect(status.lastAt).toBeNull();
  });

  it('does not count yesterday’s run as today’s', () => {
    const logs = [log(DAILY_ROUTINE_ID, at('2026-07-28T22:00'), at('2026-07-28T22:12'))];
    const status = dailyStatus(logs, now('2026-07-29T07:00'));
    expect(status.runsToday).toBe(0);
    // …but it is still the last run, which is what the spacing is measured from.
    expect(status.lastAt).toBe(at('2026-07-28T22:12'));
  });

  it('takes the latest completion as the last run, whatever order the logs arrive in', () => {
    const logs = [
      log(DAILY_ROUTINE_ID, at('2026-07-29T19:00'), at('2026-07-29T19:11')),
      log('day-1-fingerboard', at('2026-07-29T07:00'), at('2026-07-29T08:30')),
    ];
    expect(dailyStatus(logs, now('2026-07-29T20:00')).lastAt).toBe(at('2026-07-29T19:11'));
  });
});

describe('the six-hour spacing (AC3)', () => {
  const morning = [log(DAILY_ROUTINE_ID, at('2026-07-29T07:00'), at('2026-07-29T07:12'))];

  it('is not clear inside six hours, and names when it will be', () => {
    const status = dailyStatus(morning, now('2026-07-29T11:00'));
    expect(status.spacingClear).toBe(false);
    expect(status.clearsAt?.getTime()).toBe(new Date('2026-07-29T13:12').getTime());
  });

  it('is clear at exactly six hours', () => {
    expect(dailyStatus(morning, now('2026-07-29T13:12')).spacingClear).toBe(true);
  });

  it('is clear well after', () => {
    expect(dailyStatus(morning, now('2026-07-29T19:00')).spacingClear).toBe(true);
  });

  // Edge: a clock change or an imported backup can leave a completion in the
  // future. It reads as "just now" rather than a negative interval.
  it('clamps a future-dated completion to zero elapsed', () => {
    const logs = [log(DAILY_ROUTINE_ID, at('2026-07-30T07:00'), at('2026-07-30T07:12'))];
    const status = dailyStatus(logs, now('2026-07-29T19:00'));
    expect(status.msSinceLast).toBe(0);
    expect(status.spacingClear).toBe(false);
  });
});

describe('wording (D23)', () => {
  it('reports the count, and says nothing about what is left', () => {
    expect(describeRunsToday(dailyStatus([], now('2026-07-29T09:00')))).toBe('Not run today');
    const one = [log(DAILY_ROUTINE_ID, at('2026-07-29T07:00'), at('2026-07-29T07:12'))];
    expect(describeRunsToday(dailyStatus(one, now('2026-07-29T09:00')))).toBe('1 run today');
    const two = [...one, log('day-1-fingerboard', at('2026-07-29T17:00'), at('2026-07-29T18:00'))];
    expect(describeRunsToday(dailyStatus(two, now('2026-07-29T19:00')))).toBe('2 runs today');
  });

  it('states §10D’s interval before anything has been run', () => {
    expect(describeSpacing(dailyStatus([], now('2026-07-29T09:00')))).toBe('6h apart · §10D');
  });

  it('names the clock time the spacing clears, and afterwards how long it has been', () => {
    const morning = [log(DAILY_ROUTINE_ID, at('2026-07-29T07:00'), at('2026-07-29T07:12'))];
    expect(describeSpacing(dailyStatus(morning, now('2026-07-29T11:00')))).toMatch(
      /^6h spacing clears /,
    );
    expect(describeSpacing(dailyStatus(morning, now('2026-07-29T19:12')))).toBe(
      '12h since the last run',
    );
  });

  it('never uses a scheduling or scoring word', () => {
    const cases = [
      dailyStatus([], now('2026-07-29T09:00')),
      dailyStatus([log(DAILY_ROUTINE_ID, at('2026-07-29T07:00'), at('2026-07-29T07:12'))], now('2026-07-29T11:00')),
      dailyStatus([log(DAILY_ROUTINE_ID, at('2026-07-27T07:00'), at('2026-07-27T07:12'))], now('2026-07-29T11:00')),
    ];
    const forbidden = /\b(due|owed|overdue|missed|behind|late|streak|of 2|remaining|left)\b/i;
    for (const status of cases) {
      expect(describeRunsToday(status)).not.toMatch(forbidden);
      expect(describeSpacing(status)).not.toMatch(forbidden);
    }
  });
});

describe('formatSince', () => {
  it('reads minutes under an hour', () => {
    expect(formatSince(18 * 60_000)).toBe('18m');
    expect(formatSince(0)).toBe('0m');
  });

  it('reads hours and minutes under a day', () => {
    expect(formatSince(4 * 3_600_000 + 10 * 60_000)).toBe('4h 10m');
    expect(formatSince(6 * 3_600_000)).toBe('6h');
  });

  it('reads whole days beyond that', () => {
    expect(formatSince(26 * 3_600_000)).toBe('1 day');
    expect(formatSince(72 * 3_600_000)).toBe('3 days');
  });
});
