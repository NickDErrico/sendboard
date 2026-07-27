import { useEffect, useRef, useState } from 'react';
import type { Exercise } from '../types';
import {
  elapsedMs,
  formatClock,
  formatHold,
  isRestComplete,
  restRemainingMs,
  type HoldSpec,
  type TimerState,
} from '../lib/timer';
import {
  formatRun,
  isCycleStale,
  isLastStage,
  nextStage,
  roundLabel,
  shouldStartNextRound,
  type WarmupPlan,
} from '../lib/warmup';
import { useNow, useTimerCues } from '../lib/timerCues';
import { Icon, btnGhost, btnPrimary, btnSecondary, btnStop, kicker } from './ui';

/**
 * The warm-up runner (T23).
 *
 * §4A's 10–15 minutes are the part of the session the app had least to say about,
 * and §7 is unambiguous about what that part is for. Two forms, decided by
 * `warmupPlanOf` rather than here:
 *
 * - **staged** — the plan's four stages, one at a time, advanced by a tap. No
 *   stage counts down, because §4A gives a total and withholds the parts (D40).
 * - **cycle** — the abrahangs' `10s on / 50s off`, repeating with no tap per
 *   round (D39). The one place in the app where a hold starts itself, and it is
 *   gated on the catalog's `category === 'warmup'` rather than on this file.
 *
 * The cycle drives the *session's* timer, so its cues are the ones T13 and T20
 * already paid for. Exactly one view holds `useTimerCues`, which is why this
 * renders instead of the session rather than over it.
 */
