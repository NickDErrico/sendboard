import { useEffect, useState } from 'react';
import type { Exercise, Routine, WorkoutLog } from '../types';
import { createLog } from '../lib/session';
import { getAllExercises, getAllLogs, saveLog } from '../lib/storage';
import { go } from '../lib/routes';
import { ExerciseDetail } from './ExerciseDetail';

// T9 (AC4/AC5): the `#/routine/:id` screen. Replaces T6's inline start block in
// App.tsx, which showed only an exercise count — the owner needs to see what a
// routine actually contains before committing to it, and to be able to read any
// exercise's full protocol from here.
//
// Resume precedence (T4/T6) is preserved: with a session already in progress this
// offers Resume instead of silently starting a second log.
export function RoutineDetail({ routine }: { routine: Routine }) {
  const [exercisesById, setExercisesById] = useState<Map<string, Exercise>>(new Map());
  const [inProgress, setInProgress] = useState<WorkoutLog | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [all, logs] = await Promise.all([getAllExercises(), getAllLogs()]);
      setExercisesById(new Map(all.map((e) => [e.id, e])));
      setInProgress(logs.find((l) => l.completedAt === null) ?? null);
    })();
  }, [routine.id]);

  // Back from a detail returns to this routine, not home (AC5) — the detail is a
  // conditional render over the same route, so no navigation state is lost.
  const detailExercise = detailId === null ? undefined : exercisesById.get(detailId);
  if (detailExercise) {
    return <ExerciseDetail exercise={detailExercise} onBack={() => setDetailId(null)} />;
  }

  async function start() {
    const log = createLog(routine.id, crypto.randomUUID(), new Date().toISOString());
    await saveLog(log);
    go({ name: 'session' });
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-28">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-100">{routine.name}</h1>
          <p className="mt-0.5 text-xs text-slate-500">{routine.exerciseIds.length} exercises</p>
        </div>
        <button
          onClick={() => go({ name: 'home' })}
          className="shrink-0 rounded px-1 py-1 text-sm text-slate-400 hover:text-slate-200"
        >
          Home
        </button>
      </header>

      {inProgress && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-200">You have an unfinished session</p>
          <p className="mt-0.5 text-xs text-amber-100/80">
            Started {new Date(inProgress.startedAt).toLocaleString()}. Finish or discard it before
            starting another.
          </p>
          <button
            onClick={() => go({ name: 'session' })}
            className="mt-3 rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-bg"
          >
            Resume session
          </button>
        </div>
      )}

      <ol className="space-y-2">
        {routine.exerciseIds.map((exId, i) => {
          const exercise = exercisesById.get(exId);
          return (
            <li key={exId}>
              <button
                onClick={() => exercise && setDetailId(exId)}
                disabled={!exercise}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-700 bg-brand-surface p-3 text-left disabled:opacity-60"
              >
                <span className="w-4 shrink-0 text-xs text-slate-500">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  {/* Missing catalog entry → raw id, never crash (T2 edge case). */}
                  <span className="block font-medium text-slate-100">{exercise?.name ?? exId}</span>
                  {exercise && (
                    <span className="mt-0.5 block break-words text-xs leading-relaxed text-slate-400">
                      {exercise.summary}
                    </span>
                  )}
                </span>
                {exercise && (
                  <span aria-hidden className="shrink-0 text-slate-600">
                    ›
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {!inProgress && (
        <button
          onClick={() => void start()}
          className="mt-5 w-full rounded-lg bg-brand-accent px-4 py-3 font-semibold text-brand-bg"
        >
          Start {routine.name}
        </button>
      )}
    </div>
  );
}
