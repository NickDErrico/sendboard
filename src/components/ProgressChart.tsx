import {
  METRIC_CONFIG,
  timeFraction,
  valueFraction,
  type ProgressSegment,
  type ProgressSeries,
} from '../lib/progress';
import { isSafetySignal } from '../lib/setReason';

// Inline SVG, no charting dependency — the whole thing is a polyline, some
// circles, and labels, and every prior task shipped without adding a package.
//
// Presentational only: it draws the series it is handed and asserts nothing
// about it. No trendline, no projection, no PR marker, no "improving" verdict
// (T12 non-goal) — §4E's interpretation rubric belongs to the owner.

const W = 300;
const H = 150;
const PAD = { left: 34, right: 10, top: 12, bottom: 32 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

// One class per contiguous edge run (D22). Cycles if the owner uses more than
// four edges in a block, which would already be an unusual amount of change.
const SEGMENT_COLORS = [
  { stroke: 'stroke-sky-400', fill: 'fill-sky-400', text: 'text-sky-300' },
  { stroke: 'stroke-emerald-400', fill: 'fill-emerald-400', text: 'text-emerald-300' },
  { stroke: 'stroke-violet-400', fill: 'fill-violet-400', text: 'text-violet-300' },
  { stroke: 'stroke-amber-400', fill: 'fill-amber-400', text: 'text-amber-300' },
];

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ProgressChart({ series }: { series: ProgressSeries }) {
  const config = METRIC_CONFIG[series.metric];

  const x = (at: string) =>
    PAD.left + timeFraction(at, series.startAt, series.endAt) * PLOT_W;
  const y = (value: number) => PAD.top + (1 - valueFraction(value, series)) * PLOT_H;

  // A flat series has no range to label twice; showing one value is honest and
  // avoids an axis that reads "8 / 8".
  const flat = series.max === series.min;
  const flagged = series.segments.some((s) => s.points.some((p) => isSafetySignal(p.endReason)));
  const axisTop = config.lowerIsBetter ? series.min : series.max;
  const axisBottom = config.lowerIsBetter ? series.max : series.min;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${config.label} from ${shortDate(series.startAt)} to ${shortDate(
          series.endAt,
        )}, ${config.format(series.min)} to ${config.format(series.max)}${
          // The ring is invisible to a screen reader, so the fact it carries is
          // spoken instead of lost.
          flagged ? '. Some sets ended on pain or form' : ''
        }`}
      >
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={PAD.top + PLOT_H}
          className="stroke-slate-700"
        />
        <line
          x1={PAD.left}
          y1={PAD.top + PLOT_H}
          x2={W - PAD.right}
          y2={PAD.top + PLOT_H}
          className="stroke-slate-700"
        />

        <text x={PAD.left - 5} y={PAD.top + 4} textAnchor="end" className="fill-slate-500 text-[9px]">
          {config.format(axisTop)}
        </text>
        {!flat && (
          <text
            x={PAD.left - 5}
            y={PAD.top + PLOT_H + 3}
            textAnchor="end"
            className="fill-slate-500 text-[9px]"
          >
            {config.format(axisBottom)}
          </text>
        )}

        {series.segments.map((segment, i) => (
          <Segment
            key={`${segment.edgeMm ?? 'none'}-${i}`}
            segment={segment}
            color={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
            x={x}
            y={y}
            showEdgeLabel={series.segments.length > 1}
          />
        ))}

        <text x={PAD.left} y={H - 4} className="fill-slate-600 text-[9px]">
          {shortDate(series.startAt)}
        </text>
        {series.pointCount > 1 && (
          <text x={W - PAD.right} y={H - 4} textAnchor="end" className="fill-slate-600 text-[9px]">
            {shortDate(series.endAt)}
          </text>
        )}
      </svg>
      {/* T14 AC6: a ringed point is a set that ended for pain or a form
          breakdown. Stated rather than left to be inferred — the mark exists so
          a low point can be read as a tissue event instead of a strength result,
          and an unexplained symbol would do the opposite. Still no verdict: the
          caption names the fact and stops (D23). */}
      {(flagged || config.lowerIsBetter) && (
        <figcaption className="mt-1 space-y-0.5 text-center text-[10px] text-slate-500">
          {flagged && <span className="block">Ringed point — set ended on pain or form</span>}
          {config.lowerIsBetter && <span className="block">Axis inverted — a smaller edge sits higher</span>}
        </figcaption>
      )}
    </figure>
  );
}

function Segment({
  segment,
  color,
  x,
  y,
  showEdgeLabel,
}: {
  segment: ProgressSegment;
  color: (typeof SEGMENT_COLORS)[number];
  x: (at: string) => number;
  y: (value: number) => number;
  showEdgeLabel: boolean;
}) {
  const points = segment.points.map((p) => ({
    cx: x(p.at),
    cy: y(p.value),
    flagged: isSafetySignal(p.endReason),
  }));
  // A single-session segment gets its point and no line (AC12) — one point is a
  // reading, not a trend, and joining it to the neighbouring edge would assert
  // exactly the comparison D22 exists to refuse.
  const path = points.map((p) => `${p.cx},${p.cy}`).join(' ');
  const midX = points.reduce((sum, p) => sum + p.cx, 0) / points.length;

  return (
    <g>
      {points.length > 1 && (
        <polyline points={path} fill="none" strokeWidth={2} className={color.stroke} />
      )}
      {/* A flagged point keeps its dot and gains a ring, so the value still reads
          at the same place on the line — the point is not moved, downweighted, or
          excluded (see progress.sessionValue), only annotated. */}
      {points.map((p, i) => (
        <g key={i}>
          {p.flagged && (
            <circle
              cx={p.cx}
              cy={p.cy}
              r={6}
              fill="none"
              strokeWidth={1.5}
              className="stroke-red-400"
            />
          )}
          <circle cx={p.cx} cy={p.cy} r={3} className={color.fill} />
        </g>
      ))}
      {showEdgeLabel && (
        <text x={midX} y={H - 16} textAnchor="middle" className={`text-[9px] ${color.text} fill-current`}>
          {segment.edgeMm === null ? 'no edge' : `${segment.edgeMm}mm`}
        </text>
      )}
    </g>
  );
}
