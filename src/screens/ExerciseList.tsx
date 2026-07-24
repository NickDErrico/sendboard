import { useEffect, useState } from 'react';
import type { Category, Equipment, Exercise } from '../types';
import { getAllExercises } from '../lib/storage';
import { EQUIPMENT_OPTIONS } from '../lib/equipment';
import { EquipmentBadge, GtgBadge } from '../components/EquipmentBadge';
import { ExerciseDetail } from './ExerciseDetail';

// Display order + labels for the category groups (AC1).
const CATEGORY_ORDER: { key: Category; label: string }[] = [
  { key: 'warmup', label: 'Warm-up' },
  { key: 'fingers', label: 'Fingers' },
  { key: 'pulling', label: 'Pulling' },
  { key: 'antagonist', label: 'Antagonist & Prehab' },
  { key: 'lower-body', label: 'Lower Body' },
  { key: 'climbing', label: 'Climbing' },
];

export function ExerciseList({ onExit }: { onExit?: () => void }) {
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Filter state lives here, so returning from the detail view preserves it (edge case).
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | 'all'>('all');
  const [gtgOnly, setGtgOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    getAllExercises()
      .then(setExercises)
      .catch((e: unknown) => setError(String(e)));
  }, []);

  const selected = exercises?.find((e) => e.id === selectedId);
  if (selected) {
    return <ExerciseDetail exercise={selected} onBack={() => setSelectedId(null)} />;
  }

  const visible = (exercises ?? []).filter(
    (e) =>
      (equipmentFilter === 'all' || e.equipment.includes(equipmentFilter)) &&
      (!gtgOnly || e.gtgEligible),
  );

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Exercises</h1>
        {onExit && (
          <button
            onClick={onExit}
            className="rounded px-1 py-1 text-sm text-slate-400 hover:text-slate-200"
          >
            Done
          </button>
        )}
      </header>

      {/* Filters (AC1a, AC2) */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select
          value={equipmentFilter}
          onChange={(e) => setEquipmentFilter(e.target.value as Equipment | 'all')}
          className="rounded-lg border border-slate-700 bg-brand-surface px-3 py-2 text-sm text-slate-200"
          aria-label="Filter by equipment"
        >
          <option value="all">All equipment</option>
          {EQUIPMENT_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <button
          onClick={() => setGtgOnly((v) => !v)}
          aria-pressed={gtgOnly}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            gtgOnly
              ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200'
              : 'border-slate-700 bg-brand-surface text-slate-300'
          }`}
        >
          GtG only
        </button>
      </div>

      {error && <p className="text-sm text-red-400">Couldn’t load exercises: {error}</p>}

      {exercises === null && !error && <p className="text-sm text-slate-400">Loading…</p>}

      {exercises !== null && visible.length === 0 && (
        <div className="rounded-lg border border-slate-700 bg-brand-surface p-6 text-center">
          <p className="text-sm text-slate-300">No exercises match this filter.</p>
          <button
            onClick={() => {
              setEquipmentFilter('all');
              setGtgOnly(false);
            }}
            className="mt-3 text-sm font-medium text-brand-accent"
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="space-y-6">
        {CATEGORY_ORDER.map(({ key, label }) => {
          const inGroup = visible.filter((e) => e.category === key);
          if (inGroup.length === 0) return null;
          return (
            <section key={key}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </h2>
              <ul className="space-y-2">
                {inGroup.map((ex) => (
                  <li key={ex.id}>
                    <button
                      onClick={() => setSelectedId(ex.id)}
                      className="w-full rounded-xl border border-slate-700 bg-brand-surface p-3 text-left transition-colors hover:border-slate-600 active:border-slate-500"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-100">{ex.name}</span>
                        {ex.gtgEligible && <GtgBadge />}
                      </div>
                      <p className="mt-1 text-sm leading-snug text-slate-400">{ex.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ex.equipment.map((eq) => (
                          <EquipmentBadge key={eq} equipment={eq} />
                        ))}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
