import type { Exercise } from '../types';
import { focusStep, type FocusAction } from '../lib/focus';
import {
  elapsedMs,
  formatClock,
  formatHold,
  formatHoldTarget,
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

/**
 * Eyes-shut hold mode (T21): one exercise, one screen, one control at a time.
 *
 * What T20's cues could not fix are the two moments that require *aiming* rather
 * than reading — tapping Start on one of six cards in a scrolling list, and
 * tapping "Log 8.4s as a set" on a 14px strip immediately after a maximum
 * effort, with chalked hands, standing at the board. This surface makes both of
 * them a button that fills the bottom of the screen.
 *
 * Two rules hold it together, and neither is about layout:
 *
 * - **D35: it is a rendering, not a mode.** Every control here calls the same
 *   handler the card calls, so a set logged from here is byte-identical to one
 *   logged from there — same carry-forward, same standard edge, same end reason.
 *   It stores nothing and persists nothing (D18).
 * - **D36: the screen is not a button.** Only the primary control ends a hold.
 *   Ending a hold *writes a number* into the series §7 asks the owner to read,
 *   and a knee or a brushed screen must not be able to author one.
 */
export function FocusHold({
  exercise,
  state,
  hold,
  timerHold,
  chainLabel,
  chainSpoken,
  lastSummary,
  reading,
  voice,
  timerExerciseName,
  onExit,
  onStart,
  onStop,
  onSkip,
  onExtend,
  onLogHeld,
  onCountEnd,
}: {
  exercise: Exercise;
  state: TimerState;
  /** The focused exercise's hold spec — what the *view* reports. */
  hold: HoldSpec;
  /** The hold spec of whatever exercise the timer belongs to — what the *cues* read. */
  timerHold: HoldSpec | null;
  chainLabel: string | null;
  chainSpoken: string | null;
  /** T11's one-line summary of last time, or null when there is no record. */
  lastSummary: string | null;
  /** T22: the running rest's reading list, resolved for the *timer's* exercise. */
  reading: RestReading | null;
  voice: boolean;
  /** Named only when the timer belongs to a different exercise (AC9). */
  timerExerciseName: string | null;
  onExit: () => void;
  onStart: () => void;
  onStop: (auto?: boolean) => void;
  onSkip: () => void;
  onExtend: (seconds: number) => void;
  onLogHeld: (heldMs: number) => void;
  onCountEnd: () => void;
}) {
  const now = useNow(state.phase !== 'idle');
  useTimerCues({ state, now, hold: timerHold, voice, chainSpoken, onStop, onCountEnd });

  const restDone = isRestComplete(state, now);
  const { action, otherRunning } = focusStep(state, exercise.id, restDone);
  const mine = state.exerciseId === exercise.id;
  const holding = mine && state.phase === 'holding';

  // T22: while *this* exercise's rest is running, the reading area is the deck.
  // Gated on `mine` because the deck follows the clock, not the view — a rest
  // running on the half-crimp hang while focus sits on the open-hand one is
  // still the half-crimp's rest, and this screen is not about it (AC9).
  const restingHere = mine && state.phase === 'resting' && !restDone;
  const deck = restingHere ? (reading?.deck ?? []) : [];
  const cardIndex = restCardIndex(restElapsedMs(state, now), deck.length);
  const restCard = deck[cardIndex];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-brand-bg [padding-bottom:env(safe-area-inset-bottom)]">
      {/* Small and cornered on purpose: the exit is the one control on this
          screen that must NOT be findable by feel. */}
      <header className="flex items-center justify-between px-4 pt-3">
        <button
          onClick={onExit}
          aria-label="Leave focus mode"
          className="rounded-lg px-3 py-2 text-sm text-slate-500"
        >
          ✕ Exit
        </button>
        {chainLabel && (
          <span className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            {chainLabel}
          </span>
        )}
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-100">
          {exercise.name}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          target {formatHoldTarget(hold)}
          {exercise.restSeconds ? ` · rest ${formatClock(exercise.restSeconds * 1000)}` : ''}
        </p>

        <Readout state={state} now={now} hold={hold} mine={mine} restDone={restDone} />

        {/* The wall card the owner declined to print: protocol, cues and last
            time's numbers, at a size that reads from the board — but only while
            standing still. A running hold gets the screen to itself.

            T22 amends T21 AC6 here, and only here: while a rest is *running*,
            this block yields to the paced deck, which carries the same material
            plus `howTo` and `safetyNotes`, one piece at a time instead of all at
            once. Rendering both would put the same cue on screen twice. The
            moment the rest is over — and every other time no hold is running —
            the wall card is exactly what T21 left. */}
        {!holding && (
          <div className="mt-auto space-y-3 pb-3 pt-4">
            {otherRunning && timerExerciseName && (
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                A timer is still running on {timerExerciseName}. Starting here takes it over.
              </p>
            )}
            {restCard ? (
              <RestCardView
                card={restCard}
                report={reading?.report ?? null}
                index={cardIndex}
                total={deck.length}
              />
            ) : (
              <>
                {lastSummary && (
                  <p className="text-base leading-snug text-slate-400">
                    <span className="font-semibold uppercase tracking-wide text-slate-500">
                      Last
                    </span>{' '}
                    <span className="text-slate-300">{lastSummary}</span>
                  </p>
                )}
                <p className="text-base leading-snug text-slate-200">{exercise.prescription}</p>
                {exercise.cues.length > 0 && (
                  <ul className="list-disc space-y-1.5 pl-5 text-base leading-snug text-slate-400 marker:text-slate-600">
                    {exercise.cues.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </main>

      <footer className="space-y-2 px-4 pb-4 pt-2">
        {/* Secondary controls stay small deliberately: a giant button that ends
            §4C's 3 minutes early is how a prescribed rest erodes (T19). */}
        {mine && state.phase === 'resting' && (
          <div className="flex gap-2">
            <button
              onClick={() => onExtend(30)}
              className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-400"
            >
              +30s
            </button>
            <button
              onClick={onSkip}
              className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-400"
            >
              Skip rest
            </button>
          </div>
        )}
        {mine && state.heldMs !== null && state.phase === 'idle' && (
          <button
            onClick={onSkip}
            className="w-full rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-400"
          >
            Discard this hold
          </button>
        )}

        <PrimaryControl
          action={action}
          state={state}
          hold={hold}
          chainLabel={chainLabel}
          onStart={onStart}
          onStop={onStop}
          onSkip={onSkip}
          onLogHeld={onLogHeld}
        />
      </footer>
    </div>
  );
}

/** The big number: what the owner would be squinting at, if they were looking. */
function Readout({
  state,
  now,
  hold,
  mine,
  restDone,
}: {
  state: TimerState;
  now: number;
  hold: HoldSpec;
  mine: boolean;
  restDone: boolean;
}) {
  if (!mine) return null;

  if (state.phase === 'counting') {
    return (
      <Big value={String(leadInSecondsLeft(state, now))} label="get ready" tone="text-amber-300" />
    );
  }

  if (state.phase === 'holding') {
    const elapsed = elapsedMs(state, now);
    const status = holdStatus(elapsed, hold);
    // An open hold (§4E) has no range to be under or over — it is simply running,
    // and every second counts. Anything else would be reporting a band the plan
    // deliberately does not prescribe.
    const label = isOpenHold(hold)
      ? 'holding'
      : status === 'in'
        ? '✓ in range'
        : status === 'under'
          ? 'building'
          : 'past target';
    const tone =
      status === 'in' ? 'text-emerald-300' : status === 'under' ? 'text-sky-300' : 'text-amber-300';
    return <Big value={formatHold(elapsed)} label={label} tone={tone} />;
  }

  if (state.heldMs !== null) {
    return <Big value={formatHold(state.heldMs)} label="held — record it" tone="text-emerald-300" />;
  }

  if (state.phase === 'resting') {
    return (
      <Big
        value={formatClock(restRemainingMs(state, now))}
        label={restDone ? 'rest complete — go' : 'resting'}
        tone={restDone ? 'text-emerald-300' : 'text-slate-100'}
      />
    );
  }

  // Nothing running: no number exists yet, and rendering a 0.0s would look like
  // a clock that had already begun.
  return null;
}

function Big({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="py-4">
      <p className={`font-mono text-7xl font-bold leading-none tabular-nums ${tone}`}>{value}</p>
      <p className={`mt-2 text-lg font-semibold ${tone}`} aria-live="polite">
        {label}
      </p>
    </div>
  );
}

/**
 * The one thing to hit. Full width, and tall enough to find without looking —
 * `min-h-[22vh]` rather than a padding guess, because "a fifth of the screen"
 * is the actual requirement (AC2) and padding does not survive a short viewport.
 */
function PrimaryControl({
  action,
  state,
  hold,
  chainLabel,
  onStart,
  onStop,
  onSkip,
  onLogHeld,
}: {
  action: FocusAction;
  state: TimerState;
  hold: HoldSpec;
  chainLabel: string | null;
  onStart: () => void;
  onStop: (auto?: boolean) => void;
  onSkip: () => void;
  onLogHeld: (heldMs: number) => void;
}) {
  const base =
    'flex min-h-[22vh] w-full items-center justify-center rounded-2xl px-4 text-center text-3xl font-bold leading-tight';

  switch (action) {
    case 'stop':
      return (
        <button onClick={() => onStop(false)} className={`${base} bg-slate-100 text-slate-900`}>
          STOP
        </button>
      );
    case 'log':
      return (
        <button
          onClick={() => onLogHeld(state.heldMs as number)}
          className={`${base} bg-emerald-400 text-slate-900`}
        >
          Log {formatHold(state.heldMs as number)}
        </button>
      );
    case 'cancel':
      return (
        <button
          onClick={onSkip}
          className={`${base} border-2 border-slate-700 bg-transparent text-slate-400`}
        >
          Cancel
        </button>
      );
    case 'wait':
      // A running rest offers nothing large. Skip exists above, small, where a
      // deliberate hand can find it and a hurried one will not.
      return (
        <div
          className={`${base} border-2 border-dashed border-slate-800 text-lg font-semibold text-slate-600`}
        >
          Rest — the app will tell you
        </div>
      );
    case 'start-next':
    case 'start':
      return (
        <button onClick={onStart} className={`${base} bg-brand-accent text-brand-bg`}>
          ▶ Start {chainLabel ?? 'hold'}
          <span className="ml-2 text-xl font-semibold opacity-70">{formatHoldTarget(hold)}</span>
        </button>
      );
  }
}
