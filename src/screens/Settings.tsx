import { useEffect, useState } from 'react';
import { openDB } from 'idb';
import {
  backupFilename,
  collectBackup,
  importBackup,
  parseBackup,
  serializeBackup,
  triggerDownload,
  type BackupFile,
} from '../lib/backup';
import { getAllChecks, getAllLogs } from '../lib/storage';

// T6 settings shell + T7 backup section. Deliberately NO reminder UI of any kind
// (D2a): no time picker, no notification permission, no deep-link URLs. Reminders
// live in an external alarm/Todoist — see README.

type Message = { kind: 'ok' | 'error'; text: string };
type Pending = { data: BackupFile; currentLogs: number; currentChecks: number };

export function Settings({
  onExit,
  onOpenInstallGuide,
}: {
  onExit: () => void;
  onOpenInstallGuide: () => void;
}) {
  const [message, setMessage] = useState<Message | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  async function handleExport() {
    try {
      const backup = await collectBackup(new Date().toISOString());
      triggerDownload(backupFilename(backup.exportedAt), serializeBackup(backup));
      setMessage({
        kind: 'ok',
        text: `Exported ${backup.logs.length} ${backup.logs.length === 1 ? 'session' : 'sessions'} and ${backup.checks.length} check-offs.`,
      });
    } catch {
      setMessage({ kind: 'error', text: 'Export failed. Nothing was changed.' });
    }
  }

  async function handleFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setMessage(null);
    setPending(null);

    let text: string;
    try {
      text = await file.text();
    } catch {
      setMessage({ kind: 'error', text: 'Could not read that file. Nothing was changed.' });
      return;
    }

    const result = parseBackup(text);
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.message });
      return;
    }

    // Restore straight into an empty store (AC2); otherwise confirm the overwrite
    // and name the counts first (AC4).
    const [logs, checks] = await Promise.all([getAllLogs(), getAllChecks()]);
    if (logs.length === 0 && checks.length === 0) {
      await doImport(result.data);
    } else {
      setPending({ data: result.data, currentLogs: logs.length, currentChecks: checks.length });
    }
  }

  async function doImport(data: BackupFile) {
    try {
      await importBackup(data);
      setPending(null);
      setMessage({
        kind: 'ok',
        text: `Restored ${data.logs.length} ${data.logs.length === 1 ? 'session' : 'sessions'} and ${data.checks.length} check-offs.`,
      });
    } catch {
      setMessage({ kind: 'error', text: 'Import failed. Your data was not changed.' });
    }
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Settings</h1>
        <button
          onClick={onExit}
          className="rounded px-1 py-1 text-sm text-slate-400 hover:text-slate-200"
        >
          Done
        </button>
      </header>

      <div className="space-y-3">
        <section className="flex items-center justify-between rounded-xl border border-slate-700 bg-brand-surface p-4">
          <span className="text-sm font-medium text-slate-300">Version</span>
          <span className="font-mono text-sm text-slate-400">v{__APP_VERSION__}</span>
        </section>

        <button
          onClick={onOpenInstallGuide}
          className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-brand-surface p-4 text-left transition-colors hover:border-slate-600"
        >
          <span className="text-sm font-medium text-slate-200">How to install</span>
          <span className="text-slate-500">→</span>
        </button>

        <section className="space-y-3 rounded-xl border border-slate-700 bg-brand-surface p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data backup</h2>
          <p className="text-sm text-slate-400">
            Export every session and check-off to a JSON file, or restore from one. The exercise
            catalog isn’t included — it ships with the app.
          </p>

          <button
            onClick={() => void handleExport()}
            className="w-full rounded-lg bg-brand-accent px-4 py-2 font-semibold text-brand-bg"
          >
            Export backup
          </button>

          <label className="block w-full cursor-pointer rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-center font-semibold text-slate-200">
            Import backup
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => void handleFileChosen(e)}
            />
          </label>

          {pending && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-sm text-amber-100">
                This will replace your current {pending.currentLogs}{' '}
                {pending.currentLogs === 1 ? 'session' : 'sessions'} and {pending.currentChecks}{' '}
                check-offs with {pending.data.logs.length}{' '}
                {pending.data.logs.length === 1 ? 'session' : 'sessions'} and{' '}
                {pending.data.checks.length} check-offs from the file. This can’t be undone.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setPending(null)}
                  className="flex-1 rounded-lg px-4 py-2 text-sm text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void doImport(pending.data)}
                  className="flex-1 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200"
                >
                  Replace all
                </button>
              </div>
            </div>
          )}

          {message && (
            <p className={`text-sm ${message.kind === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>
              {message.text}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-700 bg-brand-surface p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reminders</h2>
          <p className="mt-2 text-sm text-slate-400">
            Sendboard has no built-in reminders. Set a repeating iPhone alarm or a Todoist recurring
            task for your training time, then tap the Sendboard icon to open it. See the README for
            step-by-step setup.
          </p>
        </section>

        <PersistenceHeartbeat />
      </div>
    </div>
  );
}

// ─── TEMPORARY: T0 persistence heartbeat ─────────────────────────────────────
// Kept ONLY until the 48h storage-persistence gate (T0 AC2 / D4) is confirmed on
// device, then delete this component and its usage above. Relocated here from the
// home screen in T8 so the real Home matches its spec (AC1) while the probe stays
// reachable on device. Separate 'sendboard-spike' DB — NOT the app's real storage.
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
    <section className="w-full rounded-xl border border-slate-800 bg-brand-surface/60 p-4 text-left text-sm">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Diagnostics · storage persistence (temporary)
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
        className="mt-3 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 font-semibold text-slate-200"
      >
        {probe ? 'Reset check (write now)' : 'Write timestamp'}
      </button>
    </section>
  );
}
