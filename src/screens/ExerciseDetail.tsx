import type { Exercise, IsoType } from '../types';
import { EquipmentBadge, GtgBadge } from '../components/EquipmentBadge';
import { ExerciseProgress } from '../components/ExerciseProgress';
import { PlanRefLinks } from '../components/PlanRefLinks';
import { PrescriptionVariants } from '../components/PrescriptionVariants';
import { useBlockWeek } from '../lib/useBlockWeek';
import { Icon } from '../components/ui';

// Only overcoming/yielding are required to be labelled (AC6); dynamic is shown
// too as useful context, 'none' is omitted.
const ISO_LABELS: Partial<Record<IsoType, string>> = {
  overcoming: 'Overcoming isometric',
  yielding: 'Yielding isometric',
  dynamic: 'Dynamic',
};

export function ExerciseDetail({
  exercise,
  onBack,
  onOpenPlan,
}: {
  exercise: Exercise;
  onBack: () => void;
  /**
   * T25: how this screen opens a cited plan section. Supplied mid-session, where
   * routing away would unmount the running timer (D18); absent elsewhere, and the
   * link then navigates to the Plan tab.
   */
  onOpenPlan?: (ref: string) => void;
}) {
  const isoLabel = ISO_LABELS[exercise.isoType];
  // T24: which of §4B's two protocols this week is, where the exercise declares
  // both. Null — nothing logged, or still loading — renders both unemphasised.
  const blockWeek = useBlockWeek();

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-[54px]">
      <button
        onClick={onBack}
        className="mb-4 -ml-1 flex items-center gap-1 rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10"
      >
        <Icon name="caret-left" className="text-[13px]" />Back
      </button>

      <h1 className="text-[15px] font-medium tracking-[-0.01em]">{exercise.name}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isoLabel && (
          <span className="inline-flex items-center rounded-md border border-accent/40 bg-accent/[.08] px-2 py-0.5 text-xs font-medium text-accent-300">
            {isoLabel}
          </span>
        )}
        {exercise.gtgEligible && <GtgBadge />}
        {exercise.equipment.map((eq) => (
          <EquipmentBadge key={eq} equipment={eq} />
        ))}
      </div>

      {/* T25: the entry's own citations, now that the plan is in the app (D42).
          Renders nothing where an entry cites nothing. */}
      <PlanRefLinks refs={exercise.planRefs} onOpen={onOpenPlan} className="mt-3" />

      {/* T12: renders nothing unless the exercise declares metrics (D20) — only
          the three the training plan actually progresses. */}
      <ExerciseProgress exerciseId={exercise.id} metrics={exercise.metrics} />

      {/* Prescription — must wrap, never scroll horizontally at 390px (AC5).
          T24: where §4B carries two week-scoped protocols, this week's leads and
          the other stays fully readable here — the detail screen is precisely
          where D25 requires the whole plan to remain legible. */}
      <section className="mt-5">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">Prescription</h2>
        <div className="mt-1">
          <PrescriptionVariants exercise={exercise} week={blockWeek} />
        </div>
      </section>

      {/* T29: the grip, where the plan names one. Until now it lived only in the
          entry's title, which meant "Max Hang — Half-Crimp" carried a training
          variable in a string nothing could read. Renders nothing for the
          exercises the plan gives no grip for, which is most of them. */}
      {(exercise.grip || exercise.gripSequence) && (
        <section className="mt-5">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">
            {exercise.gripSequence ? 'Grip sequence' : 'Grip'}
          </h2>
          {exercise.grip && <p className="mt-1 text-sm text-neutral-200">{exercise.grip}</p>}
          {exercise.gripSequence && (
            <ol className="mt-2 space-y-1.5">
              {exercise.gripSequence.map((block, i) => (
                <li
                  key={`${block.grip}-${i}`}
                  className="flex items-baseline justify-between gap-3 text-sm text-neutral-200"
                >
                  {/* No ordinal: the first grip is called "4-finger open", and a
                      "1" beside it reads as part of the name. Declaration order
                      is the running order (§10A) and the list shows it. */}
                  <span className="min-w-0">
                    {block.grip}
                    {block.digits && (
                      <span className="text-[13px] text-neutral-500"> · {block.digits}</span>
                    )}
                  </span>
                  {/* "hangs", not "sets": a warm-up round logs nothing, and
                      calling it a set would imply a SetEntry that never exists. */}
                  <span className="shrink-0 tabular-nums text-neutral-500">
                    ×{block.rounds}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <section className="mt-5">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">How to</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-neutral-200 marker:text-neutral-500">
          {exercise.howTo.map((step, i) => (
            <li key={i} className="break-words pl-1">
              {step}
            </li>
          ))}
        </ol>
      </section>

      {exercise.cues.length > 0 && (
        <section className="mt-5">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">Cues</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-300 marker:text-neutral-600">
            {exercise.cues.map((cue, i) => (
              <li key={i} className="break-words pl-1">
                {cue}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* AC4 / edge case: rendered as a distinct warning block only when non-empty. */}
      {exercise.safetyNotes.length > 0 && (
        <section className="mt-6 rounded-lg border-l-4 border-warn bg-warn/10 p-3">
          <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-warn">
            <span aria-hidden>⚠</span> Safety
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-warn">
            {exercise.safetyNotes.map((note, i) => (
              <li key={i} className="break-words">
                {note}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
