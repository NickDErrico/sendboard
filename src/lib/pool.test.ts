import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../data/exercises';
import type { Check, Exercise, WorkoutLog } from '../types';
import {
  DAILY_ISOMETRIC_SLOTS,
  POOL_INTERVAL_DAYS,
  POOL_TARGETS,
  dailyIsometricsToday,
  describeSlot,
  lastLoadedByExercise,
  movementsForSlot,
  movementsForTier,
  poolToday,
} from './pool';

// ─── Catalog coverage ───────────────────────────────────────────────────────
//
// The point of the whole rotation: a target with no movement never comes up, and
// nothing else in the app would ever say so. These are the tests that turn "we
// have no extensor work" from a discovery into a red build.

describe('catalog coverage', () => {
  it.each(DAILY_ISOMETRIC_SLOTS)('has a daily isometric for %s', (target) => {
    expect(movementsForSlot(EXERCISES, 'daily-isometric', target).length).toBeGreaterThan(0);
  });

  it.each(POOL_TARGETS)('has a pool movement for %s', (target) => {
    expect(movementsForSlot(EXERCISES, 'pool', target).length).toBeGreaterThan(0);
  });

  it('gives fingers no daily isometric slot — that tissue is already covered', () => {
    expect(DAILY_ISOMETRIC_SLOTS).not.toContain('fingers');
    expect(movementsForSlot(EXERCISES, 'daily-isometric', 'fingers')).toHaveLength(0);
  });

  it('prices every pool target, so a target cannot join the pool without a dose', () => {
    for (const target of POOL_TARGETS) expect(POOL_INTERVAL_DAYS[target]).toBeGreaterThan(0);
    expect(Object.keys(POOL_INTERVAL_DAYS).sort()).toEqual([...POOL_TARGETS].sort());
  });

  it('holds every daily isometric for 30–45s at a named long-length position', () => {
    // Asserted rather than trusted: muscle length is a prescribed variable
    // (Oranchuk 2019), so an entry that says only "hold" has lost half its dose.
    for (const exercise of movementsForTier(EXERCISES, 'daily-isometric')) {
      const dose = exercise.tiers?.find((t) => t.tier === 'daily-isometric');
      expect(dose?.holdSeconds, exercise.id).toEqual([30, 45]);
      expect(dose?.position, exercise.id).toBeTruthy();
      expect(dose?.source, exercise.id).toBeTruthy();
    }
  });

  it('cites a source on every tier dose', () => {
    for (const exercise of EXERCISES) {
      for (const dose of exercise.tiers ?? []) expect(dose.source, exercise.id).toBeTruthy();
    }
  });

  it('never targets an entry that belongs to no rotation', () => {
    // The climbing days and the §4E battery load plenty but belong to no slot;
    // a target on them would put a test into the "what is stalest" arithmetic.
    const untargeted = EXERCISES.filter((e) => e.target === undefined).map((e) => e.id);
    expect(untargeted).toContain('climbing-limit-boulder');
    expect(untargeted).toContain('test-max-hang-half-crimp');
  });
});

// ─── Fixtures ───────────────────────────────────────────────────────────────

const ex = (id: string, target: Exercise['target'], tier: 'daily-isometric' | 'pool'): Exercise => ({
  id,
  name: id,
  category: 'antagonist',
  target,
  tiers: [{ tier, text: 't', source: 's' }],
  isoType: 'none',
  equipment: ['bodyweight'],
  summary: '',
  howTo: [],
  prescription: '',
  cues: [],
  safetyNotes: [],
  gtgEligible: false,
});

const at = (local: string) => new Date(local).toISOString();

function log(
  startedAt: string,
  completedAt: string | null,
  entries: WorkoutLog['entries'],
): WorkoutLog {
  return { id: startedAt, routineId: 'r', startedAt, completedAt, entries, sessionNotes: '' };
}
const entry = (exerciseId: string, completed: boolean, sets = 0): WorkoutLog['entries'][number] => ({
  exerciseId,
  sets: Array.from({ length: sets }, () => ({ load: '', reps: '', rpe: null })),
  notes: '',
  completed,
});
const check = (exerciseId: string, date: string): Check => ({
  id: `${exerciseId}-${date}`,
  kind: 'gtg-general',
  date,
  notes: '',
  exerciseId,
});

// ─── lastLoadedByExercise ───────────────────────────────────────────────────

