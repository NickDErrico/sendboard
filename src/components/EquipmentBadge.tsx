import type { Equipment } from '../types';
import { EQUIPMENT_LABELS } from '../lib/equipment';

export function EquipmentBadge({ equipment }: { equipment: Equipment }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-700/70 px-2 py-0.5 text-xs font-medium text-slate-200">
      {EQUIPMENT_LABELS[equipment]}
    </span>
  );
}

// Distinct greasing-the-groove marker (T3 AC1a). Deliberately different colour
// from equipment badges so it reads as a category, not a piece of gear.
export function GtgBadge() {
  return (
    <span className="inline-flex items-center rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">
      GtG
    </span>
  );
}
