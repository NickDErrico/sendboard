import { Fragment, useEffect, useState } from 'react';
import type { Exercise, Focus, Routine } from '../types';
import { getAllExercises, getAllRoutines } from '../lib/storage';
import { LANE_NOTES, groupByLane, laneLabel } from '../lib/membership';
import { SOURCES } from '../lib/sources';
import { go, type LibraryLane } from '../lib/routes';
import { Icon, card, kicker } from '../components/ui';
import { RowRule, readList } from '../components/ReadList';

/**
 * The catalog's index, grouped the way the training is organised (T39, D54).
 *
 * The top level is the **lane a movement is loaded in**, derived rather than
 * declared — see `membership.ts` for why `tiers[]` could not serve as the top of
 * a hierarchy, and D54 for the correction to D48 that finding forced.
 *
 * Two groups earn a note rather than a count alone. **Heavy** is the one lane
 * derived entirely from routine membership, because no catalog entry declares a
 * heavy dose. **Not in a lane** is a real answer rather than a leftover: the §4E
 * battery is a measurement (D29) and the climbing days are check-offs (D9), and
 * filing either under a lane would assert a cadence that does not exist.
 *
 * The four focuses with no movement sit here, at the catalog's own level, rather
 * than being repeated inside each lane — they are a fact about what the catalog
 * declares, not about where anything is loaded (D48).
 *
 * D23: the lanes are listed in cadence order and never ranked, nothing is scored
 * against the counts, and no fraction is drawn against any of them.
 */

const ALL_FOCUSES: { key: Focus; label: string }[] = [
  { key: 'endurance', label: 'Endurance' },
  { key: 'power-endurance', label: 'Power endurance' },
  { key: 'power', label: 'Power' },
  { key: 'core', label: 'Core' },
];

export function Library() {
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);

  useEffect(() => {
    void (async () => {
      const [exs, rs] = await Promise.all([getAllExercises(), getAllRoutines()]);
      setExercises(exs);
      setRoutines(rs);
    })();
  }, []);

  const groups = exercises === null ? [] : groupByLane(exercises, routines);
  const untrained =
    exercises === null ? [] : ALL_FOCUSES.filter(({ key }) => !exercises.some((e) => e.focus === key));

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3.5 px-4 pb-24 pt-[54px]">
      <header className="flex items-baseline gap-2">
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">Library</h1>
        {exercises !== null && (
          <span className="text-[11px] tabular-nums text-neutral-600">
            {exercises.length} movements
          </span>
        )}
      </header>

      {exercises === null ? (
        <p className="text-[13px] text-neutral-400">Loading…</p>
      ) : (
        <>
          <section>
            <h2 className={`${kicker} mb-2`}>By how it is loaded</h2>
            <div className={readList}>
              {groups.map((group, i) => {
                const key: LibraryLane = (group.lane ?? 'none') as LibraryLane;
                const note = LANE_NOTES[key];
                return (
                  <Fragment key={key}>
                    {i > 0 && <RowRule />}
                    <button
                      onClick={() => go({ name: 'library', lane: key })}
                      className="flex w-full items-center gap-3 rounded-md px-1 py-3 text-left transition-colors hover:bg-white/5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="text-[13px] font-medium">{laneLabel(group.lane)}</span>
                          <span className="text-[11px] tabular-nums text-neutral-600">
                            {group.exercises.length}
                          </span>
                        </span>
                        {note && (
                          <span className="mt-0.5 block text-[11px] leading-snug text-neutral-500">
                            {note}
                          </span>
                        )}
                      </span>
                      <Icon name="caret-right" className="shrink-0 text-[13px] text-neutral-600" />
                    </button>
                  </Fragment>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className={`${kicker} mb-2`}>Reference</h2>
            {/* Both documents the app's numbers come from (T40, D53). Displayed,
                searched and quoted; never parsed for meaning (D42). */}
            <div className={readList}>
              {SOURCES.map((source, i) => (
                <Fragment key={source.id}>
                  {i > 0 && <RowRule />}
                  <button
                    onClick={() => go({ name: 'source', sourceId: source.id, sectionRef: null })}
                    className="flex w-full items-center gap-3 rounded-md px-1 py-3 text-left transition-colors hover:bg-white/5"
                  >
                    <Icon name="book-open" className="shrink-0 text-[17px] text-neutral-500" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="text-[13px] font-medium">{source.title}</span>
                        <span className="text-[11px] tabular-nums text-neutral-600">
                          {source.sections.length} sections
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-neutral-500">
                        {source.summary}
                      </span>
                    </span>
                    <Icon name="caret-right" className="shrink-0 text-[13px] text-neutral-600" />
                  </button>
                </Fragment>
              ))}
            </div>
          </section>

          {untrained.length > 0 && (
            <section className={`${card} flex flex-col gap-1.5 shadow-edge`}>
              <h2 className={kicker}>Not in this catalog</h2>
              <p className="text-[11px] leading-snug text-neutral-500">
                {untrained.map(({ label }) => label).join(' · ')} — no movement declared. Stated
                rather than omitted: a gap you can see is the useful half of a taxonomy.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
