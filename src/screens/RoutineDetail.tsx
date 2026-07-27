import { useEffect, useState } from 'react';
import type { Exercise, Routine, WorkoutLog } from '../types';
import { createLog } from '../lib/session';
import { getAllExercises, getAllLogs, saveLog } from '../lib/storage';
import { go } from '../lib/routes';
import { ExerciseDetail } from './ExerciseDetail';
import { Icon, btnPrimary } from '../components/ui';
import { RowRule, readList } from '../components/ReadList';

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
    <div className="mx-auto max-w-md px-4 pb-28 pt-[54px]">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[15px] font-medium tracking-[-0.01em]">{routine.name}</h1>
          <p className="mt-0.5 text-xs text-neutral-500">{routine.exerciseIds.length} exercises</p>
        </div>
        <button
          onClick={() => go({ name: 'home' })}
          className="shrink-0 rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10"
        >
          Home
        </button>
      </header>

      {inProgress && (
        <div className="mb-4 rounded-md border border-accent/40 bg-accent/[.08] p-4">
          <p className="text-[13px] font-medium text-accent-200">You have an unfinished session</p>
          <p className="mt-0.5 text-xs text-accent-200/80">
            Started {new Date(inProgress.startedAt).toLocaleString()}. Finish or discard it before
            starting another.
          </p>
          <button
            onClick={() => go({ name: 'session' })}
            className={`${btnPrimary} mt-3 py-2`}
          >
            Resume session
          </button>
        </div>
      )}

      {/* The routine's contents, as one card of rows: a preview is a thing you
          read before you start, and a card per exercise made eleven surfaces out
          of one list. */}
      <ol className={`${readList} mb-4`}>
        {routine.exerciseIds.map((exId, i) => {
          const exercise = exercisesById.get(exId);
          return (
            <li key={exId}>
              {i > 0 && <RowRule />}
              <button
                onClick={() => exercise && setDetailId(exId)}
                disabled={!exercise}
                className="flex w-full items-center gap-3 rounded-md px-1 py-3 text-left transition-colors hover:bg-white/5 disabled:opacity-60 disabled:hover:bg-transparent"
              >
                <span className="w-4 shrink-0 text-[11px] tabular-nums text-neutral-600">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  {/* Missing catalog entry → raw id, never crash (T2 edge case). */}
                  <span className="block text-[13px] font-medium">{exercise?.name ?? exId}</span>
                  {exercise && (
                    <span className="mt-0.5 block break-words text-[11px] leading-snug text-neutral-500">
                      {exercise.summary}
                    </span>
                  )}
                </span>
                {exercise && (
                  <Icon name="caret-right" className="shrink-0 text-[13px] text-neutral-600" />
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {!inProgress && (
        <button
          onClick={() => void start()}
          className={`${btnPrimary} w-full py-3`}
        >
          Start {routine.name}
        </button>
      )}
    </div>
  );
}
