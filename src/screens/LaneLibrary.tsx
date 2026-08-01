import { Fragment, useEffect, useState } from 'react';
import type { Equipment, Exercise, Focus, Routine } from '../types';
import { getAllExercises, getAllRoutines } from '../lib/storage';
import { EQUIPMENT_OPTIONS } from '../lib/equipment';
import { JOINT_TARGET_LABELS } from '../lib/pool';
import { LANE_NOTES, groupByLane, laneLabel, type Membership } from '../lib/membership';
import { go, type LibraryLane } from '../lib/routes';
import { EquipmentBadge, GtgBadge } from '../components/EquipmentBadge';
import { Icon, kicker, tagNeutral } from '../components/ui';
import { RowRule, readList } from '../components/ReadList';
import { ExerciseDetail } from './ExerciseDetail';

/**
 * One lane's movements, grouped by what they develop (T39, D54).
 *
 * **Grouped by focus inside the lane, never by target.** `focus` is declared on
 * all forty-nine entries and `target` on thirty-one, so a target-first grouping
 * would file a third of the catalog under no heading at all. The target rides on
 * the row instead, which is what it is — a fact about the movement rather than a
 * heading that has to exist for every one of them.
 *
 * The two filters survive from the flat list this replaced, because "what can I
 * do with a band" is a real question that neither grouping answers on its own.
 */

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

function toMembership(lane: LibraryLane): Membership {
  return lane === 'none' ? null : (lane as Membership);
}

export function LaneLibrary({ lane }: { lane: LibraryLane }) {
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | 'all'>('all');
  const [gtgOnly, setGtgOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [exs, rs] = await Promise.all([getAllExercises(), getAllRoutines()]);
      setExercises(exs);
      setRoutines(rs);
    })();
  }, []);

  const selected = exercises?.find((e) => e.id === selectedId);
  if (selected) {
    // T39 AC8: the detail is T3's, unchanged.
    return <ExerciseDetail exercise={selected} onBack={() => setSelectedId(null)} />;
  }

  const inLane =
    exercises === null
      ? []
      : (groupByLane(exercises, routines).find((g) => g.lane === toMembership(lane))?.exercises ??
        []);

  const visible = inLane.filter(
    (e) =>
      (equipmentFilter === 'all' || e.equipment.includes(equipmentFilter)) &&
      (!gtgOnly || e.gtgEligible),
  );
  const hidden = inLane.length - visible.length;
  const note = LANE_NOTES[lane];

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-[54px]">
      <header className="mb-2 flex items-baseline gap-2">
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">
          {laneLabel(toMembership(lane))}
        </h1>
        <span className="text-[11px] tabular-nums text-neutral-600">{inLane.length}</span>
        <button
          onClick={() => go({ name: 'library', lane: null })}
          className="ml-auto rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10"
        >
          Library
        </button>
      </header>

      {note && <p className="mb-4 text-[11px] leading-snug text-neutral-500">{note}</p>}

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

      {exercises === null && <p className="text-[13px] text-neutral-400">Loading…</p>}

      {exercises !== null && visible.length === 0 && (
        <div className="rounded-md bg-surface shadow-edge p-6 text-center">
          <p className="text-[13px] text-neutral-300">
            {inLane.length === 0
              ? 'No movement in this lane yet.'
              : 'No movement here matches this filter.'}
          </p>
          {inLane.length > 0 && (
            <button
              onClick={() => {
                setEquipmentFilter('all');
                setGtgOnly(false);
              }}
              className="mt-3 text-sm font-medium text-accent"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <div className="space-y-5">
        {FOCUS_ORDER.map(({ key, label }) => {
          const inGroup = visible.filter((e) => e.focus === key);
          if (inGroup.length === 0) return null;
          return (
            <section key={key}>
              <h2 className={`${kicker} mb-2`}>
                {label} · {inGroup.length}
              </h2>
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
                          {/* The third level, where the entry declares one. It is
                              a fact about the movement, not a heading — which is
                              why it is here and not above. */}
                          {ex.target && (
                            <span className={tagNeutral}>{JOINT_TARGET_LABELS[ex.target]}</span>
                          )}
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

      {/* AC6: a filter never makes a group vanish silently. */}
      {hidden > 0 && (
        <p className="mt-5 px-0.5 text-[11px] text-neutral-600">
          {hidden} more in this lane, hidden by the filter.
        </p>
      )}
    </div>
  );
}
