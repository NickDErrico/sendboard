import { useState } from 'react';
import type { ProgressMetric, SetEndReason, SetEntry } from '../types';
import { METRIC_CONFIG } from '../lib/progress';
import { METRIC_INPUT_ORDER } from '../lib/lastTime';
import { REASON_CONFIG } from '../lib/setReason';
import { edgeOptions, hasLoadStepper, type Gear } from '../lib/gear';
import { SetValuePicker, type PickerField } from './SetValuePicker';
import { Icon, btnSecondary } from './ui';

// A cell inside a set row. Nocturne turned the free rows of boxed inputs into a
// table: the row is the box, and a cell only draws an edge when you are pointing
// at it or typing in it. Five near-identical max-hang rows of bordered inputs
// were five times the ink the numbers needed.
const cellClass =
  'min-w-0 rounded-sm border border-transparent bg-transparent px-1 py-0 text-[12.5px] tabular-nums ' +
  'text-ink placeholder:text-neutral-600 hover:border-neutral-700 focus:border-accent focus:outline-none';

// Column headings for the measured layout. One header row for the whole list
// beats repeating a label under every set — a max hang is five near-identical
// rows and the labels would be five times the noise.
const HEADINGS: Record<ProgressMetric, string> = {
  edgeMm: 'edge',
  addedLb: 'added',
  holdSec: 'hold',
};

// The end-reason as a glyph beside the hold it explains (D27). It was a chip row
// under every set; at four sets that is four chips saying "Hit target" under four
// numbers that already say 8.0s. The glyph carries its reason as a title, and
// tapping it reopens the four chips — nothing about what is recordable changed.
//
// Only `pain` gets the one non-accent hue in the system. `form-broke` is the
// other safety signal, so it takes the same hue at the lighter weight; the two
// ordinary outcomes stay tonal.
const REASON_ICON: Record<SetEndReason, { name: string; weight: 'regular' | 'fill'; className: string }> = {
  target: { name: 'check', weight: 'regular', className: 'text-accent-400' },
  dropped: { name: 'arrow-down', weight: 'regular', className: 'text-neutral-600' },
  'form-broke': { name: 'warning-circle', weight: 'regular', className: 'text-warn' },
  pain: { name: 'warning-circle', weight: 'fill', className: 'text-warn' },
};