export function WarmupRunner({
  exercise,
  plan,
  state,
  timerHold,
  completed,
  voice,
  onExit,
  onStartRound,
  onStop,
  onSkip,
  onComplete,
  onFinish,
}: {
  exercise: Exercise;
  plan: WarmupPlan;
  state: TimerState;
  /** The hold spec of whatever the timer belongs to — what the *cues* read. */
  timerHold: HoldSpec | null;
  completed: boolean;
  voice: boolean;
  onExit: () => void;
  /**
   * Starts a round's hold directly, with no count-in: D33's count exists so
   * `holdSec` measures the effort rather than the tap offset, and a warm-up round
   * records no `holdSec` — so it would spend three seconds of a prescribed sixty.
   */
  onStartRound: () => void;
  onStop: (auto?: boolean) => void;
  onSkip: () => void;
  /** Toggles the D16 mark — the small control, and the way to correct a mistake. */
  onComplete: () => void;
  /**
   * The end of a run: records the warm-up as done and leaves. Still one
   * deliberate tap, which is all D16 asks — what it forbids is the app deciding
   * on its own, not the owner saying so with the button that is already there.
   */
  onFinish: () => void;
}) {
  // Ticks unconditionally, unlike the other two surfaces: this one has a clock of
  // its own — the run's elapsed time against §4A's 10–15 min — and a staged
  // warm-up leaves the session timer idle the whole way through.
  const now = useNow(true);
  useTimerCues({ state, now, hold: timerHold, voice, chainSpoken: null, onStop });

  // Every bit of this is view state and none of it outlives the surface (D18).
  // The run's start is an absolute instant for the same reason every phase in
  // `timer.ts` is: a throttled tick must cost a stale frame, never elapsed time.
  const [stage, setStage] = useState(0);
  const [runStartedAt] = useState(() => Date.now());
  const [armed, setArmed] = useState(false);
  const [round, setRound] = useState(0);

  const mine = state.exerciseId === exercise.id;
  const cycling = plan.form === 'cycle';
  const stageCount = plan.form === 'staged' ? plan.stages.length : 0;

  // D39's fence, in two effects. The cycle advances only while this surface is
  // mounted and the page is visible, and a transition the app slept through
  // disarms it rather than starting a round nobody heard begin (T20 AC9's rule).
  const startedFor = useRef<number | null>(null);
  const visible = typeof document === 'undefined' || document.visibilityState === 'visible';
  const goNow = cycling && mine && shouldStartNextRound(state, now, armed, visible);
  useEffect(() => {
    if (!goNow) return;
    if (startedFor.current === state.startedAt) return;
    startedFor.current = state.startedAt;
    setRound((r) => r + 1);
    onStartRound();
  }, [goNow, state.startedAt, onStartRound]);

  const stale = cycling && mine && isCycleStale(state, now, armed);
  useEffect(() => {
    if (stale) setArmed(false);
  }, [stale]);

  // Leaving stops the repeat with no cleanup to write: `armed` is this
  // component's state, so it dies with the surface. An interval already running
  // belongs to the *session* and keeps running on the bar (T21 AC7) — only the
  // automation was ever the view's.

  function beginCycle() {
    setArmed(true);
    setRound((r) => r + 1);
    onStartRound();
  }

  function endCycle() {
    setArmed(false);
    onSkip();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col px-[22px] pt-[54px] [background:radial-gradient(120%_70%_at_50%_12%,#1e2032_0%,#161826_70%)] [padding-bottom:calc(34px+env(safe-area-inset-bottom))]">
      {/* Small and cornered, exactly as T21 has it: the exit is the one control
          here that must not be findable by feel. */}
      <header className="flex items-center justify-between">
        <button
          onClick={onExit}
          aria-label="Leave the warm-up runner"
          className={`${btnGhost} -ml-1.5 h-[34px] w-[34px] px-0`}
        >
          <Icon name="x" className="text-[20px]" />
        </button>
        <span className="text-[11px] uppercase tracking-[0.1em] text-neutral-600">
          Warm-up · {formatRun(now - runStartedAt)}
        </span>
      </header>

      <main className="mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <h1 className="text-[26px] font-medium leading-[1.1] tracking-[-0.02em]">{exercise.name}</h1>
        {/* The plan's own number, reported beside the clock and never counted
            toward: §4A's range is a range, and a shorter warm-up on a lighter
            week is as correct as a longer one (D23, §4F). */}
        <p className="mt-0.5 text-sm text-neutral-500">{plan.prescription}</p>

        {plan.form === 'staged' ? (
          <StagedBody plan={plan} stage={stage} />
        ) : (
          <CycleBody
            plan={plan}
            state={state}
            now={now}
            mine={mine}
            armed={armed}
            round={round}
          />
        )}

        {exercise.safetyNotes.length > 0 && (
          <div className="mt-auto space-y-1.5 pb-3 pt-4">
            {exercise.safetyNotes.map((note, i) => (
              <p key={i} className="text-[12.5px] leading-relaxed text-warn">
                {note}
              </p>
            ))}
          </div>
        )}
      </main>

      <footer className="space-y-2 pt-2">
        {/* Secondary controls stay small, T21's rule: the one that resumes a
            stopped cadence must not be the size of the one that ends it. */}
        {plan.form === 'cycle' && !armed && round > 0 && (
          <button onClick={beginCycle} className={`${btnSecondary} w-full py-2 !text-neutral-400`}>
            <Icon name="play" weight="fill" className="text-xs" />
            More rounds
          </button>
        )}

        {/* D16: the warm-up is marked done by a tap and by nothing else — this is
            the condition §4E reads back as "after a thorough warm-up" (D29), so
            it must mean the owner said so. Here as the small control because the
            primary already records it at the end of a run; this one is the state,
            and the way to take it back. */}
        <button
          onClick={onComplete}
          aria-pressed={completed}
          className={`flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-[13px] font-medium transition-colors ${
            completed
              ? 'border-accent bg-accent/[.12] text-accent-200'
              : 'border-neutral-800 text-neutral-400 hover:border-white/[.34]'
          }`}
        >
          <Icon
            name={completed ? 'check-circle' : 'circle'}
            weight={completed ? 'fill' : 'regular'}
            className={`text-[15px] ${completed ? 'text-accent-400' : 'text-neutral-600'}`}
          />
          {completed ? 'Warm-up marked done' : 'Mark warm-up done'}
        </button>

        <PrimaryControl
          plan={plan}
          state={state}
          mine={mine}
          armed={armed}
          round={round}
          stage={stage}
          onAdvance={() => setStage((s) => nextStage(s, stageCount))}
          onFinish={onFinish}
          onBeginCycle={beginCycle}
          onEndCycle={endCycle}
        />
      </footer>
    </div>
  );
}

function StagedBody({ plan, stage }: { plan: { stages: string[] }; stage: number }) {
  const total = plan.stages.length;
  return (
    <div className="py-4">
      <p className={kicker}>
        Stage {Math.min(stage + 1, total)} of {total}
      </p>
      <p className="mt-2 text-2xl font-medium leading-snug">{plan.stages[stage]}</p>
      <span aria-hidden className="mt-4 flex items-center gap-1.5">
        {plan.stages.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${i === stage ? 'bg-accent' : i < stage ? 'bg-neutral-600' : 'bg-neutral-800'}`}
          />
        ))}
      </span>
    </div>
  );
}

function CycleBody({
  plan,
  state,
  now,
  mine,
  armed,
  round,
}: {
  plan: { holdSec: number; restSec: number };
  state: TimerState;
  now: number;
  mine: boolean;
  armed: boolean;
  round: number;
}) {
  const holding = mine && state.phase === 'holding';
  const resting = mine && state.phase === 'resting';
  const restDone = isRestComplete(state, now);

  const value = holding
    ? formatHold(elapsedMs(state, now))
    : resting
      ? formatClock(restRemainingMs(state, now))
      : '—';
  const label = holding
    ? `hang · ${plan.holdSec}s`
    : resting
      ? restDone
        ? 'next round'
        : `rest · ${plan.restSec}s`
      : armed
        ? 'ready'
        : `${plan.holdSec}s on · ${plan.restSec}s off`;
  const tone = holding ? 'text-accent' : restDone ? 'text-accent-300' : 'text-ink';

  return (
    <div className="py-4">
      {/* A count of what has been run, never a target to reach: §4A says
          "~10 min at light intensity" and states no round count, so the app
          reports and the owner stops (D23, D40). */}
      <p className={kicker}>{round > 0 ? roundLabel(round) : 'not started'}</p>
      <p
        className={`mt-1 text-[72px] font-semibold leading-none tracking-[-0.04em] tabular-nums ${tone}`}
      >
        {value}
      </p>
      <p className={`mt-2 text-base font-medium tracking-[0.04em] ${tone}`} aria-live="polite">
        {label}
      </p>
    </div>
  );
}

/** One thing to hit, `min-h-[22vh]` tall, exactly as T21 sized it. */
function PrimaryControl({
  plan,
  state,
  mine,
  armed,
  round,
  stage,
  onAdvance,
  onFinish,
  onBeginCycle,
  onEndCycle,
}: {
  plan: WarmupPlan;
  state: TimerState;
  mine: boolean;
  armed: boolean;
  round: number;
  stage: number;
  onAdvance: () => void;
  onFinish: () => void;
  onBeginCycle: () => void;
  onEndCycle: () => void;
}) {
  const base = 'w-full !rounded-[14px] px-4 py-5 text-center text-[19px] leading-tight';
  const finish = (
    <button onClick={onFinish} className={`${btnPrimary} ${base}`}>
      <Icon name="check" className="text-[17px]" />
      Warmed up
    </button>
  );

  if (plan.form === 'staged') {
    return isLastStage(stage, plan.stages.length) ? (
      finish
    ) : (
      <button onClick={onAdvance} className={`${btnPrimary} ${base}`}>
        Next stage
      </button>
    );
  }

  // A running cadence offers one thing: stopping it. Nothing here ends a single
  // interval early — a giant button that cut one round out of ten would be read
  // as ending the warm-up, and "More rounds" above is how a stopped one resumes.
  if (armed && mine && state.phase !== 'idle') {
    return (
      <button onClick={onEndCycle} className={`${btnStop} ${base}`}>
        Stop
      </button>
    );
  }

  if (round > 0) return finish;

  return (
    <button onClick={onBeginCycle} className={`${btnPrimary} ${base} gap-2.5`}>
      <Icon name="play" weight="fill" className="text-[17px]" />
      Start {plan.holdSec}s / {plan.restSec}s
    </button>
  );
}
