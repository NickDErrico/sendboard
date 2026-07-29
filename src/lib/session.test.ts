import { describe, expect, it } from 'vitest';
import {
  addSet,
  createLog,
  deleteSet,
  finishLog,
  getSets,
  isExerciseCompleted,
  isInProgress,
  isStarted,
  resumable,
  setExerciseCompleted,
  setExerciseNotes,
  setSessionNotes,
  unstarted,
  updateSet,
} from './session';

const base = () => createLog('day-1-fingerboard', 'log-1', '2026-07-23T18:00:00.000Z');

describe('createLog (AC1)', () => {
  it('starts in progress with no entries', () => {
    const log = base();
    expect(log.startedAt).toBe('2026-07-23T18:00:00.000Z');
    expect(log.completedAt).toBeNull();
    expect(log.entries).toEqual([]);
    expect(isInProgress(log)).toBe(true);
  });
});

describe('addSet (AC3, rapid-tap edge)', () => {
  it('lazily creates an entry and appends a blank set', () => {
    const log = addSet(base(), 'pima-finger-pull-half-crimp');
    expect(getSets(log, 'pima-finger-pull-half-crimp')).toEqual([{ load: '', reps: '', rpe: null }]);
  });

  it('appends one set per call with no dropped or shared entries', () => {
    let log = base();
    for (let i = 0; i < 5; i++) log = addSet(log, 'max-hang-half-crimp');
    expect(getSets(log, 'max-hang-half-crimp')).toHaveLength(5);
    // sets must be distinct objects, not shared references
    log = updateSet(log, 'max-hang-half-crimp', 0, { load: '20mm +10kg' });
    expect(getSets(log, 'max-hang-half-crimp')[0].load).toBe('20mm +10kg');
    expect(getSets(log, 'max-hang-half-crimp')[1].load).toBe('');
  });

  it('does not mutate the input log', () => {
    const log = base();
    addSet(log, 'max-hang-half-crimp');
    expect(log.entries).toEqual([]);
  });
});

describe('updateSet', () => {
  it('updates only the targeted set field (free-text load/reps, numeric rpe)', () => {
    let log = addSet(base(), 'oi-wall-press');
    log = updateSet(log, 'oi-wall-press', 0, { load: '5s', reps: '3', rpe: 9 });
    expect(getSets(log, 'oi-wall-press')[0]).toEqual({ load: '5s', reps: '3', rpe: 9 });
  });
});

describe('deleteSet + zero-set omission (AC6)', () => {
  it('removes the targeted set', () => {
    let log = base();
    log = addSet(log, 'pushups-or-dips');
    log = addSet(log, 'pushups-or-dips');
    log = updateSet(log, 'pushups-or-dips', 1, { reps: '10' });
    log = deleteSet(log, 'pushups-or-dips', 0);
    expect(getSets(log, 'pushups-or-dips')).toEqual([{ load: '', reps: '10', rpe: null }]);
  });

  it('omits an exercise once its last set is deleted', () => {
    let log = addSet(base(), 'kb-goblet-squat');
    log = deleteSet(log, 'kb-goblet-squat', 0);
    expect(log.entries.find((e) => e.exerciseId === 'kb-goblet-squat')).toBeUndefined();
  });

  it('leaves untouched exercises out of entries entirely', () => {
    const log = addSet(base(), 'pima-finger-pull-half-crimp');
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0].exerciseId).toBe('pima-finger-pull-half-crimp');
  });
});

