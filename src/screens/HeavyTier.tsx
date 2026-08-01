import { useCallback, useEffect, useState } from 'react';
import type { Exercise, Routine, WorkoutLog } from '../types';
import { getAllExercises, getAllLogs, getAllRoutines, getSettings } from '../lib/storage';
import { describeLastCompleted, rotates, routineRotation, type RoutineStatus } from '../lib/rotation';
import {
  BLOCK_WEEKS,
  blockPosition,
  formatPhaseWeeks,
  phaseFor,
  type BlockPosition,
} from '../lib/block';
import { buildEdgeWeekGrid, describeTension, type EdgeWeekGrid } from '../lib/tension';
import { batteryOccasions, type Occasion } from '../lib/retest';
import { LIGHTER_WEEK_CAVEAT } from '../data/blockPhases';
import { resumable } from '../lib/session';
import { startSession } from '../lib/openSession';
import { go } from '../lib/routes';
import { Icon, btnGhost, btnPrimary, card, kicker, kickerAccent, row } from '../components/ui';

/**
 * The heavy tier's own screen (T38, D50).
 *
 * Everything on it used to be on Today, framing the whole app: "~week 3 of 8"
 * beside the wordmark, the phase card under the lanes, the §4E battery and the
 * edge × week grid in the read list. None of that describes the other three
 * tiers. The collagen work, the daily isometric slots and the pool are permanent
 * and unperiodised — no phase, no deload, no retest — and enclosing them in a
 * countdown that belongs to one tier said something untrue about the other
 * three.
 *
 * So the block is this tier's state. Nothing in `block.ts` changed: the position
 * is still derived from the log (D25), the week is still Monday-anchored (D10),
 * and past week 8 still reads `week 8+` rather than late. What changed is only
 * what the week is allowed to frame.
 *
 * **A separate screen rather than a third branch in `TierDetail`.** That
 * component reads `SlotStatus[]` and says in as many words that it is one layout
 * parameterised, not two behind a branch. The heavy tier is routines, a block
 * and a battery — a different shape — so the route branches and each component
 * stays honest about the one thing it renders.
 *
 * D23 unchanged: this reports and cites. There is no adherence figure, no
 * projection, nothing marked finished, and the one graphic — the week strip — is
 * deliberately dumb, drawing elapsed weeks and nothing about how they went.
 */
