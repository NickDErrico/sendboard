// T1 shell only. No features, routes, or data model live here yet — those arrive
// in T2+ (see climbing-app-spec.md). This screen exists to prove the PWA installs,
// renders offline from the service-worker precache, and loads correctly from the
// GitHub Pages subpath.
export default function App() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-surface">
        <span className="text-3xl font-bold text-brand-accent">S</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Sendboard</h1>
      <p className="text-sm text-slate-400">
        Shell installed. Training features arrive in the next build.
      </p>
      <p className="text-xs text-slate-500">v{__APP_VERSION__}</p>
    </main>
  );
}
