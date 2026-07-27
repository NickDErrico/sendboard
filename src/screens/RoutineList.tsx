import { useEffect, useState } from 'react';
import type { Routine, WorkoutLog } from '../types';
import { deleteLog, getAllLogs, getAllRoutines, saveLog } from '../lib/storage';
import { createLog } from '../lib/session';
import { rotates } from '../lib/rotation';
import { go } from '../lib/routes';
import { btnPrimary } from '../components/ui';

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
    <div className="mx-auto max-w-md px-4 pb-24 pt-[54px]">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">Start a session</h1>
        {onExit && (
          <button onClick={onExit} className="rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10">
            Done
          </button>
        )}
      </header>

      {inProgress && (
        <div className="mb-5 rounded-md border border-accent/40 bg-accent/[.08] p-3">
          <p className="text-[13px] font-medium text-accent-200">Unfinished session</p>
          <p className="mt-0.5 text-xs text-accent-200/80">
            {routineName(inProgress.routineId)} · started{' '}
            {new Date(inProgress.startedAt).toLocaleString()}
          </p>
          <button
            onClick={() => onOpenSession(inProgress.id)}
            className={`${btnPrimary} mt-2`}
          >
            Resume
          </button>
        </div>
      )}

      {startable === null ? (
        <p className="text-[13px] text-neutral-400">Loading…</p>
      ) : (
        <ul className="space-y-3">
          {startable.map((routine) => (
            <li
              key={routine.id}
              className="flex items-center justify-between gap-3 rounded-md bg-surface shadow-edge p-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink">{routine.name}</p>
                <p className="text-xs text-neutral-500">{routine.exerciseIds.length} exercises</p>
              </div>
              <button
                onClick={() => handleStart(routine.id)}
                className={`${btnPrimary} shrink-0 py-2`}
              >
                Start
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => go({ name: 'retest' })}
        className="mt-3 flex w-full items-center justify-between rounded-md bg-surface shadow-edge p-3 text-left"
      >
        <span className="text-[13px] text-neutral-300">§4E baseline / retest battery</span>
        <span aria-hidden className="text-neutral-500">
          &rsaquo;
        </span>
      </button>

      {confirmRoutineId && (
        <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-md bg-surface shadow-edge p-5">
            <h2 className="text-base font-medium text-ink">You already have a session going</h2>
            <p className="mt-1 text-[13px] text-neutral-400">
              {routineName(inProgress?.routineId ?? '')}, started{' '}
              {inProgress ? new Date(inProgress.startedAt).toLocaleString() : ''}. Resume it, or
              discard it and start {routineName(confirmRoutineId)}?
            </p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => inProgress && onOpenSession(inProgress.id)}
                className={`${btnPrimary} w-full py-2`}
              >
                Resume current session
              </button>
              <button
                onClick={() => void discardAndStart()}
                className="w-full rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 font-medium text-warn"
              >
                Discard &amp; start new
              </button>
              <button
                onClick={() => setConfirmRoutineId(null)}
                className="w-full rounded-lg px-4 py-2 text-sm text-neutral-400"
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