describe('lastLoadedByExercise', () => {
  it('counts an exercise marked completed', () => {
    const logs = [log(at('2026-07-20T18:00'), at('2026-07-20T19:00'), [entry('a', true)])];
    expect(lastLoadedByExercise(logs, []).get('a')).toBe('2026-07-20');
  });

  it('counts an exercise with sets but no explicit tick', () => {
    const logs = [log(at('2026-07-20T18:00'), at('2026-07-20T19:00'), [entry('a', false, 2)])];
    expect(lastLoadedByExercise(logs, []).get('a')).toBe('2026-07-20');
  });

  it('ignores an entry that was neither ticked nor logged against', () => {
    const logs = [log(at('2026-07-20T18:00'), at('2026-07-20T19:00'), [entry('a', false)])];
    expect(lastLoadedByExercise(logs, []).has('a')).toBe(false);
  });

  it('counts an in-progress session, unlike routineRotation', () => {
    // An abandoned session must not advance the *routine* order, but an exercise
    // ticked inside a live session was still performed.
    const logs = [log(at('2026-07-20T18:00'), null, [entry('a', true)])];
    expect(lastLoadedByExercise(logs, []).get('a')).toBe('2026-07-20');
  });

  it('counts a check naming the movement', () => {
    expect(lastLoadedByExercise([], [check('a', '2026-07-21')]).get('a')).toBe('2026-07-21');
  });

  it('ignores a check naming no movement', () => {
    const anonymous: Check = { id: 'x', kind: 'gtg-general', date: '2026-07-21', notes: '' };
    expect(lastLoadedByExercise([], [anonymous]).size).toBe(0);
  });

  it('keeps the most recent day across both sources', () => {
    const logs = [log(at('2026-07-22T18:00'), at('2026-07-22T19:00'), [entry('a', true)])];
    const checks = [check('a', '2026-07-20')];
    expect(lastLoadedByExercise(logs, checks).get('a')).toBe('2026-07-22');
  });

  it('reads an evening session as its local day, not the UTC one', () => {
    // The bug localDayKey exists to prevent: string-slicing a UTC timestamp
    // attributes a late local session to tomorrow.
    const logs = [log(at('2026-07-20T23:30'), at('2026-07-20T23:45'), [entry('a', true)])];
    expect(lastLoadedByExercise(logs, []).get('a')).toBe('2026-07-20');
  });
});

// ─── Stalest-first selection ────────────────────────────────────────────────

describe('daily isometric slot selection', () => {
  const catalog = [
    ex('shoulder-1', 'shoulder', 'daily-isometric'),
    ex('shoulder-2', 'shoulder', 'daily-isometric'),
    ex('elbow-1', 'elbow', 'daily-isometric'),
  ];
  const slotFor = (statuses: ReturnType<typeof dailyIsometricsToday>, target: string) =>
    statuses.find((s) => s.target === target)!;

  it('returns every slot every day, in slot order', () => {
    const statuses = dailyIsometricsToday(catalog, [], [], '2026-07-24');
    expect(statuses.map((s) => s.target)).toEqual([...DAILY_ISOMETRIC_SLOTS]);
  });

  it('reports a slot the catalog cannot fill rather than dropping it', () => {
    const knee = slotFor(dailyIsometricsToday(catalog, [], [], '2026-07-24'), 'knee');
    expect(knee.exercise).toBeNull();
    expect(knee.due).toBe(true);
  });

  it('picks the first movement in catalog order when nothing has been logged', () => {
    const shoulder = slotFor(dailyIsometricsToday(catalog, [], [], '2026-07-24'), 'shoulder');
    expect(shoulder.exercise?.id).toBe('shoulder-1');
    expect(shoulder.daysSince).toBeNull();
  });

  it('ranks a never-loaded movement ahead of a recently loaded one', () => {
    const checks = [check('shoulder-1', '2026-07-23')];
    const shoulder = slotFor(dailyIsometricsToday(catalog, [], checks, '2026-07-24'), 'shoulder');
    expect(shoulder.exercise?.id).toBe('shoulder-2');
  });

  it('alternates within the slot as each is done', () => {
    const checks = [check('shoulder-1', '2026-07-22'), check('shoulder-2', '2026-07-23')];
    const shoulder = slotFor(dailyIsometricsToday(catalog, [], checks, '2026-07-24'), 'shoulder');
    expect(shoulder.exercise?.id).toBe('shoulder-1');
  });

  it('is not due when any movement for the target was loaded today', () => {
    // Per-target, not per-movement: a shoulder loaded today is not due today,
    // however long it has been since the *other* shoulder movement.
    const checks = [check('shoulder-2', '2026-07-24')];
    const shoulder = slotFor(dailyIsometricsToday(catalog, [], checks, '2026-07-24'), 'shoulder');
    expect(shoulder.daysSince).toBe(0);
    expect(shoulder.due).toBe(false);
    expect(shoulder.exercise?.id).toBe('shoulder-1'); // still offers the stalest
  });

  it('reports the movement done today, so a tick does not swap the row', () => {
    // The bug this exists to prevent: ticking shoulder-1 makes it the freshest,
    // so `exercise` becomes shoulder-2 and the row changes under the finger.
    const checks = [check('shoulder-1', '2026-07-24')];
    const shoulder = slotFor(dailyIsometricsToday(catalog, [], checks, '2026-07-24'), 'shoulder');
    expect(shoulder.doneToday?.id).toBe('shoulder-1');
    expect(shoulder.exercise?.id).toBe('shoulder-2');
  });

  it('reports no movement done today when the last one was yesterday', () => {
    const checks = [check('shoulder-1', '2026-07-23')];
    const shoulder = slotFor(dailyIsometricsToday(catalog, [], checks, '2026-07-24'), 'shoulder');
    expect(shoulder.doneToday).toBeNull();
  });

  it('is due again the next day', () => {
    const checks = [check('shoulder-2', '2026-07-23')];
    const shoulder = slotFor(dailyIsometricsToday(catalog, [], checks, '2026-07-24'), 'shoulder');
    expect(shoulder.daysSince).toBe(1);
    expect(shoulder.due).toBe(true);
  });

  it('reads a future-dated day as not due rather than throwing off the count', () => {
    const checks = [check('shoulder-1', '2026-07-30')];
    const shoulder = slotFor(dailyIsometricsToday(catalog, [], checks, '2026-07-24'), 'shoulder');
    expect(shoulder.due).toBe(false);
  });
});

