// T1/T2 shell. The real home screen, tab bar, and routing arrive in T8; the
// screens that consume the data layer arrive in T3–T5b. This placeholder proves
// the PWA installs and renders. The T0 persistence probe was removed in T2 now
// that the real storage module (src/lib/storage.ts) exists.
export default function App() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-surface">
        <span className="text-3xl font-bold text-brand-accent">S</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Sendboard</h1>
      <p className="text-sm text-slate-400">Data layer ready. Screens arrive in the next builds.</p>
      <p className="text-xs text-slate-500">v{__APP_VERSION__}</p>
    </main>
  );
}
