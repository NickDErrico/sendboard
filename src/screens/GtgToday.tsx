import { useCallback, useEffect, useState } from 'react';
import type { Check, CheckKind, Exercise } from '../types';
import {
  dateKey,
  deleteCheck,
  getAllChecks,
  getAllExercises,
  getChecksForDay,
  saveCheck,
} from '../lib/storage';
import { last7DayGtgCounts } from '../lib/checks';
import { doneMovementIds, gtgKindOf, gtgSections, unnamedKinds, type GtgSection } from '../lib/gtg';
import { SourceRefLinks } from '../components/SourceRefLinks';
import { Icon, card, kicker, tagNeutral } from '../components/ui';

// T33: §8's committed list, as the thing it is — a routine with a movement, a
// dose and a trigger on every line — rather than the two flags T5b left behind.
//
// D11a is the whole shape of this screen. It is *prescription* that was missing,
// not logging: the dose is rendered so the owner does not have to remember what
// "General" meant, and the tap is still one daily yes/no per movement. There is
// no set entry here, no rep counter, no load, and no count of how many times a
// movement was done today — GtG's sets are scattered and deliberately
// unmemorable, and logging each one would cost more attention than the exercise
// (D11, whose rationale D11a keeps).
//
// Nothing on this screen compares what was done to what is listed (D23). §8's
// doses are triggers — "whenever you pass a clear floor" — not a daily quota,
// and §8's own last paragraph calls the pulling half optional.

const SECTION_COPY: Record<CheckKind, { title: string; note: string; refs: string[] } | undefined> = {
  'gtg-general': {
    title: 'General',
    note: 'Free — these load tissue the rest of the week barely touches.',
    refs: ['8'],
  },
  'gtg-pull': {
    title: 'Pull',
    note:
      'Watch — pull-ups load the same elbows, shoulders and finger flexors as your climbing days, Day 3 and every hangboard session. Prefer the scapular work; full pull-ups are first out at any elbow soreness.',
    refs: ['8'],
  },
  'climbing-volume': undefined,
  'climbing-limit': undefined,
  // The joint rotation has its own screen and its own ordering rules; §8's list
  // is not where it lives. Undefined so this screen renders nothing for it,
  // rather than a third section that would duplicate `#/joints`.
  joint: undefined,
  // A stop signal is a reading, not a movement — §8's list holds none. It is
  // recorded and answered on `#/joints`.
  symptom: undefined,
};