// ─── Pool ranking ───────────────────────────────────────────────────────────

describe('poolToday', () => {
  const catalog = POOL_TARGETS.map((t) => ex(`${t}-1`, t, 'pool'));

  it('puts never-loaded targets first', () => {
    const checks = POOL_TARGETS.filter((t) => t !== 'ankle').map((t) => check(`${t}-1`, '2026-07-24'));
    const ranked = poolToday(catalog, [], checks, '2026-07-24');
    expect(ranked[0].target).toBe('ankle');
    expect(ranked[0].daysSince).toBeNull();
  });

  it('ranks by overdue-ness against each target’s own interval, not by raw days', () => {
    // Both three days ago. Elbow's interval is 2 (one day over), ankle's is 4
    // (one day short) — so elbow outranks ankle despite the identical gap.
    const checks = [check('elbow-1', '2026-07-21'), check('ankle-1', '2026-07-21')];
    const others = POOL_TARGETS.filter((t) => t !== 'elbow' && t !== 'ankle').map((t) =>
      check(`${t}-1`, '2026-07-24'),
    );
    const ranked = poolToday(catalog, [], [...checks, ...others], '2026-07-24');
    const order = ranked.map((s) => s.target);
    expect(order.indexOf('elbow')).toBeLessThan(order.indexOf('ankle'));
    expect(ranked.find((s) => s.target === 'elbow')!.due).toBe(true);
    expect(ranked.find((s) => s.target === 'ankle')!.due).toBe(false);
  });

  it('still returns not-yet-due targets, so nothing shows an empty screen', () => {
    const checks = POOL_TARGETS.map((t) => check(`${t}-1`, '2026-07-24'));
    const ranked = poolToday(catalog, [], checks, '2026-07-24');
    expect(ranked).toHaveLength(POOL_TARGETS.length);
    expect(ranked.every((s) => !s.due)).toBe(true);
  });

  it('carries each target’s interval so a surface need not look it up', () => {
    const elbow = poolToday(catalog, [], [], '2026-07-24').find((s) => s.target === 'elbow')!;
    expect(elbow.intervalDays).toBe(POOL_INTERVAL_DAYS.elbow);
  });
});

// ─── Wording ────────────────────────────────────────────────────────────────

describe('describeSlot', () => {
  const slot = (daysSince: number | null) => ({
    target: 'elbow' as const,
    exercise: null,
    doneToday: null,
    daysSince,
    intervalDays: 2,
    due: true,
  });

  it('reports facts only, with no missed or overdue wording (D23)', () => {
    expect(describeSlot(slot(null))).toBe('Not yet logged');
    expect(describeSlot(slot(0))).toBe('Done today');
    expect(describeSlot(slot(1))).toBe('Done yesterday');
    expect(describeSlot(slot(9))).toBe('Done 9 days ago');
    expect(describeSlot(slot(9))).not.toMatch(/overdue|missed|behind/i);
  });
});
