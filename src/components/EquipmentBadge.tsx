import type { Equipment } from '../types';
import { EQUIPMENT_LABELS } from '../lib/equipment';

export function EquipmentBadge({ equipment }: { equipment: Equipment }) {
  return (
    <span className="inline-flex items-center rounded-md bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-200">
      {EQUIPMENT_LABELS[equipment]}
    </span>
  );
}

// Distinct greasing-the-groove marker (T3 AC1a). Deliberately different colour
// from equipment badges so it reads as a category, not a piece of gear.
export function GtgBadge() {
  return (
    <span className="inline-flex items-center rounded-md border border-accent/40 bg-accent-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-accent-300">
      GtG
    </span>
  );
}
