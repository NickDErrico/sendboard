import { go, useRoute } from '../lib/routes';

// The four primary destinations (AC2). Uses the T6 hash router: `go` to navigate,
// `useRoute` to highlight the active tab.
const TABS = [
  { name: 'home', label: 'Home', icon: '🏠' },
  { name: 'exercises', label: 'Exercises', icon: '📋' },
  { name: 'history', label: 'History', icon: '🕓' },
  { name: 'settings', label: 'Settings', icon: '⚙️' },
] as const;

export function TabBar() {
  const route = useRoute();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-800 bg-brand-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const active = route.name === tab.name;
          return (
            <button
              key={tab.name}
              onClick={() => go({ name: tab.name })}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                active ? 'text-brand-accent' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-lg" aria-hidden>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
