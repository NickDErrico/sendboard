import { useEffect, useState } from 'react';
import type { Routine, WorkoutLog } from '../types';
import { resumable } from '../lib/session';
import { startSession } from '../lib/openSession';
import { getAllExercises, getAllLogs, getAllRoutines, getSettings } from '../lib/storage';
import {
  describeLastCompleted,
  rotates,
  routineRotation,
  type RoutineStatus,
} from '../lib/rotation';
import { batteryOccasions, type Occasion } from '../lib/retest';
import {
  DAILY_ROUTINE_ID,
  dailyStatus,
  describeRunsToday,
  describeSpacing,
  type DailyStatus,
} from '../lib/daily';
import {
  BLOCK_WEEKS,
  blockPosition,
  formatPhaseWeeks,
  phaseFor,
  type BlockPosition,
} from '../lib/block';
import { buildEdgeWeekGrid, describeTension, type EdgeWeekGrid } from '../lib/tension';
import { LIGHTER_WEEK_CAVEAT } from '../data/blockPhases';
import { go } from '../lib/routes';
import { CheckOffs } from '../components/CheckOffs';
import { BodyweightRow } from '../components/BodyweightRow';
import { Icon, btnGhost, btnPrimary, card, kicker, kickerAccent, row, tagOutline } from '../components/ui';

// "Day 1 — Fingerboard" → "Day 1", so the week line stays on one row at 390px.
// Falls back to the full name if there is no em-dash to split on.
function shortName(name: string): string {
  return name.split('—')[0].trim() || name;
}

