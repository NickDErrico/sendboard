import { useEffect, useState } from 'react';
import {
  PLAN_SECTIONS,
  inlineSpans,
  queryTerms,
  searchPlan,
  sectionsForRef,
  type PlanSection as Section,
} from '../lib/plan';
import { PlanSection } from '../components/PlanSection';
import { Icon, input } from '../components/ui';
import { RowRule, readList } from '../components/ReadList';

/**
 * The training plan, searchable, inside the app (T25).
 *
 * Two ways in, because the mid-session hands are chalked (PRD problem #2): a
 * search box for when there is a question, and the whole section list as one-tap
 * entries for when there is not. Everything on this screen is reading — nothing
 * here writes, times, or logs anything (D37, D42).
 *
 * Rendered both as a route (`#/plan`, `#/plan/4B`) and *over* a running session,
 * which is why the query and the open section are props-free view state that dies
 * with the component: no query, scroll position or bookmark is persisted (D18).
 */
export function Plan({
  initialRef = null,
  onExit,
  exitLabel = 'Done',
}: {
  /** Open straight into a section — how an exercise's citation resolves (AC8). */
  initialRef?: string | null;
  onExit?: () => void;
  exitLabel?: string;
}) {
  const [query, setQuery] = useState('');
  const [openRef, setOpenRef] = useState<string | null>(initialRef);
  const [openTitle, setOpenTitle] = useState<string | null>(null);

  useEffect(() => {
    setOpenRef(initialRef);
    setOpenTitle(null);
  }, [initialRef]);

  const terms = queryTerms(query);
  const hits = searchPlan(query);

  // A `§` can address several sections where the plan left subsections unlettered
  // (§8's prose headings), so opening one by reference shows all of them in the
  // plan's order — which is what the citation "(plan §8)" actually points at.
  const open: Section[] =
    openRef === null
      ? []
      : sectionsForRef(openRef).filter((s) => openTitle === null || s.title === openTitle);

  if (open.length > 0) {
    return (
      <div className="mx-auto max-w-md px-4 pb-24 pt-[54px]">
        {/* Two ways out, because a section can be arrived at two ways: from the
            list (← goes back to it) or straight from an exercise's citation, where
            the useful exit is the session that is still running behind this
            (AC7's "returns to the session, not to Home"). */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              setOpenRef(null);
              setOpenTitle(null);
            }}
            className="-ml-1 flex items-center gap-1 rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10"
          >
            <Icon name="caret-left" className="text-[13px]" />{terms.length > 0 ? 'Back to results' : 'All sections'}
          </button>
          {onExit && (
            <button
              onClick={onExit}
              className="shrink-0 rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10"
            >
              {exitLabel}
            </button>
          )}
        </div>
        <div className="space-y-8">
          {open.map((section) => (
            <PlanSection key={`${section.ref}-${section.title}`} section={section} terms={terms} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-[54px]">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">Training plan</h1>
        {onExit && (
          <button
            onClick={onExit}
            className="shrink-0 rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10"
          >
            {exitLabel}
          </button>
        )}
      </header>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        type="search"
        placeholder="Search the plan — “elbow”, “edge size”…"
        aria-label="Search the training plan"
        className={input}
      />

      {terms.length === 0 ? (
        <>
          {/* No typing required: the whole document, one tap per section, in the
              plan's order. This is the mid-session path — a search box is no use
              to chalked hands (AC5). */}
          <p className="mt-3 text-xs text-neutral-500">
            Your plan, in the app and offline. Tap a section, or search it.
          </p>
          {/* One card of rows, not one card per section: this is a table of
              contents, and twenty separate surfaces made the document look like
              twenty documents. */}
          <ul className={`${readList} mt-2`}>
            {PLAN_SECTIONS.map((section, i) => (
              <li key={`${section.ref}-${section.title}`}>
                {i > 0 && <RowRule />}
                <button
                  onClick={() => {
                    setOpenRef(section.ref);
                    setOpenTitle(section.title);
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-1 py-2.5 text-left transition-colors hover:bg-white/5"
                >
                  <span className="w-11 shrink-0 text-[10px] font-medium uppercase tracking-[0.12em] text-accent">
                    {section.label}
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] text-neutral-200">{section.title}</span>
                  <Icon name="caret-right" className="shrink-0 text-[13px] text-neutral-600" />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : hits.length === 0 ? (
        // Plainly, with no suggestion and no correction: the section list is one
        // clear of the box (AC11).
        <p className="mt-4 text-[13px] text-neutral-400">
          No section of the plan contains that. Clear the search to browse all{' '}
          {PLAN_SECTIONS.length} sections.
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs text-neutral-500">
            {hits.length} section{hits.length === 1 ? '' : 's'}, in the plan’s order
          </p>
          <ul className="mt-2 space-y-2">
            {hits.map((hit) => (
              <li key={`${hit.section.ref}-${hit.section.title}`}>
                <button
                  onClick={() => {
                    setOpenRef(hit.section.ref);
                    setOpenTitle(hit.section.title);
                  }}
                  className="w-full rounded-md bg-surface shadow-edge p-3 text-left"
                >
                  <span className="flex items-baseline gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-accent">
                      {hit.section.label}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium text-ink">
                      {hit.section.title}
                    </span>
                  </span>
                  {hit.section.parentTitle && (
                    <span className="mt-0.5 block text-xs text-neutral-500">
                      {hit.section.parentTitle}
                    </span>
                  )}
                  {hit.snippets.map((snippet, i) => (
                    <span key={i} className="mt-1.5 block text-xs leading-snug text-neutral-400">
                      <Snippet text={snippet} terms={terms} />
                    </span>
                  ))}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// A result line, trimmed so a long paragraph does not push the card off the
// screen. It highlights through the same pure function the section body uses, so
// the two renderings can never disagree about what matched (AC3).
function Snippet({ text, terms }: { text: string; terms: string[] }) {
  const trimmed = text.length > 180 ? `${text.slice(0, 180).trimEnd()}…` : text;
  return (
    <>
      {inlineSpans(trimmed, terms).map((span, i) =>
        span.hit ? (
          <span key={i} className="rounded-sm bg-accent/25 text-accent-100">
            {span.text}
          </span>
        ) : (
          <span key={i} className={span.bold ? 'text-neutral-300' : undefined}>
            {span.text}
          </span>
        ),
      )}
    </>
  );
}
