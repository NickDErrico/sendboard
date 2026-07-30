import { useCallback, useEffect, useState } from 'react';
import type { Check, Exercise, SymptomKind, Tier, WorkoutLog } from '../types';
import {
  dateKey,
  deleteCheck,
  getAllChecks,
  getAllExercises,
  getAllLogs,
  saveCheck,
} from '../lib/storage';
import {
  JOINT_TARGET_LABELS,
  dailyIsometricsToday,
  describeSlot,
  poolToday,
  type SlotStatus,
} from '../lib/pool';
import {
  SYMPTOM_KINDS,
  SYMPTOM_SIGNALS,
  activeSymptoms,
  describeDropPosition,
  dropPositions,
} from '../lib/symptoms';
import { Icon, card, kicker, tagNeutral } from '../components/ui';

// The joint/tendon rotation (docs/joint-rotation-research.md), as the two things
// it is: six daily isometric slots, and a queue of everything else ordered by
// what has gone longest without work.
//
// The screen renders `pool.ts` and decides nothing. Which movement is up, whether
// a target is due, and how long it has been are all answered there, so the home
// card and this screen cannot disagree — the same reason `gtg.ts` exists.
//
// D23 throughout: no streak, no compliance figure, no "overdue" label. An
// interval is a schedule the owner set, not a debt, and §4F's lighter-week
// caveat makes a skipped week correct as often as not. The queue's *order*
// carries the urgency; the words stay factual.

