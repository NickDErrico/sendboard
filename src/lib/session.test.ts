import { describe, expect, it } from 'vitest';
import {
  addSet,
  createLog,
  deleteSet,
  finishLog,
  getSets,
  isInProgress,
  setSessionNotes,
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
