import { useCallback, useEffect, useState } from 'react';
import {
  backupFilename,
  collectBackup,
  importBackup,
  parseBackup,
  serializeBackup,
  triggerDownload,
  type BackupFile,
} from '../lib/backup';
import {
  deleteBodyweight,
  getAllBodyweights,
  getAllChecks,
  getAllLogs,
  getSettings,
  saveBodyweight,
  saveSettings,
} from '../lib/storage';
import { parseBodyweight } from '../lib/bodyweight';
import { parseEdgeMm } from '../lib/retest';
import type { BodyweightEntry } from '../types';
import { PERSISTENCE_COPY, checkPersistence, type PersistenceState } from '../lib/persistence';
import { beepTest } from '../lib/beep';

// T6 settings shell + T7 backup section. Deliberately NO reminder UI of any kind
// (D2a): no time picker, no notification permission, no deep-link URLs. Reminders
// live in an external alarm/Todoist — see README.

type Message = { kind: 'ok' | 'error'; text: string };
type Pending = {
  data: BackupFile;
  currentLogs: number;
  currentChecks: number;
  /** Set when an older backup was read and upgraded (D28), so the owner is told. */
  upgradedFrom?: number;
};

/** "3 sessions", "1 session" — used in every backup message. */
function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function Settings({
  onExit,
  onOpenInstallGuide,
}: {
  onExit: () => void;
  onOpenInstallGuide: () => void;
}) {
  const [message, setMessage] = useState<Message | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  // Bumped after an import so the bodyweight list re-reads instead of showing
  // the data that was just replaced.
  const [bwReloadKey, setBwReloadKey] = useState(0);

  async function handleExport() {
    try {
      const backup = await collectBackup(new Date().toISOString());
      triggerDownload(backupFilename(backup.exportedAt), serializeBackup(backup));
      setMessage({
        kind: 'ok',
        text: `Exported ${plural(backup.logs.length, 'session')}, ${backup.checks.length} check-offs, and ${plural(backup.bodyweight.length, 'bodyweight reading')}.`,
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
    // and name the counts first (AC4). Bodyweight counts here too (T15): an import
    // clears it, so a store holding only readings must not be wiped unannounced.
    const [logs, checks, bodyweight] = await Promise.all([
      getAllLogs(),
      getAllChecks(),
      getAllBodyweights(),
    ]);
    if (logs.length === 0 && checks.length === 0 && bodyweight.length === 0) {
      await doImport(result.data, result.upgradedFrom);
    } else {
      setPending({
        data: result.data,
        currentLogs: logs.length,
        currentChecks: checks.length,
        upgradedFrom: result.upgradedFrom,
      });
    }
  }

  async function doImport(data: BackupFile, upgradedFrom?: number) {
    try {
      await importBackup(data);
      setPending(null);
      setBwReloadKey((k) => k + 1); // the list below is now showing the old data
      setMessage({
        kind: 'ok',
        text:
          `Restored ${plural(data.logs.length, 'session')}, ${data.checks.length} check-offs, and ${plural(data.bodyweight.length, 'bodyweight reading')}.` +
          // D28: an upgrade is stated, never silent — the owner should know why a
          // restored file came back with no bodyweight in it.
          (upgradedFrom === undefined
            ? ''
            : ` That file was written by an older version (v${upgradedFrom}), which recorded no bodyweight.`),
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

        <StandardEdge reloadKey={bwReloadKey} />

        <BodyweightLog reloadKey={bwReloadKey} />

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
                This will replace your current {plural(pending.currentLogs, 'session')} and{' '}
                {pending.currentChecks} check-offs with {plural(pending.data.logs.length, 'session')}{' '}
                and {pending.data.checks.length} check-offs from the file. Bodyweight readings are
                replaced too ({plural(pending.data.bodyweight.length, 'reading')} in the file). This
                can’t be undone.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setPending(null)}
                  className="flex-1 rounded-lg px-4 py-2 text-sm text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void doImport(pending.data, pending.upgradedFrom)}
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
/**
 * The one standard edge the block is tested on (T16 AC4, D30).
 *
 * §4E: pick one edge (14–20mm) and never change it mid-block, because changing it
 * invalidates the comparison more than any training variable. It lives here
 * rather than in the catalog for D26's reason — it configures an input, it does
 * not change a prescription — and it is prefilled onto every set that records an
 * edge, so week 8 does not depend on remembering week 1.
 *
 * Editable, because it is the owner's board: a nonsense edit leaves the stored
 * value alone rather than clearing the condition every hang comparison rests on.
 */
function StandardEdge({ reloadKey }: { reloadKey: number }) {
  const [edgeMm, setEdgeMm] = useState<number | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    const settings = await getSettings();
    setEdgeMm(settings.standardEdgeMm ?? null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, reloadKey]);

  async function save(raw: string) {
    const mm = parseEdgeMm(raw);
    if (mm === null) {
      await refresh();
      return;
    }
    const settings = await getSettings();
    await saveSettings({ ...settings, standardEdgeMm: mm });
    await refresh();
  }

  return (
    <section className="space-y-2 rounded-xl border border-slate-700 bg-brand-surface p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Standard edge
      </h2>
      <div className="flex items-center gap-2">
        <input
          key={String(edgeMm)}
          defaultValue={edgeMm === null || edgeMm === undefined ? '' : String(edgeMm)}
          onBlur={(e) => void save(e.target.value)}
          inputMode="decimal"
          placeholder="20"
          aria-label="Standard edge, millimetres"
          className="w-20 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-right text-sm text-slate-100 focus:border-brand-accent focus:outline-none"
        />
        <span className="text-xs text-slate-500">mm</span>
      </div>
      <p className="text-xs text-slate-500">
        Prefilled on every set that records an edge. §4E: “Pick one standard edge (14–20mm) and
        never change it mid-block — changing edge size invalidates the comparison more than any
        training variable.”
      </p>
    </section>
  );
}

/**
 * The recorded bodyweights, correctable in place (T15 AC9).
 *
 * This exists because the value is a *denominator*: a fat-fingered 187 for 178
 * silently shifts every %BW figure computed from it, and unlike a mistyped set it
 * is not visible anywhere near where the error shows up. Editing writes back to
 * the same date key, so a correction replaces rather than adds (D24).
 *
 * Reports, never comments: no trend, no goal, no delta between readings (D23).
 */
function BodyweightLog({ reloadKey }: { reloadKey: number }) {
  const [entries, setEntries] = useState<BodyweightEntry[] | null>(null);

  const refresh = useCallback(async () => {
    const all = await getAllBodyweights();
    setEntries([...all].reverse()); // newest first, like History
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, reloadKey]);

  async function correct(date: string, raw: string) {
    const lb = parseBodyweight(raw);
    // A blank or nonsense edit leaves the stored value alone — silently dropping
    // a denominator would be worse than ignoring a typo.
    if (lb === null) {
      await refresh();
      return;
    }
    await saveBodyweight({ date, lb });
    await refresh();
  }

  async function remove(date: string) {
    if (!window.confirm(`Delete the bodyweight recorded on ${date}?`)) return;
    await deleteBodyweight(date);
    await refresh();
  }

  return (
    <section className="space-y-2 rounded-xl border border-slate-700 bg-brand-surface p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bodyweight</h2>
      {entries === null ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-400">
          None recorded. Add one from the home screen — added-load figures are only comparable
          against a known bodyweight (§4E).
        </p>
      ) : (
        <>
          <p className="text-xs text-slate-500">
            Correct a mistyped reading here. Every %BW figure is divided by it.
          </p>
          <ul className="space-y-1.5">
            {entries.map((entry) => (
              <li key={entry.date} className="flex items-center gap-2">
                <span className="flex-1 font-mono text-xs text-slate-400">{entry.date}</span>
                <input
                  defaultValue={String(entry.lb)}
                  onBlur={(e) => void correct(entry.date, e.target.value)}
                  inputMode="decimal"
                  aria-label={`Bodyweight on ${entry.date}, pounds`}
                  className="w-20 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-right text-sm text-slate-100 focus:border-brand-accent focus:outline-none"
                />
                <span className="text-xs text-slate-500">lb</span>
                <button
                  onClick={() => void remove(entry.date)}
                  aria-label={`Delete bodyweight recorded on ${entry.date}`}
                  className="rounded-md px-2 py-1 text-slate-500 hover:text-red-400"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

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

