import { describe, expect, it } from 'vitest';
import type { BodyweightEntry } from '../types';
import {
  MAX_STALENESS_DAYS,
  bodyweightFor,
  describeAge,
  latestBodyweight,
  parseBodyweight,
  pctOfBodyweight,
} from './bodyweight';

const bw = (date: string, lb: number): BodyweightEntry => ({ date, lb });

// Local wall-clock instants, so the tests read the same calendar day the app does.
const at = (local: string) => new Date(local).toISOString();

describe('bodyweightFor (AC4)', () => {
  const entries = [bw('2026-07-01', 180), bw('2026-07-15', 178), bw('2026-07-20', 176)];

  it('takes the most recent reading on or before the session', () => {
    expect(bodyweightFor(entries, at('2026-07-18T18:00'))?.lb).toBe(178);
  });

  it('includes a reading taken the same day', () => {
    expect(bodyweightFor(entries, at('2026-07-20T18:00'))?.lb).toBe(176);
  });

  it('ignores a reading taken after the session, however close', () => {
    // Sunday's weigh-in must not rewrite Friday's logged percentage.
    expect(bodyweightFor([bw('2026-07-21', 176)], at('2026-07-20T18:00'))).toBeNull();
  });

  it('does not care what order the entries arrive in', () => {
    const shuffled = [entries[2], entries[0], entries[1]];
    expect(bodyweightFor(shuffled, at('2026-07-18T18:00'))?.lb).toBe(178);
  });

  it('accepts a reading exactly at the staleness limit and refuses one past it', () => {
    const old = [bw('2026-07-01', 180)];
    const limit = at('2026-07-15T18:00'); // 14 days later
    expect(bodyweightFor(old, limit)?.lb).toBe(180);
    expect(MAX_STALENESS_DAYS).toBe(14);
    expect(bodyweightFor(old, at('2026-07-16T18:00'))).toBeNull();
  });

  it('returns null when nothing has been recorded', () => {
    expect(bodyweightFor([], at('2026-07-20T18:00'))).toBeNull();
  });
});

describe('pctOfBodyweight (AC5)', () => {
  const entries = [bw('2026-07-15', 176)];

  it('divides added load by the applicable bodyweight, to one decimal', () => {
    // 35 / 176 = 19.886…%
    expect(pctOfBodyweight(35, entries, at('2026-07-16T18:00'))).toBe(19.9);
  });

  it('reads bodyweight-only as 0%', () => {
    expect(pctOfBodyweight(0, entries, at('2026-07-16T18:00'))).toBe(0);
  });

  it('returns null rather than a number when no reading applies', () => {
    // The refusal is the feature: an invented denominator is a wrong number that
    // looks right, and §4E's percentage is the block's headline figure.
    expect(pctOfBodyweight(35, [], at('2026-07-16T18:00'))).toBeNull();
    expect(pctOfBodyweight(35, entries, at('2026-08-30T18:00'))).toBeNull();
  });

  it('refuses to divide by a nonsense stored value', () => {
    expect(pctOfBodyweight(35, [bw('2026-07-15', 0)], at('2026-07-16T18:00'))).toBeNull();
  });
});

describe('latestBodyweight', () => {
  it('takes the newest by date, not by array position', () => {
    expect(latestBodyweight([bw('2026-07-20', 176), bw('2026-07-01', 180)])?.lb).toBe(176);
  });

  it('is null when empty', () => {
    expect(latestBodyweight([])).toBeNull();
  });
});

describe('parseBodyweight', () => {
  it('accepts a plain number and a decimal, rounded to one place', () => {
    expect(parseBodyweight('176')).toBe(176);
    expect(parseBodyweight(' 175.5 ')).toBe(175.5);
    expect(parseBodyweight('175.55')).toBe(175.6);
  });

  it('refuses blank, non-numeric, zero and negative values', () => {
    // This value is a divisor; a plausible-but-wrong one is worse than none.
    expect(parseBodyweight('')).toBeNull();
    expect(parseBodyweight('   ')).toBeNull();
    expect(parseBodyweight('heavy')).toBeNull();
    expect(parseBodyweight('0')).toBeNull();
    expect(parseBodyweight('-176')).toBeNull();
  });

  it('refuses an obvious extra digit', () => {
    expect(parseBodyweight('1755')).toBeNull();
  });
});

describe('describeAge', () => {
  it('words the age like rotation and lastTime do', () => {
    expect(describeAge(0)).toBe('today');
    expect(describeAge(1)).toBe('yesterday');
    expect(describeAge(9)).toBe('9 days ago');
  });
});

describe('local-day matching, not UTC-slice matching', () => {
  // Found in verification: `at()` here produces a UTC instant, and reading its
  // day by slicing the string gives the *UTC* date. West of UTC an 18:00 session
  // is already tomorrow in UTC, so a weigh-in taken the next morning would have
  // attached to it — a later measurement silently rewriting an earlier record.
  it('attributes an evening session to its local day', () => {
    const evening = at('2026-07-20T18:00');
    expect(bodyweightFor([bw('2026-07-21', 176)], evening)).toBeNull();
    expect(bodyweightFor([bw('2026-07-20', 176)], evening)?.lb).toBe(176);
  });

  it('measures staleness in local days too', () => {
    // Exactly 14 local days apart, whatever the offset does to the UTC strings.
    expect(bodyweightFor([bw('2026-07-01', 180)], at('2026-07-15T18:00'))?.lb).toBe(180);
  });
});
