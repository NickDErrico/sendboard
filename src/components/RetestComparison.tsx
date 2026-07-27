import {
  INTERPRETATION_QUOTE,
  compareOccasions,
  formatDelta,
  formatValue,
  type Occasion,
} from '../lib/retest';

// §4E's before/after, side by side (T16 AC5–AC7).
//
// Every number here is either something that was recorded or the arithmetic
// difference between two things that were recorded. There is no colour on a
// delta, no arrow, no "improved" wording, and no aggregate across the five rows —
// under D23 the app reports and cites, and §4E's rubric is quoted at the bottom
// for the owner to apply. A green +5lb would be the app deciding that the block
// went well, which §7 shows is not a judgment three numbers can support.

export function RetestComparison({
  baseline,
  latest,
}: {
  baseline: Occasion;
  latest: Occasion;
}) {
  const rows = compareOccasions(baseline, latest);

  return (
    <section className="space-y-3 rounded-md bg-surface shadow-edge p-3">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">
        {baseline.label} → {latest.label}
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="pb-1 font-medium">Test</th>
              <th className="pb-1 text-right font-medium">{baseline.label}</th>
              <th className="pb-1 text-right font-medium">{latest.label}</th>
              <th className="pb-1 text-right font-medium">Δ</th>
            </tr>
          </thead>
          <tbody className="align-top">
            {rows.map((row) => (
              <tr key={row.test.exerciseId} className="border-t border-neutral-900">
                <td className="py-2 pr-2 text-neutral-300">{row.test.label}</td>
                <td className="py-2 pl-1 text-right tabular-nums text-neutral-200">
                  <Cell value={row.baseline.value} pct={row.baseline.pctBw} metric={row.test.metric} />
                </td>
                <td className="py-2 pl-1 text-right tabular-nums text-neutral-200">
                  <Cell value={row.latest.value} pct={row.latest.pctBw} metric={row.test.metric} />
                </td>
                <td className="py-2 pl-1 text-right tabular-nums text-neutral-300">
                  {row.withheldForEdgeChange ? (
                    <span className="text-xs text-accent-300">edge changed</span>
                  ) : row.delta === null ? (
                    <span className="text-neutral-600">—</span>
                  ) : (
                    <>
                      <span className="font-medium">{formatDelta(row.delta, row.test.metric)}</span>
                      {row.deltaPctBw !== null && (
                        <span className="block text-xs text-neutral-500">
                          {formatDelta(row.deltaPctBw, 'addedLb').replace('lb', '')}%BW
                        </span>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.some((r) => r.withheldForEdgeChange) && (
        <p className="rounded-lg border border-accent/40 bg-accent/[.08] p-3 text-xs text-accent-200">
          The two occasions used different edges ({baseline.conditions.edgeMm ?? '—'}mm →{' '}
          {latest.conditions.edgeMm ?? '—'}mm), so no difference is shown for the hangs. §4E:
          “changing edge size invalidates the comparison more than any training variable.”
        </p>
      )}

      {/* D23: quoted with its reference, never applied. Which line describes this
          block is the owner's call — §7 reads a falling number as the signal to
          deload, so an app that picked a line would be giving training advice. */}
      <div className="rounded-lg border border-neutral-800 bg-bg/60 p-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">
          Interpreting this — training plan §4E
        </p>
        <ul className="mt-1 space-y-1 text-xs text-neutral-400">
          {INTERPRETATION_QUOTE.map((line) => (
            <li key={line}>“{line}”</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Cell({
  value,
  pct,
  metric,
}: {
  value: number | null;
  pct: number | null;
  metric: 'addedLb' | 'holdSec' | 'edgeMm';
}) {
  if (value === null) return <span className="text-xs text-neutral-600">not recorded</span>;
  return (
    <>
      <span>{formatValue(value, metric)}</span>
      {pct !== null && <span className="block text-xs text-neutral-500">{pct}%BW</span>}
    </>
  );
}
