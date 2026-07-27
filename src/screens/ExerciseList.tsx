import { Fragment, useEffect, useState } from 'react';
import type { Category, Equipment, Exercise } from '../types';
import { getAllExercises } from '../lib/storage';
import { EQUIPMENT_OPTIONS } from '../lib/equipment';
import { EquipmentBadge, GtgBadge } from '../components/EquipmentBadge';
import { Icon, kicker } from '../components/ui';
import { RowRule, readList } from '../components/ReadList';
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
    <div className="mx-auto max-w-md px-4 pb-24 pt-[54px]">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">Exercises</h1>
        {onExit && (
          <button
            onClick={onExit}
            className="rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10"
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
          className="rounded-md bg-surface shadow-edge px-3 py-2 text-sm text-neutral-200"
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
              ? 'border-accent bg-accent/[.12] text-accent-200'
              : 'border-neutral-800 bg-surface text-neutral-300'
          }`}
        >
          GtG only
        </button>
      </div>

      {error && <p className="text-[13px] text-warn">Couldn’t load exercises: {error}</p>}

      {exercises === null && !error && <p className="text-[13px] text-neutral-400">Loading…</p>}

      {exercises !== null && visible.length === 0 && (
        <div className="rounded-md bg-surface shadow-edge p-6 text-center">
          <p className="text-[13px] text-neutral-300">No exercises match this filter.</p>
          <button
            onClick={() => {
              setEquipmentFilter('all');
              setGtgOnly(false);
            }}
            className="mt-3 text-sm font-medium text-accent"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Nocturne's collapse rule, at the scale it matters most: twenty cards
          became six cards of rows. Nothing here is a thing you *do* — the whole
          screen is a catalog you read and then tap into — and twenty separate
          surfaces made twenty subjects out of one list. As rows the category is
          the subject and the entries are its contents, which is what they are. */}
      <div className="space-y-5">
        {CATEGORY_ORDER.map(({ key, label }) => {
          const inGroup = visible.filter((e) => e.category === key);
          if (inGroup.length === 0) return null;
          return (
            <section key={key}>
              <h2 className={`${kicker} mb-2`}>{label}</h2>
              <div className={readList}>
                {inGroup.map((ex, i) => (
                  <Fragment key={ex.id}>
                    {i > 0 && <RowRule />}
                    <button
                      onClick={() => setSelectedId(ex.id)}
                      className="flex w-full items-center gap-3 rounded-md px-1 py-3 text-left transition-colors hover:bg-white/5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-medium">{ex.name}</span>
                          {ex.gtgEligible && <GtgBadge />}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-neutral-500">
                          {ex.summary}
                        </span>
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
                          {ex.equipment.map((eq) => (
                            <EquipmentBadge key={eq} equipment={eq} />
                          ))}
                        </span>
                      </span>
                      <Icon name="caret-right" className="shrink-0 text-[13px] text-neutral-600" />
                    </button>
                  </Fragment>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
