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
  restCountdownSecondsLeft,
  restElapsedMs,
  restRemainingMs,
  type HoldSpec,
  type TimerState,
} from '../lib/timer';
import { restCardIndex, type RestReading } from '../lib/rest';
import { useNow, useTimerCues } from '../lib/timerCues';
import { RestCardView } from './RestCard';
import { HOLD_STATUS, Icon, btnGhost, btnPrimary, btnSecondary, btnStop, kicker } from './ui';

// The bar is `#1c1e2a` rather than the card ground: it sits *over* the cards, and
// a surface that lifts above the page in Nocturne does it with an edge and
// ambient darkness, not a lighter fill.
const BAR =
  'fixed inset-x-0 bottom-0 z-40 px-4 pt-3 backdrop-blur-[14px] ' +
  '[background:color-mix(in_srgb,#1c1e2a_96%,transparent)] ' +
  'shadow-[0_-1px_0_#595d6c,0_-14px_34px_rgba(0,0,0,.5)] ' +
  '[padding-bottom:calc(24px+env(safe-area-inset-bottom))]';

export function SessionTimer({
  state,
  exerciseName,
  hold,
  chainLabel = null,
  chainSpoken = null,
  heldLabel = null,
  reading = null,
  voice = true,
  chainDone = false,
  advanceLabel = null,
  onAdvance,
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
   * T31: what the Log control will actually write, where that is not the last
   * hold — a rep-chained set records "4 x 3.0s", and a button offering "3.0s"
   * would name a quarter of it. Null everywhere else, which is every exercise
   * outside §4B's weeks 1–4.
   */
  heldLabel?: string | null;
  /**
   * T22: what the rest has to read — the deck, and the numbers its report card
   * shows. Resolved for the *timer's* exercise by the session, so it stays
   * correct wherever the bar happens to be rendered. Null outside a rest.
   */
  reading?: RestReading | null;
  /** T20/D34: whether the *words* are on. Every tone fires either way. */
  voice?: boolean;
  /** T32: the prescription's top is logged — the app has no further set to offer. */
  chainDone?: boolean;
  /**
   * T32: what "mark done and move on" would do, spelled out — "Mark done · next:
   * Max Hang — Open-Hand", or the finish where nothing else is unmarked. Null
   * suppresses the control, which is what an exercise short of the plan's floor
   * gets: the card's own Mark done is still there for stopping early.
   */
  advanceLabel?: string | null;
  onAdvance?: () => void;
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
    <div className={BAR}>
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
            heldLabel={heldLabel}
            onLog={() => onLogHeld(state.heldMs as number)}
            onDismiss={state.phase === 'idle' ? onSkip : undefined}
          />
        )}

        {state.phase === 'resting' && (
          <RestView
            remaining={restRemainingMs(state, now)}
            elapsed={restElapsedMs(state, now)}
            fraction={state.restMs > 0 ? restRemainingMs(state, now) / state.restMs : 0}
            countdown={restCountdownSecondsLeft(state, now)}
            done={restDone}
            name={exerciseName}
            chainLabel={chainLabel}
            holdTarget={hold ? formatHoldTarget(hold) : null}
            reading={reading}
            chainDone={chainDone}
            advanceLabel={state.heldMs === null ? advanceLabel : null}
            onAdvance={onAdvance}
            onSkip={onSkip}
            onExtend={onExtend}
            onStartNext={onStartNext}
          />
        )}
      </div>
    </div>
  );
}

/** The line above every reading: what is running, and where in the set chain it is. */
function BarHead({
  label,
  name,
  right,
  rightClass = 'text-neutral-600',
}: {
  label: string;
  name: string;
  right: string;
  rightClass?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <p className={`${kicker} min-w-0 truncate`}>
        {label} · <span className="text-neutral-300">{name}</span>
      </p>
      <p className={`ml-auto shrink-0 text-[11px] ${rightClass}`}>{right}</p>
    </div>
  );
}

