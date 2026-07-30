import type { Check, CheckKind } from '../types';
import { dateKey, mondayOf } from './storage';

// Pure derivation of check status/summaries from raw Check records. Kept separate
// from the UI so the week/day/7-day/history aggregation is unit-testable without
// IndexedDB (the `npm run test -- checks` verify). All grouping uses the local
// calendar-date helpers from storage (D10), never UTC offsets.

export const CHECK_KIND_LABELS: Record<CheckKind, string> = {
  'climbing-volume': 'Climbing — Volume day',
  'climbing-limit': 'Climbing — Limit day',
  'gtg-general': 'GtG — General',
  'gtg-pull': 'GtG — Pull',
  joint: 'Joints & tendons',
  symptom: 'Stop signal',
};

export function keyToLocalDate(key: string): Date {
  const [y, m, d] = key.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function hasKind(checks: Check[], kind: CheckKind): boolean {
  return checks.some((c) => c.kind === kind);
}

export interface WeekClimbingStatus {
  volume: boolean;
  limit: boolean;
  complete: boolean;
}
// A second volume day still reads as done once (edge case) — booleans, not counts.
export function weekClimbingStatus(weekChecks: Check[]): WeekClimbingStatus {
  const volume = hasKind(weekChecks, 'climbing-volume');
  const limit = hasKind(weekChecks, 'climbing-limit');
  return { volume, limit, complete: volume && limit };
}

export interface DailyGtg {
  general: boolean;
  pull: boolean;
}
export function dailyGtgStatus(dayChecks: Check[]): DailyGtg {
  return {
    general: hasKind(dayChecks, 'gtg-general'),
    pull: hasKind(dayChecks, 'gtg-pull'),
  };
}

function lastNDateKeys(reference: string | Date, n: number): string[] {
  const base = keyToLocalDate(typeof reference === 'string' ? reference : dateKey(reference));
  const keys: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    keys.push(dateKey(d));
  }
  return keys;
}

// Count of distinct days in the last 7 (including today) each GtG kind was done.
export function last7DayGtgCounts(
  checks: Check[],
  today: string | Date,
): { general: number; pull: number } {
  const window = new Set(lastNDateKeys(today, 7));
  const countKind = (kind: CheckKind) =>
    new Set(
      checks
        .filter((c) => c.kind === kind && window.has(c.date.slice(0, 10)))
        .map((c) => c.date.slice(0, 10)),
    ).size;
  return { general: countKind('gtg-general'), pull: countKind('gtg-pull') };
}

export interface WeekSummary {
  weekStartKey: string; // Monday, yyyy-mm-dd
  volume: boolean;
  limit: boolean;
  gtgGeneralDays: number;
  gtgPullDays: number;
}

// Every Monday-week from the earliest check (or the current week) up to the
// current week, newest-first. Weeks with zero checks are included explicitly so
// "did I skip?" is answerable — never silently omitted (edge case).
export function summarizePastWeeks(allChecks: Check[], today: string | Date): WeekSummary[] {
  const weekKeyOf = (d: string | Date) => dateKey(mondayOf(d));
  const currentWeek = weekKeyOf(today);
  const keys = new Set<string>([currentWeek]);
  for (const c of allChecks) keys.add(weekKeyOf(c.date));

  const earliest = [...keys].sort()[0];
  const weeks: string[] = [];
  let cursor = keyToLocalDate(earliest);
  const end = keyToLocalDate(currentWeek);
  while (cursor.getTime() <= end.getTime()) {
    weeks.push(dateKey(cursor));
    const next = new Date(cursor);
    next.setDate(cursor.getDate() + 7);
    cursor = next;
  }
  weeks.reverse(); // newest first

  return weeks.map((wk) => {
    const inWeek = allChecks.filter((c) => weekKeyOf(c.date) === wk);
    const gtgDays = (kind: CheckKind) =>
      new Set(inWeek.filter((c) => c.kind === kind).map((c) => c.date.slice(0, 10))).size;
    return {
      weekStartKey: wk,
      volume: hasKind(inWeek, 'climbing-volume'),
      limit: hasKind(inWeek, 'climbing-limit'),
      gtgGeneralDays: gtgDays('gtg-general'),
      gtgPullDays: gtgDays('gtg-pull'),
    };
  });
}

export function weekEndKey(mondayKey: string): string {
  const d = keyToLocalDate(mondayKey);
  d.setDate(d.getDate() + 6);
  return dateKey(d);
}
