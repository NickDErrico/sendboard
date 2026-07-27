import {
  SERIES_CONFIG,
  timeFraction,
  valueFraction,
  type ProgressSegment,
  type ProgressSeries,
} from '../lib/progress';
import { isSafetySignal } from '../lib/setReason';
import { MAX_STALENESS_DAYS } from '../lib/bodyweight';

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

/**
 * How one edge is drawn: a step on the accent ramp, and a stroke pattern.
 *
 * Two channels rather than one, because a mono palette asks the eye to separate
 * lines by lightness alone and four steps of one hue on a dark ground is a lot
 * to ask — especially of the two dark steps. The dash carries the same
 * distinction without introducing a second hue, and it survives being
 * photographed, dimmed, or read by someone who separates tones poorly.
 *
 * Adjacent entries differ in *both* channels on purpose: consecutive edges are
 * the pair most likely to be on screen together.
 */
// The accent leads, so a chart with nothing to segment — the Edge view, or a
// block spent entirely on one rung — is the plain accent line the design system
// asks for, and the ramp only opens up when there is something to tell apart.
const EDGE_STYLES = [
  { stroke: 'stroke-accent', fill: 'fill-accent', text: 'text-accent', dash: undefined },
  { stroke: 'stroke-accent-200', fill: 'fill-accent-200', text: 'text-accent-200', dash: '5 3' },
  { stroke: 'stroke-accent-400', fill: 'fill-accent-400', text: 'text-accent-400', dash: undefined },
  { stroke: 'stroke-accent-600', fill: 'fill-accent-600', text: 'text-accent-400', dash: '5 3' },
  { stroke: 'stroke-neutral-400', fill: 'fill-neutral-400', text: 'text-neutral-400', dash: '2 3' },
];

/**
 * A style per *edge*, not per segment.
 *
 * D22 splits the line into a new segment every time the edge changes, so
 * dropping to 18mm and later returning to 20mm produces three segments across
 * two edges. Keying the style to the segment's position drew those two 20mm runs
 * in different colours — which says "these are different things" about the one
 * comparison on the chart that is genuinely like-for-like. Keyed to the edge, a
 * given rung looks the same everywhere it appears, and the labels under the axis
 * become a legend that actually resolves.
 *
 * Largest edge first, so the ordering is the board's rather than the log's.
 */
function stylesByEdge(segments: ProgressSegment[]) {
  const edges = [...new Set(segments.map((s) => s.edgeMm))].sort((a, b) => (b ?? -1) - (a ?? -1));
  const byEdge = new Map<number | null, (typeof EDGE_STYLES)[number]>();
  edges.forEach((edge, i) => byEdge.set(edge, EDGE_STYLES[i % EDGE_STYLES.length]));
  return byEdge;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ProgressChart({ series }: { series: ProgressSeries }) {
  const config = SERIES_CONFIG[series.kind];

  const x = (at: string) =>
    PAD.left + timeFraction(at, series.startAt, series.endAt) * PLOT_W;
  const y = (value: number) => PAD.top + (1 - valueFraction(value, series)) * PLOT_H;

  // A flat series has no range to label twice; showing one value is honest and
  // avoids an axis that reads "8 / 8".
  const flat = series.max === series.min;
  const flagged = series.segments.some((s) => s.points.some((p) => isSafetySignal(p.endReason)));
  const styles = stylesByEdge(series.segments);
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
          className="stroke-neutral-800"
        />
        <line
          x1={PAD.left}
          y1={PAD.top + PLOT_H}
          x2={W - PAD.right}
          y2={PAD.top + PLOT_H}
          className="stroke-neutral-800"
        />

        <text x={PAD.left - 5} y={PAD.top + 4} textAnchor="end" className="fill-neutral-600 text-[10px]">
          {config.format(axisTop)}
        </text>
        {!flat && (
          <text
            x={PAD.left - 5}
            y={PAD.top + PLOT_H + 3}
            textAnchor="end"
            className="fill-neutral-600 text-[10px]"
          >
            {config.format(axisBottom)}
          </text>
        )}

        {series.segments.map((segment, i) => (
          <Segment
            key={`${segment.edgeMm ?? 'none'}-${i}`}
            segment={segment}
            style={styles.get(segment.edgeMm) ?? EDGE_STYLES[0]}
            x={x}
            y={y}
            showEdgeLabel={series.segments.length > 1}
          />
        ))}

        <text x={PAD.left} y={H - 4} className="fill-neutral-600 text-[10px]">
          {shortDate(series.startAt)}
        </text>
        {series.pointCount > 1 && (
          <text x={W - PAD.right} y={H - 4} textAnchor="end" className="fill-neutral-600 text-[10px]">
            {shortDate(series.endAt)}
          </text>
        )}
      </svg>
      {/* T14 AC6: a ringed point is a set that ended for pain or a form
          breakdown. Stated rather than left to be inferred — the mark exists so
          a low point can be read as a tissue event instead of a strength result,
          and an unexplained symbol would do the opposite. Still no verdict: the
          caption names the fact and stops (D23). */}
      {(flagged || config.lowerIsBetter || series.droppedForNoBodyweight > 0) && (
        <figcaption className="mt-1 space-y-0.5 text-center text-[10px] text-neutral-500">
          {flagged && <span className="block">Ringed point — set ended on pain or form</span>}
          {config.lowerIsBetter && <span className="block">Axis inverted — a smaller edge sits higher</span>}
          {/* AC5: said out loud, because a percentage view quietly missing
              sessions reads as a complete record of a shorter block. */}
          {series.droppedForNoBodyweight > 0 && (
            <span className="block">
              {series.droppedForNoBodyweight} session
              {series.droppedForNoBodyweight === 1 ? '' : 's'} hidden — no bodyweight recorded
              within {MAX_STALENESS_DAYS} days
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

function Segment({
  segment,
  style,
  x,
  y,
  showEdgeLabel,
}: {
  segment: ProgressSegment;
  style: (typeof EDGE_STYLES)[number];
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
  // Centred under its own run, but never past the plot's edges: a single-session
  // segment at either end centres its label on that one point, which hangs half
  // the word outside the viewBox and clips it.
  const midX = points.reduce((sum, p) => sum + p.cx, 0) / points.length;
  const labelX = Math.min(Math.max(midX, PAD.left + 16), W - PAD.right - 16);

  return (
    <g>
      {points.length > 1 && (
        <polyline
          points={path}
          fill="none"
          strokeWidth={2}
          strokeDasharray={style.dash}
          strokeLinecap="round"
          className={style.stroke}
        />
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
              className="stroke-warn"
            />
          )}
          <circle cx={p.cx} cy={p.cy} r={3} className={style.fill} />
        </g>
      ))}
      {showEdgeLabel && (
        <text x={labelX} y={H - 16} textAnchor="middle" className={`text-[9px] ${style.text} fill-current`}>
          {segment.edgeMm === null ? 'no edge' : `${segment.edgeMm}mm`}
        </text>
      )}
    </g>
  );
}