export function HeavyTier() {
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [rotation, setRotation] = useState<RoutineStatus[]>([]);
  const [inProgress, setInProgress] = useState<WorkoutLog | null>(null);
  const [block, setBlock] = useState<BlockPosition | null>(null);
  const [tension, setTension] = useState<EdgeWeekGrid | null>(null);
  const [occasions, setOccasions] = useState<Occasion[]>([]);

  const refresh = useCallback(async () => {
    const [rs, logs, settings, exercises]: [Routine[], WorkoutLog[], Awaited<ReturnType<typeof getSettings>>, Exercise[]] =
      await Promise.all([getAllRoutines(), getAllLogs(), getSettings(), getAllExercises()]);
    setRoutines(rs);
    setRotation(routineRotation(rs, logs, new Date()));
    setInProgress(resumable(logs));
    setBlock(blockPosition({ logs, routines: rs, settings, today: new Date() }));
    setTension(buildEdgeWeekGrid({ logs, routines: rs, exercises, settings, today: new Date() }));
    setOccasions(batteryOccasions(logs));
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

  const ordered = [...(routines ?? [])]
    .filter(rotates)
    .sort(
      (a, b) =>
        Number(rotation.find((s) => s.routineId === b.id)?.isNextUp ?? false) -
        Number(rotation.find((s) => s.routineId === a.id)?.isNextUp ?? false),
    );

  const batteryLine =
    occasions.length === 0
      ? 'Not recorded yet'
      : occasions.length === 1
        ? `Baseline ${new Date(occasions[0].at).toLocaleDateString()}`
        : `${occasions.length} recorded · latest ${new Date(occasions[occasions.length - 1].at).toLocaleDateString()}`;

  async function start(routineId: string) {
    if (inProgress) {
      go({ name: 'routine', routineId });
      return;
    }
    await startSession(routineId);
    go({ name: 'session' });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3.5 px-4 pb-24 pt-[54px]">
      <header className="flex items-baseline gap-2">
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">Heavy</h1>
        <span className="text-[11px] text-neutral-600">1–2×/week per pattern · plan §3</span>
        <button
          onClick={() => go({ name: 'today' })}
          className="ml-auto rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10"
        >
          Done
        </button>
      </header>

      {routines === null ? (
        <p className="text-[13px] text-neutral-400">Loading…</p>
      ) : (
        <>
          {ordered.map((routine, i) => {
            const status = rotation.find((s) => s.routineId === routine.id);
            const upNext = status?.isNextUp === true;
            return (
              <section
                key={routine.id}
                className={
                  upNext
                    ? 'flex flex-col gap-2 rounded-lg bg-[linear-gradient(180deg,#232532_0%,#1d1f2c_100%)] p-3.5 shadow-[0_0_0_1px_rgba(145,132,217,.42),0_8px_24px_rgba(0,0,0,.4)]'
                    : `${card} flex flex-col gap-2 shadow-edge`
                }
              >
                {/* Rotation order is the only thing raised here, and it is
                    `rotation.ts`'s answer rather than this screen's — the same
                    property Today's lanes raise on cadence. */}
                {upNext && <p className={kickerAccent}>Up next</p>}
                <button
                  onClick={() => go({ name: 'routine', routineId: routine.id })}
                  className="text-left text-[15px] font-medium leading-tight"
                >
                  {routine.name}
                </button>
                <p className="text-[11px] text-neutral-500">
                  {routine.exerciseIds.length} exercises ·{' '}
                  {status ? describeLastCompleted(status) : '—'}
                </p>
                <button
                  onClick={() => void start(routine.id)}
                  className={
                    i === 0
                      ? `${btnPrimary} w-full !rounded-[10px] py-[11px] text-[14px]`
                      : `${btnGhost} w-full justify-center py-[9px]`
                  }
                >
                  <Icon name="play" weight="fill" className="text-[13px]" />
                  Start
                </button>
              </section>
            );
          })}

          {/* The block, now under the tier it describes. Not a button and not a
              schedule: nothing is due, and past week 8 it reads "week 8+". */}
          <section className={`${card} flex flex-col gap-2.5 shadow-edge`}>
            <div className="flex items-baseline gap-2">
              <h2 className={kicker}>This block</h2>
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
                      <span className="text-neutral-200">{phase.focus}</span> — {phase.note} (plan
                      §4F)
                    </p>
                  );
                })()}
                <p className="text-[11px] leading-snug text-neutral-600">{LIGHTER_WEEK_CAVEAT}</p>
              </>
            )}
          </section>

          {/* Both measure this tier and nothing else, which is why they are
              reached from here rather than from the app's read list. */}
          <section className={`${card} flex flex-col gap-0 px-3 py-1 shadow-edge`}>
            <button onClick={() => go({ name: 'retest' })} className={`${row} w-full`}>
              <Icon name="target" className="shrink-0 text-[17px] text-neutral-500" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">§4E baseline / retest</span>
                <span className="block text-[11px] text-neutral-500">{batteryLine}</span>
              </span>
              <Icon name="caret-right" className="shrink-0 text-[13px] text-neutral-600" />
            </button>
            <div className="h-px bg-neutral-900" />
            <button onClick={() => go({ name: 'block' })} className={`${row} w-full`}>
              <Icon name="chart-bar" className="shrink-0 text-[17px] text-neutral-500" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">Edge × week · under tension</span>
                <span className="block text-[11px] tabular-nums text-neutral-500">
                  {tension === null ? '—' : describeTension(tension.total)}
                </span>
              </span>
              <Icon name="caret-right" className="shrink-0 text-[13px] text-neutral-600" />
            </button>
          </section>
        </>
      )}
    </div>
  );
}
