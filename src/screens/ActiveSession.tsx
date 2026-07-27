import { useEffect, useRef, useState } from 'react';
import type { Exercise, Routine, SetEntry, WorkoutLog } from '../types';
import {
  getAllExercises,
  getAllLogs,
  getAllRoutines,
  getLog,
  getRoutine,
  getSettings,
  saveLog,
} from '../lib/storage';
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
  holdFromLeadIn,
  holdSpecOf,
  isLeadInStale,
  isTimerVisible,
  restMsOf,
  startHold,
  startLeadIn,
  startRest,
  stopHold,
  type TimerState,
} from '../lib/timer';
import { reasonApplies, reasonsFor } from '../lib/setReason';
import { gearOf, type Gear } from '../lib/gear';
import { chainPosition, formatChain, setSpecOf, speakChain } from '../lib/chain';
import { restReading } from '../lib/rest';
import { warmupPlanOf } from '../lib/warmup';
import { blockPosition, livePrescription, type BlockPosition } from '../lib/block';
import { leadInMsOf, voiceEnabled } from '../lib/cues';
import { primeAudio } from '../lib/beep';
import { hush, primeSpeech } from '../lib/speech';
import { useWakeLock } from '../lib/wakeLock';
import { go } from '../lib/routes';
import {
  Icon,
  btnGhost,
  btnPrimary,
  btnSecondary,
  card as cardClass,
  input as inputClass,
  kicker,
  tagAccent,
} from '../components/ui';
import { PlanRefLinks } from '../components/PlanRefLinks';
import { PrescriptionVariants } from '../components/PrescriptionVariants';
import { SetLogger } from '../components/SetLogger';
import { SessionTimer } from '../components/SessionTimer';
import { FocusHold } from '../components/FocusHold';
import { WarmupRunner } from '../components/WarmupRunner';
import { ExerciseDetail } from './ExerciseDetail';
import { Plan } from './Plan';

