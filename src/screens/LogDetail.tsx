import { useEffect, useState } from 'react';
import type { Exercise, WorkoutLog } from '../types';
import { getAllExercises, getRoutine } from '../lib/storage';
import { formatSet } from '../lib/lastTime';
import { describeSessionFacts, sessionFacts, sigilFor } from '../lib/sigil';
import { SigilLegend, SigilMark } from '../components/SessionSigil';
import { Icon, tagAccent } from '../components/ui';

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
  // T27: the catalog arrives asynchronously, so both are null on first paint and
  // the mark appears with the exercise names rather than before them.
  const all = [...exercisesById.values()];
  const sigil = all.length === 0 ? null : sigilFor(log, all);

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-[54px]">
      <button
        onClick={onBack}
        className="mb-4 -ml-1 flex items-center gap-1 rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10"
      >
        <Icon name="caret-left" className="text-[13px]" />Back
      </button>

      <h1 className="text-[15px] font-medium tracking-[-0.01em]">{routineName}</h1>
      <p className="mt-0.5 text-xs text-neutral-500">{new Date(when).toLocaleString()}</p>

      {/* T27/D44: the mark at the one size it can be read at, with the legend that
          makes it readable. Rendered here rather than only in the list precisely
          because this is the screen where the sets it was drawn from are also on
          display — a mark you can check against the log is a report; one you
          cannot is a badge. Absent entirely when the session held no holds. */}
      {sigil !== null && (
        <section className="mt-4 flex items-start gap-4 rounded-md bg-surface shadow-edge p-3">
          <span className="text-accent">
            <SigilMark sigil={sigil} size={104} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium tabular-nums text-neutral-200">
              {describeSessionFacts(sessionFacts(log, all))}
            </p>
            <div className="mt-2">
              <SigilLegend sigil={sigil} />
            </div>
          </div>
        </section>
      )}

      {log.entries.length === 0 ? (
        <p className="mt-6 text-[13px] text-neutral-400">No exercises were logged in this session.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {log.entries.map((entry) => {
            // Missing catalog entry → show the raw id, never crash (edge case).
            const name = exercisesById.get(entry.exerciseId)?.name ?? entry.exerciseId;
            return (
              <section
                key={entry.exerciseId}
                className="rounded-md bg-surface shadow-edge p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium text-ink">{name}</h2>
                  {/* D16: distinguishes "did it, logged no numbers" from a row
                      that only carries a note. Pre-T9 logs have no flag → absent. */}
                  {entry.completed && (
                    <span className={`${tagAccent} shrink-0 gap-1`}>
                      <Icon name="check" className="text-[11px]" />
                      Done
                    </span>
                  )}
                </div>
                {entry.sets.length === 0 ? (
                  // A done-with-no-sets exercise is complete data, not a gap (AC9).
                  <p className="mt-1 text-xs text-neutral-500">
                    {entry.completed ? 'Completed — no sets logged.' : 'No sets.'}
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {entry.sets.map((set, i) => (
                      // T12: formatSet renders a measured set from its numbers
                      // and a pre-T12 (or unmeasured) one from its free text,
                      // so old and new logs read the same way here.
                      <li key={i} className="flex items-start gap-2 text-[13px] text-neutral-200">
                        <span className="w-4 shrink-0 text-xs text-neutral-500">{i + 1}</span>
                        <span className="flex-1 break-words">{formatSet(set)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {entry.notes.trim() !== '' && (
                  <p className="mt-2 break-words text-[13px] italic text-neutral-400">{entry.notes}</p>
                )}
              </section>
            );
          })}
        </div>
      )}

      {log.sessionNotes.trim() !== '' && (
        <section className="mt-4 rounded-md bg-surface shadow-edge p-3">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">
            Session notes
          </h2>
          <p className="mt-1 break-words text-[13px] text-neutral-200">{log.sessionNotes}</p>
        </section>
      )}
    </div>
  );
}
