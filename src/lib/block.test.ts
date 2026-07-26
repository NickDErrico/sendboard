import { describe, expect, it } from 'vitest';
import type { Exercise, Routine, Settings, WorkoutLog } from '../types';
import {
  BLOCK_WEEKS,
  blockPosition,
  describeSessions,
  formatPhaseWeeks,
  formatWeek,
  livePrescription,
  phaseFor,
  variantsFor,
} from './block';
import { EXERCISES } from '../data/exercises';
import { BLOCK_PHASES } from '../data/blockPhases';

const ROUTINES: Routine[] = [
  { id: 'day-1-fingerboard', name: 'Day 1', dayOfWeek: null, exerciseIds: ['a'] },
  { id: 'day-3-pull-antagonist', name: 'Day 3', dayOfWeek: null, exerciseIds: ['b'] },
  { id: 'baseline-retest', name: '§4E', dayOfWeek: null, inRotation: false, exerciseIds: ['c'] },
];

// Local-time ISO strings, so the tests read the same calendar day the app does.
const at = (local: string) => new Date(local).toISOString();
function log(routineId: string, day: string, completed = true): WorkoutLog {
  return {
    id: `${routineId}-${day}`,
    routineId,
    startedAt: at(`${day}T18:00`),
    completedAt: completed ? at(`${day}T19:00`) : null,
    entries: [],
    sessionNotes: '',
  };
}
const NO_SETTINGS: Settings = { installGuideDismissed: false };
const position = (logs: WorkoutLog[], today: string, settings = NO_SETTINGS, liveLog?: WorkoutLog) =>
  blockPosition({ logs, routines: ROUTINES, settings, today, liveLog });

// Monday 2026-06-01 is week 1; every later Monday is one week on.
const WEEK_1_MON = '2026-06-01';

describe('blockPosition anchors on the first completed rotating session (AC1)', () => {
  it('returns null when nothing is logged and no marker is set (AC11)', () => {
    expect(position([], '2026-06-10')).toBeNull();
  });

  it('reads week 1 on the day of the first session', () => {
    const pos = position([log('day-1-fingerboard', WEEK_1_MON)], WEEK_1_MON)!;
    expect(pos.startKey).toBe(WEEK_1_MON);
    expect(pos.week).toBe(1);
    expect(pos.sessions).toBe(1);
    expect(pos.derived).toBe(true);
    expect(pos.label).toBe('1 session · ~week 1 of 8');
  });

  it('counts weeks from the first session Monday-anchored (D10)', () => {
    const logs = [log('day-1-fingerboard', '2026-06-03')]; // Wednesday of week 1
    // Sunday of the same week is still week 1 — the boundary is Monday, not +7d.
    expect(position(logs, '2026-06-07')!.week).toBe(1);
    // The following Monday starts week 2.
    expect(position(logs, '2026-06-08')!.week).toBe(2);
    expect(position(logs, '2026-07-06')!.week).toBe(6);
  });

  it('counts every completed rotating session, both routines', () => {
    const logs = [
      log('day-1-fingerboard', WEEK_1_MON),
      log('day-3-pull-antagonist', '2026-06-04'),
      log('day-1-fingerboard', '2026-06-08'),
    ];
    const pos = position(logs, '2026-06-08')!;
    expect(pos.sessions).toBe(3);
    expect(pos.label).toBe('3 sessions · ~week 2 of 8');
  });

  it('ignores an in-progress log when none is passed as live', () => {
    const logs = [log('day-1-fingerboard', WEEK_1_MON), log('day-1-fingerboard', '2026-06-04', false)];
    expect(position(logs, '2026-06-04')!.sessions).toBe(1);
  });

  it('moves the anchor forward when the earliest session is deleted (derive-don’t-store)', () => {
    const first = log('day-1-fingerboard', WEEK_1_MON);
    const second = log('day-3-pull-antagonist', '2026-06-15');
    expect(position([first, second], '2026-06-15')!.week).toBe(3);
    expect(position([second], '2026-06-15')!.week).toBe(1);
  });

  it('counts a completed session that recorded nothing (D16, D23)', () => {
    const empty = log('day-1-fingerboard', WEEK_1_MON);
    expect(position([empty], WEEK_1_MON)!.sessions).toBe(1);
  });
});