export function Joints({ onExit }: { onExit?: () => void }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [checks, setChecks] = useState<Check[] | null>(null);

  // Re-read on focus and recompute from `new Date()` every render, so the app
  // left open across midnight rolls over rather than offering yesterday's slots —
  // the rule every daily surface here has followed since T5b.
  const refresh = useCallback(async () => {
    const [exs, allLogs, allChecks] = await Promise.all([
      getAllExercises(),
      getAllLogs(),
      getAllChecks(),
    ]);
    setExercises(exs);
    setLogs(allLogs);
    setChecks(allChecks);
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refresh]);

  const today = new Date();
  const daily = dailyIsometricsToday(exercises, logs, checks ?? [], today);
  const pool = poolToday(exercises, logs, checks ?? [], today);
  const symptoms = activeSymptoms(checks ?? []);
  // The whole point of recording a signal: §8's and §10D's drop orders name
  // movements, and those movements are on this screen.
  const drops = dropPositions(symptoms);

  // Un-ticking is silent, as on the GtG screen and for the same reason: a check
  // names one movement on one day, so a mis-tap costs one tap to undo and a
  // dialog would cost more attention than the record is worth.
  async function toggle(exercise: Exercise) {
    const key = dateKey(today);
    const existing = (checks ?? []).filter(
      (c) => c.kind === 'joint' && c.exerciseId === exercise.id && c.date === key,
    );
    if (existing.length > 0) {
      await Promise.all(existing.map((c) => deleteCheck(c.id)));
    } else {
      await saveCheck({
        id: crypto.randomUUID(),
        kind: 'joint',
        date: key,
        notes: '',
        exerciseId: exercise.id,
      });
    }
    await refresh();
  }

  async function recordSymptom(kind: SymptomKind) {
    await saveCheck({
      id: crypto.randomUUID(),
      kind: 'symptom',
      date: dateKey(today),
      notes: '',
      symptom: kind,
    });
    await refresh();
  }

  // Clearing confirms, unlike un-ticking a movement. A symptom is not a daily
  // yes/no that costs one tap to redo — it is the record that changed what the
  // plan says to do, and losing it by a mis-tap loses the reason a movement was
  // dropped.
  async function clearSymptom(kind: SymptomKind, checkIds: string[]) {
    if (!window.confirm(`Clear “${SYMPTOM_SIGNALS[kind].label}”?`)) return;
    await Promise.all(checkIds.map((id) => deleteCheck(id)));
    await refresh();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3.5 px-4 pb-24 pt-[54px]">
      <header className="flex items-baseline gap-2">
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">Joints &amp; tendons</h1>
        <span className="text-[11px] text-neutral-600">
          {today.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        {onExit && (
          <button
            onClick={onExit}
            className="ml-auto rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10"
          >
            Done
          </button>
        )}
      </header>

      {checks === null ? (
        <p className="text-[13px] text-neutral-400">Loading…</p>
      ) : (
        <>
          <section className={`${card} flex flex-col gap-2.5 shadow-edge`}>
            <div className="flex items-baseline gap-2">
              <h2 className={kicker}>Daily</h2>
              <span className="ml-auto text-[11px] tabular-nums text-neutral-500">
                {daily.filter((s) => s.doneToday !== null).length} of {daily.length} today
              </span>
            </div>

            {/* Why it is 70% and not max, in one line — the number is the whole
                reason this can be daily at all, and a slot that reads "hold" with
                no intensity invites the max-effort version. */}
            <p className="px-0.5 text-[11px] leading-snug text-neutral-500">
              Around 70% effort, held 30–45s. Firm, never maximal — that is what makes a daily dose
              safe. Fingers are not here: the abrahangs and your two weekly finger sessions already
              cover them.
            </p>

            <ul className="flex flex-col gap-1.5">
              {daily.map((slot) => (
                <li key={slot.target}>
                  <SlotRow slot={slot} tier="daily-isometric" drops={drops} onToggle={toggle} />
                </li>
              ))}
            </ul>
          </section>

          <section className={`${card} flex flex-col gap-2.5 shadow-edge`}>
            <div className="flex items-baseline gap-2">
              <h2 className={kicker}>Queue</h2>
              <span className="ml-auto text-[11px] tabular-nums text-neutral-500">
                {pool.filter((s) => s.due).length} ready
              </span>
            </div>
            <p className="px-0.5 text-[11px] leading-snug text-neutral-500">
              Ordered by what has gone longest without work, against each joint’s own interval. Take
              the top two or three — this is a queue, not a checklist.
            </p>

            <ul className="flex flex-col gap-1.5">
              {pool.map((slot) => (
                <li key={slot.target}>
                  <SlotRow slot={slot} tier="pool" drops={drops} onToggle={toggle} />
                </li>
              ))}
            </ul>
          </section>

          <section className={`${card} flex flex-col gap-2.5 shadow-edge`}>
            <div className="flex items-baseline gap-2">
              <h2 className={kicker}>Stop signals</h2>
              <span className="ml-auto text-[11px] text-neutral-600">§7 · §8 · §10D</span>
            </div>

            {symptoms.length === 0 ? (
              <p className="px-0.5 text-[11px] leading-snug text-neutral-500">
                Nothing flagged. Record one when you notice it — the plan attaches a drop order to
                each, and it can’t apply one it doesn’t know about.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {symptoms.map((symptom) => (
                  <li
                    key={symptom.kind}
                    className="rounded-[10px] border border-amber-500/40 bg-amber-500/[.08] px-2.5 py-[11px]"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-medium text-amber-200">
                        {symptom.signal.label}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        since{' '}
                        {new Date(`${symptom.since}T00:00`).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <button
                        onClick={() => void clearSymptom(symptom.kind, symptom.checkIds)}
                        className="ml-auto rounded-md px-1 py-0.5 text-[11px] font-medium text-accent hover:bg-accent/10"
                      >
                        Clear
                      </button>
                    </div>
                    {/* The plan's own instruction, quoted rather than summarised —
                        it is the reason the record exists. */}
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {symptom.signal.response.map((line) => (
                        <li key={line} className="flex items-start gap-1.5">
                          <Icon
                            name="caret-right"
                            className="mt-[3px] shrink-0 text-[10px] text-amber-400/70"
                          />
                          <span className="text-[11px] leading-snug text-neutral-300">{line}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-[10px] text-neutral-600">plan {symptom.signal.source}</p>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-1.5">
              {SYMPTOM_KINDS.filter((k) => !symptoms.some((s) => s.kind === k)).map((kind) => (
                <button
                  key={kind}
                  onClick={() => void recordSymptom(kind)}
                  title={SYMPTOM_SIGNALS[kind].reading}
                  className="rounded-[8px] border border-neutral-800 px-2 py-1 text-[11px] text-neutral-400 transition-colors hover:border-amber-500/50 hover:text-amber-200"
                >
                  + {SYMPTOM_SIGNALS[kind].label}
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/**
 * One slot: which joint, what is up for it, the dose, and when it last happened.
 *
 * Shows `doneToday` in preference to `exercise` so a tick does not swap the row
 * for the next movement in the group under the owner's finger.
 */
function SlotRow({
  slot,
  tier,
  drops,
  onToggle,
}: {
  slot: SlotStatus;
  tier: Tier;
  /** Exercise id → drop position, from whichever stop signals are up. */
  drops: Map<string, number>;
  onToggle: (exercise: Exercise) => Promise<void>;
}) {
  const exercise = slot.doneToday ?? slot.exercise;
  const done = slot.doneToday !== null;

  // A slot the catalog cannot fill is rendered as a gap rather than hidden —
  // an uncovered tendon disappearing from the surface that claims to cover it is
  // the exact failure the coverage test in pool.test.ts exists to catch.
  if (exercise === null) {
    return (
      <div className="flex items-baseline gap-2 rounded-[10px] border border-dashed border-neutral-800 px-2.5 py-[11px]">
        <span className="text-[13px] font-medium text-neutral-500">
          {JOINT_TARGET_LABELS[slot.target]}
        </span>
        <span className="text-[11px] text-neutral-600">No movement in the catalog yet</span>
      </div>
    );
  }

  const dose = exercise.tiers?.find((t) => t.tier === tier);
  // A movement §8's or §10D's drop order names while a signal is up. Marked, not
  // removed: the plan says drop it, and saying so is the app's job — deciding is
  // not (D23).
  const dropPosition = drops.get(exercise.id);

  return (
    <button
      onClick={() => void onToggle(exercise)}
      aria-pressed={done}
      className={`flex w-full items-start gap-2.5 rounded-[10px] border px-2.5 py-[11px] text-left transition-colors ${
        done
          ? 'border-accent bg-accent/[.12]'
          : slot.due
            ? 'border-neutral-800 hover:border-white/[.34]'
            : 'border-neutral-900 opacity-60 hover:border-white/[.2]'
      }`}
    >
      <Icon
        name={done ? 'check-circle' : 'circle'}
        weight={done ? 'fill' : 'regular'}
        className={`mt-px shrink-0 text-[18px] ${done ? 'text-accent-400' : 'text-neutral-600'}`}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className={`text-[13px] font-medium ${done ? 'text-accent-200' : 'text-neutral-300'}`}>
            {JOINT_TARGET_LABELS[slot.target]}
          </span>
          <span className="text-[11px] text-neutral-500">{exercise.name}</span>
          {dropPosition !== undefined && (
            <span className="shrink-0 rounded-[5px] border border-amber-500/40 bg-amber-500/[.12] px-1.5 py-px text-[10px] font-medium text-amber-200">
              {describeDropPosition(dropPosition)}
            </span>
          )}
          {dose && <span className={`${tagNeutral} shrink-0`}>{dose.text}</span>}
        </span>
        {/* Muscle length is part of the prescription, not a form cue (Oranchuk
            2019), so it sits on the row rather than behind a tap. */}
        {dose?.position && (
          <span className="mt-0.5 block text-[11px] leading-snug text-neutral-500">
            {dose.position}
          </span>
        )}
        <span className="mt-0.5 block text-[11px] leading-snug text-neutral-600">
          {describeSlot(slot)}
          {slot.daysSince !== null && ` · every ${slot.intervalDays}d`}
        </span>
      </span>
    </button>
  );
}
