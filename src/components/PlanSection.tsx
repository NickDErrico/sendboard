import { inlineSpans, type PlanBlock, type PlanSection as Section } from '../lib/plan';

// One section of the training plan, rendered from its own markdown (T25, D42).
//
// Presentational and content-free: every string on screen comes from
// `docs/training-plan.md`, and nothing here interprets it — no value is read out,
// no reference is auto-linked by pattern-matching prose, and nothing is reworded
// or summarised (D6). Search terms arrive already normalised and are used only to
// highlight.

function Inline({ text, terms }: { text: string; terms: string[] }) {
  return (
    <>
      {inlineSpans(text, terms).map((span, i) => {
        const className = [
          span.bold ? 'font-medium text-ink' : '',
          span.italic ? 'italic' : '',
          span.hit ? 'rounded-sm bg-accent/25 text-accent-100' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return className === '' ? (
          <span key={i}>{span.text}</span>
        ) : (
          <span key={i} className={className}>
            {span.text}
          </span>
        );
      })}
    </>
  );
}

function Block({ block, terms }: { block: PlanBlock; terms: string[] }) {
  switch (block.kind) {
    case 'para':
      return (
        <p className="break-words text-[13px] leading-relaxed text-neutral-300">
          <Inline text={block.text} terms={terms} />
        </p>
      );
    case 'quote':
      return (
        <blockquote className="border-l-4 border-accent/50 bg-accent/[.08] py-2 pl-3 text-sm leading-relaxed text-neutral-200">
          <Inline text={block.text} terms={terms} />
        </blockquote>
      );
    case 'list': {
      const className =
        'space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-300 marker:text-neutral-600';
      const items = block.items.map((item, i) => (
        <li key={i} className="break-words pl-1">
          <Inline text={item} terms={terms} />
        </li>
      ));
      return block.ordered ? (
        <ol className={`list-decimal ${className}`}>{items}</ol>
      ) : (
        <ul className={`list-disc ${className}`}>{items}</ul>
      );
    }
    case 'table':
      // The table scrolls inside its own container: at 390px §4E's four-column
      // retest table is wider than the screen, and a page that slides sideways
      // loses the reader their place (AC6).
      return (
        <div className="-mx-1 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead>
              <tr>
                {block.header.map((cell, i) => (
                  <th
                    key={i}
                    className="whitespace-nowrap border-b border-neutral-800 px-2 py-1.5 font-medium uppercase tracking-wide text-neutral-500"
                  >
                    <Inline text={cell} terms={terms} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="align-top">
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className="border-b border-neutral-900 px-2 py-1.5 leading-snug text-neutral-300"
                    >
                      <Inline text={cell} terms={terms} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export function PlanSection({
  section,
  terms = [],
  compact = false,
}: {
  section: Section;
  terms?: string[];
  /** Inside a session: the same content with a tighter heading. */
  compact?: boolean;
}) {
  return (
    <article className="space-y-3">
      <header>
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-accent">
          {section.label}
          {section.parentTitle && !compact ? ` · ${section.parentTitle}` : ''}
        </p>
        <h2 className={`mt-0.5 font-medium tracking-tight text-ink ${compact ? 'text-base' : 'text-lg'}`}>
          <Inline text={section.title} terms={terms} />
        </h2>
      </header>
      {section.blocks.map((block, i) => (
        <Block key={i} block={block} terms={terms} />
      ))}
    </article>
  );
}