/** The 42px reading. Tabular by default (index.css), so it does not jitter. */
// Weight 600 is the one place Nocturne goes past 500, and only here: a numeral
// is not a heading, and this one is read at arm's length off the floor.
const NUMERAL = 'text-[42px] font-semibold leading-none tracking-[-0.03em] tabular-nums';

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
      <BarHead
        label="Get ready"
        name={name}
        right={`${chainLabel ? `${chainLabel} · ` : ''}${holdTarget ? `target ${holdTarget}` : 'hold'}`}
      />
      <div className="mt-1 flex items-center gap-3">
        <span className={`${NUMERAL} text-accent-300`} aria-live="assertive">
          {secondsLeft}
        </span>
        <span className="text-[13px] font-medium text-accent-300">counting in…</span>
        <button onClick={onCancel} className={`${btnSecondary} ml-auto shrink-0 !rounded-[10px] px-4 py-2`}>
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
  const style = HOLD_STATUS[status];
  // "in range" is meaningless without a range: an open hold is simply running,
  // and every second of it counts (T16).
  const label = isOpenHold(hold) ? 'holding' : style.label;

  return (
    <div>
      {/* T19: the position rides beside the target, where the eye already goes
          for "how long" — mid-hang is not the moment to count logged rows. */}
      <BarHead
        label="Hold"
        name={name}
        right={`${chainLabel ? `${chainLabel} · ` : ''}target ${formatHoldTarget(hold)}`}
      />

      <div className="mt-1 flex items-baseline gap-3">
        <span className={`${NUMERAL} ${style.text}`}>{formatHold(elapsed)}</span>
        <span className={`text-[13px] font-medium ${style.text}`} aria-live="polite">
          {label}
        </span>
      </div>

      {/* An open hold (T16) has no target to fill toward, so it gets no bar: a
          progress bar with an invented ceiling would imply a duration §4E
          deliberately does not prescribe. The count itself is the measurement. */}
      {hold.max !== null && (
        <>
          <div className="relative mt-2.5 h-1.5 overflow-hidden rounded-sm bg-neutral-900">
            {/* The target band: everything from min to the top of the range. */}
            <div
              className="absolute inset-y-0 right-0 bg-neutral-800"
              style={{ left: `${holdBandStart(hold) * 100}%` }}
            />
            <div
              className={`absolute inset-y-0 left-0 transition-[width] duration-100 ease-linear ${style.fill}`}
              style={{ width: `${holdFraction(elapsed, hold) * 100}%` }}
            />
          </div>
          <div className="mt-[3px] flex justify-between text-[9.5px] tabular-nums text-neutral-700">
            <span>0</span>
            {hold.min !== hold.max && <span>{hold.min}s</span>}
            <span>{hold.max}s</span>
          </div>
        </>
      )}

      <button onClick={() => onStop(false)} className={`${btnStop} mt-2.5 w-full !rounded-[10px] py-[13px] text-[15px]`}>
        Stop
      </button>
    </div>
  );
}

function HeldResult({
  heldMs,
  heldLabel = null,
  onLog,
  onDismiss,
}: {
  heldMs: number;
  /**
   * What the set will actually record, where that is not simply the last hold
   * (T31): a rep-chained set writes "4 x 3.0s", and a button offering to log
   * "3.0s" would name one rep of the four it is about to write.
   */
  heldLabel?: string | null;
  onLog: () => void;
  onDismiss?: () => void;
}) {
  const label = heldLabel ?? formatHold(heldMs);
  return (
    <div className="mb-2 flex items-center gap-2.5">
      <Icon name="check-circle" weight="fill" className="shrink-0 text-[18px] text-accent-400" />
      <p className="shrink-0 text-[13px] font-medium text-accent-300">Held {formatHold(heldMs)}</p>
      <button onClick={onLog} className={`${btnPrimary} min-w-0 flex-1 truncate !rounded-[10px] py-2.5 text-[13px]`}>
        Log {label} as a set
      </button>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss timer" className={`${btnGhost} shrink-0 px-2`}>
          <Icon name="x" className="text-sm" />
        </button>
      )}
    </div>
  );
}

