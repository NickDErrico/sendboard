import { useEffect, useRef, useState } from 'react';
import { beepHoldEnd, beepRestEnd, resumeAudio } from '../lib/beep';
import {
  elapsedMs,
  formatClock,
  formatHold,
  formatHoldTarget,
  holdBandStart,
  holdFraction,
  holdStatus,
  isOpenHold,
  isRestComplete,
  restRemainingMs,
  shouldAutoStop,
  type HoldSpec,
  type TimerState,
} from '../lib/timer';

/**
 * A ticking clock reading, at the resolution the display needs.
 *
 * The interval only drives *re-renders* — every value shown is recomputed from
 * the phase's absolute start instant (D18), so a throttled or skipped interval
 * costs a stale frame, never a drifted timer.
 */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 100);
    // A backgrounded tab throttles intervals, so re-read on the way back in
    // rather than waiting up to a full tick for the next one. iOS also suspends
    // the audio context while backgrounded, so re-arm it here too (T13 AC9).
    const onVisible = () => {
      setNow(Date.now());
      resumeAudio();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [active]);
  return now;
}

const STATUS_STYLE = {
  under: { fill: 'bg-sky-400', text: 'text-sky-300', label: 'building' },
  in: { fill: 'bg-emerald-400', text: 'text-emerald-300', label: '✓ in range' },
  over: { fill: 'bg-amber-400', text: 'text-amber-300', label: 'past target' },
} as const;

export function SessionTimer({
  state,
  exerciseName,
  hold,
  onStop,
  onSkip,
  onExtend,
  onLogHeld,
}: {
  state: TimerState;
  exerciseName: string;
  hold: HoldSpec | null;
  /** `auto` distinguishes the timer ending the hold from the owner ending it — the
      first records the prescription, the second records real elapsed time. */
  onStop: (auto?: boolean) => void;
  onSkip: () => void;
  onExtend: (seconds: number) => void;
  onLogHeld: (heldMs: number) => void;
}) {
  const now = useNow(state.phase !== 'idle');
  const restDone = isRestComplete(state, now);

  // T13 AC4: the hold ends itself at the prescribed maximum. Keyed on the hold's
  // start instant so it fires once per hold rather than on every tick past the
  // threshold, and it sounds *before* the state change so the cue is not waiting
  // on a render — the owner is mid-hang and listening, not watching.
  const autoStoppedAt = useRef<number | null>(null);
  const autoStop = shouldAutoStop(state, now, hold);
  useEffect(() => {
    if (!autoStop) return;
    if (autoStoppedAt.current === state.startedAt) return;
    autoStoppedAt.current = state.startedAt;
    beepHoldEnd();
    onStop(true);
  }, [autoStop, state.startedAt, onStop]);

  // One cue per rest, keyed on the phase's start instant so an extend (+30s)
  // re-arms it and a re-render never re-fires it.
  const beepedFor = useRef<number | null>(null);
  useEffect(() => {
    if (!restDone) return;
    if (beepedFor.current === state.startedAt) return;
    beepedFor.current = state.startedAt;
    beepRestEnd();
  }, [restDone, state.startedAt]);
  useEffect(() => {
    if (!restDone) beepedFor.current = null;
  }, [restDone, state.restMs]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-700 bg-slate-900/95 px-4 pt-3 backdrop-blur-sm [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md">
        {state.phase === 'holding' && hold && (
          <HoldView elapsed={elapsedMs(state, now)} hold={hold} name={exerciseName} onStop={onStop} />
        )}

        {state.heldMs !== null && (
          <HeldResult
            heldMs={state.heldMs}
            onLog={() => onLogHeld(state.heldMs as number)}
            onDismiss={state.phase === 'idle' ? onSkip : undefined}
          />
        )}

        {state.phase === 'resting' && (
          <RestView
            remaining={restRemainingMs(state, now)}
            fraction={state.restMs > 0 ? restRemainingMs(state, now) / state.restMs : 0}
            done={restDone}
            name={exerciseName}
            onSkip={onSkip}
            onExtend={onExtend}
          />
        )}
      </div>
    </div>
  );
}

function HoldView({
  elapsed,
  hold,
  name,
  onStop,
}: {
  elapsed: number;
  hold: HoldSpec;
  name: string;
  onStop: (auto?: boolean) => void;
}) {
  const status = holdStatus(elapsed, hold);
  const style = STATUS_STYLE[status];
  // "in range" is meaningless without a range: an open hold is simply running,
  // and every second of it counts (T16).
  const label = isOpenHold(hold) ? 'holding' : style.label;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-slate-400">
          Hold · <span className="text-slate-300">{name}</span>
        </p>
        <p className="shrink-0 text-xs text-slate-500">target {formatHoldTarget(hold)}</p>
      </div>

      <div className="mt-1 flex items-baseline gap-3">
        <span className="font-mono text-4xl font-bold tabular-nums text-slate-100">
          {formatHold(elapsed)}
        </span>
        <span className={`text-sm font-semibold ${style.text}`} aria-live="polite">
          {label}
        </span>
      </div>

      {/* An open hold (T16) has no target to fill toward, so it gets no bar: a
          progress bar with an invented ceiling would imply a duration §4E
          deliberately does not prescribe. The count itself is the measurement. */}
      {hold.max !== null && (
        <>
          <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
            {/* The target band: everything from min to the top of the range. */}
            <div
              className="absolute inset-y-0 right-0 bg-slate-600"
              style={{ left: `${holdBandStart(hold) * 100}%` }}
            />
            <div
              className={`absolute inset-y-0 left-0 ${style.fill}`}
              style={{ width: `${holdFraction(elapsed, hold) * 100}%` }}
            />
          </div>
          <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-slate-600">
            <span>0</span>
            {hold.min !== hold.max && <span>{hold.min}s</span>}
            <span>{hold.max}s</span>
          </div>
        </>
      )}

      <button
        onClick={() => onStop(false)}
        className="mt-2 w-full rounded-lg bg-slate-100 px-4 py-3 text-base font-bold text-slate-900"
      >
        Stop
      </button>
    </div>
  );
}

