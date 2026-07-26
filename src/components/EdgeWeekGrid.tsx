import { useState } from 'react';
import {
  CELL_MODES,
  cellText,
  formatEdge,
  type CellMode,
  type EdgeWeekGrid as Grid,
  type TensionTotals,
} from '../lib/tension';

// The block week × edge table (T26 AC3–AC7).
//
// Every cell is a count or a sum of things that were recorded. There is
// deliberately no colour scale, no shading by magnitude, no sort, and no week
// marked light, heavy, peak or missed — §4F schedules a deload in week 7 and a
// volume grid is the first surface in the app where that is *visible*, which
// makes it exactly the cell a fitness app would shade green. Whether week 7 was
// a deload is a training judgment, and §4F's own "regardless of the schedule
// above" is why the app has no standing to make it (D23).

export function EdgeWeekGrid({ grid }: { grid: Grid }) {
  // Both readings come from the same sets (AC5): a count of holds, or the
  // seconds those holds were measured at. Holds leads because it is the reading
  // that is always complete — an untimed hold still counts.
  const [mode, setMode] = useState<CellMode>('holds');

  return (
    <section className="rounded-xl border border-slate-700 bg-brand-surface p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Edge × week
        </h2>
        <div className="flex gap-1.5" role="group" aria-label="Cell contents">
          {CELL_MODES.map((m) => (
            <button
              key={m.mode}
              onClick={() => setMode(m.mode)}
              aria-pressed={m.mode === mode}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                m.mode === mode
                  ? 'bg-brand-accent text-brand-bg'
                  : 'border border-slate-700 text-slate-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* AC11: a grid wider than the screen scrolls inside its own container, so
          the page itself never moves sideways at 390px (T25 AC6's rule). */}
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="pb-1 pr-2 font-semibold">
                Week
              </th>
              {grid.edges.map((edge) => (
                <th
                  key={formatEdge(edge)}
                  scope="col"
                  className="pb-1 pl-2 text-right font-semibold tabular-nums"
                >
                  {formatEdge(edge)}
                </th>
              ))}
              <th scope="col" className="pb-1 pl-3 text-right font-semibold">
                All
              </th>
            </tr>
          </thead>
          <tbody className="align-top">
            {grid.rows.map((row) => (
              <tr key={row.week} className="border-t border-slate-800">
                <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                  {/* "W3", not "3": sessions sit beside the week rather than in a
                      column of their own — they are the context that makes the
                      row's counts readable, not a fourth thing to compare — and
                      two bare numbers side by side read as one. */}
                  <span className="text-slate-300">W{row.week}</span>
                  {row.sessions > 0 && (
                    <span className="ml-1.5 text-xs text-slate-600">{row.sessions}×</span>
                  )}
                </th>
                {row.cells.map((cell, i) => (
                  <Cell key={formatEdge(grid.edges[i])} totals={cell} mode={mode} />
                ))}
                <Cell totals={row} mode={mode} emphasis />
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-700 text-slate-300">
              <th scope="row" className="py-1.5 pr-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Block
              </th>
              {grid.columnTotals.map((cell, i) => (
                <Cell key={formatEdge(grid.edges[i])} totals={cell} mode={mode} emphasis />
              ))}
              <Cell totals={grid.total} mode={mode} emphasis />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-2 text-xs leading-snug text-slate-500">
        {mode === 'holds' ? (
          <>
            Each cell counts the holds logged that week on that edge, and a row's cells add up to
            its <span className="text-slate-400">All</span>.
          </>
        ) : (
          <>
            Each cell sums the seconds actually recorded on those holds. Sums are exact and shown to
            the nearest second, so a total can read a second away from its parts.
          </>
        )}{' '}
        The number beside the week is that week's sessions.
        {grid.edges.includes(null) && (
          <>
            {' '}
            <span className="text-slate-400">no edge</span> holds the sets logged without one — the
            bar pulls and lock-offs, which have no edge, and any hang where it was not recorded.
          </>
        )}
      </p>
    </section>
  );
}

function Cell({
  totals,
  mode,
  emphasis = false,
}: {
  totals: TensionTotals;
  mode: CellMode;
  emphasis?: boolean;
}) {
  const text = cellText(totals, mode);
  return (
    <td
      className={`py-1.5 pl-2 text-right tabular-nums ${
        emphasis ? 'pl-3 font-semibold text-slate-200' : 'text-slate-300'
      }`}
    >
      {text === null ? <span className="text-slate-700">·</span> : text}
      {/* The gap travels with the number it is missing from (D43c), on the reading
          where it is missing: a seconds cell short three sets is the one that
          would otherwise read as complete. */}
      {mode === 'seconds' && totals.untimed > 0 && totals.untimed < totals.holds && (
        <span className="block text-[10px] font-normal text-slate-600">+{totals.untimed} untimed</span>
      )}
    </td>
  );
}
