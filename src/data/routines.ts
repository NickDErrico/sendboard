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
  // T16: §4E's baseline/retest battery, run once before week 1 and again at the
  // end. A routine so its results are ordinary WorkoutLogs — the same set logger,
  // timer, end reasons, history, and backup as any session (D29) — but
  // `inRotation: false`, because completing a test must not change which training
  // routine is up next (D15). The warm-up leads: §4E requires "fully rested,
  // after a thorough warm-up", and marking it completed (D16) is how the app
  // records that condition without asking a question.
  {
    id: 'baseline-retest',
    name: '§4E — Baseline / Retest',
    dayOfWeek: null,
    inRotation: false,
    exerciseIds: [
      'finger-warmup-progression',
      'test-max-hang-half-crimp',
      'test-max-hang-open-hand',
      'test-max-pullup-load',
      'test-lockoff-90-left',
      'test-lockoff-90-right',
    ],
  },
];
