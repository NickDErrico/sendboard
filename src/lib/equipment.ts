import type { Equipment } from '../types';

// Human-readable labels for equipment enum values. Kept in its own module (not a
// component file) so fast-refresh stays happy and screens/badges can share it.
export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  hangboard: 'Hangboard',
  'pullup-bar': 'Pull-up bar',
  kettlebell: 'Kettlebell',
  'dip-belt': 'Dip belt',
  band: 'Band',
  bodyweight: 'Bodyweight',
  'climbing-wall': 'Climbing wall',
};

export const EQUIPMENT_OPTIONS = Object.entries(EQUIPMENT_LABELS) as [Equipment, string][];
