import { useEffect, useState } from 'react';
import { openDB } from 'idb';

// ─── T0/T1 SPIKE PROBE ───────────────────────────────────────────────────────
// Throwaway IndexedDB persistence probe. Its only job is to let the owner close
// T0 acceptance criterion 2 on the real device: write a value, reopen the
// installed PWA after ≥48h, confirm the value is still here. It is NOT the app's
// data model — DELETE this whole block in T2 when the real storage module lands.
const SPIKE_DB = 'sendboard-spike';
const SPIKE_STORE = 'probe';

interface ProbeValue {
  writtenAt: string; // ISO 8601
  count: number;
}

async function openProbeDb() {
  return openDB(SPIKE_DB, 1, {
    upgrade(db) {
      db.createObjectStore(SPIKE_STORE);
    },
  });
}
async function readProbe(): Promise<ProbeValue | undefined> {
  const db = await openProbeDb();
  return db.get(SPIKE_STORE, 'value');
}
async function writeProbe(prevCount: number): Promise<ProbeValue> {
  const db = await openProbeDb();
  const value: ProbeValue = { writtenAt: new Date().toISOString(), count: prevCount + 1 };
  await db.put(SPIKE_STORE, value, 'value');
  return value;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = ms / 60_000;
  if (mins < 1) return 'just now';
  if (mins < 60) return `${Math.round(mins)} min ago`;
  const hrs = mins / 60;
  if (hrs < 48) return `${Math.round(hrs)} h ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [probe, setProbe] = useState<ProbeValue | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    readProbe()
      .then((v) => setProbe(v))
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoaded(true));
  }, []);

  async function handleWrite() {
    setBusy(true);
    setError(null);
    try {
      const v = await writeProbe(probe?.count ?? 0);
      setProbe(v);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  const nav = navigator as Navigator & { standalone?: boolean };
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-surface">
        <span className="text-3xl font-bold text-brand-accent">S</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Sendboard</h1>

      {/* Standalone-launch indicator — confirms T0 criterion 1 at a glance. */}
      <p className="text-xs text-slate-500">
        Launch mode:{' '}
        <span className={isStandalone ? 'text-emerald-400' : 'text-amber-400'}>
          {isStandalone ? 'standalone ✓' : 'browser tab (not installed)'}
        </span>
      </p>

      {/* Persistence probe — the T0 criterion 2 test surface. */}
      <section className="w-full rounded-xl border border-slate-700 bg-brand-surface p-4 text-left">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Storage persistence test</h2>
        {!loaded ? (
          <p className="text-sm text-slate-400">Checking storage…</p>
        ) : probe ? (
          <p className="text-sm text-slate-300">
            Stored value found:
            <br />
            written <span className="font-semibold text-emerald-400">{timeAgo(probe.writtenAt)}</span>
            <br />
            <span className="text-xs text-slate-500">
              {new Date(probe.writtenAt).toLocaleString()} · write #{probe.count}
            </span>
          </p>
        ) : (
          <p className="text-sm text-slate-400">No value stored yet. Tap the button to write one.</p>
        )}

        <button
          onClick={handleWrite}
          disabled={busy}
          className="mt-3 w-full rounded-lg bg-brand-accent px-4 py-2 font-semibold text-brand-bg disabled:opacity-50"
        >
          {busy ? 'Writing…' : 'Write timestamp to storage'}
        </button>

        {error && <p className="mt-2 text-xs text-red-400">Error: {error}</p>}
      </section>

      <p className="text-xs text-slate-600">
        Spike shell · v{__APP_VERSION__} · storage probe is removed in the next build
      </p>
    </main>
  );
}