describe('a derived anchor is marked approximate (AC2)', () => {
  it('renders a tilde while derived and drops it once a marker is set', () => {
    const logs = [log('day-1-fingerboard', WEEK_1_MON)];
    expect(position(logs, '2026-06-15')!.weekLabel).toBe('~week 3 of 8');
    const marked = position(logs, '2026-06-15', {
      ...NO_SETTINGS,
      blockStartedAt: WEEK_1_MON,
    })!;
    expect(marked.weekLabel).toBe('week 3 of 8');
    expect(marked.derived).toBe(false);
  });

  it('formats the label directly too', () => {
    expect(formatWeek(4, true)).toBe('~week 4 of 8');
    expect(formatWeek(4, false)).toBe('week 4 of 8');
  });
});

describe('past week 8 is a state, not a failure (AC3)', () => {
  it('reads week 8+ and never says late, behind, or overdue', () => {
    const logs = [log('day-1-fingerboard', WEEK_1_MON)];
    const pos = position(logs, '2026-08-10')!; // 10 weeks on
    expect(pos.week).toBe(11);
    expect(pos.beyond).toBe(true);
    expect(pos.weekLabel).toBe('~week 8+');
    expect(pos.label).toMatch(/^1 session · ~week 8\+$/);
    expect(pos.label).not.toMatch(/overdue|behind|late|missed|due/i);
  });

  it('week 8 itself is not beyond', () => {
    const pos = position([log('day-1-fingerboard', WEEK_1_MON)], '2026-07-20')!;
    expect(pos.week).toBe(BLOCK_WEEKS);
    expect(pos.beyond).toBe(false);
    expect(pos.weekLabel).toBe('~week 8 of 8');
  });
});

describe('the block marker is the only stored state (AC4)', () => {
  it('counts weeks and sessions from the marker, excluding what came before', () => {
    const logs = [
      log('day-1-fingerboard', '2026-04-06'), // a previous block
      log('day-3-pull-antagonist', '2026-04-08'),
      log('day-1-fingerboard', '2026-06-03'), // this one
    ];
    const settings = { ...NO_SETTINGS, blockStartedAt: WEEK_1_MON };
    const pos = position(logs, '2026-06-08', settings)!;
    expect(pos.startKey).toBe(WEEK_1_MON);
    expect(pos.sessions).toBe(1);
    expect(pos.week).toBe(2);
  });

  it('clearing the marker returns exactly the derived position', () => {
    const logs = [log('day-1-fingerboard', '2026-06-03')];
    const marked = position(logs, '2026-06-20', { ...NO_SETTINGS, blockStartedAt: '2026-06-15' })!;
    expect(marked.week).toBe(1);
    const derived = position(logs, '2026-06-20')!;
    expect(derived.week).toBe(3);
    expect(derived.startKey).toBe('2026-06-03');
  });

  it('exists with zero sessions when the marker is set and nothing is logged', () => {
    const pos = position([], '2026-06-03', { ...NO_SETTINGS, blockStartedAt: WEEK_1_MON })!;
    expect(pos.sessions).toBe(0);
    expect(pos.label).toBe('No sessions yet · week 1 of 8');
  });

  it('never reads week 0 or negative from a marker dated in the future', () => {
    const pos = position([], '2026-06-01', { ...NO_SETTINGS, blockStartedAt: '2026-07-01' })!;
    expect(pos.week).toBe(1);
    expect(pos.sessions).toBe(0);
  });
});

describe('the §4E battery is not a session in the block (AC5, D29)', () => {
  it('reads as not started when only a battery is logged', () => {
    expect(position([log('baseline-retest', WEEK_1_MON)], '2026-06-08')).toBeNull();
  });

  it('never counts a battery, and never lets one anchor the block', () => {
    const logs = [log('baseline-retest', WEEK_1_MON), log('day-1-fingerboard', '2026-06-08')];
    const pos = position(logs, '2026-06-08')!;
    expect(pos.startKey).toBe('2026-06-08');
    expect(pos.week).toBe(1);
    expect(pos.sessions).toBe(1);
  });

  it('shows no ordinal for a battery in progress (AC6)', () => {
    const logs = [log('day-1-fingerboard', WEEK_1_MON)];
    const liveBattery = log('baseline-retest', '2026-06-15', false);
    const pos = position(logs, '2026-06-15', NO_SETTINGS, liveBattery)!;
    expect(pos.live).toBe(false);
    expect(pos.sessions).toBe(1);
    expect(pos.label).toBe('1 session · ~week 3 of 8');
  });
});

