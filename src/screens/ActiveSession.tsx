import { useEffect, useRef, useState } from 'react';
import type { Exercise, Routine, SetEntry, WorkoutLog } from '../types';
import { getAllExercises, getAllLogs, getLog, getRoutine, saveLog } from '../lib/storage';
import {
  addSet,
  deleteSet,
  finishLog,
  getSets,
  isExerciseCompleted,
  setExerciseCompleted,
  setExerciseNotes,
  setSessionNotes,
  updateSet,
} from '../lib/session';
import {
  describeWhen,
  lastPerformanceMap,
  seedForNextSet,
  summarizeSets,
  type LastPerformance,
} from '../lib/lastTime';
import {
  IDLE_TIMER,
  autoStopHold,
  clearHeld,
  clearTimer,
  extendRest,
  formatClock,
  formatHold,
  formatHoldTarget,
  holdSpecOf,
  isTimerVisible,
  restMsOf,
  startHold,
  startRest,
  stopHold,
  type TimerState,
} from '../lib/timer';
import { primeAudio } from '../lib/beep';
import { useWakeLock } from '../lib/wakeLock';
import { SetLogger } from '../components/SetLogger';
import { SessionTimer } from '../components/SessionTimer';
import { ExerciseDetail } from './ExerciseDetail';

