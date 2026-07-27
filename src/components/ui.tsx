// Nocturne's component layer, as Tailwind class strings.
//
// These are not a component library — they are the handoff's recipes written
// once so twenty screens can't each drift a pixel. Compose them with more
// utilities at the call site (`${btnPrimary} w-full py-3`); nothing here sets
// size, because size is the thing that varies.

// Deliberately sets no border *colour* and no text colour: Tailwind resolves two
// competing utilities by their order in the stylesheet, not by the order they
// appear in the class string, so anything declared here would silently outrank
// the variant below it. Each variant states both.
const btnBase =
  'inline-flex items-center justify-center gap-1.5 rounded-md border ' +
  'px-3 py-1.5 text-sm font-medium leading-tight transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-45';

/** The primary is an outline, not a fill — the single biggest Nocturne rule. */
export const btnPrimary = `${btnBase} border-accent text-accent hover:bg-accent/[.12] active:bg-accent/[.22]`;

export const btnSecondary = `${btnBase} border-white/[.16] text-ink hover:bg-white/[.07] active:bg-white/[.14]`;

export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium ' +
  'text-accent transition-colors hover:bg-accent/10 active:bg-accent/[.18] ' +
  'disabled:cursor-not-allowed disabled:opacity-45';

/**
 * The one filled button in the system. Deliberately the loudest thing on screen
 * mid-hang: you are looking for it with your fingers on an edge.
 */
export const btnStop = `${btnBase} border-transparent bg-neutral-200 font-semibold text-bg hover:bg-neutral-100`;

/**
 * A card ground. Carries no elevation of its own — add `shadow-edge` for the
 * ordinary case, or a `shadow-[…]` of your own for the two surfaces that lift
 * further. Kept out of the recipe because Tailwind resolves conflicting
 * utilities by stylesheet order, not by the order you wrote them, so a shadow
 * baked in here would quietly outrank the one at the call site.
 */
export const card = 'rounded-md bg-surface p-3';

export const kicker = 'text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500';

/** Accent kickers are reserved for surfaces you can act on. */
export const kickerAccent = 'text-[10px] font-medium uppercase tracking-[0.12em] text-accent';

const tagBase = 'inline-flex items-center rounded-[6px] px-2.5 py-[3px] text-[11px] tracking-[0.02em]';
export const tagAccent = `${tagBase} bg-accent-800 text-accent-100`;
export const tagNeutral = `${tagBase} bg-neutral-800 text-neutral-100`;
export const tagOutline = `${tagBase} border border-accent text-accent`;

export const input =
  'w-full rounded-md border border-white/[.16] bg-surface px-2.5 py-1.5 text-[13px] text-ink ' +
  'caret-accent placeholder:text-neutral-600 hover:border-white/[.45] ' +
  'focus-visible:border-accent focus-visible:outline-none';

/** A row in a collapsed read-list card. */
export const row = 'flex items-center gap-3 rounded-md px-1 py-3 text-left transition-colors hover:bg-white/5';

/**
 * Where a hold sits against its range, as tonal weight on the one hue.
 *
 * Nocturne is mono, so "building / in range / past target" cannot be sky /
 * emerald / amber — it is neutral, then the accent's light step, then its dark
 * one. `hex` exists for the two places that need the colour as a value rather
 * than a class: the band fill's inline width and Focus's text-shadow glow.
 */
export const HOLD_STATUS = {
  under: { fill: 'bg-neutral-400', text: 'text-neutral-400', hex: '#b2b6ca', label: 'building' },
  in: { fill: 'bg-accent-400', text: 'text-accent-400', hex: '#b5abfc', label: '✓ in range' },
  over: { fill: 'bg-accent-600', text: 'text-accent-600', hex: '#796cbf', label: 'past target' },
} as const;

/**
 * A Phosphor glyph. `weight="fill"` for the states the system fills — an active
 * tab, a completed thing, a running play control.
 *
 * Sizes, per the handoff: 19px in the tab bar, 17–18px in list rows and tiles,
 * 13–15px inside buttons.
 */
export function Icon({
  name,
  weight = 'regular',
  className = '',
  title,
}: {
  name: string;
  weight?: 'regular' | 'fill';
  className?: string;
  title?: string;
}) {
  return (
    <i
      className={`${weight === 'fill' ? 'ph-fill' : 'ph'} ph-${name} ${className}`}
      // A titled icon is carrying meaning (the end-reason on a set row), so it
      // is readable; an untitled one is decoration beside a label already read.
      aria-hidden={title === undefined ? true : undefined}
      role={title === undefined ? undefined : 'img'}
      aria-label={title}
      title={title}
    />
  );
}
