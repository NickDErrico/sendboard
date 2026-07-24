import { useEffect, useState } from 'react';
import type { Routine, WorkoutLog } from '../types';
import { createLog } from '../lib/session';
import { getAllLogs, getAllRoutines, saveLog } from '../lib/storage';
import { go } from '../lib/routes';
import { WeekStatus } from '../components/WeekStatus';
import { DailyGtgStatus } from '../components/DailyGtgStatus';

// T8 home (AC1): both routines with one-tap Start, the last session's date, and
// the T5b climbing-week + daily-GtG status. Replaces the temporary shell home.
export function Home() {
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [inProgress, setInProgress] = useState<WorkoutLog | null>(null);
  const [lastCompleted, setLastCompleted] = useState<WorkoutLog | null>(null);

  // Reloads on mount and refocus, so a session finished elsewhere (or a resume
  // after force-close) is reflected.
  useEffect(() => {
    const load = async () => {
      const [rs, logs] = await Promise.all([getAllRoutines(), getAllLogs()]);
      setRoutines(rs);
      // getAllLogs is sorted by startedAt descending.
      setInProgress(logs.find((l) => l.completedAt === null) ?? null);
      setLastCompleted(logs.find((l) => l.completedAt !== null) ?? null);
    };
    void load();
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const routineName = (id: string) => routines?.find((r) => r.id === id)?.name ?? id;

  async function start(routineId: string) {
    // One-tap start (AC1). If a session is already in progress, defer to the
    // routine start route, which surfaces Resume rather than opening a second log
    // (resume precedence, matching T4/T6).
    if (inProgress) {
      go({ name: 'routine', routineId });
      return;
    }
    const log = createLog(routineId, crypto.randomUUID(), new Date().toISOString());
    await saveLog(log);
    go({ name: 'session' });
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4 pb-24">
      <header className="flex items-center gap-3 pt-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-surface">
          <span className="text-xl font-bold text-brand-accent">S</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Sendboard</h1>
      </header>

      {inProgress && (
        <button
          onClick={() => go({ name: 'session' })}
          className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-left"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">
            In progress · tap to resume
          </span>
          <p className="mt-1 font-semibold text-slate-100">{routineName(inProgress.routineId)}</p>
        </button>
      )}

      <section className="space-y-2">
        {(routines ?? []).map((routine) => (
          <div
            key={routine.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-brand-surface p-3"
          >
            <div className="min-w-0">
              <p className="font-semibold text-slate-100">{routine.name}</p>
              <p className="text-xs text-slate-500">{routine.exerciseIds.length} exercises</p>
            </div>
            <button
              onClick={() => void start(routine.id)}
              className="shrink-0 rounded-lg bg-brand-accent px-4 py-2 font-semibold text-brand-bg"
            >
              Start
            </button>
          </div>
        ))}
      </section>

      <p className="text-xs text-slate-500">
        {lastCompleted
          ? `Last session: ${new Date(lastCompleted.completedAt ?? lastCompleted.startedAt).toLocaleDateString()}`
          : 'No sessions yet — start one above.'}
      </p>

      <WeekStatus />
      <DailyGtgStatus />
    </div>
  );
}
