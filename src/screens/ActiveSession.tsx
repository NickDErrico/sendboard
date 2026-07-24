import { useEffect, useRef, useState } from 'react';
import type { Exercise, Routine, SetEntry, WorkoutLog } from '../types';
import { getAllExercises, getLog, getRoutine, saveLog } from '../lib/storage';
import {
  addSet,
  deleteSet,
  finishLog,
  getSets,
  setExerciseNotes,
  setSessionNotes,
  updateSet,
} from '../lib/session';
import { SetLogger } from '../components/SetLogger';

export function ActiveSession({ logId, onFinish }: { logId: string; onFinish: () => void }) {
  const [log, setLog] = useState<WorkoutLog | null>(null);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [exercisesById, setExercisesById] = useState<Map<string, Exercise>>(new Map());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [notFound, setNotFound] = useState(false);
  // Ref mirrors the latest log so rapid taps build from current state, never a
  // stale closure — otherwise concurrent "Add set" taps would drop entries.
  const logRef = useRef<WorkoutLog | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await getLog(logId);
      if (cancelled) return;
      if (!loaded) {
        setNotFound(true);
        return;
      }
      logRef.current = loaded;
      setLog(loaded);
      const [r, all] = await Promise.all([getRoutine(loaded.routineId), getAllExercises()]);
      if (cancelled) return;
      setRoutine(r ?? null);
      setExercisesById(new Map(all.map((e) => [e.id, e])));
    })();
    return () => {
      cancelled = true;
    };
  }, [logId]);

  // Persist immediately (well within the 1s budget); no explicit save action.
  function persist(next: WorkoutLog) {
    logRef.current = next;
    setLog(next);
    void saveLog(next);
  }
  const mutate = (fn: (l: WorkoutLog) => WorkoutLog) => {
    const cur = logRef.current;
    if (cur) persist(fn(cur));
  };

  function handleDeleteSet(exerciseId: string, index: number) {
    if (window.confirm('Delete this set?')) {
      mutate((l) => deleteSet(l, exerciseId, index));
    }
  }

  function handleFinish() {
    const cur = logRef.current;
    if (cur) {
      void saveLog(finishLog(cur, new Date().toISOString()));
    }
    onFinish();
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-md p-4">
        <p className="text-sm text-slate-300">That session no longer exists.</p>
        <button onClick={onFinish} className="mt-3 text-sm font-medium text-brand-accent">
          Back home
        </button>
      </div>
    );
  }
  if (!log || !routine) {
    return <p className="mx-auto max-w-md p-4 text-sm text-slate-400">Loading session…</p>;
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-28">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Session</p>
        <h1 className="text-xl font-bold tracking-tight text-slate-100">{routine.name}</h1>
        <p className="text-xs text-slate-500">Started {new Date(log.startedAt).toLocaleString()}</p>
      </header>

      <div className="space-y-3">
        {routine.exerciseIds.map((exId) => {
          const exercise = exercisesById.get(exId);
          const sets = getSets(log, exId);
          const isOpen = expanded.has(exId);
          const entryNotes = log.entries.find((e) => e.exerciseId === exId)?.notes ?? '';
          return (
            <section key={exId} className="rounded-xl border border-slate-700 bg-brand-surface p-3">
              <div className="flex items-start justify-between gap-2">
                {/* Missing catalog entry → fall back to the raw id, never crash. */}
                <h2 className="font-semibold text-slate-100">{exercise?.name ?? exId}</h2>
                {exercise && (
                  <button
                    onClick={() => toggleExpanded(exId)}
                    aria-expanded={isOpen}
                    className="shrink-0 text-xs text-slate-400 hover:text-slate-200"
                  >
                    {isOpen ? 'Hide info ▾' : 'Info ▸'}
                  </button>
                )}
              </div>

              {isOpen && exercise && (
                <div className="mt-2 rounded-lg bg-slate-800/60 p-2 text-sm">
                  <p className="break-words text-slate-200">{exercise.prescription}</p>
                  {exercise.cues.length > 0 && (
                    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-slate-400 marker:text-slate-600">
                      {exercise.cues.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <SetLogger
                sets={sets}
                onAdd={() => mutate((l) => addSet(l, exId))}
                onUpdate={(index, patch: Partial<SetEntry>) =>
                  mutate((l) => updateSet(l, exId, index, patch))
                }
                onDelete={(index) => handleDeleteSet(exId, index)}
              />

              <input
                value={entryNotes}
                onChange={(e) => mutate((l) => setExerciseNotes(l, exId, e.target.value))}
                placeholder="Notes (optional)"
                aria-label={`${exercise?.name ?? exId} notes`}
                className="mt-2 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-brand-accent focus:outline-none"
              />
            </section>
          );
        })}
      </div>

      <section className="mt-4">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Session notes
        </label>
        <textarea
          value={log.sessionNotes}
          onChange={(e) => mutate((l) => setSessionNotes(l, e.target.value))}
          rows={2}
          placeholder="How did it feel?"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-brand-accent focus:outline-none"
        />
      </section>

      <button
        onClick={handleFinish}
        className="mt-5 w-full rounded-lg bg-brand-accent px-4 py-3 font-semibold text-brand-bg"
      >
        Finish session
      </button>
    </div>
  );
}