const REASON_CHIP_STYLE: Record<SetEndReason, string> = {
  target: 'border-accent bg-accent/[.12] text-accent-200',
  dropped: 'border-neutral-700 bg-white/5 text-neutral-200',
  'form-broke': 'border-warn/60 bg-warn/[.12] text-warn',
  pain: 'border-warn bg-warn/[.18] text-warn',
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
  nextSetLabel = null,
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
  /**
   * T19: "set 3 of 5" for the row this control would create, or null where the
   * plan declares no set count. It is the only place the position shows on the
   * rep-based exercises, which have no timer to carry it.
   */
  nextSetLabel?: string | null;
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

  // `#` · one column per measured value (or load + reps) · reason · rpe · delete.
  const valueColumns = measured.length > 0 ? measured.length : 2;
  const gridStyle = {
    gridTemplateColumns: `18px repeat(${valueColumns}, minmax(0,1fr)) ${askEndReason ? '18px ' : ''}38px 22px`,
  };
  const rowClass = 'grid items-baseline gap-2 bg-[#1c1e2a] px-2.5 py-[7px]';

  return (
    <div className="flex flex-col gap-2">
      {sets.length === 0 && <p className="text-[11px] text-neutral-600">No sets logged yet.</p>}

      {sets.length > 0 && (
        <div className="flex flex-col gap-px overflow-hidden rounded-md bg-neutral-900">
          <div
            className={`${rowClass} text-[9px] uppercase tracking-[0.09em] text-neutral-600`}
            style={gridStyle}
          >
            <span>#</span>
            {measured.length > 0 ? (
              measured.map((m) => <span key={m}>{HEADINGS[m]}</span>)
            ) : (
              <>
                <span>load</span>
                <span>reps</span>
              </>
            )}
            {askEndReason && <span />}
            <span>rpe</span>
            <span />
          </div>

          {sets.map((set, i) => (
            <div key={i} className="flex flex-col bg-[#1c1e2a]">
              <div className={rowClass} style={gridStyle}>
                <span className="text-neutral-600">{i + 1}</span>

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
                        className={`${cellClass} text-left ${isPickerOpen(i, m) ? 'border-accent' : ''}`}
                      >
                        {set[m] ?? <span className="text-neutral-700">—</span>}
                      </button>
                    ) : (
                      <input
                        key={m}
                        value={set[m] ?? ''}
                        onChange={(e) => onUpdate(i, { [m]: parseMeasurement(e.target.value) })}
                        inputMode="decimal"
                        aria-label={`Set ${i + 1} ${METRIC_CONFIG[m].label.toLowerCase()}`}
                        className={cellClass}
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
                      className={cellClass}
                    />
                    <input
                      value={set.reps}
                      onChange={(e) => onUpdate(i, { reps: e.target.value })}
                      placeholder="reps / time"
                      aria-label={`Set ${i + 1} reps`}
                      className={cellClass}
                    />
                  </>
                )}

                {/* D27: why the hold ended, beside the number it explains. Blank
                    until it is recorded, and a control either way — the reason is
                    the highest-value tap in the app and must never become
                    read-only just because it now reads as a glyph. */}
                {askEndReason && (
                  <button
                    onClick={() => setPanel(isReasonOpen(i) ? null : { index: i, field: 'reason' })}
                    aria-expanded={isReasonOpen(i)}
                    aria-label={
                      set.endReason
                        ? `Set ${i + 1} ended: ${REASON_CONFIG[set.endReason].label}. Change`
                        : `Record why set ${i + 1} ended`
                    }
                    title={set.endReason ? REASON_CONFIG[set.endReason].label : 'Why did it end?'}
                    className="justify-self-start rounded-sm text-[11px] leading-none text-neutral-700"
                  >
                    {set.endReason ? (
                      <Icon {...REASON_ICON[set.endReason]} />
                    ) : (
                      <Icon name="question" className="opacity-60" />
                    )}
                  </button>
                )}

                {/* RPE is a ten-point scale, not equipment, so it needs no gear to
                    be pickable (AC4) — and it is entered with the same chalked
                    hands as everything else on this row. */}
                <button
                  onClick={() => setPanel(isPickerOpen(i, 'rpe') ? null : { index: i, field: 'rpe' })}
                  aria-expanded={isPickerOpen(i, 'rpe')}
                  aria-label={`Set ${i + 1} RPE: ${set.rpe ?? 'not recorded'}. Choose`}
                  className={`${cellClass} text-center ${isPickerOpen(i, 'rpe') ? 'border-accent' : ''}`}
                >
                  {set.rpe ?? <span className="text-neutral-700">—</span>}
                </button>

                <button
                  onClick={() => {
                    // Close first: an open panel would otherwise survive the delete
                    // and reopen against whichever set slid into this index — a
                    // picker pointed at a different set than the one it was opened
                    // on.
                    setPanel(null);
                    onDelete(i);
                  }}
                  aria-label={`Delete set ${i + 1}`}
                  className="justify-self-end text-[11px] leading-none text-neutral-700 hover:text-warn"
                >
                  <Icon name="x" />
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
                      // `rpe` spells "not recorded" as null, the measurements spell
                      // it as absent — the picker speaks one language and the row
                      // keeps its own (setReason.isSafetySignal makes the same
                      // allowance).
                      open.field === 'rpe' ? { rpe: next ?? null } : { [open.field]: next },
                    )
                  }
                  onClose={() => setPanel(null)}
                />
              )}

              {/* D27: the four chips, on the freshly created row exactly as before
                  — the reason is never inferred from holdSec against the target
                  range. A hang 1s short was not necessarily dropped, and guessing
                  would fabricate the safety signal §7 depends on. */}
              {askEndReason && isReasonOpen(i) && (
                <div className="flex flex-wrap gap-1 px-2.5 pb-2 pl-[38px]">
                  {endReasons.map((reason) => {
                    const active = set.endReason === reason;
                    return (
                      <button
                        key={reason}
                        onClick={() => pickReason(i, reason)}
                        aria-pressed={active}
                        aria-label={`Set ${i + 1} ended: ${REASON_CONFIG[reason].label}`}
                        className={`rounded-sm border px-2 py-1 text-[11px] font-medium transition-colors ${
                          active ? REASON_CHIP_STYLE[reason] : 'border-neutral-800 text-neutral-400'
                        }`}
                      >
                        {REASON_CONFIG[reason].label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button onClick={onAdd} className={`${btnSecondary} self-start px-2.5 py-1 text-xs`}>
        <Icon name="plus" className="text-[11px]" />
        Add {nextSetLabel ?? 'set'}
      </button>
    </div>
  );
}