function RestView({
  remaining,
  elapsed,
  fraction,
  countdown,
  done,
  name,
  chainLabel,
  holdTarget,
  reading,
  chainDone,
  advanceLabel,
  onAdvance,
  onSkip,
  onExtend,
  onStartNext,
}: {
  remaining: number;
  elapsed: number;
  fraction: number;
  /** T30: seconds left inside the closing countdown, or 0 outside it. */
  countdown: number;
  done: boolean;
  name: string;
  chainLabel: string | null;
  holdTarget: string | null;
  reading: RestReading | null;
  /** T32: the prescription's top is logged, so the start control is the exception. */
  chainDone: boolean;
  /**
   * T32: "Mark done · next: …", or null where the control is not offered — short
   * of the plan's floor, or with a measured hold still waiting to be recorded
   * (completing an exercise around an unlogged hang is how one disappears, D16).
   */
  advanceLabel: string | null;
  onAdvance?: () => void;
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

  // T30: the last seconds are the walk back to the board, so they read as the
  // count-in does — accent-300, and a header that says what to do rather than
  // what is running. The card stays put underneath: it is five seconds, and a
  // bar that changes height would move the buttons under a hand reaching for
  // one. The colour is the whole visual change, because the tick is the cue.
  const closing = countdown > 0;
  const lit = done || closing;

  return (
    <div>
      <BarHead
        label="Rest"
        name={name}
        right={
          done
            ? 'Rest complete — go'
            : closing
              ? `get ready${chainLabel ? ` · ${chainLabel}` : ''}`
              : chainLabel
                ? `next · ${chainLabel}`
                : 'resting'
        }
        rightClass={lit ? 'text-accent-300' : 'text-neutral-600'}
      />

      <div className="mt-1 flex items-center gap-3">
        <span className={`${NUMERAL} ${lit ? 'text-accent-300' : 'text-accent'}`}>
          {formatClock(remaining)}
        </span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => onExtend(30)} className={`${btnSecondary} !rounded-[10px] px-3 py-2.5 text-[13px]`}>
            +30s
          </button>
          <button onClick={onSkip} className={`${btnPrimary} !rounded-[10px] px-4 py-2.5 text-[13px]`}>
            {done ? 'Done' : 'Skip'}
          </button>
        </div>
      </div>

      <div className="mt-2.5 h-1.5 overflow-hidden rounded-sm bg-neutral-900">
        <div
          className={`h-full transition-[width] duration-100 ease-linear ${lit ? 'bg-accent-300' : 'bg-accent'}`}
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

      {/* T32: the other end of the chain, and the same argument T19 AC4 made for
          the button below it — this bar covers the card, so without a control
          here "that exercise is done" costs an exit, a scroll, a Mark done and a
          hunt for the next card. It sits above the start control rather than in
          its place: the bar grows upward from a fixed edge, so the thumb that
          has spent four rests finding "Start" at the bottom still finds it.
          Emphasis moves instead — past the prescription's top the start button
          reads as the secondary it now is, and nothing is removed (D23). */}
      {advanceLabel && onAdvance && (
        <button
          onClick={onAdvance}
          className={`${chainDone ? btnPrimary : btnSecondary} mt-2.5 w-full truncate !rounded-[10px] py-2.5 text-[13px]`}
        >
          <Icon name="check-circle" weight="fill" className="shrink-0 text-[13px]" />
          <span className="min-w-0 truncate">{advanceLabel}</span>
        </button>
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
          className={`${chainDone ? btnSecondary : btnPrimary} mt-2.5 w-full !rounded-[10px] py-[13px] text-[15px]`}
        >
          <Icon name="play" weight="fill" className="text-[13px]" />
          Start {chainLabel ?? 'next hold'}
          {holdTarget ? ` · ${holdTarget}` : ''}
        </button>
      )}
    </div>
  );
}
