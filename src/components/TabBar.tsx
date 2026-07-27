import { go, useRoute } from '../lib/routes';
import { Icon } from './ui';

// The primary destinations (T8 AC2). Uses the T6 hash router: `go` to navigate,
// `useRoute` to highlight the active tab.
//
// T25 added the fifth, Plan: the training document is now inside the app, and it
// is a place the owner goes rather than something reached from another screen —
// see the T8 AC2 amendment in T25's Amendments.
//
// Nocturne replaced the emoji with Phosphor glyphs. The active tab is the *fill*
// weight of the same icon rather than a different icon — the shape stays put and
// only its weight moves, which is the same "tonal weight, not a second hue" rule
// the hold band follows.
const TABS = [
  { name: 'home', label: 'Home', icon: 'house' },
  { name: 'exercises', label: 'Exercises', icon: 'list-checks' },
  { name: 'plan', label: 'Plan', icon: 'book-open' },
  { name: 'history', label: 'History', icon: 'clock-counter-clockwise' },
  { name: 'settings', label: 'Settings', icon: 'gear-six' },
] as const;

export function TabBar() {
  const route = useRoute();
  return (
    <nav
      // A top edge as a shadow, not a border: a border would add a pixel to the
      // bar's box and push the labels up off the safe-area inset.
      className="fixed inset-x-0 bottom-0 z-20 pt-2 shadow-[0_-1px_0_#292b31] backdrop-blur-[12px] [background:color-mix(in_srgb,#161826_92%,transparent)] [padding-bottom:calc(22px+env(safe-area-inset-bottom))]"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const active = route.name === tab.name;
          return (
            <button
              key={tab.name}
              onClick={() => go(tab.name === 'plan' ? { name: 'plan', sectionRef: null } : { name: tab.name })}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-[3px] text-[10px] transition-colors ${
                active ? 'text-accent' : 'text-neutral-500 hover:text-accent-400'
              }`}
            >
              <Icon name={tab.icon} weight={active ? 'fill' : 'regular'} className="text-[19px]" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
