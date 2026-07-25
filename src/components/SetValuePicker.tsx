import { RPE_OPTIONS, stepLoad } from '../lib/gear';

/**
 * The one-tap entry panel for a set value (T18).
 *
 * Opens beneath the row it belongs to, which is the shape T14's end-reason chips
 * already established in this component — same place, same "at most one open"
 * rule, so the row itself never changes size and a five-set max hang stays
 * readable at 390px (T3 AC5).
 *
 * Every variant ends with a typed field. That is D31 in the interaction: the
 * chips decide what is one tap, never what is possible — a borrowed board, a
 * 17.5mm rung, an RPE of 4, all stay recordable. Nothing here proposes a value
 * (D32): no chip is marked recommended, and the stepper moves only on a tap.
 */

export type PickerField = 'edgeMm' | 'addedLb' | 'rpe';

const chipClass =
  'rounded-md border px-2.5 py-1 text-[13px] font-medium tabular-nums';
const activeChip = 'border-brand-accent bg-brand-accent/15 text-brand-accent';
const idleChip = 'border-slate-700 text-slate-300';
const typedInputClass =
  'w-16 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-center text-[13px] text-slate-100 placeholder:text-slate-600 focus:border-brand-accent focus:outline-none';

export function SetValuePicker({
  field,
  value,
  edges = [],
  standardEdgeMm,
  step,
  onChange,
  onClose,
}: {
  field: PickerField;
  /** The value in the cell right now; `undefined` is "not recorded". */
  value: number | undefined;
  /** Edge options in board order (largest first) — `edgeMm` only. */
  edges?: number[];
  /** Marked in the picker so §4E's one standard edge is recognisable (D30). */
  standardEdgeMm?: number;
  /** The load increment — `addedLb` only. */
  step?: number;
  onChange: (next: number | undefined) => void;
  /** Called when a pick settles the value; the stepper deliberately does not. */
  onClose: () => void;
}) {
  function pick(next: number) {
    // Tapping the active chip clears it, exactly as the reason chips do — a
    // mistap costs one tap, never a deleted set.
    onChange(value === next ? undefined : next);
    onClose();
  }

  function typed(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      onChange(undefined);
      return;
    }
    const n = Number(trimmed);
    if (Number.isFinite(n)) onChange(Math.round(n * 10) / 10);
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 pl-5">
      {field === 'edgeMm' &&
        edges.map((mm) => {
          const isStandard = mm === standardEdgeMm;
          return (
            <button
              key={mm}
              onClick={() => pick(mm)}
              aria-pressed={value === mm}
              aria-label={`${mm} millimetre edge${isStandard ? ', standard edge' : ''}`}
              className={`${chipClass} ${value === mm ? activeChip : idleChip}`}
            >
              {mm}
              {isStandard && (
                <span aria-hidden className="ml-0.5 text-[10px] text-brand-accent">
                  ★
                </span>
              )}
            </button>
          );
        })}

      {field === 'addedLb' && typeof step === 'number' && (
        <>
          <button
            onClick={() => onChange(stepLoad(value, step, -1))}
            aria-label={`Subtract ${step} pounds`}
            className={`${chipClass} ${idleChip} px-3`}
          >
            −{step}
          </button>
          <button
            onClick={() => onChange(stepLoad(value, step, 1))}
            aria-label={`Add ${step} pounds`}
            className={`${chipClass} ${idleChip} px-3`}
          >
            +{step}
          </button>
          <span className="px-1 text-[11px] text-slate-500">
            {value === undefined ? 'not recorded' : value === 0 ? 'BW' : `+${value}lb`}
          </span>
        </>
      )}

      {field === 'rpe' && (
        <>
          {RPE_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => pick(n)}
              aria-pressed={value === n}
              aria-label={`RPE ${n}`}
              className={`${chipClass} ${value === n ? activeChip : idleChip}`}
            >
              {n}
            </button>
          ))}
        </>
      )}

      {/* D31: the way out of the list, on every variant. */}
      <input
        key={String(value)}
        defaultValue={value === undefined ? '' : String(value)}
        onBlur={(e) => typed(e.target.value)}
        inputMode="decimal"
        placeholder="type"
        aria-label={`Type ${LABELS[field]}`}
        className={typedInputClass}
      />
      <button
        onClick={onClose}
        aria-label="Close picker"
        className="rounded-md px-2 py-1 text-[13px] text-slate-500"
      >
        Done
      </button>
    </div>
  );
}

const LABELS: Record<PickerField, string> = {
  edgeMm: 'edge in millimetres',
  addedLb: 'added load in pounds',
  rpe: 'RPE',
};
