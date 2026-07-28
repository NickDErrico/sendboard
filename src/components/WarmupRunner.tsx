import { useEffect, useRef, useState } from 'react';
import type { Exercise, GripBlock } from '../types';
import {
  elapsedMs,
  formatClock,
  formatHold,
  isRestComplete,
  restCountdownSecondsLeft,
  restRemainingMs,
  type HoldSpec,
  type TimerState,
} from '../lib/timer';
import {
  formatGrip,
  formatGripRound,
  formatRun,
  gripAt,
  isCycleStale,
  isLastStage,
  isSequenceComplete,
  nextStage,
  roundLabel,
  shouldStartNextRound,
  totalRounds,
  type CyclePlan,
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
  // T29: the sequence's own end. A cycle with no declared grips never reaches it,
  // which is what keeps every pre-T29 cadence repeating exactly as it did.
  const sequenceDone = plan.form === 'cycle' && isSequenceComplete(plan.blocks, round);

  // D39's fence, in three effects. The cycle advances only while this surface is
  // mounted and the page is visible, a transition the app slept through disarms it
  // rather than starting a round nobody heard begin (T20 AC9's rule), and it never
  // runs past the last grip the addendum prescribes.
  const startedFor = useRef<number | null>(null);
  const visible = typeof document === 'undefined' || document.visibilityState === 'visible';
  const goNow =
    cycling && mine && !sequenceDone && shouldStartNextRound(state, now, armed, visible);
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

  // The last prescribed rest running out disarms the cycle rather than starting a
  // twenty-first hang. Waiting for the *rest* rather than disarming the instant
  // the count is reached is deliberate: §10A's last hang is still owed its 20
  // seconds, and the cues for it are the ones already running.
  const finished = cycling && mine && sequenceDone && armed && isRestComplete(state, now);
  useEffect(() => {
    if (finished) setArmed(false);
  }, [finished]);

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
            {/* Past the sequence the label says so. Continuing is allowed — D23
                leaves stopping and continuing to the owner — but a button that
                still read "More rounds" would let extra volume look prescribed. */}
            {sequenceDone ? 'Rounds beyond the sequence' : 'More rounds'}
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
  plan: CyclePlan;
  state: TimerState;
  now: number;
  mine: boolean;
  armed: boolean;
  round: number;
}) {
  const holding = mine && state.phase === 'holding';
  const resting = mine && state.phase === 'resting';
  const restDone = isRestComplete(state, now);
  // T30's countdown, which this surface has the most use for: a cycle starts its
  // own next round (D39), so these are the seconds in which hands go back on the
  // device — the alternative is the round starting under a hand that is still
  // shaking out.
  const countdown = mine ? restCountdownSecondsLeft(state, now) : 0;

  // T29: which grip this round is taken in. During the rest before a round the
  // *next* grip is shown, not the one that just finished — T30's count-in is
  // precisely when hands go back on the device, so a grip named after the fact is
  // a grip taken in the wrong position.
  const done = isSequenceComplete(plan.blocks, round);
  const ahead = resting && !done && (restDone || countdown > 0);
  // One number, read by both the counter and the grip. Looking ahead in the grip
  // but not in the count is how "round 1 · hang 2 of 6" gets on screen — two
  // readings of the same moment, and the owner has to work out which is stale.
  const shown = ahead ? round + 1 : round;
  const position = gripAt(plan.blocks, Math.max(1, shown));
  const total = totalRounds(plan.blocks);

  const value = holding
    ? formatHold(elapsedMs(state, now))
    : countdown > 0
      ? String(countdown)
      : resting
        ? formatClock(restRemainingMs(state, now))
        : '—';
  const label = holding
    ? `hang · ${plan.holdSec}s`
    : countdown > 0
      ? 'get ready'
      : resting
        ? restDone
          ? done
            ? 'sequence complete'
            : 'next round'
          : `rest · ${plan.restSec}s`
        : armed
          ? 'ready'
          : `${plan.holdSec}s on · ${plan.restSec}s off`;
  const tone = holding
    ? 'text-accent'
    : restDone || countdown > 0
      ? 'text-accent-300'
      : 'text-ink';

  return (
    <div className="py-4">
      {/* A count of what has been run. Against §10A's total where the addendum
          states one — which is quoting a prescription, not setting a quota:
          nothing is blocked here and the owner may stop anywhere (D23, D40).
          Where no grip sequence is declared this reads exactly as it did. */}
      <p className={kicker}>
        {shown > 0 ? (
          <>
            {roundLabel(shown)}
            {total > 0 && ` of ${total}`}
            {position && ` · ${formatGripRound(position)}`}
          </>
        ) : (
          // Before the first round the position within a grip is meaningless, but
          // the total is not: it is how long §10A says this takes, and it belongs
          // on screen before the owner commits to starting it.
          <>not started{total > 0 && ` · ${total} hangs`}</>
        )}
      </p>

      {/* The grip leads. It is the thing that has to be right *before* the hang
          starts, and at arm's length from the board it has to be legible without
          the clock's precision. */}
      {position && (
        <div className="mt-2">
          <p className="text-[27px] font-medium leading-tight tracking-[-0.02em]">
            {position.block.grip}
          </p>
          {position.block.digits && (
            <p className="mt-0.5 text-[13px] text-neutral-500">{position.block.digits}</p>
          )}
        </div>
      )}

      <p
        className={`mt-3 text-[72px] font-semibold leading-none tracking-[-0.04em] tabular-nums ${tone}`}
      >
        {value}
      </p>
      <p className={`mt-2 text-base font-medium tracking-[0.04em] ${tone}`} aria-live="polite">
        {label}
      </p>

      {/* What is coming, so a grip change is never a surprise mid-rest. */}
      {position?.next && (
        <p className="mt-3 text-[13px] text-neutral-500">next up · {formatGrip(position.next)}</p>
      )}
      {done && (
        <p className="mt-3 text-[13px] text-neutral-500">
          All {total} hangs run. Further rounds are yours to add, not the plan's.
        </p>
      )}

      {plan.blocks.length > 0 && (
        <GripSequence blocks={plan.blocks} currentIndex={position?.blockIndex ?? null} />
      )}
    </div>
  );
}

/**
 * The whole rotation, with the live block marked (T29).
 *
 * On screen the entire time rather than revealed a grip at a time: §10A is six
 * positions in a fixed order, and knowing the last two are two-finger pockets is
 * how the owner decides to stop before them — which the addendum explicitly
 * invites. Nothing here is tappable: the cadence decides which grip is live, and
 * a jump control would let a tap skip hangs the round counter would then
 * misreport.
 */
function GripSequence({
  blocks,
  currentIndex,
}: {
  blocks: GripBlock[];
  currentIndex: number | null;
}) {
  return (
    <ul className="mt-5 space-y-1 border-t border-neutral-800/70 pt-3">
      {blocks.map((block, i) => {
        const live = i === currentIndex;
        const past = currentIndex !== null && i < currentIndex;
        return (
          <li
            key={`${block.grip}-${i}`}
            aria-current={live ? 'step' : undefined}
            className={`flex items-baseline justify-between gap-3 text-[13px] ${
              live ? 'text-accent-200' : past ? 'text-neutral-600' : 'text-neutral-400'
            }`}
          >
            <span className="min-w-0 truncate">
              {block.grip}
              {block.digits && <span className="text-neutral-600"> · {block.digits}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-neutral-600">×{block.rounds}</span>
          </li>
        );
      })}
    </ul>
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