// T8 home (AC1): both routines with one-tap Start, the last session's date, and
// the T5b climbing-week + daily-GtG status. T9 adds the rotation — which routine
// is up next (D15) — while keeping both one tap away.
//
// The Nocturne pass restructured this screen without adding or removing a thing
// it says. Eight sibling cards became five blocks, on one rule: a surface you can
// *act* on is elevated and gets the accent, and everything you merely *read* is
// flat, quiet, and collapsed together. So the up-next routine became the only
// raised card on the screen, the second routine became a row on it rather than a
// second equal-weight card, the two check surfaces became one card (they answer
// one question), and the three inert cards at the bottom became one card of rows.
export function Home() {
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [inProgress, setInProgress] = useState<WorkoutLog | null>(null);
  const [lastCompleted, setLastCompleted] = useState<WorkoutLog | null>(null);
  const [rotation, setRotation] = useState<RoutineStatus[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  // T24/D25: derived, never scheduled — and null until a training session has been
  // completed, which the card states rather than papering over with week 1.
  const [block, setBlock] = useState<BlockPosition | null>(null);
  // T26: the same block, aggregated. Null exactly when `block` is null, which is
  // what keeps the entry point below from ever being a control with nothing
  // behind it (AC10).
  const [tension, setTension] = useState<EdgeWeekGrid | null>(null);
  // T34: §10D's daily, derived from the same logs as everything else on this
  // screen — no stored flag, no schedule (D2a).
  const [daily, setDaily] = useState<DailyStatus | null>(null);

  // Reloads on mount and refocus, so a session finished elsewhere (or a resume
  // after force-close) is reflected — and so "days ago" rolls over at midnight
  // without a reload, the same way T5b's daily status does.
  useEffect(() => {
    const load = async () => {
      const [rs, logs, settings, exercises] = await Promise.all([
        getAllRoutines(),
        getAllLogs(),
        getSettings(),
        getAllExercises(),
      ]);
      setRoutines(rs);
      // getAllLogs is sorted by startedAt descending. D46: only a session that
      // recorded something is in progress — a routine opened, read and backed
      // out of leaves a log behind, and that is not a thing to resume.
      setInProgress(resumable(logs));
      setLastCompleted(logs.find((l) => l.completedAt !== null) ?? null);
      setRotation(routineRotation(rs, logs, new Date()));
      setOccasions(batteryOccasions(logs));
      // No `liveLog`: an abandoned session must not advance a count, the same rule
      // `routineRotation` follows. The session screen numbers the live one.
      setBlock(blockPosition({ logs, routines: rs, settings, today: new Date() }));
      setTension(buildEdgeWeekGrid({ logs, routines: rs, exercises, settings, today: new Date() }));
      // Recomputed on every refocus, like T5b's daily status, so leaving the app
      // open across midnight rolls the count over rather than showing yesterday's.
      setDaily(dailyStatus(logs, new Date()));
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

  // T16: what the §4E row says, in facts only. "Not recorded yet" is a statement
  // of what the log holds, not a reproach for not having done it (D23).
  const batteryLine =
    occasions.length === 0
      ? 'Not recorded yet'
      : occasions.length === 1
        ? `Baseline ${new Date(occasions[0].at).toLocaleDateString()}`
        : `${occasions.length} recorded · latest ${new Date(
            occasions[occasions.length - 1].at,
          ).toLocaleDateString()}`;

  // Up next first; otherwise seed order is preserved. The battery is excluded:
  // `routineRotation` already drops it (D29), and a test is not a training day
  // the week owes.
  const sortedRoutines = [...(routines ?? [])].filter(rotates).sort(
    (a, b) => Number(statusFor(b.id)?.isNextUp ?? false) - Number(statusFor(a.id)?.isNextUp ?? false),
  );
  const [hero, ...rest] = sortedRoutines;
  // Excluded from `sortedRoutines` by the same `rotates` filter that drops the
  // battery, and surfaced on its own card below (T34).
  const dailyRoutine = routines?.find((r) => r.id === DAILY_ROUTINE_ID);

  async function start(routineId: string) {
    // One-tap start (AC1). If a session is already in progress, defer to the
    // routine start route, which surfaces Resume rather than opening a second log
    // (resume precedence, matching T4/T6).
    if (inProgress) {
      go({ name: 'routine', routineId });
      return;
    }
    await startSession(routineId);
    go({ name: 'session' });
  }

  function describeRoutine(routine: Routine): string {
    const status = statusFor(routine.id);
    return `${routine.exerciseIds.length} exercises · ${status ? describeLastCompleted(status) : '—'}`;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3.5 px-4 pb-24 pt-[54px]">
      {/* 1. Header. The week rides here as an outline chip, which is what lets the
             block card below stop shouting its own phase. */}
      <header className="flex items-center gap-2.5">
        <div className="grid h-[30px] w-[30px] place-items-center rounded-md border border-accent text-sm font-medium text-accent">
          S
        </div>
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">Sendboard</h1>
        {/* `weekLabel` is written for mid-sentence use ("~week 3 of 8"), and the
            tilde means the anchor was inferred rather than set. A CSS
            first-letter rule capitalises the tilde and leaves the w alone, so
            the W is raised here instead — the marker survives, the chip reads. */}
        {block !== null && (
          <span className={`${tagOutline} ml-auto`}>
            {block.weekLabel.replace(/week/, 'Week')}
          </span>
        )}
      </header>

      {inProgress && (
        <button
          onClick={() => go({ name: 'session' })}
          className={`${card} flex flex-col items-start gap-1 border border-accent/40 bg-accent/[.08] text-left`}
        >
          <span className={kickerAccent}>In progress · tap to resume</span>
          <span className="text-[15px] font-medium">{routineName(inProgress.routineId)}</span>
        </button>
      )}

      {/* 2. Up next. The only elevated surface on the screen, because it is the
             only one the owner came here to act on. Rotation order still decides
             which routine is the hero (D15); the other stays one tap away, as a
             row rather than a second card competing for the same glance. */}
      {hero !== undefined && (
        <section className="flex flex-col gap-2.5 rounded-lg bg-[linear-gradient(180deg,#232532_0%,#1d1f2c_100%)] p-3.5 shadow-[0_0_0_1px_rgba(145,132,217,.42),0_10px_30px_rgba(0,0,0,.45)]">
          <p className={`${kickerAccent} flex items-center gap-2`}>
            <span aria-hidden className="h-[5px] w-[5px] animate-pulse rounded-full bg-accent" />
            Up next
          </p>
          <div>
            <button
              onClick={() => go({ name: 'routine', routineId: hero.id })}
              className="text-left text-[22px] font-medium leading-[1.15] tracking-[-0.02em]"
            >
              {hero.name}
            </button>
            <p className="mt-1 text-xs text-neutral-500">{describeRoutine(hero)}</p>
          </div>
          <button
            onClick={() => void start(hero.id)}
            className={`${btnPrimary} w-full !rounded-[10px] py-[13px] text-[15px]`}
          >
            <Icon name="play" weight="fill" className="text-[15px]" />
            Start session
          </button>

          {rest.map((routine) => (
            <div
              key={routine.id}
              className="-mx-1.5 -mb-1 mt-0.5 flex items-center gap-2 rounded-md px-1.5 py-[7px] transition-colors hover:bg-white/5"
            >
              <button
                onClick={() => go({ name: 'routine', routineId: routine.id })}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block text-[13px] font-medium">{routine.name}</span>
                <span className="block text-[11px] text-neutral-600">{describeRoutine(routine)}</span>
              </button>
              <button onClick={() => void start(routine.id)} className={`${btnGhost} shrink-0 text-[13px]`}>
                Start
                <Icon name="caret-right" className="text-xs" />
              </button>
            </div>
          ))}
        </section>
      )}

      {/* 2b. T34: §10D's daily — the §4A warm-up and §10A's abrahangs, twice a
             day, at least six hours apart. Its own card rather than a row on
             the one above, because it is not in the rotation and never competes
             with it: doing this does not change what is up next (D15).

             It reports and it starts. What it never does is say the day owes a
             run — no "1 of 2", no meter, no colour that reads as incomplete.
             The spacing line is §10D's own interval and a clock time, which is
             a fact about the last run, not a schedule (D2a, D23). */}
      {dailyRoutine !== undefined && (
        <section className={`${card} flex items-center gap-3 shadow-edge`}>
          <div className="min-w-0 flex-1">
            <p className={kicker}>Today · daily</p>
            <button
              onClick={() => go({ name: 'routine', routineId: dailyRoutine.id })}
              className="mt-0.5 block max-w-full text-left text-[15px] font-medium leading-tight"
            >
              {dailyRoutine.name}
            </button>
            {daily !== null && (
              <p className="mt-0.5 text-[11px] text-neutral-500">
                {describeRunsToday(daily)} · {describeSpacing(daily)}
              </p>
            )}
          </div>
          <button
            onClick={() => void start(dailyRoutine.id)}
            className={`${btnGhost} shrink-0 text-[13px]`}
          >
            <Icon name="play" weight="fill" className="text-[13px]" />
            Start
          </button>
        </section>
      )}

      {/* 3. T24: where the 8-week block stands, counted from the owner's own log
             (D25). Not a button and not a schedule: there is nothing to tap,
             nothing is due, and past week 8 it reads "week 8+" rather than late
             (D2a, D23). §4F's row for the week is quoted with its reference,
             alongside §4F's own caveat that a lighter week beats the table —
             which is the sentence that makes the app's silence about adherence
             the plan's position, not just a design preference.

             The week strip is the one graphic this card earns, and it is
             deliberately dumb: elapsed weeks filled, remaining weeks not. It
             draws nothing about whether those weeks went well. */}
      <section className={`${card} flex flex-col gap-2.5 shadow-edge`}>
        <div className="flex items-baseline gap-2">
          <h2 className={kicker}>Block</h2>
          {block !== null && (
            <span className="ml-auto text-[11px] text-neutral-600">
              {block.derived ? 'counted from' : 'from'}{' '}
              {new Date(`${block.startKey}T00:00`).toLocaleDateString()}
            </span>
          )}
        </div>
        {block === null ? (
          <p className="text-[13px] text-neutral-400">
            Not started — the block begins at your first logged session.
          </p>
        ) : (
          <>
            <p className="text-base font-medium">{block.label}</p>
            <div className="grid grid-cols-8 gap-[3px]" aria-hidden>
              {Array.from({ length: BLOCK_WEEKS }, (_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-sm ${i < Math.min(block.week, BLOCK_WEEKS) ? 'bg-accent' : 'bg-neutral-800'}`}
                />
              ))}
            </div>
            {(() => {
              const phase = phaseFor(block.week);
              if (!phase) return null;
              return (
                <p className="text-xs leading-relaxed text-neutral-400">
                  <span className={kicker}>{formatPhaseWeeks(phase)}</span>{' '}
                  <span className="text-neutral-200">{phase.focus}</span> — {phase.note} (plan §4F)
                </p>
              );
            })()}
            <p className="text-[11px] leading-snug text-neutral-600">{LIGHTER_WEEK_CAVEAT}</p>
          </>
        )}
      </section>

      {/* 4. The week's check-offs — climbing days and today's GtG, in one card
             because they are one question. */}
      <CheckOffs />

      {/* 5. The read list. Three cards became one card of rows for a single
             reason: none of them is a thing you *do*. T26's under-tension total,
             §4E's battery, and T15's bodyweight are all things you read, and
             three separate cards made three subjects out of one glance.

             The tension row is rendered only when there is a block behind it, so
             it is never a dead control (T26 AC10). */}
      <section className={`${card} flex flex-col gap-0 px-3 py-1 shadow-edge`}>
        {tension !== null && (
          <>
            <button onClick={() => go({ name: 'block' })} className={`${row} w-full`}>
              <Icon name="chart-bar" className="shrink-0 text-[17px] text-neutral-500" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">Edge × week · under tension</span>
                <span className="block text-[11px] tabular-nums text-neutral-500">
                  {describeTension(tension.total)}
                </span>
              </span>
              <Icon name="caret-right" className="shrink-0 text-[13px] text-neutral-600" />
            </button>
            <div className="h-px bg-neutral-900" />
          </>
        )}

        {/* §4E's battery, one tap away and never a prompt. It states what is
            recorded and nothing else — no "due", no countdown to week 8, no
            nudge (D2a, D23). It sits above bodyweight for the same reason it
            used to sit above the check-offs: a baseline not taken before week 1
            cannot be taken later. */}
        <button onClick={() => go({ name: 'retest' })} className={`${row} w-full`}>
          <Icon name="target" className="shrink-0 text-[17px] text-neutral-500" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium">§4E baseline / retest</span>
            <span className="block text-[11px] text-neutral-500">{batteryLine}</span>
          </span>
          <Icon name="caret-right" className="shrink-0 text-[13px] text-neutral-600" />
        </button>
        <div className="h-px bg-neutral-900" />

        {/* T15: last, because it is the least time-sensitive thing on this screen
            — a weigh-in has no day it belongs to (D24), unlike the week's
            climbing balance or today's GtG. */}
        <BodyweightRow />
      </section>

      {/* 6. Which routines this Monday-start week has had (AC3), and when the
             last session was — one quiet line, because between them they are a
             footnote to everything above. */}
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-0.5 text-[11px] text-neutral-600">
        {rotation.length > 0 && (
          <>
            {/* "Routines" qualifier avoids colliding with the check-offs card
                above, which covers the climbing days for the same week. */}
            <span>Routines this week</span>
            {rotation.map((s) => (
              <span
                key={s.routineId}
                className={`flex items-center gap-1 ${s.doneThisWeek ? 'text-accent-300' : ''}`}
              >
                <Icon
                  name={s.doneThisWeek ? 'check' : 'circle'}
                  className={`text-[10px] ${s.doneThisWeek ? '' : 'text-neutral-700'}`}
                />
                {shortName(routineName(s.routineId))}
              </span>
            ))}
          </>
        )}
        <span className="ml-auto">
          {lastCompleted
            ? `Last ${new Date(lastCompleted.completedAt ?? lastCompleted.startedAt).toLocaleDateString()}`
            : 'No sessions yet — start one above.'}
        </span>
      </p>
    </div>
  );
}
