import { useEffect, useState } from 'react';
import type { BodyweightEntry, ProgressMetric, WorkoutLog } from '../types';
import { getAllBodyweights, getAllLogs } from '../lib/storage';
import { SERIES_CONFIG, buildSeries, isSegmentedBy, type SeriesKind } from '../lib/progress';
import { ProgressChart } from './ProgressChart';

// The progress section on an exercise's detail screen. Self-loading, so
// ExerciseDetail keeps its existing props and stays presentational — it is
// rendered from three places (the catalog list, the routine preview, and mid
// session) and none of them should have to know about logs.
//
// Renders nothing at all for the seventeen exercises that declare no metrics
// (AC2): no heading, no empty box, no "not tracked" note.

export function ExerciseProgress({
  exerciseId,
  metrics,
}: {
  exerciseId: string;
  metrics: ProgressMetric[] | undefined;
}) {
  const [logs, setLogs] = useState<WorkoutLog[] | null>(null);
  const [bodyweights, setBodyweights] = useState<BodyweightEntry[]>([]);
  // Declaration order is the toggle's order and its default (D22): hold time
  // leads on the max hangs because it is what moves session to session.
  const [selected, setSelected] = useState<SeriesKind | null>(metrics?.[0] ?? null);

  useEffect(() => {
    if (!metrics || metrics.length === 0) return;
    void (async () => {
      const [allLogs, allBw] = await Promise.all([getAllLogs(), getAllBodyweights()]);
      setLogs(allLogs);
      setBodyweights(allBw);
    })();
  }, [metrics]);

  if (!metrics || metrics.length === 0) return null;

  // T15: %BW is offered next to Load wherever added load is progressed, but only
  // once a bodyweight exists — a toggle that could only ever say "nothing to show"
  // is worse than no toggle. It sits immediately after `addedLb` because it is
  // the same measurement in the unit §4E reports the block in.
  const kinds: SeriesKind[] =
    metrics.includes('addedLb') && bodyweights.length > 0
      ? metrics.flatMap<SeriesKind>((m) => (m === 'addedLb' ? [m, 'addedPctBw'] : [m]))
      : metrics;

  const kind = selected !== null && kinds.includes(selected) ? selected : kinds[0];
  const series =
    logs === null
      ? null
      : buildSeries(logs, exerciseId, kind, isSegmentedBy(kind, metrics), bodyweights);

  return (
    <section className="mt-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Progress</h2>

      {kinds.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Progress metric">
          {kinds.map((k) => (
            <button
              key={k}
              onClick={() => setSelected(k)}
              aria-pressed={k === kind}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                k === kind
                  ? 'bg-brand-accent text-brand-bg'
                  : 'border border-slate-700 text-slate-300'
              }`}
            >
              {SERIES_CONFIG[k].label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 rounded-xl border border-slate-700 bg-brand-surface p-3">
        {logs === null ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : series === null ? (
          <p className="text-xs text-slate-400">
            {kind === 'addedPctBw'
              ? // Distinct from "nothing logged": the load is there, the
                // denominator is not, and saying which is missing is the
                // difference between an actionable message and a dead end.
                'No session has both an added load and a bodyweight recorded near it yet.'
              : `No ${SERIES_CONFIG[kind].label.toLowerCase()} logged yet. It appears here once you record it in a finished session.`}
          </p>
        ) : series.pointCount < 2 ? (
          // AC9: one point is a reading, not a line. Say so rather than drawing
          // a chart that implies a trend from a single session.
          <p className="text-xs text-slate-400">
            One session so far — {SERIES_CONFIG[kind].format(series.max)}. A line appears from the
            second.
          </p>
        ) : (
          <ProgressChart series={series} />
        )}
      </div>
    </section>
  );
}
