import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import * as storage from './storage';
import { finishSession, leaveSession, startSession } from './openSession';
import { addSet, setSessionNotes } from './session';
import type { WorkoutLog } from '../types';

beforeEach(async () => {
  await storage._resetForTests();
});

const open = async () => (await storage.getAllLogs()).filter((l) => l.completedAt === null);

describe('startSession', () => {
  it('creates one in-progress log for the routine', async () => {
    const log = await startSession('day-1-fingerboard');
    expect(log.routineId).toBe('day-1-fingerboard');
    expect(log.completedAt).toBeNull();
    expect(await open()).toHaveLength(1);
  });

  it('sweeps a log left behind by a force-close mid-look', async () => {
    const abandoned = await startSession('day-1-fingerboard');
    const fresh = await startSession('day-3-pull-antagonist');
    expect((await open()).map((l) => l.id)).toEqual([fresh.id]);
    expect(await storage.getLog(abandoned.id)).toBeUndefined();
  });

  it('never sweeps a session that recorded something', async () => {
    const real = await startSession('day-1-fingerboard');
    await storage.saveLog(addSet(real, 'max-hang-half-crimp'));
    await startSession('day-3-pull-antagonist');
    // Two open logs is the state the start guards exist to prevent — this
    // asserts only that `startSession` will not resolve it by deleting work.
    expect(await storage.getLog(real.id)).toBeDefined();
  });
});

describe('leaveSession', () => {
  it('discards a session that recorded nothing', async () => {
    const log = await startSession('day-1-fingerboard');
    await leaveSession(log);
    expect(await open()).toEqual([]);
  });

  it('leaves a real session in progress, to be resumed', async () => {
    const log = addSet(await startSession('day-1-fingerboard'), 'max-hang-half-crimp');
    await storage.saveLog(log);
    await leaveSession(log);
    expect((await open()).map((l) => l.id)).toEqual([log.id]);
  });
});

describe('finishSession', () => {
  it('completes a session that recorded something', async () => {
    const log = setSessionNotes(await startSession('day-1-fingerboard'), 'felt strong');
    await finishSession(log, '2026-07-23T19:00:00.000Z');
    const stored = (await storage.getLog(log.id)) as WorkoutLog;
    expect(stored.completedAt).toBe('2026-07-23T19:00:00.000Z');
    expect(stored.sessionNotes).toBe('felt strong');
  });

  it('discards an empty one instead of writing a blank session into History', async () => {
    const log = await startSession('day-1-fingerboard');
    await finishSession(log, '2026-07-23T19:00:00.000Z');
    expect(await storage.getAllLogs()).toEqual([]);
  });
});
