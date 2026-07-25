import type { ProgressMetric, SetEndReason, SetEntry, WorkoutLog } from '../types';

// Progress series for the three exercises the training plan actually progresses
// (D20). Pure — a function of (logs, exerciseId, metric) — like timer.ts,
// lastTime.ts, and rotation.ts, so the aggregation and segmentation rules are
// testable without IndexedDB or a DOM.
//
// This module reports and never judges. There is no trendline fit, no
// projection, no PR, and no "improving / declining" verdict: §4E's
// interpretation rubric is the owner's to apply, and a cheerful arrow drawn on a
// declining line would invert the plan's own safety guidance (§7 treats a
// downward trend as a signal to deload, not to try harder).

export interface MetricConfig {
  label: string; // toggle text
  unit: string;
  /** True when a *smaller* number is the better performance (edge size). */
  lowerIsBetter: boolean;
  format: (value: number) => string;
}

export const METRIC_CONFIG: Record<ProgressMetric, MetricConfig> = {
  holdSec: {
    label: 'Time',
    unit: 's',
    lowerIsBetter: false,
    format: (v) => `${v.toFixed(1)}s`,
  },
  addedLb: {
    label: 'Load',
    unit: 'lb',
    lowerIsBetter: false,
    // 0 added is bodyweight, which is what the lock-off starts at (plan §5B).
    format: (v) => (v === 0 ? 'BW' : `+${round1(v)}lb`),
  },
  edgeMm: {
    label: 'Edge',
    unit: 'mm',
    lowerIsBetter: true,
    format: (v) => `${round1(v)}mm`,
  },
};

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export interface ProgressPoint {
  logId: string;
  at: string; // ISO completedAt
  value: number;
  edgeMm: number | null; // the edge this value was recorded on, if any
  // D27: why the set behind this point ended, when it was recorded. Carried so
  // the chart can mark a hold that stopped for pain or a form breakdown
  // differently from one that stopped for strength — the same number, and a
  // completely different training fact (§7).
  endReason: SetEndReason | null;
}

/** A contiguous run of sessions sharing one edge. `edgeMm: null` = not recorded. */
export interface ProgressSegment {
  edgeMm: number | null;
  points: ProgressPoint[];
}

export interface ProgressSeries {
  metric: ProgressMetric;
  segments: ProgressSegment[];
  pointCount: number;
  min: number;
  max: number;
  startAt: string;
  endAt: string;
}

function readMetric(set: SetEntry, metric: ProgressMetric): number | undefined {
  const value = set[metric];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * The session's representative value for a metric: its best set (AC8).
 *
 * "Best" follows the metric's direction — the heaviest load, the longest hold,
 * the smallest edge. The returned `edgeMm` is the edge of *that* set rather than
 * the session's smallest, so a point is always the best effort together with the
 * condition it was actually produced under. `endReason` travels with it for the
 * same reason.
 *
 * A set that ended for pain is *not* excluded from the comparison (T14 edge
 * case). It was a real measurement, and dropping it would erase the low points
 * that make a declining line visible — which is the one thing §7 asks this chart
 * to show. It is marked instead, and the interpretation stays the owner's.
 */
function sessionValue(
  log: WorkoutLog,
  exerciseId: string,
  metric: ProgressMetric,
): ProgressPoint | null {
  const entry = log.entries.find((e) => e.exerciseId === exerciseId);
  if (!entry || log.completedAt === null) return null;

  const { lowerIsBetter } = METRIC_CONFIG[metric];
  let best: { value: number; set: SetEntry } | null = null;
  for (const set of entry.sets) {
    const value = readMetric(set, metric);
    if (value === undefined) continue;
    if (best === null || (lowerIsBetter ? value < best.value : value > best.value)) {
      best = { value, set };
    }
  }
  if (best === null) return null;

  return {
    logId: log.id,
    at: log.completedAt,
    value: best.value,
    edgeMm: readMetric(best.set, 'edgeMm') ?? null,
    endReason: best.set.endReason ?? null,
  };
}

/**
 * Splits chronological points into one segment per contiguous run of the same
 * edge (D22).
 *
 * Runs are contiguous in *time*, never merged by value: 18mm → 16mm → 18mm is
 * three segments, not two, because merging them would draw the later 18mm work
 * as a continuation of the harder 16mm block and read as progress that did not
 * happen. Sessions with no edge recorded form their own `null` run rather than
 * being absorbed into a neighbour's.
 */
function segmentByEdge(points: ProgressPoint[]): ProgressSegment[] {
  const segments: ProgressSegment[] = [];
  for (const point of points) {
    const current = segments[segments.length - 1];
    if (current && current.edgeMm === point.edgeMm) current.points.push(point);
    else segments.push({ edgeMm: point.edgeMm, points: [point] });
  }
  return segments;
}

/**
 * The full series for one exercise and metric, oldest first, or null if nothing
 * has been logged for it.
 *
 * Only completed sessions count — an abandoned log is not a performance, the
 * same rule rotation (D15) and carry-forward already apply.
 *
 * `segmented` is false when charting `edgeMm` itself: there the edge is the
 * subject rather than the condition, so cutting the line at every change would
 * leave a chart made entirely of single points.
 */
export function buildSeries(
  logs: WorkoutLog[],
  exerciseId: string,
  metric: ProgressMetric,
  segmented: boolean,
): ProgressSeries | null {
  const points = logs
    .map((log) => sessionValue(log, exerciseId, metric))
    .filter((p): p is ProgressPoint => p !== null)
    .sort((a, b) => a.at.localeCompare(b.at));

  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  return {
    metric,
    segments: segmented ? segmentByEdge(points) : [{ edgeMm: null, points }],
    pointCount: points.length,
    min: Math.min(...values),
    max: Math.max(...values),
    startAt: points[0].at,
    endAt: points[points.length - 1].at,
  };
}

/** True when a metric's chart is cut by edge (D22): everything except edge itself. */
export function isSegmentedBy(metric: ProgressMetric, declared: ProgressMetric[]): boolean {
  return metric !== 'edgeMm' && declared.includes('edgeMm');
}

/**
 * Fractional x position of an instant across the series' time span (AC10).
 *
 * Proportional to elapsed time rather than to session index, so a deload or a
 * skipped week shows as a gap — §4F schedules a lighter week 7, and evenly
 * spacing it away would hide the one interruption the plan builds in on purpose.
 * A series whose points share one instant collapses to 0 rather than dividing by
 * zero.
 */
export function timeFraction(at: string, startAt: string, endAt: string): number {
  const start = new Date(startAt).getTime();
  const span = new Date(endAt).getTime() - start;
  if (span <= 0) return 0;
  return (new Date(at).getTime() - start) / span;
}

/**
 * Fractional y position, 0 = bottom of the plot.
 *
 * Inverted for edge size so a smaller edge sits higher (AC7). A flat series
 * (five weeks at the same load) has zero range and is centred rather than
 * scaled into a fake slope or divided by zero.
 */
export function valueFraction(value: number, series: ProgressSeries): number {
  const range = series.max - series.min;
  if (range <= 0) return 0.5;
  const raw = (value - series.min) / range;
  return METRIC_CONFIG[series.metric].lowerIsBetter ? 1 - raw : raw;
}