describe('a live session numbers itself (AC6)', () => {
  it('reads Session N for the session on screen', () => {
    const logs = [log('day-1-fingerboard', WEEK_1_MON), log('day-3-pull-antagonist', '2026-06-04')];
    const live = log('day-1-fingerboard', '2026-06-08', false);
    const pos = position(logs, '2026-06-08', NO_SETTINGS, live)!;
    expect(pos.live).toBe(true);
    expect(pos.sessions).toBe(3);
    expect(pos.label).toBe('Session 3 · ~week 2 of 8');
  });

  it('anchors a first-ever session in progress to itself', () => {
    const live = log('day-1-fingerboard', WEEK_1_MON, false);
    const pos = position([live], WEEK_1_MON, NO_SETTINGS, live)!;
    expect(pos.startKey).toBe(WEEK_1_MON);
    expect(pos.week).toBe(1);
    expect(pos.label).toBe('Session 1 · ~week 1 of 8');
    // ...while Home, which passes no live log, still reads not-started.
    expect(position([live], WEEK_1_MON)).toBeNull();
  });

  it('phrases the count for both shapes', () => {
    expect(describeSessions(0, false)).toBe('No sessions yet');
    expect(describeSessions(1, false)).toBe('1 session');
    expect(describeSessions(4, false)).toBe('4 sessions');
    expect(describeSessions(4, true)).toBe('Session 4');
  });
});

describe('§4F is quoted for the derived week (AC7)', () => {
  it('returns the plan’s own row for each week', () => {
    expect(phaseFor(1)!.focus).toBe('Establish baselines, moderate effort (80%)');
    expect(phaseFor(2)!.focus).toBe(phaseFor(1)!.focus);
    expect(phaseFor(4)!.note).toBe('Add small load increments (1–3%)');
    expect(phaseFor(6)!.focus).toBe('Peak intensity, PIMA at true max effort');
    expect(phaseFor(7)!.focus).toBe('Deload — half the volume, same intensity');
    expect(phaseFor(8)!.focus).toBe('Retest max hang load / PIMA feel');
  });

  it('clamps to the last row past week 8 rather than inventing one', () => {
    expect(phaseFor(9)).toBe(BLOCK_PHASES[BLOCK_PHASES.length - 1]);
    expect(phaseFor(40)).toBe(BLOCK_PHASES[BLOCK_PHASES.length - 1]);
  });

  it('covers every week of the block with exactly one row', () => {
    for (let week = 1; week <= BLOCK_WEEKS; week += 1) {
      const matches = BLOCK_PHASES.filter((p) => week >= p.weeks[0] && week <= p.weeks[1]);
      expect(matches).toHaveLength(1);
    }
  });

  it('labels a row’s weeks', () => {
    expect(formatPhaseWeeks(BLOCK_PHASES[0])).toBe('Weeks 1–2');
    expect(formatPhaseWeeks(BLOCK_PHASES[3])).toBe('Week 7');
  });
});

