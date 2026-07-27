// T8 install guide. Shown two ways (see App): once on first open in Safari (AC3,
// gated by Settings.installGuideDismissed), and any time from Settings → How to
// install. The caller supplies the CTA label + handler so the same content serves
// both the "Got it" dismissal and the "Back" reference view.
import { btnPrimary } from '../components/ui';

export function InstallGuide({ ctaLabel, onCta }: { ctaLabel: string; onCta: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-[54px]">
      <header className="mb-4 flex items-center gap-2.5">
        <div className="grid h-[30px] w-[30px] place-items-center rounded-md border border-accent text-sm font-medium text-accent">
          S
        </div>
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">Install Sendboard</h1>
      </header>

      <p className="mb-4 text-[13px] text-neutral-400">
        Add Sendboard to your home screen so it launches full-screen, works offline, and keeps your
        log safe across sessions.
      </p>

      <ol className="space-y-3">
        {[
          'Open this page in Safari on your iPhone (not another browser — only Safari can install it).',
          'Tap the Share button (the square with an upward arrow) in the toolbar.',
          'Scroll down and tap “Add to Home Screen”, then “Add”.',
          'Launch Sendboard from its new home-screen icon. From then on, open it from that icon.',
        ].map((step, i) => (
          <li key={i} className="flex gap-3 rounded-md bg-surface p-3 shadow-edge">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-accent text-[11px] font-medium text-accent">
              {i + 1}
            </span>
            <span className="text-[13px] leading-relaxed text-neutral-300">{step}</span>
          </li>
        ))}
      </ol>

      <button onClick={onCta} className={`${btnPrimary} mt-5 w-full py-2.5`}>
        {ctaLabel}
      </button>
    </div>
  );
}
