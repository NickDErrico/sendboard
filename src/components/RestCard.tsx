import type { RestCard, RestReport } from '../lib/rest';

/**
 * The rest, rendered (T22).
 *
 * One card at a time, at one of two sizes: `compact` is the strip that rides
 * under the timer bar's clock, and the default is the board-legible form that
 * fills focus mode's reading area while a rest runs.
 *
 * **Nothing in here is a control (D37).** Not the card, not the dots, not the
 * label. The surface exists to be read while the hands are chalked and the
 * three minutes §4C prescribes are running — every button it could grow (log it
 * from here, skip to the next card, start the set) is either a second write path
 * (D35) or a quiet way to end a prescribed rest (T19). So it is a `div`, and it
 * stays one.
 */
export function RestCardView({
  card,
  report,
  index,
  total,
  compact = false,
}: {
  card: RestCard;
  /** Present whenever the deck contains a report card; null otherwise. */
  report: RestReport | null;
  index: number;
  total: number;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'mt-2.5' : ''}>
      <div className="flex items-baseline justify-between gap-2">
        <p
          className={`min-w-0 truncate uppercase tracking-[0.1em] text-neutral-600 ${
            compact ? 'text-[10px]' : 'text-[11px]'
          }`}
        >
          {card.label}
        </p>
        <Dots index={index} total={total} />
      </div>

      <div className={compact ? 'mt-1' : 'mt-2'}>
        {card.kind === 'report' ? (
          <Report report={report} compact={compact} />
        ) : (
          <p
            className={
              compact
                ? 'line-clamp-2 text-[11.5px] leading-relaxed text-neutral-300'
                : 'text-lg leading-snug text-neutral-200'
            }
          >
            {card.text}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The numbers, and only the numbers (D23).
 *
 * No delta, no percentage, no arrow, no "up 5lb on last time" — §4F puts the
 * 1–3% judgment with the person who can feel whether the last session was an 8
 * or a 10, and this surface is three minutes of their attention at exactly the
 * moment that judgment is made. Showing them the two sets of numbers is the
 * whole job; computing the difference would be doing the judging for them.
 */
function Report({ report, compact }: { report: RestReport | null; compact: boolean }) {
  if (!report) return null;

  if (compact) {
    return (
      <>
        {report.summary && (
          <p className="truncate text-[11.5px] tabular-nums text-neutral-300">{report.summary}</p>
        )}
        {report.last && (
          <p className="truncate text-[11.5px] text-neutral-500">
            <span className="text-neutral-600">Last</span> {report.last}
          </p>
        )}
      </>
    );
  }

  return (
    <div className="space-y-1">
      {report.hidden > 0 && (
        <p className="text-[13px] text-neutral-600">
          +{report.hidden} earlier {report.hidden === 1 ? 'set' : 'sets'}
        </p>
      )}
      {report.lines.map((line, i) => (
        <p key={i} className="text-base leading-snug tabular-nums text-neutral-200">
          {line}
        </p>
      ))}
      {report.last && (
        <p className="pt-1 text-base leading-snug text-neutral-500">
          <span className="uppercase tracking-[0.1em] text-neutral-600">Last</span>{' '}
          <span className="text-neutral-300">{report.last}</span>
        </p>
      )}
    </div>
  );
}

/** Where you are in the deck, and how much of the rest is still to read. */
function Dots({ index, total }: { index: number; total: number }) {
  if (total <= 1) return null;
  return (
    <span aria-hidden className="flex shrink-0 items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1 w-1 rounded-full ${i === index ? 'bg-neutral-400' : 'bg-neutral-800'}`}
        />
      ))}
    </span>
  );
}
