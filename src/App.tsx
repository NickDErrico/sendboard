import { useEffect, useState } from 'react';
import { openDB } from 'idb';
import { ExerciseList } from './screens/ExerciseList';

// ─── TEMPORARY: T0 persistence heartbeat ─────────────────────────────────────
// Kept ONLY until the 48h storage-persistence gate (T0 AC2 / D4) is confirmed on
// device, then delete this block. Reads the value written during the earlier
// device test so that in-flight 48h check still completes. Separate 'sendboard-
// spike' DB — NOT the app's real storage (src/lib/storage.ts).
const SPIKE_DB = 'sendboard-spike';
const SPIKE_STORE = 'probe';
interface ProbeValue {
  writtenAt: string;
  count: number;
}
async function openSpike() {
  return openDB(SPIKE_DB, 1, { upgrade: (db) => void db.createObjectStore(SPIKE_STORE) });
}
async function readProbe(): Promise<ProbeValue | undefined> {
  return (await openSpike()).get(SPIKE_STORE, 'value');
}
async function writeProbe(prevCount: number): Promise<ProbeValue> {
  const value: ProbeValue = { writtenAt: new Date().toISOString(), count: prevCount + 1 };
  await (await openSpike()).put(SPIKE_STORE, value, 'value');
  return value;
}
function timeAgo(iso: string): string {
  const mins = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (mins < 1) return 'just now';
  if (mins < 60) return `${Math.round(mins)} min ago`;
  const hrs = mins / 60;
  if (hrs < 48) return `${Math.round(hrs)} h ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

function PersistenceHeartbeat() {
  const [probe, setProbe] = useState<ProbeValue | undefined>();
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    readProbe()
      .then(setProbe)
      .finally(() => setLoaded(true));
  }, []);
  return (
    <section className="w-full rounded-xl border border-slate-700 bg-brand-surface p-4 text-left text-sm">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Storage persistence check
      </h2>
      {!loaded ? (
        <p className="text-slate-400">Checking…</p>
      ) : probe ? (
        <p className="text-slate-300">
          Value survived — written{' '}
          <span className="font-semibold text-emerald-400">{timeAgo(probe.writtenAt)}</span>
          <br />
          <span className="text-xs text-slate-500">
            {new Date(probe.writtenAt).toLocaleString()} · write #{probe.count}
          </span>
        </p>
      ) : (
        <p className="text-slate-400">No stored value found — tap to start the 48h check.</p>
      )}
      <button
        onClick={() => writeProbe(probe?.count ?? 0).then(setProbe)}
        className="mt-3 w-full rounded-lg bg-brand-accent px-4 py-2 font-semibold text-brand-bg"
      >
        {probe ? 'Reset check (write now)' : 'Write timestamp'}
      </button>
    </section>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// Temporary shell so screens built so far are reachable on device. The real home
// screen, tab bar, and routing arrive in T8; this switch is replaced then.
type View = 'home' | 'exercises';

export default function App() {
  const [view, setView] = useState<View>('home');

  if (view === 'exercises') {
    return <ExerciseList onExit={() => setView('home')} />;
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-surface">
        <span className="text-3xl font-bold text-brand-accent">S</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Sendboard</h1>
      <button
        onClick={() => setView('exercises')}
        className="w-full rounded-lg bg-brand-accent px-4 py-2 font-semibold text-brand-bg"
      >
        Browse exercises
      </button>
      <PersistenceHeartbeat />
      <p className="text-xs text-slate-500">v{__APP_VERSION__}</p>
    </main>
  );
}
