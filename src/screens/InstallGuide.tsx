// T8 install guide. Shown two ways (see App): once on first open in Safari (AC3,
// gated by Settings.installGuideDismissed), and any time from Settings → How to
// install. The caller supplies the CTA label + handler so the same content serves
// both the "Got it" dismissal and the "Back" reference view.
export function InstallGuide({ ctaLabel, onCta }: { ctaLabel: string; onCta: () => void }) {
  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <header className="mb-4 flex items-center gap-3 pt-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-surface">
          <span className="text-xl font-bold text-brand-accent">S</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Install Sendboard</h1>
      </header>

      <p className="mb-4 text-sm text-slate-400">
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
          <li key={i} className="flex gap-3 rounded-xl border border-slate-700 bg-brand-surface p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-accent text-sm font-bold text-brand-bg">
              {i + 1}
            </span>
            <span className="text-sm text-slate-300">{step}</span>
          </li>
        ))}
      </ol>

      <button
        onClick={onCta}
        className="mt-5 w-full rounded-lg bg-brand-accent px-4 py-2 font-semibold text-brand-bg"
      >
        {ctaLabel}
      </button>
    </div>
  );
}
