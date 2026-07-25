import { useEffect, useState } from 'react';
import type { Exercise, WorkoutLog } from '../types';
import { getAllExercises, getRoutine } from '../lib/storage';
import { formatSet } from '../lib/lastTime';

// Read-only view of a completed session (T5 non-goal: no editing in v1).
export function LogDetail({ log, onBack }: { log: WorkoutLog; onBack: () => void }) {
  const [routineName, setRoutineName] = useState(log.routineId);
  const [exercisesById, setExercisesById] = useState<Map<string, Exercise>>(new Map());

  useEffect(() => {
    void (async () => {
      const [routine, all] = await Promise.all([getRoutine(log.routineId), getAllExercises()]);
      setRoutineName(routine?.name ?? log.routineId);
      setExercisesById(new Map(all.map((e) => [e.id, e])));
    })();
  }, [log.routineId]);

  const when = log.completedAt ?? log.startedAt;

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <button
        onClick={onBack}
        className="mb-4 -ml-1 flex items-center gap-1 rounded px-1 py-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <span aria-hidden>←</span> Back
      </button>

      <h1 className="text-xl font-bold tracking-tight text-slate-100">{routineName}</h1>
      <p className="mt-0.5 text-xs text-slate-500">{new Date(when).toLocaleString()}</p>

      {log.entries.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">No exercises were logged in this session.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {log.entries.map((entry) => {
            // Missing catalog entry → show the raw id, never crash (edge case).
            const name = exercisesById.get(entry.exerciseId)?.name ?? entry.exerciseId;
            return (
              <section
                key={entry.exerciseId}
                className="rounded-xl border border-slate-700 bg-brand-surface p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-slate-100">{name}</h2>
                  {/* D16: distinguishes "did it, logged no numbers" from a row
                      that only carries a note. Pre-T9 logs have no flag → absent. */}
                  {entry.completed && (
                    <span className="shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
                      ✓ Done
                    </span>
                  )}
                </div>
                {entry.sets.length === 0 ? (
                  // A done-with-no-sets exercise is complete data, not a gap (AC9).
                  <p className="mt-1 text-xs text-slate-500">
                    {entry.completed ? 'Completed — no sets logged.' : 'No sets.'}
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {entry.sets.map((set, i) => (
                      // T12: formatSet renders a measured set from its numbers
                      // and a pre-T12 (or unmeasured) one from its free text,
                      // so old and new logs read the same way here.
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                        <span className="w-4 shrink-0 text-xs text-slate-500">{i + 1}</span>
                        <span className="flex-1 break-words">{formatSet(set)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {entry.notes.trim() !== '' && (
                  <p className="mt-2 break-words text-sm italic text-slate-400">{entry.notes}</p>
                )}
              </section>
            );
          })}
        </div>
      )}

      {log.sessionNotes.trim() !== '' && (
        <section className="mt-4 rounded-xl border border-slate-700 bg-brand-surface p-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Session notes
          </h2>
          <p className="mt-1 break-words text-sm text-slate-200">{log.sessionNotes}</p>
        </section>
      )}
    </div>
  );
}