function HeldResult({
  heldMs,
  onLog,
  onDismiss,
}: {
  heldMs: number;
  onLog: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <p className="shrink-0 text-sm font-semibold text-emerald-300">✓ Held {formatHold(heldMs)}</p>
      <button
        onClick={onLog}
        className="min-w-0 flex-1 truncate rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-200"
      >
        Log {formatHold(heldMs)} as a set
      </button>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss timer"
          className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-slate-400"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function RestView({
  remaining,
  fraction,
  done,
  name,
  onSkip,
  onExtend,
}: {
  remaining: number;
  fraction: number;
  done: boolean;
  name: string;
  onSkip: () => void;
  onExtend: (seconds: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-slate-400">
          Rest · <span className="text-slate-300">{name}</span>
        </p>
        <p
          className={`shrink-0 text-xs font-semibold ${done ? 'text-emerald-300' : 'text-slate-500'}`}
          aria-live="polite"
        >
          {done ? 'Rest complete — go' : 'resting'}
        </p>
      </div>

      <div className="mt-1 flex items-center gap-3">
        <span
          className={`font-mono text-4xl font-bold tabular-nums ${
            done ? 'text-emerald-300' : 'text-slate-100'
          }`}
        >
          {formatClock(remaining)}
        </span>
        <div className="flex flex-1 justify-end gap-2">
          <button
            onClick={() => onExtend(30)}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-300"
          >
            +30s
          </button>
          <button
            onClick={onSkip}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${
              done ? 'bg-emerald-400 text-slate-900' : 'bg-slate-700 text-slate-100'
            }`}
          >
            {done ? 'Done' : 'Skip'}
          </button>
        </div>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full ${done ? 'bg-emerald-400' : 'bg-brand-accent'}`}
          style={{ width: `${Math.min(1, Math.max(0, fraction)) * 100}%` }}
        />
      </div>
    </div>
  );
}
