import { useEffect, useState } from 'react';
import type { BodyweightEntry, Settings, WorkoutLog } from '../types';
import { resumable } from '../lib/session';
import { startSession } from '../lib/openSession';
import { getAllBodyweights, getAllLogs, getSettings } from '../lib/storage';
import { go } from '../lib/routes';
import {
  BATTERY_ROUTINE_ID,
  batteryOccasions,
  formatValue,
  occasionLabel,
  type Occasion,
} from '../lib/retest';
import { RetestComparison } from '../components/RetestComparison';
import { Icon, btnPrimary, btnSecondary } from '../components/ui';

// §4E's baseline / retest battery (T16).
//
// The screen's job is to make the test runnable under the conditions §4E
// requires and to show what was recorded. It never schedules one, never says a
// retest is due, and never grades the result (D2a, D23) — §4E's own rubric is
// quoted by RetestComparison and applied by the owner.

export function Retest({ onExit }: { onExit: () => void }) {
  const [logs, setLogs] = useState<WorkoutLog[] | null>(null);
  const [bodyweights, setBodyweights] = useState<BodyweightEntry[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void (async () => {
      const [l, bw, s] = await Promise.all([getAllLogs(), getAllBodyweights(), getSettings()]);
      setLogs(l);
      setBodyweights(bw);
      setSettings(s);
    })();
  }, []);

  if (logs === null || settings === null) {
    return <p className="mx-auto max-w-md p-4 text-[13px] text-neutral-400">Loading…</p>;
  }

  const occasions = batteryOccasions(logs, bodyweights);
  const inProgress = resumable(logs);
  const inProgressIsBattery = inProgress?.routineId === BATTERY_ROUTINE_ID;
  const baseline = occasions[0] ?? null;
  const latest = occasions.length > 1 ? occasions[occasions.length - 1] : null;
  const nextLabel = occasionLabel(occasions.length);

  async function start() {
    // Same single-in-progress invariant every other start path obeys: an open
    // session is resumed rather than shadowed by a second log. D46 narrows what
    // counts as one, and `startSession` sweeps the rest.
    if (inProgress) {
      go({ name: 'session' });
      return;
    }
    await startSession(BATTERY_ROUTINE_ID);
    go({ name: 'session' });
  }

  return (
    <div className="mx-auto max-w-md space-y-3 px-4 pb-24 pt-[54px]">
      <header className="flex items-center justify-between">
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">Baseline / Retest</h1>
        <button
          onClick={onExit}
          className="rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10"
        >
          Done
        </button>
      </header>

      {/* The protocol, quoted rather than paraphrased into a new prescription
          (AC2). The conditions clause is the whole reason this screen exists. */}
      <section className="rounded-md bg-surface shadow-edge p-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">
          Training plan §4E
        </p>
        <p className="mt-1 text-[13px] text-neutral-300">
          “Do this once in week 1 (fully rested, after a thorough warm-up) and again in week 8.
          <strong className="text-ink"> Identical conditions both times</strong> — same edge,
          same grip, same time of day, same warm-up — or the comparison is meaningless.”
        </p>
        <p className="mt-2 text-xs text-neutral-500">
          Four tests: max hang load in each grip, max pull-up load, and a 90° lock-off hold on each
          side. Stop at the first failed attempt.
        </p>
      </section>

      <section className="rounded-md bg-surface shadow-edge p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-neutral-200">Standard edge</p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {settings.standardEdgeMm === undefined
                ? 'Not set — the hangs will ask for an edge, and whatever you record becomes what the retest compares against.'
                : `${settings.standardEdgeMm}mm · prefilled on both hang tests. Change it in Settings.`}
            </p>
          </div>
          <button
            onClick={() => go({ name: 'settings' })}
            className={`${btnSecondary} shrink-0 px-3 py-1.5`}
          >
            {settings.standardEdgeMm === undefined ? 'Set' : 'Edit'}
          </button>
        </div>
      </section>

      <button
        onClick={() => void start()}
        className={`${btnPrimary} w-full py-3`}
      >
        {inProgressIsBattery ? 'Resume battery' : `Start ${nextLabel.toLowerCase()}`}
      </button>
      {inProgress && !inProgressIsBattery && (
        <p className="text-xs text-accent-300">
          A session is already open — finish or discard it first; tapping above resumes it.
        </p>
      )}

      {baseline && latest && <RetestComparison baseline={baseline} latest={latest} />}

      {occasions.length === 0 ? (
        <p className="text-xs text-neutral-500">
          No battery recorded yet. §4E asks for one in week 1, before the block starts.
        </p>
      ) : (
        <section className="space-y-2">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">Recorded</h2>
          {[...occasions].reverse().map((occasion) => (
            <OccasionCard key={occasion.logId} occasion={occasion} />
          ))}
        </section>
      )}
    </div>
  );
}

/**
 * One occasion, with the conditions it was produced under (AC8).
 *
 * Every condition here is derived from what was already stored — the time from
 * the log, the warm-up from D16's completed flag, the rest from the previous
 * session's date, the edge from the sets themselves (D29b). Nothing on this card
 * was typed twice.
 */
function OccasionCard({ occasion }: { occasion: Occasion }) {
  const c = occasion.conditions;
  return (
    <div className="rounded-md bg-surface shadow-edge p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium text-ink">{occasion.label}</p>
        <p className="text-xs text-neutral-500">
          {new Date(occasion.at).toLocaleDateString()} · {c.timeOfDay}
        </p>
      </div>

      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <Icon
            name={c.warmedUp ? 'check' : 'circle'}
            className={`text-[11px] ${c.warmedUp ? 'text-accent-300' : 'text-neutral-600'}`}
          />
          {c.warmedUp ? 'warm-up completed' : 'warm-up not marked'}
        </span>
        <span>
          {c.daysSincePrevious === null
            ? 'no session before it'
            : `${c.daysSincePrevious}d since last session`}
        </span>
        <span>
          {c.edgeMixed
            ? 'two different edges'
            : c.edgeMm === null
              ? 'no edge recorded'
              : `${c.edgeMm}mm edge`}
        </span>
        <span>{c.bodyweightLb === null ? 'no bodyweight in range' : `${c.bodyweightLb} lb`}</span>
      </p>

      <ul className="mt-2 space-y-1 text-sm">
        {occasion.rows.map((row) => (
          <li key={row.test.exerciseId} className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-neutral-400">{row.test.label}</span>
            <span className="shrink-0 tabular-nums text-neutral-200">
              {row.value === null ? (
                <span className="text-xs text-neutral-600">not recorded</span>
              ) : (
                <>
                  {formatValue(row.value, row.test.metric)}
                  {row.pctBw !== null && (
                    <span className="ml-1 text-xs text-neutral-500">({row.pctBw}%BW)</span>
                  )}
                  {(row.endReason === 'pain' || row.endReason === 'form-broke') && (
                    <span className="ml-1 text-xs text-accent-300">
                      {row.endReason === 'pain' ? 'pain' : 'form'}
                    </span>
                  )}
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
