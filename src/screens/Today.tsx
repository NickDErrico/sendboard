import { useCallback, useEffect, useState } from 'react';
import type { Check, Exercise, Routine, WorkoutLog } from '../types';
import {
  dateKey,
  deleteCheck,
  getAllChecks,
  getAllExercises,
  getAllLogs,
  getAllRoutines,
  getChecksForWeek,
  mondayOf,
  saveCheck,
} from '../lib/storage';
import { keyToLocalDate, weekClimbingStatus, weekEndKey } from '../lib/checks';
import { activeSymptoms } from '../lib/symptoms';
import { lanesToday, type Lane } from '../lib/lanes';
import type { TierRoute } from '../lib/routes';
import { resumable } from '../lib/session';
import { startSession } from '../lib/openSession';
import { go } from '../lib/routes';
import { BodyweightRow } from '../components/BodyweightRow';
import { Icon, btnGhost, btnPrimary, card, kicker, kickerAccent, row, tagOutline } from '../components/ui';

/**
 * The four tiers, as the screen the owner opens (T36, D47).
 *
 * This replaces Home rather than editing it. Home had accumulated seven cards in
 * five shapes across eight tasks, each shape encoding its own task's argument;
 * every lane here has the same shape, because the point of the surface is that
 * the shape is learned once and holds for all four.
 *
 * **Everything on a lane comes from `lanes.ts`, and nothing is decided here.**
 * The order, the cadence strings, the state lines and which control a lane
 * offers are all that module's, so this file cannot disagree with it and a
 * second surface built on the same module cannot disagree with this one.
 *
 * **D49, the half of it that is visual.** Elevation is `lane.daily` — a property
 * of the tier's cadence, never of the log — so a lane that has been run today is
 * pixel-identical to one that has not. Nothing on this screen reads two lanes
 * together: there is no count of lanes touched, no day-complete state, and no
 * summary line over the four. The climbing strip above them is deliberately not
 * a lane and is deliberately shaped unlike one.
 *
 * What is still here because stage 4 has not moved it: the block card, the
 * retest row and the tension row, which are all `heavy`-tier concerns (D50) and
 * belong on that tier's own screen rather than under the app's header.
 */

