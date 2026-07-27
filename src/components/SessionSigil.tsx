import type { Exercise, WorkoutLog } from '../types';
import {
  SIGIL_INNER,
  SIGIL_MAX_SEC,
  sigilFor,
  spokePoint,
  type Sigil,
} from '../lib/sigil';

// The session's mark (T27, D44).
//
// Every property drawn below is one recorded fact, and `SigilLegend` names them
// wherever the mark is large enough to read. Nothing here is derived from the
// log's id, its timestamp, or any hash — a mark that cannot be checked against
// the log is decoration that looks like information, which is the badge D23
// forbids.
//
// It is `aria-hidden` on purpose: the row beside it already carries the same
// facts in text, so describing the picture would either repeat them or invent a
// summary the app has no business writing.

const VIEW = 100; // viewBox units; the mark is drawn in a centred unit circle
const CENTRE = VIEW / 2;

export function SessionSigil({
  log,
  exercises,
  size = 28,
}: {
  log: WorkoutLog;
  exercises: Exercise[];
  size?: number;
}) {
  const sigil = sigilFor(log, exercises);
  // AC7: a session with no holds has nothing to draw. No empty frame, no
  // placeholder — the row's own line still says what the session contained.
  if (sigil === null) return null;
  return <SigilMark sigil={sigil} size={size} />;
}

export function SigilMark({ sigil, size }: { sigil: Sigil; size: number }) {
  // Thinner strokes as the mark grows, so a 28px row glyph stays legible and a
  // 120px one does not read as a blob.
  const stroke = size <= 40 ? 7 : 4.5;
  const radius = CENTRE - stroke;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      aria-hidden
      className="shrink-0 overflow-visible"
    >
      {/* The hub is the session itself: every spoke starts on it, so a mark with
          one hold and a mark with twelve are recognisably the same kind of thing. */}
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={SIGIL_INNER * radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke * 0.5}
        className="text-neutral-700"
      />
      {sigil.spokes.map((spoke) => {
        const from = spokePoint(spoke.angleDeg, SIGIL_INNER * radius);
        const to = spokePoint(spoke.angleDeg, spoke.reach * radius);
        const untimed = spoke.seconds === null;
        return (
          <g key={spoke.index}>
            {untimed ? (
              // AC4: absent is not brief. An untimed hold is a hollow tick on the
              // hub rather than a very short spoke, which would claim a
              // measurement that was never taken.
              <circle
                cx={CENTRE + to.x}
                cy={CENTRE + to.y}
                r={stroke * 0.55}
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke * 0.45}
                className="text-neutral-500"
              />
            ) : (
              <line
                x1={CENTRE + from.x}
                y1={CENTRE + from.y}
                x2={CENTRE + to.x}
                y2={CENTRE + to.y}
                stroke="currentColor"
                strokeWidth={stroke}
                strokeLinecap="round"
                className="text-accent"
              />
            )}
            {/* AC5: the two reasons a set summary already surfaces (D27). A mark,
                not an alarm — the surface that acts on a stop signal is T17's. */}
            {spoke.signal && !untimed && (
              <circle
                cx={CENTRE + to.x}
                cy={CENTRE + to.y}
                r={stroke * 0.85}
                className="fill-warn"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * What each property of the mark means (AC6, D44).
 *
 * Rendered wherever the mark is drawn large. This is not a nicety: it is the
 * thing that makes the mark a report rather than a badge, because it is what
 * lets the owner read it back against the sets on the same screen.
 */
export function SigilLegend({ sigil }: { sigil: Sigil }) {
  const untimed = sigil.spokes.filter((s) => s.seconds === null).length;
  const signals = sigil.spokes.filter((s) => s.signal).length;
  const clamped = sigil.spokes.filter((s) => s.clamped).length;

  return (
    <ul className="space-y-1 text-xs leading-snug text-neutral-400">
      <li>
        <span className="text-neutral-300">{sigil.spokes.length}</span> spokes — one per hold, in the
        order they were logged, clockwise from the top.
      </li>
      <li>
        Spoke length is the <span className="text-neutral-300">recorded seconds</span>, on the same
        scale in every mark in the app: the rim is {SIGIL_MAX_SEC}s.
      </li>
      {sigil.groups > 1 && (
        <li>
          The <span className="text-neutral-300">{sigil.groups} gaps</span> are the boundaries between
          this session's exercises.
        </li>
      )}
      {untimed > 0 && (
        <li>
          <span className="text-neutral-300">{untimed}</span> hollow tick
          {untimed === 1 ? '' : 's'} on the hub — a hold logged with no duration, which is not the
          same as a short one.
        </li>
      )}
      {signals > 0 && (
        <li>
          <span className="text-warn">{signals}</span> amber tip
          {signals === 1 ? '' : 's'} — a set that ended for pain or a form breakdown.
        </li>
      )}
      {clamped > 0 && (
        <li>
          <span className="text-neutral-300">{clamped}</span> spoke{clamped === 1 ? '' : 's'} reached
          the rim: the hold ran past {SIGIL_MAX_SEC}s and is drawn at the scale's limit.
        </li>
      )}
    </ul>
  );
}
