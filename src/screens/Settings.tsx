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
import { Icon, btnGhost, btnPrimary, btnSecondary, input } from '../components/ui';
import { ExpandableRow, ReadRow, RowRule, readList } from '../components/ReadList';

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
    <div className="mx-auto max-w-md px-4 pb-24 pt-[54px]">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">Settings</h1>
        <button
          onClick={onExit}
          className="rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10"
        >
          Done
        </button>
      </header>

      <div className="space-y-3">
        {/* Nocturne's collapse rule: the build stamp, the storage verdict and the
            install guide were three cards in a row and none of them is a thing
            you *do* — the first two report and the third goes somewhere. As one
            card of rows the whole preamble is four lines instead of half a
            screen, and the section you actually came to change is above the fold.

            Each row's explanation is one tap away rather than always on: it is
            read once, and after that it sits between the owner and the setting
            they opened this screen for. */}
        <section className={readList}>
          {/* T13 AC2: the build stamp, not the (never-bumped) package version, is
              what tells the owner an update landed. Compare it after relaunching
              twice — the service worker updates itself (registerType:
              autoUpdate), so the app never needs deleting, and deleting it is
              what destroys the log. */}
          <ExpandableRow
            icon="arrows-clockwise"
            title="Build"
            detail={`${new Date(__BUILD_TIME__).toLocaleString()} · v${__APP_VERSION__} · ${__COMMIT__}`}
          >
            <p>
              Updates install themselves — close Sendboard and open it twice, then check this
              timestamp. Never delete the app to update it; that erases your log.
            </p>
          </ExpandableRow>
          <RowRule />

          <PersistenceStatus />
          <RowRule />

          <ReadRow
            icon="device-mobile"
            title="How to install"
            detail="Add Sendboard to your home screen"
            onClick={onOpenInstallGuide}
          />
        </section>

        <BlockStart reloadKey={bwReloadKey} />

        <StandardEdge reloadKey={bwReloadKey} />

        <GearSettings reloadKey={bwReloadKey} />

        <BodyweightLog reloadKey={bwReloadKey} />

        <section className="space-y-3 rounded-md bg-surface shadow-edge p-3">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">Data backup</h2>
          <p className="text-[13px] text-neutral-400">
            Export every session and check-off to a JSON file, or restore from one. The exercise
            catalog isn’t included — it ships with the app.
          </p>

          <button
            onClick={() => void handleExport()}
            className={`${btnPrimary} w-full py-2`}
          >
            Export backup
          </button>

          <label className={`${btnSecondary} w-full cursor-pointer py-2`}>
            Import backup
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => void handleFileChosen(e)}
            />
          </label>

          {pending && (
            <div className="rounded-lg border border-accent/40 bg-accent/[.08] p-3">
              <p className="text-[13px] text-accent-100">
                This will replace your current {plural(pending.currentLogs, 'session')} and{' '}
                {pending.currentChecks} check-offs with {plural(pending.data.logs.length, 'session')}{' '}
                and {pending.data.checks.length} check-offs from the file. Bodyweight readings are
                replaced too ({plural(pending.data.bodyweight.length, 'reading')} in the file). This
                can’t be undone.
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setPending(null)} className={`${btnSecondary} flex-1 py-2`}>
                  Cancel
                </button>
                {/* The one hue that is not the accent, for the one action here
                    that destroys something. */}
                <button
                  onClick={() => void doImport(pending.data, pending.upgradedFrom)}
                  className={`${btnSecondary} flex-1 border-warn/50 bg-warn/10 py-2 !text-warn hover:bg-warn/20`}
                >
                  Replace all
                </button>
              </div>
            </div>
          )}

          {message && (
            <p className={`text-sm ${message.kind === 'ok' ? 'text-accent-300' : 'text-warn'}`}>
              {message.text}
            </p>
          )}
        </section>

        {/* T13 AC8: audio is the one thing that cannot be checked by looking, and
            checking it mid-session means abandoning a hang to find out. T20 adds
            the voice and the count-in to the same section, for the same reason. */}
        <SoundSettings reloadKey={bwReloadKey} />

        <section className="rounded-md bg-surface shadow-edge p-3">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">Reminders</h2>
          <p className="mt-2 text-[13px] text-neutral-400">
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
    <section className="space-y-3 rounded-md bg-surface shadow-edge p-3">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">Block</h2>

      {block === null ? (
        <p className="text-[13px] text-neutral-400">
          Not started — the block begins at your first logged session.
        </p>
      ) : (
        <p className="text-[13px] text-neutral-300">
          {block.label} ·{' '}
          <span className="text-neutral-500">
            {block.derived ? 'counted from your first session, ' : 'started '}
            {new Date(`${block.startKey}T00:00`).toLocaleDateString()}
          </span>
        </p>
      )}

      <button onClick={() => void startNewBlock()} className={`${btnSecondary} w-full py-2`}>
        Start a new block today
      </button>
      {marker !== null && (
        <button
          onClick={() => void clearMarker()}
          className={`${btnGhost} w-full py-2 !text-neutral-400`}
        >
          Use my first session instead
        </button>
      )}

      <p className="text-xs text-neutral-500">
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
    <section className="space-y-2 rounded-md bg-surface shadow-edge p-3">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">
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
          className={`${input} w-20 text-right`}
        />
        <span className="text-xs text-neutral-500">mm</span>
      </div>
      <p className="text-xs text-neutral-500">
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
    <section className="space-y-3 rounded-md bg-surface shadow-edge p-3">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">Your gear</h2>

      <div className="space-y-1">
        <label className="text-sm text-neutral-300" htmlFor="gear-edges">
          Board edges
        </label>
        <input
          id="gear-edges"
          key={`edges-${edges?.join(',')}`}
          defaultValue={edges?.join(', ') ?? ''}
          onBlur={(e) => void saveEdges(e.target.value)}
          // No `inputMode="decimal"` here, unlike the single-number fields below:
          // a decimal keypad has no comma and no space, so it would hide the very
          // separators the placeholder asks for. A list needs the text keyboard.
          placeholder="20, 18, 15, 10"
          aria-label="Board edges, millimetres, comma separated"
          className={input}
        />
        <p className="text-xs text-neutral-500">
          The rungs that exist on your board, in millimetres. Each one becomes a one-tap choice when
          you log an edge — typing any other value still works.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-neutral-300" htmlFor="gear-step">
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
            className={`${input} w-20 text-right`}
          />
          <span className="text-xs text-neutral-500">lb</span>
        </div>
        <p className="text-xs text-neutral-500">
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
    <section className="space-y-3 rounded-md bg-surface shadow-edge p-3">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">Sound</h2>
      <p className="text-[13px] text-neutral-400">
        The timer plays a tone when a hold ends and when a rest is up, and pips through the target
        window of a hang so you can hear where you are without looking. It only sounds while
        Sendboard is on screen — iOS suspends a backgrounded web app.
      </p>

      <button
        onClick={() => void toggleVoice()}
        aria-pressed={voice}
        className={`flex w-full items-center justify-between rounded-md border px-4 py-2 text-[13px] font-medium transition-colors ${
          voice
            ? 'border-accent bg-accent/[.12] text-accent-200'
            : 'border-neutral-800 text-neutral-300 hover:border-white/[.34]'
        }`}
      >
        <span>Spoken cues</span>
        <span className="flex items-center gap-1.5">
          {voice && <Icon name="check" className="text-[13px] text-accent-400" />}
          {voice ? 'On' : 'Off'}
        </span>
      </button>
      <p className="text-xs text-neutral-500">
        Counts you in and says which set is next when a rest ends. Turning it off silences the words
        only — every tone still plays.
      </p>

      <div className="space-y-1">
        <label className="text-sm text-neutral-300" htmlFor="lead-in">
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
            className={`${input} w-20 text-right`}
          />
          <span className="text-xs text-neutral-500">seconds</span>
        </div>
        <p className="text-xs text-neutral-500">
          “3, 2, 1, pull” — the hold clock starts on <em>pull</em>, so the recorded time is the
          effort and not the time it took to get loaded. Set 0 to start on the tap instead.
        </p>
      </div>

      <div className="flex gap-2">
        <button onClick={beepTest} className={`${btnSecondary} flex-1 py-2`}>
          Test sound
        </button>
        <button
          onClick={() => {
            primeSpeech();
            say('Rest done. Set 3 of 5.');
          }}
          className={`${btnSecondary} flex-1 py-2`}
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
    <section className="space-y-2 rounded-md bg-surface shadow-edge p-3">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">Bodyweight</h2>
      {entries === null ? (
        <p className="text-xs text-neutral-500">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-[13px] text-neutral-400">
          None recorded. Add one from the home screen — added-load figures are only comparable
          against a known bodyweight (§4E).
        </p>
      ) : (
        <>
          <p className="text-xs text-neutral-500">
            Correct a mistyped reading here. Every %BW figure is divided by it.
          </p>
          <ul className="space-y-1.5">
            {entries.map((entry) => (
              <li key={entry.date} className="flex items-center gap-2">
                <span className="flex-1 text-xs text-neutral-400">{entry.date}</span>
                <input
                  defaultValue={String(entry.lb)}
                  onBlur={(e) => void correct(entry.date, e.target.value)}
                  inputMode="decimal"
                  aria-label={`Bodyweight on ${entry.date}, pounds`}
                  className={`${input} w-20 text-right`}
                />
                <span className="text-xs text-neutral-500">lb</span>
                <button
                  onClick={() => void remove(entry.date)}
                  aria-label={`Delete bodyweight recorded on ${entry.date}`}
                  className="rounded-md px-2 py-1 text-neutral-600 hover:text-warn"
                >
                  <Icon name="x" className="text-[13px]" />
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

  // A granted request is the accent; anything else is neutral. Not a warning:
  // the browser saying no is a normal answer, and D5's export is the real backup
  // either way — colouring it as a problem would be the app worrying on the
  // owner's behalf about something they cannot change.
  const tone = state === 'persisted' ? 'text-accent-300' : 'text-neutral-400';

  return (
    <ExpandableRow
      icon="database"
      title="Storage durability"
      detail={
        state === null ? (
          'Checking…'
        ) : (
          <span className={tone}>
            {state === 'persisted' ? 'Persistent storage granted' : `Persistent storage: ${state}`}
          </span>
        )
      }
    >
      <p>{state === null ? 'Checking…' : PERSISTENCE_COPY[state]}</p>
    </ExpandableRow>
  );
}

