import { useEffect, useState } from 'react';
import type { ProgressMetric, WorkoutLog } from '../types';
import { getAllLogs } from '../lib/storage';
import { METRIC_CONFIG, buildSeries, isSegmentedBy } from '../lib/progress';
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
  // Declaration order is the toggle's order and its default (D22): hold time
  // leads on the max hangs because it is what moves session to session.
  const [selected, setSelected] = useState<ProgressMetric | null>(metrics?.[0] ?? null);

  useEffect(() => {
    if (!metrics || metrics.length === 0) return;
    void (async () => setLogs(await getAllLogs()))();
  }, [metrics]);

  if (!metrics || metrics.length === 0) return null;

  const metric = selected ?? metrics[0];
  const series =
    logs === null ? null : buildSeries(logs, exerciseId, metric, isSegmentedBy(metric, metrics));

  return (
    <section className="mt-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Progress</h2>

      {metrics.length > 1 && (
        <div className="mt-2 flex gap-1.5" role="group" aria-label="Progress metric">
          {metrics.map((m) => (
            <button
              key={m}
              onClick={() => setSelected(m)}
              aria-pressed={m === metric}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                m === metric
                  ? 'bg-brand-accent text-brand-bg'
                  : 'border border-slate-700 text-slate-300'
              }`}
            >
              {METRIC_CONFIG[m].label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 rounded-xl border border-slate-700 bg-brand-surface p-3">
        {logs === null ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : series === null ? (
          <p className="text-xs text-slate-400">
            No {METRIC_CONFIG[metric].label.toLowerCase()} logged yet. It appears here once you
            record it in a finished session.
          </p>
        ) : series.pointCount < 2 ? (
          // AC9: one point is a reading, not a line. Say so rather than drawing
          // a chart that implies a trend from a single session.
          <p className="text-xs text-slate-400">
            One session so far — {METRIC_CONFIG[metric].format(series.max)}. A line appears from the
            second.
          </p>
        ) : (
          <ProgressChart series={series} />
        )}
      </div>
    </section>
  );
}
