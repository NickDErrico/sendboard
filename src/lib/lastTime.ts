import type { SetEntry, WorkoutLog } from '../types';
import { daysBetween } from './rotation';

// "What did I do last time?" (T11), derived from the logs rather than stored —
// the same property that makes rotation.ts correct after a backup import, for
// the same reason. Pure, so the lookup rules are testable without IndexedDB.
//
// This module reports history and never proposes a target. Suggesting the *next*
// load would be adaptive load calculation, a standing v1 non-goal; training plan
// §4F puts that judgment with the owner, who can feel whether the last session
// was an 8 or a 10.

export interface LastPerformance {
  logId: string;
  /** When the session happened: its completedAt (all candidates are completed). */
  performedAt: string;
  daysAgo: number;
  sets: SetEntry[];
}

/**
 * The most recent completed performance of an exercise, or null.
 *
 * "Performance" means at least one logged set. An entry that is only marked
 * `completed` (D16) carries no numbers to carry forward, so the search passes
 * over it to the session behind — otherwise a single "did it, typed nothing"
 * session would hide the last real numbers indefinitely, which is precisely the
 * trend the training plan asks the owner to watch (§7).
 */
export function lastPerformance(
  logs: WorkoutLog[],
  exerciseId: string,
  today: string | Date,
  excludeLogId?: string,
): LastPerformance | null {
  const candidates = logs
    .filter((l) => l.completedAt !== null && l.id !== excludeLogId)
    // Ordered by when the work finished, not when it started — a session opened
    // before midnight and finished after it is the more recent performance.
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));

  for (const log of candidates) {
    const entry = log.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry || entry.sets.length === 0) continue;
    const performedAt = log.completedAt as string;
    return {
      logId: log.id,
      performedAt,
      daysAgo: daysBetween(performedAt, today),
      sets: entry.sets,
    };
  }
  return null;
}

/** Every exercise's last performance in one pass, so a session screen reads the logs once. */
export function lastPerformanceMap(
  logs: WorkoutLog[],
  exerciseIds: string[],
  today: string | Date,
  excludeLogId?: string,
): Map<string, LastPerformance> {
  const map = new Map<string, LastPerformance>();
  for (const id of exerciseIds) {
    const found = lastPerformance(logs, id, today, excludeLogId);
    if (found) map.set(id, found);
  }
  return map;
}

/** "today" / "yesterday" / "5 days ago" — worded like rotation's describeLastCompleted. */
export function describeWhen(daysAgo: number): string {
  if (daysAgo <= 0) return 'today';
  if (daysAgo === 1) return 'yesterday';
  return `${daysAgo} days ago`;
}

/** One set as `load × reps @rpe`, skipping whatever the owner left blank. */
export function formatSet(set: SetEntry): string {
  const load = set.load.trim();
  const reps = set.reps.trim();
  const core = load && reps ? `${load} × ${reps}` : load || reps;
  if (!core) return set.rpe === null ? '—' : `@${set.rpe}`;
  return set.rpe === null ? core : `${core} @${set.rpe}`;
}

/**
 * A set list compressed to one line, collapsing consecutive identical sets.
 *
 * Five identical max hangs are the common case, and "20mm +10kg × 7s ×5" is both
 * shorter and easier to read than the same row five times. `maxRuns` caps the
 * line so a varied session summarizes rather than wrapping the card (AC2).
 */
export function summarizeSets(sets: SetEntry[], maxRuns = 3): string {
  if (sets.length === 0) return '';

  const runs: { text: string; count: number }[] = [];
  for (const set of sets) {
    const text = formatSet(set);
    const last = runs[runs.length - 1];
    if (last && last.text === text) last.count += 1;
    else runs.push({ text, count: 1 });
  }

  const shown = runs.slice(0, maxRuns).map((r) => (r.count > 1 ? `${r.text} ×${r.count}` : r.text));
  const hidden = runs.slice(maxRuns).reduce((n, r) => n + r.count, 0);
  return hidden > 0 ? `${shown.join(' · ')} +${hidden} more` : shown.join(' · ');
}

/**
 * The starting values for the next set row (AC3, AC4).
 *
 * Precedence is the previous set *in this session* first — a max-hang exercise
 * is five near-identical rows, so that is the biggest saving — then the matching
 * set from the last completed session, then blank.
 *
 * `rpe` is deliberately never carried forward. Load and reps describe what was
 * set up, and repeating them is a shortcut; RPE is a fresh judgment about a set
 * that has not happened yet, and pre-filling it would quietly fabricate exactly
 * the "how did it feel" signal the plan asks the owner to watch for a downward
 * trend (§7). A prefilled value is a draft, never a claim (D19).
 */
export function seedForNextSet(
  currentSets: SetEntry[],
  last: LastPerformance | null,
): SetEntry {
  const previous = currentSets[currentSets.length - 1];
  if (previous) return { load: previous.load, reps: previous.reps, rpe: null };

  const corresponding = last?.sets[currentSets.length] ?? last?.sets[0];
  if (corresponding) return { load: corresponding.load, reps: corresponding.reps, rpe: null };

  return { load: '', reps: '', rpe: null };
}
