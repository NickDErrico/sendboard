import type { Exercise } from '../types';
import { variantsFor } from '../lib/block';

// The prescription, with §4B's two week-scoped protocols in the order the derived
// block week puts them (T24, D41). Presentational: the week arrives as a prop, so
// this renders identically from the session card, the detail screen, and a test.
//
// Three things it will not do, and each is an acceptance criterion:
//   - hide a variant (D25 narrows emphasis, it never hides the plan)
//   - emphasise one when no week is known (D19 — a draft is not a claim, and a
//     guessed week would be exactly that)
//   - imply the timer follows the emphasised variant when it does not (D41)
//
// Exercises declaring no variants — eighteen of twenty — render the untouched
// `prescription` string, exactly as they did before this task.

export function PrescriptionVariants({
  exercise,
  week,
  compact = false,
}: {
  exercise: Exercise;
  week: number | null;
  /** In-session sizing: the same content, in a card the owner reads standing up. */
  compact?: boolean;
}) {
  const { live, others, timedElsewhere } = variantsFor(exercise, week);
  const body = compact ? 'text-sm' : 'text-sm leading-relaxed';

  if (live === null && others.length === 0) {
    return <p className={`break-words text-slate-200 ${body}`}>{exercise.prescription}</p>;
  }

  return (
    <div className="space-y-2">
      {live && (
        <div className="rounded-lg border border-brand-accent/50 bg-brand-accent/5 p-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
            This week · {live.label}
          </p>
          <p className={`mt-1 break-words text-slate-100 ${body}`}>{live.text}</p>
        </div>
      )}
      {others.map((variant) => (
        <div key={variant.label} className="rounded-lg border border-slate-700 p-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {variant.label}
          </p>
          <p className={`mt-1 break-words text-slate-400 ${body}`}>{variant.text}</p>
        </div>
      ))}
      {/* D41's honesty note. `holdSeconds` and `prescribedSets` describe the peak
          variant, so in weeks 1–4 the clock and the "set 3 of 4–6" label belong to
          the *other* protocol on this card. T23 fenced a cadence runner for the
          rep-structured variant off as needing its own decision, so the app says
          which variant the timing follows rather than switching it silently. */}
      {timedElsewhere && (
        <p className="text-xs leading-snug text-slate-500">
          The timer and set count follow {timedElsewhere.label} (§4B) — the reps in this week’s
          variant are yours to count.
        </p>
      )}
    </div>
  );
}
