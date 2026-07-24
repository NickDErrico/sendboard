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

export function getSets(log: WorkoutLog, exerciseId: string): SetEntry[] {
  return log.entries.find((e) => e.exerciseId === exerciseId)?.sets ?? [];
}

export function getEntry(log: WorkoutLog, exerciseId: string): LoggedExercise | undefined {
  return log.entries.find((e) => e.exerciseId === exerciseId);
}

// Applies fn to the entry for exerciseId, lazily creating it if absent, then
// drops any entry left with neither sets nor notes (AC6: zero-set → omitted).
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
  return { ...log, entries: kept.filter((e) => e.sets.length > 0 || e.notes.trim() !== '') };
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

export function setSessionNotes(log: WorkoutLog, sessionNotes: string): WorkoutLog {
  return { ...log, sessionNotes };
}

export function finishLog(log: WorkoutLog, completedAt: string): WorkoutLog {
  return { ...log, completedAt };
}
