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
  leadInSecondsLeft,
  restElapsedMs,
  restRemainingMs,
  type HoldSpec,
  type TimerState,
} from '../lib/timer';
import { restCardIndex, type RestReading } from '../lib/rest';
import { useNow, useTimerCues } from '../lib/timerCues';
import { RestCardView } from './RestCard';

const STATUS_STYLE = {
  under: { fill: 'bg-sky-400', text: 'text-sky-300', label: 'building' },
  in: { fill: 'bg-emerald-400', text: 'text-emerald-300', label: '✓ in range' },
  over: { fill: 'bg-amber-400', text: 'text-amber-300', label: 'past target' },
} as const;

export function SessionTimer({
  state,
  exerciseName,
  hold,
  chainLabel = null,
  chainSpoken = null,
  reading = null,
  voice = true,
  onStop,
  onSkip,
  onExtend,
  onLogHeld,
  onStartNext,
  onCountEnd,
}: {
  state: TimerState;
  exerciseName: string;
  hold: HoldSpec | null;
  /**
   * T19: the set that is next to be *logged* — the one being held right now, or
   * the one after a rest. Null where the plan declares no set count. It advances
   * only when a set is recorded, so a hold performed and not logged leaves it
   * where it was; the "Log …" button that would advance it is on this same bar.
   */
  chainLabel?: string | null;
  /** T20: the same position, said out loud when a rest completes (`speakChain`). */
  chainSpoken?: string | null;
  /**
   * T22: what the rest has to read — the deck, and the numbers its report card
   * shows. Resolved for the *timer's* exercise by the session, so it stays
   * correct wherever the bar happens to be rendered. Null outside a rest.
   */
  reading?: RestReading | null;
  /** T20/D34: whether the *words* are on. Every tone fires either way. */
  voice?: boolean;
  /** `auto` distinguishes the timer ending the hold from the owner ending it — the
      first records the prescription, the second records real elapsed time. */
  onStop: (auto?: boolean) => void;
  onSkip: () => void;
  onExtend: (seconds: number) => void;
  onLogHeld: (heldMs: number) => void;
  /**
   * Starts the next hold from the timer bar once a rest is done (T19 AC4) — the
   * bar covers the card, so without this the next set costs a scroll and the
   * thing that gets skipped is the rest. Absent where the exercise has no hold.
   */
  onStartNext?: () => void;
  /**
   * T20: the count reached zero — become the hold (or, if the app was asleep
   * through it, drop it). The caller owns that choice; this bar only sounds it.
   */
  onCountEnd?: () => void;
}) {
  const now = useNow(state.phase !== 'idle');
  const restDone = isRestComplete(state, now);
  const counting = state.phase === 'counting';
  const secondsLeft = leadInSecondsLeft(state, now);

  useTimerCues({ state, now, hold, voice, chainSpoken, onStop, onCountEnd });

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-700 bg-slate-900/95 px-4 pt-3 backdrop-blur-sm [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md">
        {counting && (
          <CountView
            secondsLeft={secondsLeft}
            name={exerciseName}
            chainLabel={chainLabel}
            holdTarget={hold ? formatHoldTarget(hold) : null}
            onCancel={onSkip}
          />
        )}

        {state.phase === 'holding' && hold && (
          <HoldView
            elapsed={elapsedMs(state, now)}
            hold={hold}
            name={exerciseName}
            chainLabel={chainLabel}
            onStop={onStop}
          />
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
            elapsed={restElapsedMs(state, now)}
            fraction={state.restMs > 0 ? restRemainingMs(state, now) / state.restMs : 0}
            done={restDone}
            name={exerciseName}
            chainLabel={chainLabel}
            holdTarget={hold ? formatHoldTarget(hold) : null}
            reading={reading}
            onSkip={onSkip}
            onExtend={onExtend}
            onStartNext={onStartNext}
          />
        )}
      </div>
    </div>
  );
}

