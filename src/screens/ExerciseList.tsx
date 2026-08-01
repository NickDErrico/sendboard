import { Fragment, useEffect, useState } from 'react';
import type { Equipment, Exercise, Focus } from '../types';
import { getAllExercises } from '../lib/storage';
import { EQUIPMENT_OPTIONS } from '../lib/equipment';
import { EquipmentBadge, GtgBadge } from '../components/EquipmentBadge';
import { Icon, kicker } from '../components/ui';
import { RowRule, readList } from '../components/ReadList';
import { ExerciseDetail } from './ExerciseDetail';

// Display order + labels for the focus groups (D48; was the category groups).
//
// Ordered by where a movement sits in a session rather than by how many entries
// it has: the warm-up first because it comes first, then the two tiers that carry
// the heaviest load, then the supporting work, then the sport. A count-ordered
// list would put sixteen prehab movements above the four the block is built on.
const FOCUS_ORDER: { key: Focus; label: string }[] = [
  { key: 'warm-up', label: 'Warm-up' },
  { key: 'max-strength', label: 'Max strength' },
  { key: 'tendon-conditioning', label: 'Tendon conditioning' },
  { key: 'general-strength', label: 'General strength' },
  { key: 'prehab-stability', label: 'Prehab & stability' },
  { key: 'proprioception', label: 'Proprioception' },
  { key: 'climbing', label: 'Climbing' },
  { key: 'endurance', label: 'Endurance' },
  { key: 'power-endurance', label: 'Power endurance' },
  { key: 'power', label: 'Power' },
  { key: 'core', label: 'Core' },
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
        {FOCUS_ORDER.map(({ key, label }) => {
          const inGroup = visible.filter((e) => e.focus === key);
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

        {/* D48: the focuses nothing in the catalog trains, stated rather than
            omitted. This is the axis's most useful product — an accurate report
            that this catalog trains max strength and conditions tissue and does
            nothing else — and it is computed against the whole catalog rather
            than the filtered view, because it is a fact about what is declared,
            not about what the equipment chip is currently hiding.

            It reports and stops there (D23): no target, no suggestion to add
            one, and no implication that a gap is a failing. Absent entirely once
            every focus has a member. */}
        {exercises !== null &&
          (() => {
            const untrained = FOCUS_ORDER.filter(
              ({ key }) => !exercises.some((e) => e.focus === key),
            );
            if (untrained.length === 0) return null;
            return (
              <section>
                <h2 className={`${kicker} mb-2`}>Not in this catalog</h2>
                <div className={readList}>
                  <p className="px-1 py-3 text-[11px] leading-snug text-neutral-500">
                    {untrained.map(({ label }) => label).join(' · ')}
                  </p>
                </div>
              </section>
            );
          })()}
      </div>
    </div>
  );
}
