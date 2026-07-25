import { useEffect, useState } from 'react';
import type { Routine, WorkoutLog } from '../types';
import { deleteLog, getAllLogs, getAllRoutines, saveLog } from '../lib/storage';
import { createLog } from '../lib/session';
import { rotates } from '../lib/rotation';
import { go } from '../lib/routes';

export function RoutineList({
  onOpenSession,
  onExit,
}: {
  onOpenSession: (logId: string) => void;
  onExit?: () => void;
}) {
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [inProgress, setInProgress] = useState<WorkoutLog | null>(null);
  const [confirmRoutineId, setConfirmRoutineId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [rs, logs] = await Promise.all([getAllRoutines(), getAllLogs()]);
      setRoutines(rs);
      setInProgress(logs.find((l) => l.completedAt === null) ?? null);
    })();
  }, []);

  // Names resolve against every routine, including the battery — an unfinished
  // battery must still be named in the resume banner rather than showing its id.
  const routineName = (id: string) => routines?.find((r) => r.id === id)?.name ?? id;
  // Started from here: training routines only. The §4E battery is a measurement,
  // not a training session, and it has its own screen where its protocol and its
  // conditions live (D29).
  const startable = routines?.filter(rotates) ?? null;

  async function startNew(routineId: string) {
    const log = createLog(routineId, crypto.randomUUID(), new Date().toISOString());
    await saveLog(log);
    onOpenSession(log.id);
  }

  function handleStart(routineId: string) {
    // Never silently create a second in-progress log (edge case).
    if (inProgress) setConfirmRoutineId(routineId);
    else void startNew(routineId);
  }

  async function discardAndStart() {
    const routineId = confirmRoutineId;
    if (!routineId) return;
    if (inProgress) await deleteLog(inProgress.id);
    setConfirmRoutineId(null);
    setInProgress(null);
    await startNew(routineId);
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Start a session</h1>
        {onExit && (
          <button onClick={onExit} className="rounded px-1 py-1 text-sm text-slate-400 hover:text-slate-200">
            Done
          </button>
        )}
      </header>

      {inProgress && (
        <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="text-sm font-semibold text-amber-200">Unfinished session</p>
          <p className="mt-0.5 text-xs text-amber-100/80">
            {routineName(inProgress.routineId)} · started{' '}
            {new Date(inProgress.startedAt).toLocaleString()}
          </p>
          <button
            onClick={() => onOpenSession(inProgress.id)}
            className="mt-2 rounded-lg bg-brand-accent px-3 py-1.5 text-sm font-semibold text-brand-bg"
          >
            Resume
          </button>
        </div>
      )}

      {startable === null ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <ul className="space-y-3">
          {startable.map((routine) => (
            <li
              key={routine.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-brand-surface p-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-100">{routine.name}</p>
                <p className="text-xs text-slate-500">{routine.exerciseIds.length} exercises</p>
              </div>
              <button
                onClick={() => handleStart(routine.id)}
                className="shrink-0 rounded-lg bg-brand-accent px-4 py-2 font-semibold text-brand-bg"
              >
                Start
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => go({ name: 'retest' })}
        className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-700 bg-brand-surface p-3 text-left"
      >
        <span className="text-sm text-slate-300">§4E baseline / retest battery</span>
        <span aria-hidden className="text-slate-500">
          &rsaquo;
        </span>
      </button>

      {confirmRoutineId && (
        <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-brand-surface p-5">
            <h2 className="text-base font-semibold text-slate-100">You already have a session going</h2>
            <p className="mt-1 text-sm text-slate-400">
              {routineName(inProgress?.routineId ?? '')}, started{' '}
              {inProgress ? new Date(inProgress.startedAt).toLocaleString() : ''}. Resume it, or
              discard it and start {routineName(confirmRoutineId)}?
            </p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => inProgress && onOpenSession(inProgress.id)}
                className="w-full rounded-lg bg-brand-accent px-4 py-2 font-semibold text-brand-bg"
              >
                Resume current session
              </button>
              <button
                onClick={() => void discardAndStart()}
                className="w-full rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 font-medium text-red-200"
              >
                Discard &amp; start new
              </button>
              <button
                onClick={() => setConfirmRoutineId(null)}
                className="w-full rounded-lg px-4 py-2 text-sm text-slate-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