export function ActiveSession({ logId, onFinish }: { logId: string; onFinish: () => void }) {
  const [log, setLog] = useState<WorkoutLog | null>(null);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [exercisesById, setExercisesById] = useState<Map<string, Exercise>>(new Map());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  // T10: exactly one timer for the whole session, held here rather than per card
  // so it survives opening an exercise's detail view. Never persisted (D18).
  const [timer, setTimer] = useState<TimerState>(IDLE_TIMER);
  // T11: every exercise's previous performance, resolved once on load.
  const [lastByExercise, setLastByExercise] = useState<Map<string, LastPerformance>>(new Map());
  // Ref mirrors the latest log so rapid taps build from current state, never a
  // stale closure — otherwise concurrent "Add set" taps would drop entries.
  const logRef = useRef<WorkoutLog | null>(null);

  // Keeps the screen on while logging: the phone is on the floor, and a sleeping
  // screen takes the rest countdown (and its beep) with it.
  useWakeLock(true);

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
      const [r, all, logs] = await Promise.all([
        getRoutine(loaded.routineId),
        getAllExercises(),
        getAllLogs(),
      ]);
      if (cancelled) return;
      setRoutine(r ?? null);
      setExercisesById(new Map(all.map((e) => [e.id, e])));
      // This log is excluded, so an exercise can never cite itself (T11).
      setLastByExercise(lastPerformanceMap(logs, r?.exerciseIds ?? [], new Date(), logId));
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

  // ─── Timer (T10) ───────────────────────────────────────────────────────────
  // Every transition is a functional update reading the live state, so a tap
  // never acts on a stale closure — the same rule `mutate` follows for the log.
  // primeAudio runs on these taps because they are the user gesture iOS requires
  // before an AudioContext will make any sound at all.

  function beginHold(exerciseId: string) {
    primeAudio();
    setTimer(startHold(exerciseId, Date.now()));
  }

  function beginRest(exerciseId: string, restMs: number) {
    primeAudio();
    setTimer(startRest(exerciseId, restMs, Date.now()));
  }

  // `auto` means the timer reached the prescribed maximum rather than the owner
  // tapping Stop. Only then is the recorded duration the prescription: a manual
  // stop always measures what actually elapsed (T13 AC6).
  function handleStop(auto = false) {
    setTimer((t) => {
      const exercise = exercisesById.get(t.exerciseId ?? '');
      const restMs = restMsOf(exercise);
      const hold = holdSpecOf(exercise);
      return auto && hold ? autoStopHold(t, hold, restMs) : stopHold(t, Date.now(), restMs);
    });
  }

  // Writes the measured hold as a set, carrying last time's load forward (T11
  // AC5) — the duration is the thing that was just measured, so it wins on reps.
  // Explicit tap only; this never marks the exercise completed (D16, D19).
  function handleLogHeld(heldMs: number) {
    const exerciseId = timer.exerciseId;
    if (!exerciseId) return;
    // T12: where the exercise declares `holdSec`, the measurement lands in the
    // numeric field — that is the charted value, and the free-text `reps` has
    // been replaced there (D21). Everywhere else it keeps writing the text form.
    const tracksHold = exercisesById.get(exerciseId)?.metrics?.includes('holdSec') ?? false;
    mutate((l) => {
      const seed = seedForNextSet(getSets(l, exerciseId), lastByExercise.get(exerciseId) ?? null);
      const measured = tracksHold
        ? { holdSec: Math.round((heldMs / 1000) * 10) / 10 }
        : { reps: formatHold(heldMs) };
      return addSet(l, exerciseId, { ...seed, ...measured });
    });
    setTimer(clearHeld);
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

  // The timer belongs to the session, not to a card, so it renders over the
  // exercise detail view too — reading the cues is exactly what the owner does
  // during a 3 minute rest, and the countdown must not vanish to allow it.
  const timerExercise = timer.exerciseId ? exercisesById.get(timer.exerciseId) : undefined;
  const timerBar = isTimerVisible(timer) ? (
    <SessionTimer
      state={timer}
      exerciseName={timerExercise?.name ?? timer.exerciseId ?? ''}
      hold={holdSpecOf(timerExercise)}
      onStop={handleStop}
      onSkip={() => setTimer(clearTimer())}
      onExtend={(seconds) => setTimer((t) => extendRest(t, seconds))}
      onLogHeld={handleLogHeld}
    />
  ) : null;

  // T9 AC6: full protocol without leaving the session. Rendered over the session
  // rather than routed to, so back returns here with every set intact — and
  // auto-persist (T4) means nothing is riding on component state anyway.
  const detailExercise = detailId === null ? undefined : exercisesById.get(detailId);
  if (detailExercise) {
    return (
      <>
        <ExerciseDetail exercise={detailExercise} onBack={() => setDetailId(null)} />
        {timerBar}
      </>
    );
  }

  return (
    <div className={`mx-auto max-w-md p-4 ${timerBar ? 'pb-72' : 'pb-28'}`}>
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Session</p>
        <h1 className="text-xl font-bold tracking-tight text-slate-100">{routine.name}</h1>
        <p className="text-xs text-slate-500">
          Started {new Date(log.startedAt).toLocaleString()} ·{' '}
          {routine.exerciseIds.filter((id) => isExerciseCompleted(log, id)).length} of{' '}
          {routine.exerciseIds.length} done
        </p>
      </header>

      <div className="space-y-3">
        {routine.exerciseIds.map((exId) => {
          const exercise = exercisesById.get(exId);
          const sets = getSets(log, exId);
          const isOpen = expanded.has(exId);
          const entryNotes = log.entries.find((e) => e.exerciseId === exId)?.notes ?? '';
          const done = isExerciseCompleted(log, exId);
          const last = lastByExercise.get(exId) ?? null;
          const holdSpec = holdSpecOf(exercise);
          const restMs = restMsOf(exercise);
          const isTiming = timer.exerciseId === exId && timer.phase !== 'idle';
          return (
            <section
              key={exId}
              className={`rounded-xl border p-3 ${
                done ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700 bg-brand-surface'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                {/* Missing catalog entry → fall back to the raw id, never crash. */}
                {exercise ? (
                  <button
                    onClick={() => setDetailId(exId)}
                    className="min-w-0 text-left font-semibold text-slate-100"
                  >
                    {exercise.name} <span aria-hidden className="text-slate-500">›</span>
                  </button>
                ) : (
                  <h2 className="font-semibold text-slate-100">{exId}</h2>
                )}
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

              {/* T11: what this exercise looked like last time, where the
                  decision is made — §4F asks for small increments, which is not
                  possible against a number you have to leave the session to find. */}
              {last && (
                <p className="mt-2 text-xs leading-snug text-slate-400">
                  <span className="font-semibold uppercase tracking-wide text-slate-500">
                    Last {describeWhen(last.daysAgo)}
                  </span>{' '}
                  <span className="text-slate-300">{summarizeSets(last.sets)}</span>
                </p>
              )}

              {/* T10: a hold if the plan prescribes a duration, otherwise a bare
                  rest if it prescribes only that. Untimed movements (rows,
                  squats, get-ups, prehab) get neither and read exactly as before. */}
              {holdSpec ? (
                <button
                  onClick={() => beginHold(exId)}
                  disabled={isTiming}
                  className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 disabled:opacity-40"
                >
                  {isTiming ? 'Timing…' : `▶ Start hold · ${formatHoldTarget(holdSpec)}`}
                </button>
              ) : (
                restMs !== null && (
                  <button
                    onClick={() => beginRest(exId, restMs)}
                    disabled={isTiming}
                    className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 disabled:opacity-40"
                  >
                    {isTiming ? 'Resting…' : `▶ Start rest · ${formatClock(restMs)}`}
                  </button>
                )
              )}

              <SetLogger
                sets={sets}
                metrics={exercise?.metrics}
                onAdd={() =>
                  mutate((l) => addSet(l, exId, seedForNextSet(getSets(l, exId), last)))
                }
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

              {/* D16: explicit and independent of sets — several plan items
                  (warm-up progression, get-ups, wall press) have nothing numeric
                  worth typing, and adding a set never implies completion. */}
              <button
                onClick={() => mutate((l) => setExerciseCompleted(l, exId, !done))}
                aria-pressed={done}
                className={`mt-2 flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                  done
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : 'border border-slate-700 text-slate-300'
                }`}
              >
                <span aria-hidden>{done ? '✓' : '○'}</span>
                {done ? 'Completed' : 'Mark done'}
              </button>
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

      {timerBar}
    </div>
  );
}
