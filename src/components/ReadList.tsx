import { useState, type ReactNode } from 'react';
import { Icon } from './ui';

// The read-list pattern.
//
// Nocturne's rule for the screens that were never mocked: where three or more
// inert cards sit in a row, they become one card of rows. Three cards make three
// subjects out of one glance, and a card is a promise that there is something to
// *do* here — which, for the things this pattern holds, there is not.
//
// It lives here rather than in ui.tsx because it is a component with behaviour
// (a row can expand), not a class string.

/** The card the rows sit in: a surface with the padding taken off the ends. */
export const readList = 'flex flex-col gap-0 rounded-md bg-surface px-3 py-1 shadow-edge';

/** The hairline between two rows. Solid — it separates parts of one control
    surface, where the fading `.hr` separates subjects. */
export function RowRule() {
  return <div className="h-px bg-neutral-900" />;
}

const rowShell = 'flex w-full items-center gap-3 rounded-md px-1 py-3 text-left transition-colors';

function RowBody({ title, detail }: { title: string; detail: ReactNode }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-[13px] font-medium">{title}</span>
      {detail !== null && detail !== undefined && (
        <span className="block text-[11px] leading-snug text-neutral-500">{detail}</span>
      )}
    </span>
  );
}

/**
 * A row that goes somewhere, or a row that simply reports.
 *
 * With `onClick` it is a button carrying a caret; with `trailing` it is a plain
 * row whose own control sits on the right (Home's bodyweight row, which is the
 * one thing in a read list you can also act on). With neither it is a statement.
 */
export function ReadRow({
  icon,
  title,
  detail,
  onClick,
  trailing,
}: {
  icon: string;
  title: string;
  detail?: ReactNode;
  onClick?: () => void;
  trailing?: ReactNode;
}) {
  const content = (
    <>
      <Icon name={icon} className="shrink-0 text-[17px] text-neutral-500" />
      <RowBody title={title} detail={detail} />
      {onClick ? (
        <Icon name="caret-right" className="shrink-0 text-[13px] text-neutral-600" />
      ) : (
        trailing
      )}
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={`${rowShell} hover:bg-white/5`}>
        {content}
      </button>
    );
  }
  return <div className={rowShell}>{content}</div>;
}

/**
 * A row whose detail is a paragraph rather than a line.
 *
 * The alternative to this row is a card, and a card would be the wrong shape:
 * what it holds is a *value* you check (a build stamp, a storage verdict) with an
 * explanation you read once and then never again. So the value is always visible
 * and the explanation is one tap away, rather than three lines of prose sitting
 * permanently between you and the next thing.
 */
export function ExpandableRow({
  icon,
  title,
  detail,
  children,
}: {
  icon: string;
  title: string;
  detail?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`${rowShell} hover:bg-white/5`}
      >
        <Icon name={icon} className="shrink-0 text-[17px] text-neutral-500" />
        <RowBody title={title} detail={detail} />
        <Icon
          name={open ? 'caret-up' : 'caret-down'}
          className="shrink-0 text-[13px] text-neutral-600"
        />
      </button>
      {open && (
        <div className="space-y-2 px-1 pb-3 pl-[32px] text-[11px] leading-relaxed text-neutral-500">
          {children}
        </div>
      )}
    </div>
  );
}
