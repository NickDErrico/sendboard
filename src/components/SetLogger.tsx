import type { ProgressMetric, SetEntry } from '../types';
import { METRIC_CONFIG } from '../lib/progress';
import { METRIC_INPUT_ORDER } from '../lib/lastTime';

const inputClass =
  'min-w-0 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-accent focus:outline-none';

// Column headings for the measured layout. One header row for the whole list
// beats repeating a label under every set — a max hang is five near-identical
// rows and the labels would be five times the noise.
const HEADINGS: Record<ProgressMetric, string> = {
  edgeMm: 'edge mm',
  addedLb: 'added lb',
  holdSec: 'hold s',
};

/** Parses a numeric input, treating blank as "not recorded" rather than as zero. */
function parseMeasurement(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export function SetLogger({
  sets,
  metrics,
  onAdd,
  onUpdate,
  onDelete,
}: {
  sets: SetEntry[];
  /** D21: when present, the numeric fields replace the free-text load/reps here. */
  metrics?: ProgressMetric[];
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<SetEntry>) => void;
  onDelete: (index: number) => void;
}) {
  const measured = METRIC_INPUT_ORDER.filter((m) => metrics?.includes(m));

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
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-4 shrink-0 text-xs text-slate-500">{i + 1}</span>

          {measured.length > 0 ? (
            measured.map((m) => (
              <input
                key={m}
                value={set[m] ?? ''}
                onChange={(e) => onUpdate(i, { [m]: parseMeasurement(e.target.value) })}
                inputMode="decimal"
                aria-label={`Set ${i + 1} ${METRIC_CONFIG[m].label.toLowerCase()}`}
                className={`${inputClass} flex-1 text-center`}
              />
            ))
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

          <input
            value={set.rpe ?? ''}
            onChange={(e) => {
              const v = e.target.value.trim();
              const n = Number(v);
              onUpdate(i, { rpe: v === '' || Number.isNaN(n) ? null : n });
            }}
            inputMode="numeric"
            placeholder={measured.length > 0 ? '' : 'RPE'}
            aria-label={`Set ${i + 1} RPE`}
            className={`${inputClass} ${measured.length > 0 ? 'w-12' : 'w-12'} text-center`}
          />
          <button
            onClick={() => onDelete(i)}
            aria-label={`Delete set ${i + 1}`}
            className="w-7 shrink-0 rounded-md px-2 py-1 text-slate-500 hover:text-red-400"
          >
            ✕
          </button>
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
