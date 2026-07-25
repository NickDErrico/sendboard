import { useState } from 'react';
import type { ProgressMetric, SetEndReason, SetEntry } from '../types';
import { METRIC_CONFIG } from '../lib/progress';
import { METRIC_INPUT_ORDER } from '../lib/lastTime';
import { REASON_CONFIG } from '../lib/setReason';
import { edgeOptions, hasLoadStepper, type Gear } from '../lib/gear';
import { SetValuePicker, type PickerField } from './SetValuePicker';

const inputClass =
  'min-w-0 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-accent focus:outline-none';

// A cell that opens a picker instead of the keyboard (T18). Deliberately the same
// box as `inputClass`: the row must not change size when gear is configured, or a
// five-set max hang stops fitting a 390px screen (AC10).
const cellButtonClass =
  'min-w-0 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-center text-sm tabular-nums text-slate-100';

// Column headings for the measured layout. One header row for the whole list
// beats repeating a label under every set — a max hang is five near-identical
// rows and the labels would be five times the noise.
const HEADINGS: Record<ProgressMetric, string> = {
  edgeMm: 'edge mm',
  addedLb: 'added lb',
  holdSec: 'hold s',
};

// Chip colours per reason (D27). `target` reuses the timer's in-range green and
// `pain` reads as attention, not as reproach — the app never grades a set (D23),
// but "something hurt" is the one value worth being able to spot in a scroll.
const REASON_STYLE: Record<SetEndReason, string> = {
  target: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200',
  dropped: 'border-slate-500 bg-slate-700 text-slate-200',
  'form-broke': 'border-amber-500/60 bg-amber-500/15 text-amber-200',
  pain: 'border-red-500/60 bg-red-500/15 text-red-200',
};