export function ActiveSession({ logId, onFinish }: { logId: string; onFinish: () => void }) {
  const [log, setLog] = useState<WorkoutLog | null>(null);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [exercisesById, setExercisesById] = useState<Map<string, Exercise>>(new Map());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  // T21: which exercise the eyes-shut surface is showing, or null. View state
  // only — never persisted, never restored on reload (D18).
  const [focusId, setFocusId] = useState<string | null>(null);
  // T23: which warm-up the runner is on, or null. Same rule, same lifetime.
  const [warmupId, setWarmupId] = useState<string | null>(null);
  // T25: which plan section is open over the session, or null. Rendered here
  // rather than routed to, because a route change would unmount the timer this
  // component holds (D18) — and reading the plan must cost nothing (D37).
  const [planRef, setPlanRef] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  // T10: exactly one timer for the whole session, held here rather than per card
  // so it survives opening an exercise's detail view. Never persisted (D18).
  const [timer, setTimer] = useState<TimerState>(IDLE_TIMER);
  // T11: every exercise's previous performance, resolved once on load.
  const [lastByExercise, setLastByExercise] = useState<Map<string, LastPerformance>>(new Map());
  // T16/D30: the one edge the block is tested on, used to seed a first-ever set
  // where carry-forward has nothing to offer — the §4E battery is exactly that
  // case. Read once; changing it mid-session is not a thing that happens.
  const [standardEdgeMm, setStandardEdgeMm] = useState<number | undefined>(undefined);
  // T18/D26: the board and the plate rack, which decide what a set value costs in
  // taps. Read from the same settings fetch — it configures inputs only, so an
  // empty gear object is a working session, not a degraded one (D31).
  const [gear, setGear] = useState<Gear>({});
  // T20/D33/D34: how long the count runs before "pull", and whether the cues are
  // spoken as well as sounded. Read from the same settings fetch; both have
  // defaults, so an install that has never opened Settings counts in from 3 and
  // talks (D34 — the tones are unconditional either way).
  const [leadInMs, setLeadInMs] = useState(0);
  const [voice, setVoice] = useState(true);
  // T24/D25: where this session sits in the 8-week block, derived from the log and
  // resolved once on load. It numbers *this* session (so the ordinal describes the
  // one on screen) and supplies the week §4B's variants are chosen against. Read
  // only — nothing here is written back to the log.
  const [block, setBlock] = useState<BlockPosition | null>(null);
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
      const [r, all, logs, settings, routines] = await Promise.all([
        getRoutine(loaded.routineId),
        getAllExercises(),
        getAllLogs(),
        getSettings(),
        getAllRoutines(),
      ]);
      if (cancelled) return;
      setRoutine(r ?? null);
      // `liveLog` is this session: it makes the label read "Session 11" for the
      // one on screen, and — on a first-ever session — is the only thing available
      // to anchor the block to. A battery is excluded by `blockPosition` itself
      // (D29), so running a test shows the week without an ordinal.
      setBlock(
        blockPosition({ logs, routines, settings, today: new Date(), liveLog: loaded }),
      );
      setStandardEdgeMm(settings.standardEdgeMm);
      setGear(gearOf(settings));
      setLeadInMs(leadInMsOf(settings));
      setVoice(voiceEnabled(settings));
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

  // T20/D33: with a count-in configured this starts the *count*, and the hold
  // begins on "pull" — so `holdSec` measures the effort rather than the effort
  // plus however long it took to step up and load. With none it is the T13
  // behaviour exactly: the hold starts on the tap. Either way it starts only
  // from a tap (T19 AC5): nothing here is ever called by a completing rest.
  function beginHold(exerciseId: string) {
    primeAudio();
    primeSpeech();
    setTimer(
      leadInMs > 0
        ? startLeadIn(exerciseId, leadInMs, Date.now())
        : startHold(exerciseId, Date.now()),
    );
  }

  // T23/D39: a warm-up round starts its hold *directly*, with no count-in. D33's
  // count exists so `holdSec` measures the effort rather than the tap offset, and
  // a warm-up round records no `holdSec` — so the count would buy nothing and
  // spend three seconds of a prescribed sixty-second cadence. Reachable only from
  // the runner, which the catalog's `category === 'warmup'` gates.
  function beginWarmupRound(exerciseId: string) {
    primeAudio();
    primeSpeech();
    setTimer(startHold(exerciseId, Date.now()));
  }

  function beginRest(exerciseId: string, restMs: number) {
    primeAudio();
    primeSpeech();
    setTimer(startRest(exerciseId, restMs, Date.now()));
  }

  /**
   * The count reached zero: become the hold — unless the app slept through it.
   *
   * A backgrounded PWA is suspended, so a count can finish while nothing is
   * running and be noticed on the way back. Starting a hold there would begin
   * (and, at the prescribed maximum, auto-finish and offer to log) a hang that
   * never happened, which is the one thing the app must never do.
   */
  function handleCountEnd() {
    setTimer((t) => (isLeadInStale(t, Date.now()) ? clearTimer() : holdFromLeadIn(t)));
  }

  /** Skip / Cancel / dismiss — and stop the voice mid-word if it is counting. */
  function dismissTimer() {
    hush();
    setTimer(clearTimer());
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
    // T14 AC2/AC3: an auto-stop knows why the hold ended — the app ended it,
    // because it reached the prescribed maximum — so the reason is recorded with
    // no tap. A manual stop is the ambiguous case (dropped? pain? form?) and
    // records nothing, leaving SetLogger's chips open on the new row. Inferring
    // it from the duration is exactly what D27 forbids.
    const endReason = timer.heldAuto ? ('target' as const) : undefined;
    // T12: where the exercise declares `holdSec`, the measurement lands in the
    // numeric field — that is the charted value, and the free-text `reps` has
    // been replaced there (D21). Everywhere else it keeps writing the text form.
    const tracksHold = exercisesById.get(exerciseId)?.metrics?.includes('holdSec') ?? false;
    mutate((l) => {
      const seed = seedForNextSet(
        getSets(l, exerciseId),
        lastByExercise.get(exerciseId) ?? null,
        edgeSeedFor(exerciseId),
      );
      const measured = tracksHold
        ? { holdSec: Math.round((heldMs / 1000) * 10) / 10 }
        : { reps: formatHold(heldMs) };
      return addSet(l, exerciseId, { ...seed, ...measured, endReason });
    });
    setTimer(clearHeld);
  }

  // Only exercises that actually record an edge get the standard-edge seed —
  // writing one onto a goblet squat would invent a measurement (D21).
  function edgeSeedFor(exerciseId: string): number | undefined {
    return exercisesById.get(exerciseId)?.metrics?.includes('edgeMm') ? standardEdgeMm : undefined;
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
      <div className="mx-auto max-w-md p-4 pt-[54px]">
        <p className="text-[13px] text-neutral-300">That session no longer exists.</p>
        <button onClick={onFinish} className={`${btnGhost} mt-3`}>
          Back home
        </button>
      </div>
    );
  }
  if (!log || !routine) {
    return <p className="mx-auto max-w-md p-4 pt-[54px] text-[13px] text-neutral-500">Loading session…</p>;
  }

  // The timer belongs to the session, not to a card, so it renders over the
  // exercise detail view too — reading the cues is exactly what the owner does
  // during a 3 minute rest, and the countdown must not vanish to allow it.
  /**
   * "set 3 of 5" for an exercise, or null where the plan declares no count.
   *
   * A report over the logged sets, never a stored counter — which is what makes
   * it move back when a set is deleted (AC8) and what stops it claiming a set
   * that no record contains (D16).
   */
  function chainLabelFor(exerciseId: string): string | null {
    const spec = setSpecOf(exercisesById.get(exerciseId));
    if (spec === null) return null;
    return formatChain(chainPosition(getSets(log as WorkoutLog, exerciseId).length, spec));
  }

  /** The same position said out loud (T20) — spoken once, when a rest completes. */
  function chainSpokenFor(exerciseId: string): string | null {
    const spec = setSpecOf(exercisesById.get(exerciseId));
    if (spec === null) return null;
    return speakChain(chainPosition(getSets(log as WorkoutLog, exerciseId).length, spec));
  }

  const timerExercise = timer.exerciseId ? exercisesById.get(timer.exerciseId) : undefined;
  // T19: one value serves both views, because "the set that is next to be logged"
  // *is* the set being held while a hold runs, and the one after a rest. It moves
  // only when a set is recorded — so a hold that was performed and not logged
  // leaves it where it was, and the Log button that fixes that is on this bar.
  const timerChainLabel = timer.exerciseId
    ? chainLabelFor(timer.exerciseId)
    : null;
  const timerChainSpoken = timer.exerciseId ? chainSpokenFor(timer.exerciseId) : null;
  // T22: what the prescribed rest has to read. Resolved once, here, for the
  // exercise the *timer* belongs to — so it is the same deck whichever view is
  // mounted, and a rest running on one exercise still reports that one while
  // focus sits on another (the rule the cues already follow).
  const timerReading =
    timer.phase === 'resting' && timer.exerciseId
      ? restReading({
          exercise: timerExercise,
          sets: getSets(log, timer.exerciseId),
          last: lastByExercise.get(timer.exerciseId) ?? null,
          restMs: timer.restMs,
        })
      : null;
  const timerBar = isTimerVisible(timer) ? (
    <SessionTimer
      state={timer}
      exerciseName={timerExercise?.name ?? timer.exerciseId ?? ''}
      hold={holdSpecOf(timerExercise)}
      chainLabel={timerChainLabel}
      chainSpoken={timerChainSpoken}
      reading={timerReading}
      voice={voice}
      onStop={handleStop}
      onSkip={dismissTimer}
      onExtend={(seconds) => setTimer((t) => extendRest(t, seconds))}
      onLogHeld={handleLogHeld}
      onCountEnd={handleCountEnd}
      onStartNext={
        timer.exerciseId && holdSpecOf(timerExercise)
          ? () => beginHold(timer.exerciseId as string)
          : undefined
      }
    />
  ) : null;

  // T23: the warm-up runner. Rendered instead of the session for the same reason
  // focus is — two views of one timer would double every cue — and it drives the
  // session's timer, so its hold-end and rest-end tones are the ones T13 and T20
  // already paid for. It writes nothing on its own (AC6): the only thing it can
  // change about the log is the completion mark, and only on a tap (D16).
  const warmupExercise = warmupId === null ? undefined : exercisesById.get(warmupId);
  const warmupPlan = warmupPlanOf(warmupExercise);
  if (warmupExercise && warmupPlan) {
    return (
      <WarmupRunner
        exercise={warmupExercise}
        plan={warmupPlan}
        state={timer}
        timerHold={holdSpecOf(timerExercise)}
        completed={isExerciseCompleted(log, warmupExercise.id)}
        voice={voice}
        onExit={() => setWarmupId(null)}
        onStartRound={() => beginWarmupRound(warmupExercise.id)}
        onStop={handleStop}
        onSkip={dismissTimer}
        onComplete={() =>
          mutate((l) =>
            setExerciseCompleted(l, warmupExercise.id, !isExerciseCompleted(l, warmupExercise.id)),
          )
        }
        onFinish={() => {
          mutate((l) => setExerciseCompleted(l, warmupExercise.id, true));
          dismissTimer();
          setWarmupId(null);
        }}
      />
    );
  }

  // T21: eyes-shut mode. Rendered *instead of* the session (and instead of the
  // bar), never alongside it — two views of one timer would double every cue,
  // which is why `useTimerCues` moved out of `SessionTimer` and why exactly one
  // of them is mounted. Every control below is the same handler the card uses
  // (D35): a set logged here is byte-identical to one logged there.
  const focusExercise = focusId === null ? undefined : exercisesById.get(focusId);
  const focusHold = holdSpecOf(focusExercise);
  if (focusExercise && focusHold) {
    const last = lastByExercise.get(focusExercise.id) ?? null;
    return (
      <FocusHold
        exercise={focusExercise}
        state={timer}
        hold={focusHold}
        // The cues read the *timer's* exercise, not the focused one, so leaving
        // a rest running on one exercise and opening focus on another still
        // sounds correctly (AC5, AC9).
        timerHold={holdSpecOf(timerExercise)}
        chainLabel={chainLabelFor(focusExercise.id)}
        chainSpoken={timerChainSpoken}
        // The edge the next set will carry, resolved through the same seed the
        // set logger uses — so the tag on the board and the number that gets
        // written can't disagree. Null on the exercises that record no edge.
        edgeLabel={(() => {
          if (!focusExercise.metrics?.includes('edgeMm')) return null;
          const seed = seedForNextSet(
            getSets(log, focusExercise.id),
            last,
            edgeSeedFor(focusExercise.id),
          );
          return typeof seed.edgeMm === 'number' ? `${seed.edgeMm} mm` : null;
        })()}
        // T24: one line at board-legible size, so it is this week's protocol
        // rather than both of §4B's in a paragraph nobody reads mid-set. Falls
        // back to the full prescription wherever no variant is declared or no
        // week is known.
        prescriptionLine={livePrescription(focusExercise, block?.week ?? null)}
        lastSummary={last ? `${describeWhen(last.daysAgo)} · ${summarizeSets(last.sets)}` : null}
        reading={timerReading}
        voice={voice}
        timerExerciseName={
          timer.exerciseId && timer.exerciseId !== focusExercise.id
            ? (timerExercise?.name ?? timer.exerciseId)
            : null
        }
        onExit={() => setFocusId(null)}
        onStart={() => beginHold(focusExercise.id)}
        onStop={handleStop}
        onSkip={dismissTimer}
        onExtend={(seconds) => setTimer((t) => extendRest(t, seconds))}
        onLogHeld={handleLogHeld}
        onCountEnd={handleCountEnd}
      />
    );
  }

  // T25: the plan, over the session, with the timer bar still on screen and
  // still running. Nothing here can write to the log — it is reading, in dead
  // time, which is exactly what D37 permits at any moment (AC7).
  if (planRef !== null) {
    return (
      <>
        <Plan initialRef={planRef} onExit={() => setPlanRef(null)} exitLabel="Back to session" />
        {timerBar}
      </>
    );
  }

  // T9 AC6: full protocol without leaving the session. Rendered over the session
  // rather than routed to, so back returns here with every set intact — and
  // auto-persist (T4) means nothing is riding on component state anyway.
  const detailExercise = detailId === null ? undefined : exercisesById.get(detailId);
  if (detailExercise) {
    return (
      <>
        <ExerciseDetail
          exercise={detailExercise}
          onBack={() => setDetailId(null)}
          onOpenPlan={(ref) => setPlanRef(ref)}
        />
        {timerBar}
      </>
    );
  }

  const doneCount = routine.exerciseIds.filter((id) => isExerciseCompleted(log, id)).length;

  return (
    <div className="mx-auto max-w-md">
      {/* The header is a fixed frame around a scrolling list, not part of it:
          the block position and the completion count are the two things you
          glance at mid-session, and they should not scroll away. */}
      <header className="flex items-center gap-2.5 px-4 pb-3 pt-[50px] shadow-[0_1px_0_#292b31]">
        <button
          onClick={() => go({ name: 'home' })}
          aria-label="Back home"
          className={`${btnGhost} h-[30px] w-[30px] shrink-0 px-0`}
        >
          <Icon name="caret-left" className="text-[18px]" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-medium tracking-[-0.01em]">{routine.name}</h1>
          {/* T24: the block position, derived (D25). A statement of where this
              session falls — never a target, a quota, or a "you're behind"
              (D23) — merged onto one line with what the session has covered so
              far, because they are read in the same glance. */}
          <p className="truncate text-[11px] text-neutral-500 first-letter:uppercase">
            {block ? `${block.label} · ` : ''}
            {doneCount} of {routine.exerciseIds.length} done
          </p>
        </div>
        <button onClick={handleFinish} className={`${btnGhost} shrink-0 text-[13px]`}>
          Finish
        </button>
      </header>

      {/* One segment per exercise: done, the one the timer is on, and the rest.
          It replaces nothing — it is the completion count above, drawn, so the
          answer to "how much is left" costs no reading at all. */}
      <div
        className="grid gap-[3px] px-4 pt-2.5"
        style={{ gridTemplateColumns: `repeat(${routine.exerciseIds.length}, minmax(0,1fr))` }}
        aria-hidden
      >
        {routine.exerciseIds.map((exId) => (
          <span
            key={exId}
            className={`h-[3px] rounded-sm ${
              isExerciseCompleted(log, exId)
                ? 'bg-accent'
                : timer.exerciseId === exId && timer.phase !== 'idle'
                  ? 'bg-accent-400'
                  : 'bg-neutral-800'
            }`}
          />
        ))}
      </div>

      <div className={`flex flex-col gap-2.5 px-4 pt-3 ${timerBar ? 'pb-[250px]' : 'pb-28'}`}>
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
          const chainLabel = chainLabelFor(exId);
          // T24: this week's protocol, at the top of the card rather than behind
          // Info. It is the number the owner sets the board to, so it costs a tap
          // to reach only if you would rather read the plan's alternatives — which
          // is what Info is still for.
          const prescription = exercise ? livePrescription(exercise, block?.week ?? null) : '';
          const planRef = exercise?.planRefs?.[0];
          return (
            <section
              key={exId}
              // The card's edge is its state: accent-tinted with an accent ring
              // once it is done, a brighter neutral ring while its timer runs,
              // and the ordinary edge otherwise. Three weights of one line.
              className={`${cardClass} flex flex-col gap-2.5 ${
                done
                  ? 'bg-[color-mix(in_srgb,#9184d9_8%,#232532)] shadow-[0_0_0_1px_rgba(145,132,217,.3)]'
                  : isTiming
                    ? 'shadow-[0_0_0_1px_#595d6c]'
                    : 'shadow-edge'
              }`}
            >
              <div className="flex items-start gap-2">
                {done && (
                  <Icon
                    name="check-circle"
                    weight="fill"
                    className="mt-0.5 shrink-0 text-[17px] text-accent-400"
                  />
                )}
                <div className="min-w-0 flex-1">
                  {/* Missing catalog entry → fall back to the raw id, never crash. */}
                  {exercise ? (
                    <button
                      onClick={() => setDetailId(exId)}
                      className={`min-w-0 text-left font-medium ${done ? 'text-[15px]' : 'text-base'}`}
                    >
                      {exercise.name}
                    </button>
                  ) : (
                    <h2 className="text-base font-medium">{exId}</h2>
                  )}
                  {prescription !== '' && !done && (
                    <p className="mt-[3px] text-xs text-accent-300">
                      {prescription}
                      {planRef && <span className="text-neutral-600"> · plan §{planRef}</span>}
                    </p>
                  )}
                </div>
                {/* D16: explicit and independent of sets — several plan items
                    (warm-up progression, get-ups, wall press) have nothing
                    numeric worth typing, and adding a set never implies
                    completion. Reads as the state it is in, and toggles. */}
                {done ? (
                  <button
                    onClick={() => mutate((l) => setExerciseCompleted(l, exId, false))}
                    aria-pressed
                    className={`${tagAccent} shrink-0`}
                  >
                    Completed
                  </button>
                ) : (
                  exercise && (
                    <button
                      onClick={() => toggleExpanded(exId)}
                      aria-expanded={isOpen}
                      className={`${btnGhost} shrink-0 px-1 text-[11px]`}
                    >
                      Info
                      <Icon name={isOpen ? 'caret-up' : 'caret-down'} className="text-[11px]" />
                    </button>
                  )
                )}
              </div>

              {/* A completed card says what it was, once, and then gets out of the
                  way — indented past the check so the line belongs to the name. */}
              {done && prescription !== '' && (
                <p className="-mt-1 pl-[25px] text-[11px] text-neutral-500">
                  {prescription}
                  {planRef && ` · plan §${planRef}`}
                </p>
              )}

              {isOpen && exercise && (
                <div className="rounded-md bg-black/20 p-2 text-[13px]">
                  {/* T24: this week's variant leads where §4B declares two, and the
                      other stays on the card rather than moving to the detail
                      screen — mid-session is exactly when the owner needs to see
                      that a choice exists (D25). */}
                  <PrescriptionVariants exercise={exercise} week={block?.week ?? null} compact />
                  {exercise.cues.length > 0 && (
                    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-neutral-400 marker:text-neutral-700">
                      {exercise.cues.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  )}
                  {/* T25: the section this entry was transcribed from, one tap
                      away and readable during the rest that follows (D42, D37). */}
                  <PlanRefLinks
                    refs={exercise.planRefs}
                    onOpen={(ref) => setPlanRef(ref)}
                    className="mt-2"
                  />
                </div>
              )}

              {/* T11: what this exercise looked like last time, where the
                  decision is made — §4F asks for small increments, which is not
                  possible against a number you have to leave the session to find. */}
              {last && !done && (
                <p className="text-[11px] leading-relaxed text-neutral-500">
                  <span className="text-[10px] uppercase tracking-[0.08em]">
                    Last {describeWhen(last.daysAgo)}
                  </span>{' '}
                  <span className="text-neutral-300">{summarizeSets(last.sets)}</span>
                </p>
              )}

              {/* T23: a warm-up's full-screen surface is the runner, not focus —
                  it starts the same holds, runs §4A's cadence without a tap per
                  round, and paces the stages an untimed warm-up has instead. So
                  it takes the place of both controls rather than sitting beside
                  them (T21 AC1 amended, see T23's Amendments). */}
              {warmupPlanOf(exercise) ? (
                <button onClick={() => setWarmupId(exId)} className={`${btnSecondary} w-full !rounded-[10px] py-2.5`}>
                  <Icon name="play" weight="fill" className="text-xs" />
                  Run warm-up
                </button>
              ) : /* T10: a hold if the plan prescribes a duration, otherwise a bare
                  rest if it prescribes only that. Untimed movements (rows,
                  squats, get-ups, prehab) get neither and read exactly as before. */
              holdSpec ? (
                <div className="flex gap-2">
                  {/* The set the owner came to this card to start: Nocturne's
                      primary, which is an outline. Nothing else on the card
                      carries the accent as a border. */}
                  <button
                    onClick={() => beginHold(exId)}
                    disabled={isTiming}
                    className={`${btnPrimary} min-w-0 flex-1 truncate !rounded-[10px] py-2.5`}
                  >
                    <Icon name="play" weight="fill" className="shrink-0 text-[13px]" />
                    {isTiming
                      ? timer.phase === 'counting'
                        ? 'Counting in…'
                        : 'Timing…'
                      : `Start ${chainLabel ?? 'hold'} · ${formatHoldTarget(holdSpec)}`}
                  </button>
                  {/* T21: the eyes-shut surface for this exercise. Only where the
                      plan declares a hold — an exercise with no clock has no
                      loop to run blind. */}
                  <button
                    onClick={() => setFocusId(exId)}
                    aria-label={`Focus mode for ${exercise?.name ?? exId}`}
                    className={`${btnSecondary} h-auto w-[42px] shrink-0 !rounded-[10px] px-0`}
                  >
                    <Icon name="arrows-out" className="text-[17px]" />
                  </button>
                </div>
              ) : (
                restMs !== null && (
                  <button
                    onClick={() => beginRest(exId, restMs)}
                    disabled={isTiming}
                    className={`${btnSecondary} w-full !rounded-[10px] py-2.5`}
                  >
                    <Icon name="timer" className="text-[13px]" />
                    {isTiming ? 'Resting…' : `Start rest · ${formatClock(restMs)}`}
                  </button>
                )
              )}

              <SetLogger
                sets={sets}
                metrics={exercise?.metrics}
                askEndReason={reasonApplies(exercise)}
                endReasons={reasonsFor(exercise)}
                gear={gear}
                nextSetLabel={chainLabel}
                onAdd={() =>
                  mutate((l) =>
                    addSet(l, exId, seedForNextSet(getSets(l, exId), last, edgeSeedFor(exId))),
                  )
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
                className={`${inputClass} min-h-[32px] text-[12.5px]`}
              />

              {/* The other half of the completion toggle above: the tag in the
                  header is the "on" state, and this is the "off" one. One
                  control, two shapes, so a completed card never carries a
                  full-width button restating what its own tint already says. */}
              {!done && (
                <button
                  onClick={() => mutate((l) => setExerciseCompleted(l, exId, true))}
                  aria-pressed={false}
                  className={`${btnSecondary} w-full !rounded-[10px] py-2 text-[13px] !text-neutral-400`}
                >
                  <Icon name="circle" className="text-[13px]" />
                  Mark done
                </button>
              )}
            </section>
          );
        })}

        <section className="mt-0.5 flex flex-col gap-1.5">
          <label className={kicker} htmlFor="session-notes">
            Session notes
          </label>
          <textarea
            id="session-notes"
            value={log.sessionNotes}
            onChange={(e) => mutate((l) => setSessionNotes(l, e.target.value))}
            rows={2}
            placeholder="How did it feel?"
            className={`${inputClass} min-h-[58px] resize-y text-[12.5px]`}
          />
        </section>

        <button onClick={handleFinish} className={`${btnPrimary} mt-1 w-full !rounded-[10px] py-[13px] text-[15px]`}>
          Finish session
        </button>
      </div>

      {timerBar}
    </div>
  );
}
