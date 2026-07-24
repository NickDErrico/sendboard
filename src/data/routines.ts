import type { Routine } from '../types';

// Exactly two routines (D9): the climbing days are check-offs, not routines.
// dayOfWeek is null for both — no day-of-week scheduling exists (D2a); the owner
// picks the day. Exercise ordering follows the training plan's section order.
export const ROUTINES: Routine[] = [
  {
    id: 'day-1-fingerboard',
    name: 'Day 1 — Fingerboard',
    dayOfWeek: null,
    exerciseIds: [
      'finger-warmup-progression',
      'abrahangs-no-hang',
      'pima-finger-pull-half-crimp',
      'pima-finger-pull-open-hand',
      'max-hang-half-crimp',
      'max-hang-open-hand',
    ],
  },
  {
    id: 'day-3-pull-antagonist',
    name: 'Day 3 — Pull / Antagonist',
    dayOfWeek: null,
    exerciseIds: [
      'oi-bar-pull-extended',
      'oi-bar-pull-90',
      'oi-bar-pull-top',
      'weighted-lockoff-hold',
      'kb-single-arm-row',
      'kb-goblet-squat',
      'kb-turkish-getup',
      'pushups-or-dips',
      'oi-wall-press',
      'external-rotations',
      'wrist-extensor-work',
    ],
  },
];
