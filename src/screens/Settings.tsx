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
  dateKey,
  deleteBodyweight,
  getAllBodyweights,
  getAllChecks,
  getAllLogs,
  getAllRoutines,
  getSettings,
  saveBodyweight,
  saveSettings,
} from '../lib/storage';
import { parseBodyweight } from '../lib/bodyweight';
import { blockPosition, type BlockPosition } from '../lib/block';
import { parseEdgeMm } from '../lib/retest';
import { parseEdgeList, parseLoadStep } from '../lib/gear';
import { DEFAULT_LEAD_IN_SEC, leadInSecOf, parseLeadIn, voiceEnabled } from '../lib/cues';
import { primeSpeech, say } from '../lib/speech';
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

        <BlockStart reloadKey={bwReloadKey} />

        <StandardEdge reloadKey={bwReloadKey} />

        <GearSettings reloadKey={bwReloadKey} />

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
            checking it mid-session means abandoning a hang to find out. T20 adds
            the voice and the count-in to the same section, for the same reason. */}
        <SoundSettings reloadKey={bwReloadKey} />

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
 * Where the 8-week block is counted from (T24, D25).
 *
 * The app derives this from the first completed training session and says so, so
 * this section is empty of input in the normal case — it reports the derived
 * position and offers the one thing that cannot be derived: *this is a new block,
 * start counting here.* That marker is the only block state stored anywhere.
 *
 * Both controls confirm first, because they change what every week label in the
 * app means. Neither deletes a session: clearing the marker returns to the derived
 * position exactly, which is why "Use my first session" is safe to offer at all.
 */
function BlockStart({ reloadKey }: { reloadKey: number }) {
  const [block, setBlock] = useState<BlockPosition | null>(null);
  const [marker, setMarker] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [logs, routines, settings] = await Promise.all([
      getAllLogs(),
      getAllRoutines(),
      getSettings(),
    ]);
    setMarker(settings.blockStartedAt ?? null);
    setBlock(blockPosition({ logs, routines, settings, today: new Date() }));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, reloadKey]);

  async function startNewBlock() {
    const today = dateKey(new Date());
    if (
      !window.confirm(
        `Start a new block from today (${new Date(`${today}T00:00`).toLocaleDateString()})? Weeks and session counts restart here. Nothing you have logged is deleted.`,
      )
    ) {
      return;
    }
    const settings = await getSettings();
    await saveSettings({ ...settings, blockStartedAt: today });
    await refresh();
  }

  async function clearMarker() {
    if (!window.confirm('Go back to counting from your first logged session?')) return;
    const settings = await getSettings();
    const { blockStartedAt: _dropped, ...rest } = settings;
    void _dropped;
    await saveSettings(rest);
    await refresh();
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-700 bg-brand-surface p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Block</h2>

      {block === null ? (
        <p className="text-sm text-slate-400">
          Not started — the block begins at your first logged session.
        </p>
      ) : (
        <p className="text-sm text-slate-300">
          {block.label} ·{' '}
          <span className="text-slate-500">
            {block.derived ? 'counted from your first session, ' : 'started '}
            {new Date(`${block.startKey}T00:00`).toLocaleDateString()}
          </span>
        </p>
      )}

      <button
        onClick={() => void startNewBlock()}
        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200"
      >
        Start a new block today
      </button>
      {marker !== null && (
        <button
          onClick={() => void clearMarker()}
          className="w-full rounded-lg px-4 py-2 text-sm text-slate-400"
        >
          Use my first session instead
        </button>
      )}

      <p className="text-xs text-slate-500">
        The week comes from your log, not a schedule — nothing here is ever due, and past week 8 it
        just reads “week 8+”. Set this only when you deliberately begin a new block; §4F’s weeks are
        counted from it.
      </p>
    </section>
  );
}

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
 * The board and the plate rack (T18, D26).
 *
 * This is the only place the app learns what the owner physically owns, and it
 * buys exactly one thing: a set value that used to cost an iOS keyboard now
 * costs a tap. It changes no prescription and hides no exercise — D26's line
 * between configuring an *input* and editing the *catalog* (D6).
 *
 * Both fields are permissive by design (D31): a junk edge list leaves the stored
 * board alone rather than clearing it, and an unusual increment is accepted
 * because it is gear, not advice. Leaving them blank is a supported state — the
 * set logger simply stays the text inputs it has always been.
 */
