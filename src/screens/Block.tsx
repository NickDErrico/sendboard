import { useEffect, useState } from 'react';
import { getAllExercises, getAllLogs, getAllRoutines, getSettings } from '../lib/storage';
import { buildEdgeWeekGrid, describeTension, describeUntimed, type EdgeWeekGrid as Grid } from '../lib/tension';
import { go } from '../lib/routes';
import { EdgeWeekGrid } from '../components/EdgeWeekGrid';
import { PlanRefLinks } from '../components/PlanRefLinks';

// Where the block's work went (T26). A reading surface: it loads, aggregates and
// renders, and writes nothing.
//
// The whole screen is arithmetic over the log — sums and counts, which D23
// permits in as many words. What is absent is deliberate and is the harder half
// of the task: no heaviest load, no longest hold, no best week, no smallest edge
// reached, no adherence percentage, no projection, and no comment on any of it.
// A maximum is a PR, and §7 asks the owner to watch for a *falling* number.

export function Block({ onExit }: { onExit: () => void }) {
  const [grid, setGrid] = useState<Grid | null | undefined>(undefined);

  useEffect(() => {
    void (async () => {
      const [logs, routines, exercises, settings] = await Promise.all([
        getAllLogs(),
        getAllRoutines(),
        getAllExercises(),
        getSettings(),
      ]);
      setGrid(buildEdgeWeekGrid({ logs, routines, exercises, settings, today: new Date() }));
    })();
  }, []);

  return (
    <div className="mx-auto max-w-md space-y-4 p-4 pb-24">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Block</h1>
        <button onClick={onExit} className="rounded px-1 py-1 text-sm text-slate-400 hover:text-slate-200">
          Done
        </button>
      </header>

      {grid === undefined ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : grid === null ? (
        // AC10: the same words Home uses, because it is the same fact.
        <p className="rounded-xl border border-slate-700 bg-brand-surface p-6 text-center text-sm text-slate-300">
          Not started — the block begins at your first logged session.
        </p>
      ) : (
        <>
          {/* AC1/AC2: two facts and the gap between them. Nothing is compared to
              anything, here or below. */}
          <section className="rounded-xl border border-slate-700 bg-brand-surface p-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Under tension
            </h2>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-100">
              {describeTension(grid.total)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{grid.position.label}</p>
            {describeUntimed(grid.total) && (
              <p className="mt-1.5 text-xs leading-snug text-amber-200/80">
                {describeUntimed(grid.total)} — those holds are counted, and the seconds beside them
                are not.
              </p>
            )}
          </section>

          {/* T28: the whole block on one surface, one tap from where the block
              lives. Not gated on week 8 and carrying no countdown to it — the
              poster reads the same at week 3 and at week 12 (D45b). */}
          <button
            onClick={() => go({ name: 'poster' })}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-700 bg-brand-surface p-3 text-left"
          >
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                The block, session by session
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-slate-400">
                Every session as a mark, week by week, with §4E's before and after.
              </span>
            </span>
            <span aria-hidden className="shrink-0 text-slate-500">
              ›
            </span>
          </button>

          {grid.total.holds === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-brand-surface p-6 text-center text-sm text-slate-400">
              No holds logged in this block yet. Sets appear here once a finished session records
              one.
            </p>
          ) : (
            <EdgeWeekGrid grid={grid} />
          )}

          {/* AC8/AC9: what the numbers above are made of, said plainly rather than
              left for the owner to infer from a total that looks low. */}
          <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              What is counted
            </h2>
            <ul className="mt-1 space-y-1 text-xs leading-snug text-slate-400">
              <li>
                A <span className="text-slate-300">hold</span> is one logged set of an exercise the
                plan prescribes a hold for — the PIMA pulls (§4B), the max hangs (§4C), the bar
                pulls and lock-off holds (§5A, §5B).
              </li>
              <li>
                Seconds are the durations <span className="text-slate-300">recorded</span> on those
                sets. A set logged without one is counted as a hold and adds no time; nothing is
                filled in from a prescription.
              </li>
              <li>Warm-up hangs (§4A) are not counted — the warm-up is a condition of the work.</li>
              <li>
                Finished training sessions only, from the day this block is counted from. Unfinished
                sessions are not included.
              </li>
            </ul>
            <PlanRefLinks refs={['4B', '4C', '5A', '5B']} className="mt-2" />
          </section>

          {grid.excludedBatteries > 0 && (
            <button
              onClick={() => go({ name: 'retest' })}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-700 bg-brand-surface p-3 text-left"
            >
              <span className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  §4E baseline / retest
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-400">
                  {grid.excludedBatteries === 1
                    ? 'One battery falls inside this block and is not counted above'
                    : `${grid.excludedBatteries} batteries fall inside this block and are not counted above`}{' '}
                  — a maximum under a test protocol is not training volume. Reported on its own
                  screen.
                </span>
              </span>
              <span aria-hidden className="shrink-0 text-slate-500">
                ›
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
