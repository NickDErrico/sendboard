import { useEffect, useState } from 'react';
import type { Routine, WorkoutLog } from '../types';
import { createLog } from '../lib/session';
import { getAllLogs, getAllRoutines, saveLog } from '../lib/storage';
import { describeLastCompleted, routineRotation, type RoutineStatus } from '../lib/rotation';
import { go } from '../lib/routes';
import { WeekStatus } from '../components/WeekStatus';
import { DailyGtgStatus } from '../components/DailyGtgStatus';
import { BodyweightCard } from '../components/BodyweightCard';

// "Day 1 — Fingerboard" → "Day 1", so the week line stays on one row at 390px.
// Falls back to the full name if there is no em-dash to split on.
function shortName(name: string): string {
  return name.split('—')[0].trim() || name;
}

// T8 home (AC1): both routines with one-tap Start, the last session's date, and
// the T5b climbing-week + daily-GtG status. T9 adds the rotation — which routine
// is up next (D15) — while keeping both one tap away.
export function Home() {
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [inProgress, setInProgress] = useState<WorkoutLog | null>(null);
  const [lastCompleted, setLastCompleted] = useState<WorkoutLog | null>(null);
  const [rotation, setRotation] = useState<RoutineStatus[]>([]);

  // Reloads on mount and refocus, so a session finished elsewhere (or a resume
  // after force-close) is reflected — and so "days ago" rolls over at midnight
  // without a reload, the same way T5b's daily status does.
  useEffect(() => {
    const load = async () => {
      const [rs, logs] = await Promise.all([getAllRoutines(), getAllLogs()]);
      setRoutines(rs);
      // getAllLogs is sorted by startedAt descending.
      setInProgress(logs.find((l) => l.completedAt === null) ?? null);
      setLastCompleted(logs.find((l) => l.completedAt !== null) ?? null);
      setRotation(routineRotation(rs, logs, new Date()));
    };
    void load();
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  const routineName = (id: string) => routines?.find((r) => r.id === id)?.name ?? id;
  const statusFor = (id: string) => rotation.find((s) => s.routineId === id);

  // Up next first; otherwise seed order is preserved.
  const sortedRoutines = [...(routines ?? [])].sort(
    (a, b) => Number(statusFor(b.id)?.isNextUp ?? false) - Number(statusFor(a.id)?.isNextUp ?? false),
  );

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

      {/* Sorted up-next first (D15). Both stay startable in one tap — "up next" is
          a suggestion from rotation order, never a lock, and there is deliberately
          no rest-day or "you're behind" state. */}
      <section className="space-y-2">
        {sortedRoutines.map((routine) => {
          const status = statusFor(routine.id);
          const nextUp = status?.isNextUp ?? false;
          return (
            <div
              key={routine.id}
              className={`rounded-xl border p-3 ${
                nextUp ? 'border-brand-accent/60 bg-brand-accent/5' : 'border-slate-700 bg-brand-surface'
              }`}
            >
              {nextUp && (
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-accent">
                  Up next
                </p>
              )}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => go({ name: 'routine', routineId: routine.id })}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block font-semibold text-slate-100">
                    {routine.name} <span aria-hidden className="text-slate-500">›</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {routine.exerciseIds.length} exercises ·{' '}
                    {status ? describeLastCompleted(status) : '—'}
                  </span>
                </button>
                <button
                  onClick={() => void start(routine.id)}
                  className="shrink-0 rounded-lg bg-brand-accent px-4 py-2 font-semibold text-brand-bg"
                >
                  Start
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* Which routines this Monday-start week has had (AC3), alongside T5b's
          climbing checks below — together they answer "what does the week owe?" */}
      {rotation.length > 0 && (
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          {/* "Routines" qualifier avoids colliding with T5b's WeekStatus heading
              directly below, which covers the climbing days for the same week. */}
          <span className="font-semibold uppercase tracking-wide">Routines this week</span>
          {rotation.map((s) => (
            <span key={s.routineId} className={s.doneThisWeek ? 'text-emerald-300' : ''}>
              {s.doneThisWeek ? '✓' : '○'} {shortName(routineName(s.routineId))}
            </span>
          ))}
        </p>
      )}

      <p className="text-xs text-slate-500">
        {lastCompleted
          ? `Last session: ${new Date(lastCompleted.completedAt ?? lastCompleted.startedAt).toLocaleDateString()}`
          : 'No sessions yet — start one above.'}
      </p>

      <WeekStatus />
      <DailyGtgStatus />
      {/* T15: last, because it is the least time-sensitive thing on this screen —
          a weigh-in has no day it belongs to (D24), unlike the week's climbing
          balance or today's GtG. */}
      <BodyweightCard />
    </div>
  );
}