function fmtDay(key: string): string {
  return keyToLocalDate(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function Today() {
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [weekChecks, setWeekChecks] = useState<Check[]>([]);
  const [inProgress, setInProgress] = useState<WorkoutLog | null>(null);

  // Every read recomputes from `new Date()`, so the app left open across
  // midnight (or across a Monday) rolls over on refocus rather than showing
  // yesterday's lanes — T5b's rule, which every daily surface has followed since.
  const refresh = useCallback(async () => {
    const [rs, exs, allLogs, allChecks, week] = await Promise.all([
      getAllRoutines(),
      getAllExercises(),
      getAllLogs(),
      getAllChecks(),
      getChecksForWeek(new Date()),
    ]);
    setRoutines(rs);
    setExercises(exs);
    setLogs(allLogs);
    setChecks(allChecks);
    setWeekChecks(week);
    // D46: only a session that recorded something is in progress. A routine
    // opened, read and backed out of leaves a log behind, and that is not a
    // thing to resume.
    setInProgress(resumable(allLogs));
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refresh]);

  const lanes = lanesToday({
    exercises,
    routines: routines ?? [],
    logs,
    checks,
    today: new Date(),
  });

  const climbing = weekClimbingStatus(weekChecks);
  // T37: signals moved off the joint rotation onto their own route, because a
  // signal changes what the plan says to do across every tier rather than inside
  // one. Reported here, never ranked — the count is a fact about the record.
  const signals = activeSymptoms(checks);
  const mondayKey = dateKey(mondayOf(new Date()));
  const routineName = (id: string) => routines?.find((r) => r.id === id)?.name ?? id;

  async function start(routineId: string) {
    // If a session is already open, defer to the routine screen, which surfaces
    // Resume rather than opening a second log (T4/T6 precedence, unchanged).
    if (inProgress) {
      go({ name: 'routine', routineId });
      return;
    }
    await startSession(routineId);
    go({ name: 'session' });
  }

  async function toggleClimbing(kind: 'climbing-volume' | 'climbing-limit') {
    const existing = weekChecks.filter((c) => c.kind === kind);
    if (existing.length > 0) {
      if (window.confirm('Remove this check for the week?')) {
        await Promise.all(existing.map((c) => deleteCheck(c.id)));
        await refresh();
      }
      return;
    }
    await saveCheck({ id: crypto.randomUUID(), kind, date: dateKey(new Date()), notes: '' });
    await refresh();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3.5 px-4 pb-24 pt-[54px]">
      <header className="flex items-center gap-2.5">
        <div className="grid h-[30px] w-[30px] place-items-center rounded-md border border-accent text-sm font-medium text-accent">
          S
        </div>
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">Today</h1>
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

      {/* The sport, above the tiers and shaped unlike them: two ticks, no start
          control, no session. Climbing is the only thing here not run inside the
          app (D9), and a session-shaped card would promise one that never
          arrives. Deliberately no "n of 2" — the week's two days are a
          prescription, and a fraction against one is a score (D23). */}
      <section className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-0.5">
        <span className={kicker}>
          This week · {fmtDay(mondayKey)}–{fmtDay(weekEndKey(mondayKey))}
        </span>
        <ClimbTick label="Volume" done={climbing.volume} onClick={() => void toggleClimbing('climbing-volume')} />
        <ClimbTick label="Limit" done={climbing.limit} onClick={() => void toggleClimbing('climbing-limit')} />
      </section>

      {routines === null ? (
        <p className="text-[13px] text-neutral-400">Loading…</p>
      ) : (
        lanes.map((lane) => <LaneCard key={lane.id} lane={lane} onStart={start} />)
      )}


      {/* Things you read rather than do — one card of rows, Nocturne's collapse
          rule. GtG leads because it is the only one of the four that is about
          today; §8's list is ticked on its own screen, which this opens. */}
      <section className={`${card} flex flex-col gap-0 px-3 py-1 shadow-edge`}>
        <button onClick={() => go({ name: 'signals' })} className={`${row} w-full`}>
          <Icon name="warning-circle" className="shrink-0 text-[17px] text-neutral-500" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium">Stop signals</span>
            <span className="block text-[11px] text-neutral-500">
              {signals.length === 0
                ? 'Nothing flagged'
                : signals.map((s) => s.signal.label).join(' · ')}
            </span>
          </span>
          <Icon name="caret-right" className="shrink-0 text-[13px] text-neutral-600" />
        </button>
        <div className="h-px bg-neutral-900" />

        <button onClick={() => go({ name: 'gtg' })} className={`${row} w-full`}>
          <Icon name="list-checks" className="shrink-0 text-[17px] text-neutral-500" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium">Today’s GtG</span>
            <span className="block text-[11px] text-neutral-500">§8’s committed list</span>
          </span>
          <Icon name="caret-right" className="shrink-0 text-[13px] text-neutral-600" />
        </button>
        <div className="h-px bg-neutral-900" />



        <BodyweightRow />
      </section>
    </div>
  );
}

/**
 * One tier.
 *
 * Elevation is `lane.daily` and nothing else. The two daily tiers are raised
 * because they are always live; the two weekly ones sit flat. No branch here
 * reads the log, so a lane run today and a lane not run today render the same
 * box (D49) — the only thing that differs is the words `lanes.ts` returned.
 */
function LaneCard({ lane, onStart }: { lane: Lane; onStart: (routineId: string) => Promise<void> }) {
  const raised = lane.daily
    ? 'bg-[linear-gradient(180deg,#232532_0%,#1d1f2c_100%)] shadow-[0_0_0_1px_rgba(145,132,217,.42),0_8px_24px_rgba(0,0,0,.4)]'
    : 'bg-surface shadow-edge';

  return (
    <section className={`flex flex-col gap-2 rounded-lg p-3.5 ${raised}`}>
      <div className="flex items-start justify-between gap-3">
        {/* A control only where there is a screen behind it (T38 AC7). Collagen
            has none — the routine it starts is the whole of that tier — and a
            title that looks tappable and is not is worse than one that never
            claimed to be. */}
        {lane.detail === undefined ? (
          <h2 className="text-[15px] font-medium tracking-[-0.01em]">{lane.name}</h2>
        ) : (
          <button
            onClick={() => go({ name: 'tier', tier: lane.detail as TierRoute })}
            className="flex items-center gap-1 text-left text-[15px] font-medium tracking-[-0.01em] hover:text-accent-200"
          >
            {lane.name}
            <Icon name="caret-right" className="text-[11px] text-neutral-600" />
          </button>
        )}
        <span
          className={`${tagOutline} shrink-0 tabular-nums`}
          title={lane.source}
        >
          {lane.cadence}
        </span>
      </div>

      <div className="flex flex-col gap-0.5">
        {lane.lines.map((line, i) => (
          <p key={i} className={i === 0 ? 'text-[13px] text-accent-200' : 'text-[11px] text-neutral-500'}>
            {line}
          </p>
        ))}
      </div>

      {lane.action.kind === 'start-routine' && (
        <button
          onClick={() => void onStart(lane.action.kind === 'start-routine' ? lane.action.routineId : '')}
          className={`${btnPrimary} w-full !rounded-[10px] py-[11px] text-[14px]`}
        >
          <Icon name="play" weight="fill" className="text-[14px]" />
          {lane.action.label}
        </button>
      )}

      {lane.action.kind === 'open-tier' && (
        <button
          onClick={() => go({ name: 'tier', tier: lane.action.kind === 'open-tier' ? lane.action.tier : 'pool' })}
          className={`${btnGhost} w-full justify-center py-[9px]`}
        >
          {lane.action.label}
          <Icon name="caret-right" className="text-xs" />
        </button>
      )}

      {lane.action.kind === 'empty' && (
        <p className="text-[11px] text-neutral-600">{lane.action.label}</p>
      )}
    </section>
  );
}

/** A week tick. Nothing here is styled by how many of the two are done. */
function ClimbTick({ label, done, onClick }: { label: string; done: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={done}
      className={`flex items-center gap-1.5 text-[11px] transition-colors ${
        done ? 'text-accent-300' : 'text-neutral-500 hover:text-accent-400'
      }`}
    >
      <Icon name={done ? 'check-circle' : 'circle'} weight={done ? 'fill' : 'regular'} className="text-[13px]" />
      {label}
    </button>
  );
}
