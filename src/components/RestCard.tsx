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
    <div className={compact ? 'mt-2 border-t border-slate-800 pt-2' : ''}>
      <div className="flex items-baseline justify-between gap-2">
        <p
          className={`min-w-0 truncate font-semibold uppercase tracking-wide text-slate-500 ${
            compact ? 'text-[10px]' : 'text-xs'
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
                ? 'line-clamp-2 text-xs leading-snug text-slate-300'
                : 'text-lg leading-snug text-slate-200'
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
          <p className="truncate font-mono text-xs tabular-nums text-slate-300">{report.summary}</p>
        )}
        {report.last && (
          <p className="truncate text-xs text-slate-400">
            <span className="text-slate-500">Last</span> {report.last}
          </p>
        )}
      </>
    );
  }

  return (
    <div className="space-y-1">
      {report.hidden > 0 && (
        <p className="text-sm text-slate-600">
          +{report.hidden} earlier {report.hidden === 1 ? 'set' : 'sets'}
        </p>
      )}
      {report.lines.map((line, i) => (
        <p key={i} className="font-mono text-base leading-snug tabular-nums text-slate-200">
          {line}
        </p>
      ))}
      {report.last && (
        <p className="pt-1 text-base leading-snug text-slate-400">
          <span className="font-semibold uppercase tracking-wide text-slate-500">Last</span>{' '}
          <span className="text-slate-300">{report.last}</span>
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
          className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-slate-400' : 'bg-slate-700'}`}
        />
      ))}
    </span>
  );
}