function GearSettings({ reloadKey }: { reloadKey: number }) {
  const [edges, setEdges] = useState<number[] | null>(null);
  const [step, setStep] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const settings = await getSettings();
    setEdges(settings.edgesMm ?? []);
    setStep(settings.loadStepLb ?? null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, reloadKey]);

  async function saveEdges(raw: string) {
    const parsed = parseEdgeList(raw);
    // Nothing parsed → keep the board. Mistyping a list must not delete it, the
    // same rule the standard edge and the bodyweight corrections follow.
    if (parsed.length === 0) {
      await refresh();
      return;
    }
    const settings = await getSettings();
    await saveSettings({ ...settings, edgesMm: parsed });
    await refresh();
  }

  async function saveStep(raw: string) {
    const parsed = parseLoadStep(raw);
    if (parsed === null) {
      await refresh();
      return;
    }
    const settings = await getSettings();
    await saveSettings({ ...settings, loadStepLb: parsed });
    await refresh();
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-700 bg-brand-surface p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your gear</h2>

      <div className="space-y-1">
        <label className="text-sm text-slate-300" htmlFor="gear-edges">
          Board edges
        </label>
        <input
          id="gear-edges"
          key={`edges-${edges?.join(',')}`}
          defaultValue={edges?.join(', ') ?? ''}
          onBlur={(e) => void saveEdges(e.target.value)}
          inputMode="decimal"
          placeholder="20, 18, 15, 10"
          aria-label="Board edges, millimetres, comma separated"
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-brand-accent focus:outline-none"
        />
        <p className="text-xs text-slate-500">
          The rungs that exist on your board, in millimetres. Each one becomes a one-tap choice when
          you log an edge — typing any other value still works.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300" htmlFor="gear-step">
          Load increment
        </label>
        <div className="flex items-center gap-2">
          <input
            id="gear-step"
            key={`step-${step}`}
            defaultValue={step === null ? '' : String(step)}
            onBlur={(e) => void saveStep(e.target.value)}
            inputMode="decimal"
            placeholder="2.5"
            aria-label="Load increment, pounds"
            className="w-20 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-right text-sm text-slate-100 placeholder:text-slate-600 focus:border-brand-accent focus:outline-none"
          />
          <span className="text-xs text-slate-500">lb</span>
        </div>
        <p className="text-xs text-slate-500">
          The smallest weight you can actually add. It sets the size of the − / + step on added load
          — §4F asks for increments of 1–3%, and whether to take one is yours.
        </p>
      </div>
    </section>
  );
}

/**
 * The tones, the voice, and the count that starts a hold (T13 AC8, T20).
 *
 * D34 is visible in the copy on purpose: the toggle turns off the *words*, never
 * the tones, because the tones are the channel the session actually depends on
 * and the voice is the one that is allowed to be missing. Both testable here,
 * off the training floor — mid-session, finding out costs a hang.
 *
 * The count-in is the one setting in this section that changes a *number*: with
 * it on, a hold is measured from "pull" rather than from the tap (D33).
 */
function SoundSettings({ reloadKey }: { reloadKey: number }) {
  const [voice, setVoice] = useState(true);
  const [leadIn, setLeadIn] = useState<number>(DEFAULT_LEAD_IN_SEC);
  // Bumped on every read so the field remounts against what is actually stored.
  // Without it a *refused* edit leaves the junk sitting in the box — the stored
  // count is unchanged, so the value-keyed remount never happens and the refusal
  // is invisible, which is the one thing a refusal must not be.
  const [readCount, setReadCount] = useState(0);

  const refresh = useCallback(async () => {
    const settings = await getSettings();
    setVoice(voiceEnabled(settings));
    setLeadIn(leadInSecOf(settings));
    setReadCount((n) => n + 1);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, reloadKey]);

  async function toggleVoice() {
    const settings = await getSettings();
    await saveSettings({ ...settings, voiceCues: !voiceEnabled(settings) });
    await refresh();
  }

  async function saveLeadIn(raw: string) {
    const parsed = parseLeadIn(raw);
    // Junk leaves the stored count alone — the same refusal every other field in
    // this screen makes. 0 is a real answer, not an empty one.
    if (parsed === null) {
      await refresh();
      return;
    }
    const settings = await getSettings();
    await saveSettings({ ...settings, leadInSec: parsed });
    await refresh();
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-700 bg-brand-surface p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sound</h2>
      <p className="text-sm text-slate-400">
        The timer plays a tone when a hold ends and when a rest is up, and pips through the target
        window of a hang so you can hear where you are without looking. It only sounds while
        Sendboard is on screen — iOS suspends a backgrounded web app.
      </p>

      <button
        onClick={() => void toggleVoice()}
        aria-pressed={voice}
        className={`flex w-full items-center justify-between rounded-lg px-4 py-2 text-sm font-semibold ${
          voice ? 'bg-emerald-500/20 text-emerald-200' : 'border border-slate-700 text-slate-300'
        }`}
      >
        <span>Spoken cues</span>
        <span aria-hidden>{voice ? 'On ✓' : 'Off'}</span>
      </button>
      <p className="text-xs text-slate-500">
        Counts you in and says which set is next when a rest ends. Turning it off silences the words
        only — every tone still plays.
      </p>

      <div className="space-y-1">
        <label className="text-sm text-slate-300" htmlFor="lead-in">
          Count-in
        </label>
        <div className="flex items-center gap-2">
          <input
            id="lead-in"
            key={`lead-${leadIn}-${readCount}`}
            defaultValue={String(leadIn)}
            onBlur={(e) => void saveLeadIn(e.target.value)}
            inputMode="decimal"
            placeholder="3"
            aria-label="Count-in before a hold, seconds"
            className="w-20 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-right text-sm text-slate-100 focus:border-brand-accent focus:outline-none"
          />
          <span className="text-xs text-slate-500">seconds</span>
        </div>
        <p className="text-xs text-slate-500">
          “3, 2, 1, pull” — the hold clock starts on <em>pull</em>, so the recorded time is the
          effort and not the time it took to get loaded. Set 0 to start on the tap instead.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={beepTest}
          className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 font-semibold text-slate-200"
        >
          Test sound
        </button>
        <button
          onClick={() => {
            primeSpeech();
            say('Rest done. Set 3 of 5.');
          }}
          className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 font-semibold text-slate-200"
        >
          Test voice
        </button>
      </div>
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

