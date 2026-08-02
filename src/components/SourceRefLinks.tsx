import { go } from '../lib/routes';
import { sectionsForRef } from '../lib/sources';
import { Icon, btnSecondary } from './ui';

/**
 * An exercise's citations, as controls that open the section (T25, D42).
 *
 * The refs are typed on the catalog entry — never regexed out of the prose beside
 * them — so a link either resolves to the section the entry was transcribed from
 * or is not rendered at all. A ref naming a section that does not exist is
 * dropped silently rather than shown as a dead control, which is also what makes
 * `plan.test.ts`'s "every citation resolves" test worth having.
 *
 * `onOpen` exists for the session: navigating there would unmount the running
 * timer (D18 keeps it in React state), so mid-session the plan is rendered *over*
 * the session instead — the same thing the exercise detail view already does.
 */
export function SourceRefLinks({
  refs,
  onOpen,
  className = '',
}: {
  refs: string[] | undefined;
  onOpen?: (ref: string) => void;
  className?: string;
}) {
  const resolvable = (refs ?? []).filter((ref) => sectionsForRef(ref).length > 0);
  if (resolvable.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="text-xs uppercase tracking-wide text-neutral-500">In the plan</span>
      {resolvable.map((ref) => {
        const section = sectionsForRef(ref)[0];
        return (
          <button
            key={ref}
            onClick={() => (onOpen ? onOpen(ref) : go({ name: 'source', sourceId: 'plan', sectionRef: ref }))}
            title={section.title}
            className={`${btnSecondary} gap-1 px-2 py-1 text-xs !text-accent`}
          >
            §{ref}
            <Icon name="caret-right" className="text-[11px]" />
          </button>
        );
      })}
    </div>
  );
}
