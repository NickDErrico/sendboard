import { useEffect, useState } from 'react';
import type { Routine, WorkoutLog } from '../types';
import { getAllLogs, getAllRoutines } from '../lib/storage';
import { LogDetail } from './LogDetail';

export function History({
  onResume,
  onExit,
}: {
  onResume: (logId: string) => void;
  onExit?: () => void;
}) {
  const [logs, setLogs] = useState<WorkoutLog[] | null>(null);
  const [routinesById, setRoutinesById] = useState<Map<string, Routine>>(new Map());
  const [selected, setSelected] = useState<WorkoutLog | null>(null);

  useEffect(() => {
    void (async () => {
      const [ls, rs] = await Promise.all([getAllLogs(), getAllRoutines()]);
      setLogs(ls);
      setRoutinesById(new Map(rs.map((r) => [r.id, r])));
    })();
  }, []);

  if (selected) {
    return <LogDetail log={selected} onBack={() => setSelected(null)} />;
  }

  const routineName = (id: string) => routinesById.get(id)?.name ?? id;
  // getAllLogs is already sorted by startedAt descending (newest-first).
  const inProgress = (logs ?? []).filter((l) => l.completedAt === null);
  const completed = (logs ?? []).filter((l) => l.completedAt !== null);

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">History</h1>
        {onExit && (
          <button onClick={onExit} className="rounded px-1 py-1 text-sm text-slate-400 hover:text-slate-200">
            Done
          </button>
        )}
      </header>

      {logs === null ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-brand-surface p-6 text-center">
          <p className="text-sm text-slate-300">No sessions yet.</p>
          <p className="mt-1 text-xs text-slate-500">
            Start one from the home screen to begin building your log.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {inProgress.length > 0 && (
            <section className="space-y-2">
              {inProgress.map((l) => (
                <button
                  key={l.id}
                  onClick={() => onResume(l.id)}
                  className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                      In progress
                    </span>
                    <span className="text-xs font-medium text-amber-200">Tap to resume →</span>
                  </div>
                  <p className="mt-1 font-semibold text-slate-100">{routineName(l.routineId)}</p>
                  <p className="text-xs text-slate-400">
                    Started {new Date(l.startedAt).toLocaleString()}
                  </p>
                </button>
              ))}
            </section>
          )}

          {completed.length > 0 && (
            <ul className="space-y-2">
              {completed.map((l) => (
                <li key={l.id}>
                  <button
                    onClick={() => setSelected(l)}
                    className="w-full rounded-xl border border-slate-700 bg-brand-surface p-3 text-left transition-colors hover:border-slate-600"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-100">{routineName(l.routineId)}</span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {l.entries.length} {l.entries.length === 1 ? 'exercise' : 'exercises'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {new Date(l.completedAt ?? l.startedAt).toLocaleString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