/** Parses a numeric input, treating blank as "not recorded" rather than as zero. */
function parseMeasurement(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

// T18: which panel is open, if any. One piece of state for the value pickers and
// the reason chips together, because "at most one thing open in this logger" is
// one rule, not two that can disagree (AC7). Never persisted (D18's reasoning).
type Panel = { index: number; field: PickerField | 'reason' };

export function SetLogger({
  sets,
  metrics,
  askEndReason = false,
  endReasons = [],
  gear = {},
  onAdd,
  onUpdate,
  onDelete,
}: {
  sets: SetEntry[];
  /** D21: when present, the numeric fields replace the free-text load/reps here. */
  metrics?: ProgressMetric[];
  /** D27: true where the plan prescribes a hold, so "why did it end" has an answer. */
  askEndReason?: boolean;
  /** Which reasons to offer — an open hold has no `target` to have hit (T16). */
  endReasons?: SetEndReason[];
  /**
   * T18/D26: the board and the plate rack. Empty means every cell stays the T12
   * text input — an unconfigured install is the app exactly as it was, never a
   * picker over a board the app invented (D31, AC5).
   */
  gear?: Gear;
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<SetEntry>) => void;
  onDelete: (index: number) => void;
}) {
  const measured = METRIC_INPUT_ORDER.filter((m) => metrics?.includes(m));
  const [panel, setPanel] = useState<Panel | null>(null);

  // A stale index left by a deleted set falls back to the default rule rather
  // than opening a panel against a row that shifted underneath it.
  const stale = panel !== null && panel.index >= sets.length;
  const open: Panel | null = stale ? null : panel;

  // At most one row's chips are open (twenty controls on a five-set card is not a
  // card). Default: the last set, while its reason is unrecorded — which is the
  // row "Log 7.4s" and "+ Add set" both just created.
  const isReasonOpen = (i: number) =>
    open === null
      ? i === sets.length - 1 && sets[i].endReason === undefined
      : open.field === 'reason' && open.index === i;

  const isPickerOpen = (i: number, field: PickerField) =>
    open !== null && open.index === i && open.field === field;

  /** What this cell can offer: the board (plus whatever is already recorded), or nothing. */
  const edgesFor = (set: SetEntry) => edgeOptions(gear, set.edgeMm);
  // A type predicate rather than a boolean, so `holdSec` — which has no picker,
  // by design — cannot reach one through a widened metric type.
  const canPick = (
    set: SetEntry,
    field: ProgressMetric,
  ): field is Extract<PickerField, ProgressMetric> =>
    field === 'edgeMm'
      ? edgesFor(set).length > 0
      : field === 'addedLb'
        ? hasLoadStepper(gear)
        : // `holdSec` is written by the timer as a measurement (T10/T13); a
          // stepper there would invite editing a recorded performance rather
          // than entering a setup.
          false;

  function pickReason(index: number, reason: SetEndReason) {
    // Tapping the active chip clears it: a mistap costs one tap, never a set.
    const next = sets[index].endReason === reason ? undefined : reason;
    onUpdate(index, { endReason: next });
    setPanel(null);
  }

  return (
    <div className="mt-2 space-y-2">
      {sets.length === 0 && <p className="text-xs text-slate-500">No sets logged yet.</p>}

      {sets.length > 0 && measured.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="w-4 shrink-0" />
          {measured.map((m) => (
            <span key={m} className="flex-1 text-center">
              {HEADINGS[m]}
            </span>
          ))}
          <span className="w-12 text-center">rpe</span>
          <span className="w-7 shrink-0" />
        </div>
      )}

      {sets.map((set, i) => (
        <div key={i}>
        <div className="flex items-center gap-1.5">
          <span className="w-4 shrink-0 text-xs text-slate-500">{i + 1}</span>

          {measured.length > 0 ? (
            measured.map((m) =>
              // T18: where the gear says what the choices are, the cell is a
              // button and the panel opens beneath — no keyboard for chalked
              // hands mid-protocol. Where it does not, this is the T12 input,
              // unchanged (AC5).
              canPick(set, m) ? (
                <button
                  key={m}
                  onClick={() => setPanel(isPickerOpen(i, m) ? null : { index: i, field: m })}
                  aria-expanded={isPickerOpen(i, m)}
                  aria-label={`Set ${i + 1} ${METRIC_CONFIG[m].label.toLowerCase()}: ${
                    set[m] ?? 'not recorded'
                  }. Choose`}
                  className={`${cellButtonClass} flex-1 ${
                    isPickerOpen(i, m) ? 'border-brand-accent' : ''
                  }`}
                >
                  {set[m] ?? <span className="text-slate-600">—</span>}
                </button>
              ) : (
                <input
                  key={m}
                  value={set[m] ?? ''}
                  onChange={(e) => onUpdate(i, { [m]: parseMeasurement(e.target.value) })}
                  inputMode="decimal"
                  aria-label={`Set ${i + 1} ${METRIC_CONFIG[m].label.toLowerCase()}`}
                  className={`${inputClass} flex-1 text-center`}
                />
              ),
            )
          ) : (
            <>
              <input
                value={set.load}
                onChange={(e) => onUpdate(i, { load: e.target.value })}
                placeholder="load"
                aria-label={`Set ${i + 1} load`}
                className={`${inputClass} flex-1`}
              />
              <input
                value={set.reps}
                onChange={(e) => onUpdate(i, { reps: e.target.value })}
                placeholder="reps / time"
                aria-label={`Set ${i + 1} reps`}
                className={`${inputClass} flex-1`}
              />
            </>
          )}

          {/* RPE is a ten-point scale, not equipment, so it needs no gear to be
              pickable (AC4) — and it is entered with the same chalked hands as
              everything else on this row. */}
          <button
            onClick={() => setPanel(isPickerOpen(i, 'rpe') ? null : { index: i, field: 'rpe' })}
            aria-expanded={isPickerOpen(i, 'rpe')}
            aria-label={`Set ${i + 1} RPE: ${set.rpe ?? 'not recorded'}. Choose`}
            className={`${cellButtonClass} w-12 ${
              isPickerOpen(i, 'rpe') ? 'border-brand-accent' : ''
            }`}
          >
            {set.rpe ?? <span className="text-slate-600">{measured.length > 0 ? '—' : 'RPE'}</span>}
          </button>
          <button
            onClick={() => {
              // Close first: an open panel would otherwise survive the delete and
              // reopen against whichever set slid into this index — a picker
              // pointed at a different set than the one it was opened on.
              setPanel(null);
              onDelete(i);
            }}
            aria-label={`Delete set ${i + 1}`}
            className="w-7 shrink-0 rounded-md px-2 py-1 text-slate-500 hover:text-red-400"
          >
            ✕
          </button>
        </div>

        {/* T18: the open picker, beneath the row it belongs to. */}
        {open !== null && open.index === i && open.field !== 'reason' && (
          <SetValuePicker
            field={open.field}
            value={open.field === 'rpe' ? (set.rpe ?? undefined) : set[open.field]}
            edges={open.field === 'edgeMm' ? edgesFor(set) : undefined}
            standardEdgeMm={gear.standardEdgeMm}
            step={gear.loadStepLb}
            onChange={(next) =>
              onUpdate(
                i,
                // `rpe` spells "not recorded" as null, the measurements spell it
                // as absent — the picker speaks one language and the row keeps
                // its own (setReason.isSafetySignal makes the same allowance).
                open.field === 'rpe' ? { rpe: next ?? null } : { [open.field]: next },
              )
            }
            onClose={() => setPanel(null)}
          />
        )}

        {/* D27: why the hold ended. Only on exercises the plan gives a hold —
            "why did your third set of ten squats end" has no answer worth a tap.
            The reason is never inferred from holdSec against the target range: a
            hang 1s short was not necessarily dropped, and guessing would
            fabricate the safety signal §7 depends on. */}
        {askEndReason &&
          (isReasonOpen(i) ? (
            <div className="mt-1 flex flex-wrap gap-1 pl-5">
              {endReasons.map((reason) => {
                const active = set.endReason === reason;
                return (
                  <button
                    key={reason}
                    onClick={() => pickReason(i, reason)}
                    aria-pressed={active}
                    aria-label={`Set ${i + 1} ended: ${REASON_CONFIG[reason].label}`}
                    className={`rounded-md border px-2 py-1 text-[11px] font-medium ${
                      active ? REASON_STYLE[reason] : 'border-slate-700 text-slate-400'
                    }`}
                  >
                    {REASON_CONFIG[reason].label}
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              onClick={() => setPanel({ index: i, field: 'reason' })}
              aria-label={
                set.endReason
                  ? `Set ${i + 1} ended: ${REASON_CONFIG[set.endReason].label}. Change`
                  : `Record why set ${i + 1} ended`
              }
              className={`mt-1 ml-5 rounded-md border px-2 py-0.5 text-[11px] ${
                set.endReason
                  ? REASON_STYLE[set.endReason]
                  : 'border-dashed border-slate-700 text-slate-500'
              }`}
            >
              {set.endReason ? REASON_CONFIG[set.endReason].label : 'Why did it end?'}
            </button>
          ))}
        </div>
      ))}

      <button
        onClick={onAdd}
        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 active:border-slate-500"
      >
        + Add set
      </button>
    </div>
  );
}
