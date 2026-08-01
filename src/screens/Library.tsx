import { go } from '../lib/routes';
import { Icon, card, kicker } from '../components/ui';
import { RowRule, readList } from '../components/ReadList';
import { Fragment } from 'react';

/**
 * The reference tab (T37).
 *
 * Exercises and the plan document were two of five tabs, and they are the same
 * kind of thing: content you *read* rather than something you do. Collapsing
 * them is what takes the tab bar to four without deleting a screen — both are
 * still one tap from here, and `#/exercises` and `#/plan` still resolve on their
 * own, because an exercise's `planRefs` citation deep-links to `#/plan/4B` and a
 * tab reorganisation must not break a link the catalog writes (T25 AC8, D42).
 *
 * **A shell this cycle, deliberately.** The catalog's browse is still grouped by
 * `focus` exactly as stage 1 left it. Restructuring it into tier → focus →
 * target is stage 5's job, and turning the plan into a set of sources is stage
 * 6's (D53) — doing either here would be a second task wearing this one's
 * clothes.
 */
export function Library() {
  const rows = [
    {
      icon: 'list-checks',
      title: 'Exercises',
      sub: 'Every movement, grouped by what it develops',
      onClick: () => go({ name: 'exercises' }),
    },
    {
      icon: 'book-open',
      title: 'Training plan',
      sub: 'The document the app is a tool for — searchable, quoted, never parsed',
      onClick: () => go({ name: 'plan', sectionRef: null }),
    },
  ];

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3.5 px-4 pb-24 pt-[54px]">
      <header className="flex items-baseline gap-2">
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">Library</h1>
      </header>

      {/* Nocturne's collapse rule: nothing here is a thing you *do*, so two cards
          would make two subjects out of one list. */}
      <div className={readList}>
        {rows.map((row, i) => (
          <Fragment key={row.title}>
            {i > 0 && <RowRule />}
            <button
              onClick={row.onClick}
              className="flex w-full items-center gap-3 rounded-md px-1 py-3 text-left transition-colors hover:bg-white/5"
            >
              <Icon name={row.icon} className="shrink-0 text-[17px] text-neutral-500" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{row.title}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-neutral-500">
                  {row.sub}
                </span>
              </span>
              <Icon name="caret-right" className="shrink-0 text-[13px] text-neutral-600" />
            </button>
          </Fragment>
        ))}
      </div>

      <section className={`${card} flex flex-col gap-1.5 shadow-edge`}>
        <h2 className={kicker}>What is not here</h2>
        <p className="text-[11px] leading-snug text-neutral-500">
          The catalog trains max strength and conditions tissue. Endurance, power endurance, power
          and core have no movement declared — the Exercises list names them at the bottom rather
          than leaving the gap invisible.
        </p>
      </section>
    </div>
  );
}
