import type { SetEntry } from '../types';

const inputClass =
  'min-w-0 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-accent focus:outline-none';

export function SetLogger({
  sets,
  onAdd,
  onUpdate,
  onDelete,
}: {
  sets: SetEntry[];
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<SetEntry>) => void;
  onDelete: (index: number) => void;
}) {
  return (
    <div className="mt-2 space-y-2">
      {sets.length === 0 && <p className="text-xs text-slate-500">No sets logged yet.</p>}

      {sets.map((set, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-4 shrink-0 text-xs text-slate-500">{i + 1}</span>
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
          <input
            value={set.rpe ?? ''}
            onChange={(e) => {
              const v = e.target.value.trim();
              const n = Number(v);
              onUpdate(i, { rpe: v === '' || Number.isNaN(n) ? null : n });
            }}
            inputMode="numeric"
            placeholder="RPE"
            aria-label={`Set ${i + 1} RPE`}
            className={`${inputClass} w-12 text-center`}
          />
          <button
            onClick={() => onDelete(i)}
            aria-label={`Delete set ${i + 1}`}
            className="shrink-0 rounded-md px-2 py-1 text-slate-500 hover:text-red-400"
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
