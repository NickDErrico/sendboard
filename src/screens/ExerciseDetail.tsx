import type { Exercise, IsoType } from '../types';
import { EquipmentBadge, GtgBadge } from '../components/EquipmentBadge';

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
}: {
  exercise: Exercise;
  onBack: () => void;
}) {
  const isoLabel = ISO_LABELS[exercise.isoType];

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <button
        onClick={onBack}
        className="mb-4 -ml-1 flex items-center gap-1 rounded px-1 py-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <span aria-hidden>←</span> Back
      </button>

      <h1 className="text-xl font-bold tracking-tight text-slate-100">{exercise.name}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isoLabel && (
          <span className="inline-flex items-center rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
            {isoLabel}
          </span>
        )}
        {exercise.gtgEligible && <GtgBadge />}
        {exercise.equipment.map((eq) => (
          <EquipmentBadge key={eq} equipment={eq} />
        ))}
      </div>

      {/* Prescription — must wrap, never scroll horizontally at 390px (AC5). */}
      <section className="mt-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prescription</h2>
        <p className="mt-1 break-words text-sm leading-relaxed text-slate-200">
          {exercise.prescription}
        </p>
      </section>

      <section className="mt-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">How to</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-200 marker:text-slate-500">
          {exercise.howTo.map((step, i) => (
            <li key={i} className="break-words pl-1">
              {step}
            </li>
          ))}
        </ol>
      </section>

      {exercise.cues.length > 0 && (
        <section className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cues</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-300 marker:text-slate-600">
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
        <section className="mt-6 rounded-lg border-l-4 border-red-500 bg-red-500/10 p-3">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-300">
            <span aria-hidden>⚠</span> Safety
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-red-100">
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