/**
 * The seconds between the tap and "pull" (T20, D33).
 *
 * Deliberately the loudest thing on the bar for three seconds: the owner taps
 * this and then looks up at the board, so the number's job is to be readable at
 * a glance on the way up — and the tick underneath it is what they actually
 * count on. Cancel is the only control, because the count exists to be trusted,
 * not managed.
 */
function CountView({
  secondsLeft,
  name,
  chainLabel,
  holdTarget,
  onCancel,
}: {
  secondsLeft: number;
  name: string;
  chainLabel: string | null;
  holdTarget: string | null;
  onCancel: () => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-slate-400">
          Get ready · <span className="text-slate-300">{name}</span>
        </p>
        <p className="shrink-0 text-xs text-slate-500">
          {chainLabel && <span className="text-slate-400">{chainLabel} · </span>}
          {holdTarget ? `target ${holdTarget}` : 'hold'}
        </p>
      </div>

      <div className="mt-1 flex items-center gap-3">
        <span
          className="font-mono text-4xl font-bold tabular-nums text-amber-300"
          aria-live="assertive"
        >
          {secondsLeft}
        </span>
        <span className="text-sm font-semibold text-amber-200">counting in…</span>
        <button
          onClick={onCancel}
          className="ml-auto shrink-0 rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function HoldView({
  elapsed,
  hold,
  name,
  chainLabel,
  onStop,
}: {
  elapsed: number;
  hold: HoldSpec;
  name: string;
  chainLabel: string | null;
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
        {/* T19: the position rides beside the target, where the eye already goes
            for "how long" — mid-hang is not the moment to count logged rows. */}
        <p className="shrink-0 text-xs text-slate-500">
          {chainLabel && <span className="text-slate-400">{chainLabel} · </span>}
          target {formatHoldTarget(hold)}
        </p>
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
  elapsed,
  fraction,
  done,
  name,
  chainLabel,
  holdTarget,
  reading,
  onSkip,
  onExtend,
  onStartNext,
}: {
  remaining: number;
  elapsed: number;
  fraction: number;
  done: boolean;
  name: string;
  chainLabel: string | null;
  holdTarget: string | null;
  reading: RestReading | null;
  onSkip: () => void;
  onExtend: (seconds: number) => void;
  onStartNext?: () => void;
}) {
  // T22: two lines of reading under the clock, and no more — the card underneath
  // this bar is where the owner is entering the load for the set they just
  // logged, and a rest surface that covers it would take the three minutes it
  // was meant to fill. The board-legible version of the same card is focus
  // mode's job. Gone the moment the rest is over: at that point the surface has
  // one thing to say, and it is "start the next one".
  const deck = reading?.deck ?? [];
  const cardIndex = restCardIndex(elapsed, deck.length);
  const card = done ? undefined : deck[cardIndex];

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
          {done ? 'Rest complete — go' : chainLabel ? `next · ${chainLabel}` : 'resting'}
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

      {card && (
        <RestCardView
          card={card}
          report={reading?.report ?? null}
          index={cardIndex}
          total={deck.length}
          compact
        />
      )}

      {/* T19 AC4: the next hold, from here, once the rest is actually over. The
          bar covers the card, so without this the next set costs a scroll — and
          the thing that gets cut short to avoid the scroll is the rest §4C
          prescribes. Deliberately NOT offered while the rest is still running:
          Skip already exists for that, and a second control that quietly ends a
          3 minute interval is how a prescribed rest erodes. It never starts by
          itself either (AC5) — the owner has to be on the board first. */}
      {done && onStartNext && (
        <button
          onClick={onStartNext}
          className="mt-2 w-full rounded-lg bg-emerald-400 px-4 py-3 text-base font-bold text-slate-900"
        >
          ▶ Start {chainLabel ?? 'next hold'}
          {holdTarget ? ` · ${holdTarget}` : ''}
        </button>
      )}
    </div>
  );
}
