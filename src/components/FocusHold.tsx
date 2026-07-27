import type { Exercise } from '../types';
import { focusStep, type FocusAction } from '../lib/focus';
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
import { HOLD_STATUS, Icon, btnGhost, btnPrimary, btnSecondary, btnStop, tagNeutral } from './ui';

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
 *
 * Nocturne gave it the one place in the app where the ground lifts — a radial
 * wash behind the numeral — and the one place the accent is used as light rather
 * than as a line: the reading throws a 60px glow in its own status colour.
 */
export function FocusHold({
  exercise,
  state,
  hold,
  timerHold,
  chainLabel,
  chainSpoken,
  edgeLabel,
  lastSummary,
  prescriptionLine,
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
  /**
   * The edge the next set will be logged on ("20 mm"), or null where the
   * exercise records none.
   *
   * It leads the meta row because it is the one setup value you can still get
   * wrong after the phone is on the floor — the chain position and the target
   * are the app's to know, but which rung you are standing under is yours.
   * Resolved by the session from the same seed the set logger uses, so it is
   * the number that will actually be written.
   */
  edgeLabel: string | null;
  /** T11's one-line summary of last time, or null when there is no record. */
  lastSummary: string | null;
  /**
   * The one protocol line to read from the board (T24).
   *
   * This week's variant where §4B declares two, otherwise `exercise.prescription`
   * unchanged — resolved by the session, because the derived week lives there.
   */
  prescriptionLine: string;
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
    <div className="fixed inset-0 z-50 flex flex-col px-[22px] pb-[34px] pt-[54px] [background:radial-gradient(120%_70%_at_50%_12%,#1e2032_0%,#161826_70%)] [padding-bottom:calc(34px+env(safe-area-inset-bottom))]">
      {/* Small and cornered on purpose: the exit is the one control on this
          screen that must NOT be findable by feel. */}
      <header className="flex items-center">
        <button
          onClick={onExit}
          aria-label="Leave focus mode"
          className={`${btnGhost} -ml-1.5 h-[34px] w-[34px] px-0`}
        >
          <Icon name="x" className="text-[20px]" />
        </button>
        <span className="ml-auto text-[11px] uppercase tracking-[0.1em] text-neutral-600">Focus</span>
      </header>

      <div className="mt-6 shrink-0">
        <h1 className="text-[26px] font-medium leading-[1.1] tracking-[-0.02em]">{exercise.name}</h1>
        {/* 14px, not the 13px body size: this line is read standing at the board
            with the phone on the floor. */}
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5 text-sm text-neutral-500">
          {edgeLabel && <span className={tagNeutral}>{edgeLabel}</span>}
          {chainLabel && <span>{chainLabel}</span>}
          <span>target {formatHoldTarget(hold)}</span>
          {exercise.restSeconds ? <span>rest {formatClock(exercise.restSeconds * 1000)}</span> : null}
        </p>
      </div>

      <main className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto py-4">
        <Readout state={state} now={now} hold={hold} mine={mine} restDone={restDone} />
      </main>

      {/* The wall card the owner declined to print: protocol, cues and last
          time's numbers, at a size that reads from the board.

          The two *lines* survive a running hold — they are what the owner glances
          at between the hang and the log, and they cost the numeral nothing. The
          cue list does not: a running hold gets the screen.

          T22 amends T21 AC6 here, and only here: while a rest is *running*, this
          block yields to the paced deck, which carries the same material plus
          `howTo` and `safetyNotes`, one piece at a time instead of all at once.
          Rendering both would put the same cue on screen twice. */}
      <div className="mb-[18px] shrink-0 space-y-2 text-[12.5px] leading-relaxed">
        {otherRunning && timerExerciseName && !holding && (
          <p className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-warn">
            A timer is still running on {timerExerciseName}. Starting here takes it over.
          </p>
        )}
        {restCard && !holding ? (
          <RestCardView
            card={restCard}
            report={reading?.report ?? null}
            index={cardIndex}
            total={deck.length}
          />
        ) : (
          <>
            <p className="text-neutral-300">{prescriptionLine}</p>
            {lastSummary && <p className="text-neutral-500">Last {lastSummary}</p>}
            {!holding && exercise.cues.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-neutral-500 marker:text-neutral-700">
                {exercise.cues.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <footer className="shrink-0 space-y-2">
        {/* Secondary controls stay small deliberately: a giant button that ends
            §4C's 3 minutes early is how a prescribed rest erodes (T19). */}
        {mine && state.phase === 'resting' && (
          <div className="flex gap-2">
            <button onClick={() => onExtend(30)} className={`${btnSecondary} flex-1 py-2`}>
              +30s
            </button>
            <button onClick={onSkip} className={`${btnSecondary} flex-1 py-2`}>
              Skip rest
            </button>
          </div>
        )}
        {mine && state.heldMs !== null && state.phase === 'idle' && (
          <button onClick={onSkip} className={`${btnSecondary} w-full py-2`}>
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
      <Big
        value={String(leadInSecondsLeft(state, now))}
        label="get ready"
        tone="text-accent-300"
        glow="#d2cefd"
      />
    );
  }

  if (state.phase === 'holding') {
    const elapsed = elapsedMs(state, now);
    const status = holdStatus(elapsed, hold);
    const style = HOLD_STATUS[status];
    // An open hold (§4E) has no range to be under or over — it is simply running,
    // and every second counts. Anything else would be reporting a band the plan
    // deliberately does not prescribe, which is also why it draws no band.
    const label = isOpenHold(hold) ? 'holding' : style.label;
    return (
      <Big value={formatHold(elapsed)} label={label} tone={style.text} glow={style.hex}>
        {hold.max !== null && (
          <>
            <div className="relative h-2.5 w-full overflow-hidden rounded-[5px] bg-neutral-900">
              <div
                className="absolute inset-y-0 right-0 bg-neutral-800"
                style={{ left: `${holdBandStart(hold) * 100}%` }}
              />
              <div
                className={`absolute inset-y-0 left-0 transition-[width] duration-100 ease-linear ${style.fill}`}
                style={{ width: `${holdFraction(elapsed, hold) * 100}%` }}
              />
            </div>
            <div className="flex w-full justify-between text-[11px] tabular-nums text-neutral-700">
              <span>0</span>
              {hold.min !== hold.max && <span>{hold.min}s</span>}
              <span>{hold.max}s</span>
            </div>
          </>
        )}
      </Big>
    );
  }

  if (state.heldMs !== null) {
    return (
      <Big
        value={formatHold(state.heldMs)}
        label="held — record it"
        tone="text-accent-300"
        glow="#d2cefd"
      />
    );
  }

  if (state.phase === 'resting') {
    return (
      <Big
        value={formatClock(restRemainingMs(state, now))}
        label={restDone ? 'rest complete — go' : 'resting'}
        tone={restDone ? 'text-accent-300' : 'text-accent'}
        glow={restDone ? '#d2cefd' : '#9184d9'}
      />
    );
  }

  // Nothing running: no number exists yet, and rendering a 0.0s would look like
  // a clock that had already begun.
  return null;
}

function Big({
  value,
  label,
  tone,
  glow,
  children,
}: {
  value: string;
  label: string;
  tone: string;
  /** The status colour as a value, for the one glow in the system. */
  glow: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-5">
      <p
        className={`text-[108px] font-semibold leading-none tracking-[-0.05em] tabular-nums ${tone}`}
        style={{ textShadow: `0 0 60px color-mix(in srgb, ${glow} 34%, transparent)` }}
      >
        {value}
      </p>
      <p className={`text-base font-medium tracking-[0.04em] ${tone}`} aria-live="polite">
        {label}
      </p>
      {children}
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
  const base = 'w-full !rounded-[14px] px-4 py-5 text-center text-[19px] leading-tight';

  switch (action) {
    case 'stop':
      return (
        <button onClick={() => onStop(false)} className={`${btnStop} ${base}`}>
          Stop
        </button>
      );
    case 'log':
      return (
        <button
          onClick={() => onLogHeld(state.heldMs as number)}
          className={`${btnPrimary} ${base} text-[17px]`}
        >
          Log {formatHold(state.heldMs as number)} as a set
        </button>
      );
    case 'cancel':
      return (
        <button onClick={onSkip} className={`${btnSecondary} ${base}`}>
          Cancel
        </button>
      );
    case 'wait':
      // A running rest offers nothing large. Skip exists above, small, where a
      // deliberate hand can find it and a hurried one will not.
      return (
        <div
          className={`${base} border border-dashed border-neutral-800 text-base font-medium text-neutral-600`}
        >
          Rest — the app will tell you
        </div>
      );
    case 'start-next':
    case 'start':
      return (
        <button onClick={onStart} className={`${btnPrimary} ${base} gap-2.5`}>
          <Icon name="play" weight="fill" className="text-[17px]" />
          Start {chainLabel ?? 'hold'}
          <span className="text-base opacity-70">{formatHoldTarget(hold)}</span>
        </button>
      );
  }
}
