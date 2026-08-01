import { useCallback, useEffect, useState } from 'react';
import type { Check, Exercise, Tier, WorkoutLog } from '../types';
import { dateKey, deleteCheck, getAllChecks, getAllExercises, getAllLogs, saveCheck } from '../lib/storage';
import {
  JOINT_TARGET_LABELS,
  dailyIsometricsToday,
  describeSlot,
  poolToday,
  type SlotStatus,
} from '../lib/pool';
import { activeSymptoms, describeDropPosition, dropPositions } from '../lib/symptoms';
import { go, type SlotTier } from '../lib/routes';
import { Icon, card, kicker, tagNeutral } from '../components/ui';

/**
 * One tier's own screen (T37, D47).
 *
 * This is two thirds of what `#/joints` used to be. That screen rendered the
 * daily isometric slots and the pool queue together with the stop signals, which
 * is precisely the arrangement D47 undoes: two tiers on different cadences, with
 * different rules for what comes next, do not share a surface, and a signal that
 * changes every tier is not filed under one of them (`Signals.tsx`).
 *
 * **One component, parameterised — not two layouts behind a branch.** Both tiers
 * are a list of `SlotStatus`, and the ways they differ are already differences in
 * the data: `dailyIsometricsToday` returns its six slots in slot order whatever
 * their state, because that is what daily means, and `poolToday` returns a
 * ranking, because the pool is a queue. A component that reads `SlotStatus[]`
 * needs to know nothing else, and the copy that explains each tier is the only
 * thing keyed by which one it is.
 *
 * The engines are untouched. Ticking writes the same check `#/joints` wrote —
 * same kind, same `exerciseId`, same day key — so every record already in the
 * database reads identically and nothing migrates.
 *
 * D23 throughout, and one thing tightened on the way: `#/joints` headed these
 * lists with "3 of 6 today" and "2 ready", which are fractions against a
 * prescribed count. The slots are named instead.
 */

interface TierCopy {
  title: string;
  /** Why this tier is loaded the way it is — transcribed, never composed. */
  note: string;
  source: string;
}

const COPY: Record<SlotTier, TierCopy> = {
  'daily-isometric': {
    title: 'Daily isometrics',
    note: 'Around 70% effort, held 30–45s. Firm, never maximal — that is what makes a daily dose safe. Fingers are not here: the abrahangs and your two weekly finger sessions already cover them.',
    source: 'research §6',
  },
  pool: {
    title: 'Rotating pool',
    note: 'Ordered by what has gone longest without work, against each joint’s own interval. Take the top two or three — this is a queue, not a checklist.',
    source: 'research §6',
  },
};

export function TierDetail({ tier }: { tier: SlotTier }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [checks, setChecks] = useState<Check[] | null>(null);

  // Recomputed from `new Date()` on every focus, so the app left open across
  // midnight rolls over rather than offering yesterday's slots — the rule every
  // daily surface has followed since T5b.
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
  const slots =
    tier === 'daily-isometric'
      ? dailyIsometricsToday(exercises, logs, checks ?? [], today)
      : poolToday(exercises, logs, checks ?? [], today);
  // A signal changes what the plan says to do here even though it is recorded
  // elsewhere — §8's and §10D's drop orders name movements, and the movements
  // are on this screen.
  const drops = dropPositions(activeSymptoms(checks ?? []));
  const copy = COPY[tier];

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

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3.5 px-4 pb-24 pt-[54px]">
      <header className="flex items-baseline gap-2">
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">{copy.title}</h1>
        <span className="text-[11px] text-neutral-600">
          {today.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <button
          onClick={() => go({ name: 'today' })}
          className="ml-auto rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10"
        >
          Done
        </button>
      </header>

      {checks === null ? (
        <p className="text-[13px] text-neutral-400">Loading…</p>
      ) : (
        <section className={`${card} flex flex-col gap-2.5 shadow-edge`}>
          <div className="flex items-baseline gap-2">
            <h2 className={kicker}>{tier === 'daily-isometric' ? 'Slots' : 'Queue'}</h2>
            <span className="ml-auto text-[11px] text-neutral-600">{copy.source}</span>
          </div>

          <p className="px-0.5 text-[11px] leading-snug text-neutral-500">{copy.note}</p>

          <ul className="flex flex-col gap-1.5">
            {slots.map((slot) => (
              <li key={slot.target}>
                <SlotRow slot={slot} tier={tier as Tier} drops={drops} onToggle={toggle} />
              </li>
            ))}
          </ul>
        </section>
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