export function GtgToday({ onExit }: { onExit?: () => void }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [today, setToday] = useState<Check[] | null>(null);
  const [all, setAll] = useState<Check[]>([]);

  // Recomputed from `new Date()` on every read, so the app left open across
  // midnight rolls over to a fresh day rather than offering yesterday's ticks —
  // the same rule the home card has followed since T5b.
  const refresh = useCallback(async () => {
    const [exs, dayChecks, allChecks] = await Promise.all([
      getAllExercises(),
      getChecksForDay(new Date()),
      getAllChecks(),
    ]);
    setExercises(exs);
    setToday(dayChecks);
    setAll(allChecks);
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

  const sections = gtgSections(exercises);
  const done = doneMovementIds(today ?? []);
  const unnamed = unnamedKinds(today ?? []);
  const counts = last7DayGtgCounts(all, new Date());

  // Un-ticking is deliberately silent, unlike the home card's confirm: a check
  // here names one movement on one day, so a mis-tap costs one tap to undo and a
  // dialog would cost more attention than the record is worth. The whole-kind
  // check below keeps its confirm — that one is not this screen's to lose.
  async function toggle(exercise: Exercise) {
    const existing = (today ?? []).filter((c) => c.exerciseId === exercise.id);
    if (existing.length > 0) {
      await Promise.all(existing.map((c) => deleteCheck(c.id)));
    } else {
      await saveCheck({
        id: crypto.randomUUID(),
        kind: gtgKindOf(exercise),
        date: dateKey(new Date()),
        notes: '',
        exerciseId: exercise.id,
      });
    }
    await refresh();
  }

  async function removeUnnamed(kind: CheckKind) {
    const existing = (today ?? []).filter((c) => c.kind === kind && c.exerciseId === undefined);
    if (existing.length === 0) return;
    if (!window.confirm('Remove today’s whole-kind check?')) return;
    await Promise.all(existing.map((c) => deleteCheck(c.id)));
    await refresh();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3.5 px-4 pb-24 pt-[54px]">
      <header className="flex items-baseline gap-2">
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">Today’s GtG</h1>
        <span className="text-[11px] text-neutral-600">
          {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
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

      {/* §8's own rule for the whole list, quoted rather than paraphrased — it is
          the sentence that makes every dose below a ceiling rather than a target. */}
      <p className="px-0.5 text-[11px] leading-snug text-neutral-500">
        Never to failure. If you’re breathing hard or feeling a pump, the set was too long (plan §8).
      </p>

      {today === null ? (
        <p className="text-[13px] text-neutral-400">Loading…</p>
      ) : (
        sections.map((section) => (
          <Section
            key={section.kind}
            section={section}
            done={done}
            unnamed={unnamed.has(section.kind)}
            days={section.kind === 'gtg-pull' ? counts.pull : counts.general}
            onToggle={toggle}
            onRemoveUnnamed={() => void removeUnnamed(section.kind)}
          />
        ))
      )}
    </div>
  );
}

function Section({
  section,
  done,
  unnamed,
  days,
  onToggle,
  onRemoveUnnamed,
}: {
  section: GtgSection;
  done: Set<string>;
  unnamed: boolean;
  days: number;
  onToggle: (exercise: Exercise) => Promise<void>;
  onRemoveUnnamed: () => void;
}) {
  const copy = SECTION_COPY[section.kind];
  if (copy === undefined || section.movements.length === 0) return null;

  return (
    <section className={`${card} flex flex-col gap-2.5 shadow-edge`}>
      <div className="flex items-baseline gap-2">
        <h2 className={kicker}>{copy.title}</h2>
        {/* A window count, which is what T5b already reported — not a streak and
            not a rate (D23). */}
        <span className="ml-auto text-[11px] tabular-nums text-neutral-500">
          {days} of last 7 days
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {section.movements.map((exercise) => (
          <li key={exercise.id}>
            <MovementRow
              exercise={exercise}
              done={done.has(exercise.id)}
              onToggle={() => void onToggle(exercise)}
            />
          </li>
        ))}
      </ul>

      {unnamed && (
        <button
          onClick={onRemoveUnnamed}
          className="flex items-start gap-1.5 rounded-md px-1 py-0.5 text-left text-[11px] leading-snug text-neutral-500 hover:bg-white/5"
        >
          <Icon name="check" className="mt-[3px] shrink-0 text-[11px] text-accent-400" />
          <span>Also today: a check for this kind with no movement named — tap to remove</span>
        </button>
      )}

      <p className="text-[11px] leading-snug text-neutral-600">{copy.note}</p>
      <SourceRefLinks refs={copy.refs} />
    </section>
  );
}

/** One movement: what to do, how much, and when the plan says it happens. */
function MovementRow({
  exercise,
  done,
  onToggle,
}: {
  exercise: Exercise;
  done: boolean;
  onToggle: () => void;
}) {
  const gtg = exercise.gtg;
  if (gtg === undefined) return null;

  return (
    <button
      onClick={onToggle}
      aria-pressed={done}
      className={`flex w-full items-start gap-2.5 rounded-[10px] border px-2.5 py-[11px] text-left transition-colors ${
        done
          ? 'border-accent bg-accent/[.12]'
          : 'border-neutral-800 hover:border-white/[.34]'
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
            {exercise.name}
          </span>
          {/* The dose is the reason this screen exists, so it is a tag rather
              than a third line of grey: §8's numbers, transcribed (D6). It wraps
              rather than holding its width — §8's longer doses are wider than a
              390px row, and a chip that cannot shrink takes the screen with it. */}
          <span className={`${tagNeutral} max-w-full leading-snug`}>{gtg.dose}</span>
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-neutral-500">{gtg.trigger}</span>
      </span>
    </button>
  );
}
