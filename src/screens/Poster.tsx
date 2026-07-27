import { useEffect, useState } from 'react';
import type { Exercise } from '../types';
import {
  getAllBodyweights,
  getAllExercises,
  getAllLogs,
  getAllRoutines,
  getSettings,
} from '../lib/storage';
import { buildPoster, describeOccasions, formatSpan, type Poster as PosterData } from '../lib/poster';
import { describeSessionFacts, sessionFacts } from '../lib/sigil';
import { describeTension, describeUntimed, formatEdge } from '../lib/tension';
import { formatPhaseWeeks } from '../lib/block';
import { LIGHTER_WEEK_CAVEAT } from '../data/blockPhases';
import { SessionSigil } from '../components/SessionSigil';
import { EdgeWeekGrid } from '../components/EdgeWeekGrid';
import { RetestComparison } from '../components/RetestComparison';
import { PlanRefLinks } from '../components/PlanRefLinks';

// The whole block on one surface (T28).
//
// Assembly: the span and the label are T24's, the volume is T26's, every mark is
// T27's, and §4E's comparison is T16's component rendered unchanged. This screen
// computes nothing of its own, which is the point — a seventh place that decides
// what a session is would be a seventh place that can disagree.
//
// What is deliberately absent, because this is the screen that would tempt every
// one of them: a sentence summarising the block, a grade, an adherence figure, a
// completion percentage, a maximum of any kind, a "best week", a comparison
// between two marks, and any congratulation. §4E's rubric is the one
// interpretation here and RetestComparison quotes it for the owner to apply
// (D23, D44, D45).
//
// It is also not an artifact: nothing exports, downloads, prints or encodes. A
// printable card was rejected by the owner and URL/QR sharing was deferred, both
// in v1.8 (D45a).

export function Poster({ onExit }: { onExit: () => void }) {
  const [data, setData] = useState<PosterData | null | undefined>(undefined);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routineNames, setRoutineNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    void (async () => {
      const [logs, routines, es, settings, bodyweights] = await Promise.all([
        getAllLogs(),
        getAllRoutines(),
        getAllExercises(),
        getSettings(),
        getAllBodyweights(),
      ]);
      setExercises(es);
      setRoutineNames(new Map(routines.map((r) => [r.id, r.name])));
      setData(
        buildPoster({ logs, routines, exercises: es, settings, bodyweights, today: new Date() }),
      );
    })();
  }, []);

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-24 pt-[54px]">
      <header className="flex items-center justify-between">
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">The block</h1>
        <button onClick={onExit} className="rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10">
          Done
        </button>
      </header>

      {data === undefined ? (
        <p className="text-[13px] text-neutral-400">Loading…</p>
      ) : data === null ? (
        <p className="rounded-md bg-surface shadow-edge p-6 text-center text-[13px] text-neutral-300">
          Not started — the block begins at your first logged session.
        </p>
      ) : (
        <>
          {/* AC1/AC2: the span and the label, both T24's. No "of 8 weeks", no
              progress toward eight, and nothing that reads as a finish line —
              §4F's lighter week is why there is no moment to call the end (D45b). */}
          <section className="rounded-md bg-surface shadow-edge p-3">
            <p className="text-lg font-medium tabular-nums text-ink">
              {describeTension(data.grid.total)}
            </p>
            <p className="mt-0.5 text-[13px] text-neutral-300">{data.grid.position.label}</p>
            {formatSpan(data.firstAt, data.lastAt) && (
              <p className="mt-0.5 text-xs text-neutral-500">{formatSpan(data.firstAt, data.lastAt)}</p>
            )}
            {data.edges.length > 0 && (
              <p className="mt-1.5 text-xs text-neutral-400">
                Edges worked: {data.edges.map(formatEdge).join(' · ')}
              </p>
            )}
            {describeUntimed(data.grid.total) && (
              <p className="mt-1 text-xs text-neutral-500">
                {describeUntimed(data.grid.total)}.
              </p>
            )}
          </section>

          {/* AC4/AC5/AC6: every session as its own mark, forward through the
              block. Nothing here is sized, ordered or highlighted by comparison
              with another mark — they are laid out in time, and that is all. */}
          <section className="space-y-3">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">
              Session by session
            </h2>
            {data.weeks.map((week) => (
              <div key={week.week} className="rounded-md bg-surface shadow-edge p-3">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-300">
                    Week {week.week}
                  </h3>
                  {week.phase && (
                    <p className="min-w-0 flex-1 text-xs leading-snug text-neutral-600">
                      {formatPhaseWeeks(week.phase)}: {week.phase.focus} (plan §4F)
                    </p>
                  )}
                </div>

                {week.logs.length === 0 ? (
                  // AC6: a gap is part of the block's shape. Stated as an absence
                  // of records, never as a lapse (D23).
                  <p className="mt-2 text-xs text-neutral-600">No sessions logged this week.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {week.logs.map((log) => (
                      <li key={log.id} className="flex items-center gap-3">
                        <SessionSigil log={log} exercises={exercises} size={34} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[13px] text-neutral-200">
                              {routineNames.get(log.routineId) ?? log.routineId}
                            </span>
                            <span className="shrink-0 text-xs text-neutral-500">
                              {new Date(log.completedAt as string).toLocaleDateString()}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs tabular-nums text-neutral-400">
                            {describeSessionFacts(sessionFacts(log, exercises))}
                          </span>
                          {/* AC7's other half: present in the block's story, and
                              counted in none of its volume (D29, D43). */}
                          {data.batteryLogIds.has(log.id) && (
                            <span className="mt-0.5 block text-xs text-neutral-600">
                              §4E battery — not counted as a block session
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>

          {/* AC3: T26's grid, unmodified. The poster does not get its own copy of
              the volume rules. */}
          <EdgeWeekGrid grid={data.grid} />

          {/* AC7/AC8: the one comparison the plan itself asks for, rendered by
              T16's component with §4E's rubric quoted and never applied. */}
          <section className="space-y-2">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">
              §4E — compare to week 1
            </h2>
            {data.occasions.length >= 2 ? (
              <RetestComparison
                baseline={data.occasions[0]}
                latest={data.occasions[data.occasions.length - 1]}
              />
            ) : (
              <p className="rounded-md bg-surface shadow-edge p-3 text-xs leading-snug text-neutral-400">
                {describeOccasions(data.occasions)}
              </p>
            )}
          </section>

          {/* §4F's own caveat, in full, on the surface most likely to be read as a
              verdict. It is the sentence that makes the app's silence the plan's
              position rather than a design preference (D23). */}
          <section className="rounded-md border border-neutral-800 bg-bg/60 p-3">
            <p className="text-xs leading-snug text-neutral-500">{LIGHTER_WEEK_CAVEAT}</p>
            <PlanRefLinks refs={['4E', '4F']} className="mt-2" />
          </section>
        </>
      )}
    </div>
  );
}