describe('variantsFor puts the live protocol first (AC8, AC9, AC10)', () => {
  const pima = EXERCISES.find((e) => e.id === 'pima-finger-pull-half-crimp')!;
  const maxHang = EXERCISES.find((e) => e.id === 'max-hang-half-crimp')!;

  it('declares variants on exactly the two PIMA entries and nowhere else', () => {
    const declaring = EXERCISES.filter((e) => (e.variants?.length ?? 0) > 0).map((e) => e.id);
    expect(declaring).toEqual(['pima-finger-pull-half-crimp', 'pima-finger-pull-open-hand']);
  });

  it('every declared variant’s text appears verbatim in the prescription (D6)', () => {
    for (const exercise of EXERCISES) {
      for (const variant of exercise.variants ?? []) {
        expect(exercise.prescription).toContain(variant.text);
      }
    }
  });

  it('picks the tendon variant in weeks 1–4 and the peak variant from week 5', () => {
    expect(variantsFor(pima, 1).live!.label).toBe('Weeks 1–4 · tendon variant');
    expect(variantsFor(pima, 4).live!.label).toBe('Weeks 1–4 · tendon variant');
    expect(variantsFor(pima, 5).live!.label).toBe('Weeks 5–8 · peak');
    expect(variantsFor(pima, 8).live!.label).toBe('Weeks 5–8 · peak');
  });

  it('keeps the other variant readable rather than hiding it', () => {
    const view = variantsFor(pima, 2);
    expect(view.others).toHaveLength(1);
    expect(view.others[0].label).toBe('Weeks 5–8 · peak');
    expect(view.live!.text.length).toBeGreaterThan(0);
  });

  it('emphasises nothing when no week is known (AC9)', () => {
    const view = variantsFor(pima, null);
    expect(view.live).toBeNull();
    expect(view.others).toEqual(pima.variants);
    expect(view.timedElsewhere).toBeNull();
  });

  it('names the variant the timer follows only when it is not the live one (AC10)', () => {
    expect(variantsFor(pima, 2).timedElsewhere!.label).toBe('Weeks 5–8 · peak');
    expect(variantsFor(pima, 6).timedElsewhere).toBeNull();
  });

  it('keeps the last variant live past week 8 rather than falling back to none', () => {
    expect(variantsFor(pima, 12).live!.label).toBe('Weeks 5–8 · peak');
  });

  it('returns nothing for an exercise that declares no variants', () => {
    expect(variantsFor(maxHang, 3)).toEqual({ live: null, others: [], timedElsewhere: null });
    expect(variantsFor(undefined, 3).live).toBeNull();
  });

  it('exactly one declared variant carries the typed timing', () => {
    for (const exercise of EXERCISES) {
      const variants = exercise.variants ?? [];
      if (variants.length === 0) continue;
      expect(variants.filter((v) => v.timed)).toHaveLength(1);
    }
  });
});

describe('livePrescription falls back to the untouched string', () => {
  const pima = EXERCISES.find((e) => e.id === 'pima-finger-pull-open-hand')!;
  const maxHang = EXERCISES.find((e) => e.id === 'max-hang-open-hand')!;

  it('gives the live variant’s text where one is declared and a week is known', () => {
    expect(livePrescription(pima, 3)).toBe(pima.variants![0].text);
    expect(livePrescription(pima, 6)).toBe(pima.variants![1].text);
  });

  it('gives the whole prescription with no week, and for every other exercise', () => {
    expect(livePrescription(pima, null)).toBe(pima.prescription);
    expect(livePrescription(maxHang, 3)).toBe(maxHang.prescription);
    expect(livePrescription(undefined, 3)).toBe('');
  });
});

describe('nothing about the block is stored on a log', () => {
  it('leaves the logs it reads untouched', () => {
    const logs = [log('day-1-fingerboard', WEEK_1_MON)];
    const snapshot = JSON.stringify(logs);
    position(logs, '2026-06-15');
    expect(JSON.stringify(logs)).toBe(snapshot);
  });

  it('reads only blockStartedAt off settings', () => {
    const settings: Settings & { week?: number } = { ...NO_SETTINGS, blockStartedAt: WEEK_1_MON };
    const pos = position([], '2026-06-08', settings)!;
    expect(pos.week).toBe(2);
    expect(settings.week).toBeUndefined();
  });

  it('is a pure function of its inputs — no clock read inside', () => {
    const logs = [log('day-1-fingerboard', WEEK_1_MON)];
    const a = position(logs, '2026-06-15');
    const b = position(logs, '2026-06-15');
    expect(a).toEqual(b);
  });
});

// Type-level guard: the exercise the tests reach for is the shape the catalog has.
const _exerciseShape: Exercise | undefined = EXERCISES[0];
void _exerciseShape;
