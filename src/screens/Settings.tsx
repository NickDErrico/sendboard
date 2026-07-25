import { useEffect, useState } from 'react';
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
import { PERSISTENCE_COPY, checkPersistence, type PersistenceState } from '../lib/persistence';
import { beepTest } from '../lib/beep';

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
        {/* T13 AC2: the build stamp, not the (never-bumped) package version, is
            what tells the owner an update landed. Compare it after relaunching
            twice — the service worker updates itself (registerType: autoUpdate),
            so the app never needs deleting, and deleting it is what destroys the
            log. */}
        <section className="rounded-xl border border-slate-700 bg-brand-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">Build</span>
            <span className="font-mono text-sm text-slate-400">
              {new Date(__BUILD_TIME__).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            v{__APP_VERSION__} · {__COMMIT__}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Updates install themselves — close Sendboard and open it twice, then check this
            timestamp. Never delete the app to update it; that erases your log.
          </p>
        </section>

        <PersistenceStatus />

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

        {/* T13 AC8: audio is the one thing that cannot be checked by looking, and
            checking it mid-session means abandoning a hang to find out. */}
        <section className="rounded-xl border border-slate-700 bg-brand-surface p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sound</h2>
          <p className="mt-2 text-sm text-slate-400">
            The timer plays a tone when a hold ends and when a rest is up. It only sounds while
            Sendboard is on screen — iOS suspends a backgrounded web app.
          </p>
          <button
            onClick={beepTest}
            className="mt-3 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 font-semibold text-slate-200"
          >
            Test sound
          </button>
        </section>

        <section className="rounded-xl border border-slate-700 bg-brand-surface p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reminders</h2>
          <p className="mt-2 text-sm text-slate-400">
            Sendboard has no built-in reminders. Set a repeating iPhone alarm or a Todoist recurring
            task for your training time, then tap the Sendboard icon to open it. See the README for
            step-by-step setup.
          </p>
        </section>
      </div>
    </div>
  );
}

// T13 AC1/AC3: replaces T0's temporary write-a-timestamp probe, which could not
// survive the owner's update workflow anyway (deleting the app deleted the
// probe). This reports the browser's actual answer instead of inferring it.
function PersistenceStatus() {
  const [state, setState] = useState<PersistenceState | null>(null);

  useEffect(() => {
    void (async () => setState(await checkPersistence()))();
  }, []);

  const tone =
    state === 'persisted'
      ? 'text-emerald-300'
      : state === 'denied'
        ? 'text-amber-300'
        : 'text-slate-400';

  return (
    <section className="rounded-xl border border-slate-700 bg-brand-surface p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Storage durability
      </h2>
      {state === null ? (
        <p className="mt-2 text-sm text-slate-400">Checking…</p>
      ) : (
        <>
          <p className={`mt-2 text-sm font-semibold ${tone}`}>
            {state === 'persisted' ? 'Persistent storage granted' : `Persistent storage: ${state}`}
          </p>
          <p className="mt-1 text-sm text-slate-400">{PERSISTENCE_COPY[state]}</p>
        </>
      )}
    </section>
  );
}

