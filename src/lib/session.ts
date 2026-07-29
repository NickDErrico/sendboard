import type { LoggedExercise, SetEntry, WorkoutLog } from '../types';

// Pure, immutable log-mutation helpers. Kept separate from the UI so the session
// rules (lazy entries, zero-set omission, no dropped sets on rapid adds) are
// unit-testable without a DOM. ActiveSession is a thin shell over these + storage.

export function createLog(routineId: string, id: string, startedAt: string): WorkoutLog {
  return { id, routineId, startedAt, completedAt: null, entries: [], sessionNotes: '' };
}

export function isInProgress(log: WorkoutLog): boolean {
  return log.completedAt === null;
}

/**
 * Has this session recorded anything at all? (D46)
 *
 * The line between "I opened the routine to read it" and "I am training". A log
 * exists from the Start tap because the session screen needs somewhere to write
 * — but a log is not a session, and until something lands in it there is nothing
 * under way and nothing to resume.
 *
 * `entries` is already pruned to entries that carry signal (see isMeaningful),
 * so its emptiness is exact rather than approximate: a set typed and deleted
 * leaves nothing behind, and a lone Mark done counts, because D16 makes that tap
 * a thing that happened.
 */
export function isStarted(log: WorkoutLog): boolean {
  return log.entries.length > 0 || log.sessionNotes.trim() !== '';
}

/** The unfinished session worth offering Resume for, or null (D46). */
export function resumable(logs: WorkoutLog[]): WorkoutLog | null {
  return logs.find((l) => isInProgress(l) && isStarted(l)) ?? null;
}

/**
 * Unfinished logs holding nothing — discardable by definition, since there is
 * nothing in them to discard.
 */
export function unstarted(logs: WorkoutLog[]): WorkoutLog[] {
  return logs.filter((l) => isInProgress(l) && !isStarted(l));
}

export function getSets(log: WorkoutLog, exerciseId: string): SetEntry[] {
  return log.entries.find((e) => e.exerciseId === exerciseId)?.sets ?? [];
}

export function getEntry(log: WorkoutLog, exerciseId: string): LoggedExercise | undefined {
  return log.entries.find((e) => e.exerciseId === exerciseId);
}

// An entry is worth keeping if it carries any signal at all. T4 AC6 prunes
// untouched exercises (no sets, no notes) so they never pollute a log; T9/D16
// adds `completed` as a third kind of signal, so "I did this, nothing numeric
// worth typing" survives while genuinely untouched exercises still vanish.
function isMeaningful(entry: LoggedExercise): boolean {
  return entry.sets.length > 0 || entry.notes.trim() !== '' || entry.completed === true;
}

// Applies fn to the entry for exerciseId, lazily creating it if absent, then
// drops any entry left with no signal (see isMeaningful).
function mapEntry(
  log: WorkoutLog,
  exerciseId: string,
  fn: (entry: LoggedExercise) => LoggedExercise,
): WorkoutLog {
  const existing = log.entries.find((e) => e.exerciseId === exerciseId);
  const base: LoggedExercise = existing ?? { exerciseId, sets: [], notes: '' };
  const updated = fn(base);
  const kept = existing
    ? log.entries.map((e) => (e.exerciseId === exerciseId ? updated : e))
    : [...log.entries, updated];
  return { ...log, entries: kept.filter(isMeaningful) };
}

const BLANK_SET: SetEntry = { load: '', reps: '', rpe: null };

export function addSet(log: WorkoutLog, exerciseId: string, set: SetEntry = BLANK_SET): WorkoutLog {
  return mapEntry(log, exerciseId, (e) => ({ ...e, sets: [...e.sets, { ...set }] }));
}

export function updateSet(
  log: WorkoutLog,
  exerciseId: string,
  index: number,
  patch: Partial<SetEntry>,
): WorkoutLog {
  return mapEntry(log, exerciseId, (e) => ({
    ...e,
    sets: e.sets.map((s, i) => (i === index ? { ...s, ...patch } : s)),
  }));
}

export function deleteSet(log: WorkoutLog, exerciseId: string, index: number): WorkoutLog {
  return mapEntry(log, exerciseId, (e) => ({
    ...e,
    sets: e.sets.filter((_, i) => i !== index),
  }));
}

export function setExerciseNotes(log: WorkoutLog, exerciseId: string, notes: string): WorkoutLog {
  return mapEntry(log, exerciseId, (e) => ({ ...e, notes }));
}

export function isExerciseCompleted(log: WorkoutLog, exerciseId: string): boolean {
  return getEntry(log, exerciseId)?.completed === true;
}

// Explicit tap only — adding a set never implies completion (T9 non-goal), so
// the two signals stay independent and a set can be logged mid-exercise without
// claiming the exercise is finished.
export function setExerciseCompleted(
  log: WorkoutLog,
  exerciseId: string,
  completed: boolean,
): WorkoutLog {
  return mapEntry(log, exerciseId, (e) => ({ ...e, completed }));
}

export function setSessionNotes(log: WorkoutLog, sessionNotes: string): WorkoutLog {
  return { ...log, sessionNotes };
}

export function finishLog(log: WorkoutLog, completedAt: string): WorkoutLog {
  return { ...log, completedAt };
}