describe('setExerciseCompleted (T9 AC7/AC8, D16)', () => {
  it('persists a completed exercise that has no sets and no notes', () => {
    const log = setExerciseCompleted(base(), 'kb-turkish-getup', true);
    const entry = log.entries.find((e) => e.exerciseId === 'kb-turkish-getup');
    expect(entry).toEqual({ exerciseId: 'kb-turkish-getup', sets: [], notes: '', completed: true });
    expect(isExerciseCompleted(log, 'kb-turkish-getup')).toBe(true);
  });

  it('prunes the entry when un-completed with nothing else on it (AC8)', () => {
    let log = setExerciseCompleted(base(), 'kb-turkish-getup', true);
    log = setExerciseCompleted(log, 'kb-turkish-getup', false);
    expect(log.entries).toEqual([]);
    expect(isExerciseCompleted(log, 'kb-turkish-getup')).toBe(false);
  });

  it('keeps the entry when un-completed but sets remain', () => {
    let log = setExerciseCompleted(base(), 'max-hang-half-crimp', true);
    log = addSet(log, 'max-hang-half-crimp');
    log = setExerciseCompleted(log, 'max-hang-half-crimp', false);
    expect(getSets(log, 'max-hang-half-crimp')).toHaveLength(1);
    expect(isExerciseCompleted(log, 'max-hang-half-crimp')).toBe(false);
  });

  it('survives on the completed flag alone after its last set is deleted (edge case)', () => {
    let log = setExerciseCompleted(base(), 'oi-wall-press', true);
    log = addSet(log, 'oi-wall-press');
    log = deleteSet(log, 'oi-wall-press', 0);
    expect(isExerciseCompleted(log, 'oi-wall-press')).toBe(true);
    expect(getSets(log, 'oi-wall-press')).toEqual([]);
  });

  it('does not mark an exercise completed just because a set was added (non-goal)', () => {
    const log = addSet(base(), 'pima-finger-pull-half-crimp');
    expect(isExerciseCompleted(log, 'pima-finger-pull-half-crimp')).toBe(false);
  });

  it('preserves completion across other edits', () => {
    let log = setExerciseCompleted(base(), 'external-rotations', true);
    log = setExerciseNotes(log, 'external-rotations', 'band, blue');
    log = addSet(log, 'external-rotations');
    log = updateSet(log, 'external-rotations', 0, { reps: '15/side' });
    expect(isExerciseCompleted(log, 'external-rotations')).toBe(true);
  });

  it('treats a pre-T9 entry with no completed field as not completed', () => {
    // Shape written by an older build (or an older backup file).
    const log = { ...base(), entries: [{ exerciseId: 'pushups-or-dips', sets: [], notes: 'ok' }] };
    expect(isExerciseCompleted(log, 'pushups-or-dips')).toBe(false);
    // …and it must not be pruned by the new predicate — its notes still count.
    expect(setExerciseNotes(log, 'pushups-or-dips', 'ok').entries).toHaveLength(1);
  });
});

describe('isStarted (D46)', () => {
  it('is false for a log nobody has written in', () => {
    expect(isStarted(base())).toBe(false);
  });

  it('is true once a set is added', () => {
    expect(isStarted(addSet(base(), 'max-hang-half-crimp'))).toBe(true);
  });

  it('is true on a completion mark alone — D16 makes that tap a thing that happened', () => {
    expect(isStarted(setExerciseCompleted(base(), 'kb-turkish-getup', true))).toBe(true);
  });

  it('is true on exercise notes alone', () => {
    expect(isStarted(setExerciseNotes(base(), 'oi-wall-press', 'left side tender'))).toBe(true);
  });

  it('is true on session notes alone, and not on whitespace', () => {
    expect(isStarted(setSessionNotes(base(), 'felt strong'))).toBe(true);
    expect(isStarted(setSessionNotes(base(), '   '))).toBe(false);
  });

  it('goes back to false when the only thing recorded is taken away again', () => {
    // The pruning in `mapEntry` is what makes this exact: a set added and
    // deleted leaves no entry, so backing out is as empty as never starting.
    let log = addSet(base(), 'max-hang-half-crimp');
    log = deleteSet(log, 'max-hang-half-crimp', 0);
    expect(isStarted(log)).toBe(false);
  });
});

describe('resumable / unstarted (D46)', () => {
  const empty = { ...base(), id: 'empty' };
  const started = addSet({ ...base(), id: 'started' }, 'max-hang-half-crimp');
  const done = finishLog(addSet({ ...base(), id: 'done' }, 'max-hang-half-crimp'), '2026-07-23T19:00:00.000Z');

  it('offers only an unfinished session that recorded something', () => {
    expect(resumable([empty, started, done])?.id).toBe('started');
    expect(resumable([empty])).toBeNull();
    expect(resumable([done])).toBeNull();
    expect(resumable([])).toBeNull();
  });

  it('collects the unfinished logs that recorded nothing, and no others', () => {
    expect(unstarted([empty, started, done]).map((l) => l.id)).toEqual(['empty']);
  });

  it('never treats a completed session as sweepable, however empty', () => {
    // Pre-D46 builds could complete an empty log; it is history now, not litter.
    const emptyCompleted = finishLog({ ...base(), id: 'old' }, '2026-07-23T19:00:00.000Z');
    expect(unstarted([emptyCompleted])).toEqual([]);
  });
});

describe('finishLog (AC5) + notes', () => {
  it('sets completedAt and ends in-progress', () => {
    const log = finishLog(base(), '2026-07-23T19:00:00.000Z');
    expect(log.completedAt).toBe('2026-07-23T19:00:00.000Z');
    expect(isInProgress(log)).toBe(false);
  });

  it('records session notes', () => {
    const log = setSessionNotes(base(), 'felt strong');
    expect(log.sessionNotes).toBe('felt strong');
  });
});
