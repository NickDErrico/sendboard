import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import * as storage from './storage';
import { EXERCISES } from '../data/exercises';
import { ROUTINES } from '../data/routines';
import type { Check, CheckKind, WorkoutLog } from '../types';

beforeEach(async () => {
  await storage._resetForTests();
});

function makeLog(id: string, startedAt: string): WorkoutLog {
  return {
    id,
    routineId: 'day-1-fingerboard',
    startedAt,
    completedAt: null,
    entries: [],
    sessionNotes: '',
  };
}
function makeCheck(id: string, kind: CheckKind, date: string): Check {
  return { id, kind, date, notes: '' };
}

describe('catalog (AC1, AC4, AC5)', () => {
  // 21 training entries (T33 added §8's scapular pull-ups / dead hangs) + T16's
  // five §4E test-only entries + the joint rotation's ten (six daily tendon
  // isometrics and four pool movements covering the targets the catalog left
  // uncovered — elbow, wrist, knee, ankle). 2 training routines, T34's §10D
  // daily, and T16's non-rotating battery. The rotation adds no routine: it is
  // scheduled by target rather than by session (see pool.ts).
  it('exposes all 36 exercises and 4 routines from an empty database', async () => {
    expect(await storage.getAllExercises()).toHaveLength(36);
    expect(await storage.getAllRoutines()).toHaveLength(4);
  });

  it('is stable across a re-init and never overwritten', async () => {
    const first = await storage.getAllExercises();
    await storage._resetForTests();
    const second = await storage.getAllExercises();
    expect(second).toHaveLength(first.length);
  });

  it('has non-empty summary, howTo and prescription for every exercise (AC4)', async () => {
    for (const ex of await storage.getAllExercises()) {
      expect(ex.summary.trim(), ex.id).not.toBe('');
      expect(ex.howTo.length, ex.id).toBeGreaterThan(0);
      expect(ex.prescription.trim(), ex.id).not.toBe('');
    }
  });

  it('has unique exercise ids', () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has every routine exerciseId present in the catalog (AC5)', () => {
    const ids = new Set(EXERCISES.map((e) => e.id));
    for (const routine of ROUTINES) {
      for (const exId of routine.exerciseIds) {
        expect(ids.has(exId), `${routine.id} → ${exId}`).toBe(true);
      }
    }
  });

  // T33 added the seventh: §8 names scapular pull-ups / dead hangs on the same
  // committed list — and names it as the pulling movement to *prefer* — but no
  // section described it, so the catalog had the option the plan warns about and
  // not the one it recommends. §10C writes the execution down; the dose, trigger
  // and risk class are still §8's.
  it('marks exactly §8s seven committed movements (D13, T33)', () => {
    const eligible = EXERCISES.filter((e) => e.gtgEligible).map((e) => e.id).sort();
    expect(eligible).toEqual(
      [
        'bodyweight-pullups',
        'external-rotations',
        'kb-goblet-squat',
        'oi-wall-press',
        'pushups-or-dips',
        'scapular-pullups-dead-hangs',
        'wrist-extensor-work',
      ].sort(),
    );
  });
});

describe('workout logs (AC2)', () => {
  it('saves a log and retrieves it by id', async () => {
    await storage.saveLog(makeLog('a', '2026-07-20T10:00:00.000Z'));
    const got = await storage.getLog('a');
    expect(got?.id).toBe('a');
  });

  it('returns logs sorted by startedAt descending', async () => {
    await storage.saveLog(makeLog('old', '2026-07-18T10:00:00.000Z'));
    await storage.saveLog(makeLog('new', '2026-07-22T10:00:00.000Z'));
    await storage.saveLog(makeLog('mid', '2026-07-20T10:00:00.000Z'));
    const ids = (await storage.getAllLogs()).map((l) => l.id);
    expect(ids).toEqual(['new', 'mid', 'old']);
  });

  it('returns an empty array when no logs exist', async () => {
    expect(await storage.getAllLogs()).toEqual([]);
  });
});

describe('settings (AC3)', () => {
  it('returns a default object, not undefined, when nothing is stored', async () => {
    const settings = await storage.getSettings();
    expect(settings).toEqual({ installGuideDismissed: false });
  });

  it('persists and reloads settings', async () => {
    await storage.saveSettings({ installGuideDismissed: true });
    expect((await storage.getSettings()).installGuideDismissed).toBe(true);
  });
});

describe('checks (AC3a, AC3b, D10)', () => {
  it('returns empty arrays for a period with no checks (AC3b)', async () => {
    expect(await storage.getChecksForWeek('2026-07-23')).toEqual([]);
    expect(await storage.getChecksForDay('2026-07-23')).toEqual([]);
  });

  it('groups checks into the Monday-start week and the local day (AC3a)', async () => {
    // Week of Thu 2026-07-23 = Mon 2026-07-20 .. Sun 2026-07-26.
    await storage.saveCheck(makeCheck('mon', 'climbing-volume', '2026-07-20'));
    await storage.saveCheck(makeCheck('wed', 'gtg-general', '2026-07-22'));
    await storage.saveCheck(makeCheck('sun', 'climbing-limit', '2026-07-26'));
    await storage.saveCheck(makeCheck('nextmon', 'gtg-general', '2026-07-27'));

    const week = (await storage.getChecksForWeek('2026-07-23')).map((c) => c.id).sort();
    expect(week).toEqual(['mon', 'sun', 'wed']);

    const day = (await storage.getChecksForDay('2026-07-22')).map((c) => c.id);
    expect(day).toEqual(['wed']);
  });

  it('places Sunday 07-26 and Monday 07-27 in different weeks (D10 boundary)', async () => {
    await storage.saveCheck(makeCheck('sun', 'climbing-volume', '2026-07-26'));
    await storage.saveCheck(makeCheck('mon', 'climbing-volume', '2026-07-27'));

    expect((await storage.getChecksForWeek('2026-07-26')).map((c) => c.id)).toEqual(['sun']);
    expect((await storage.getChecksForWeek('2026-07-27')).map((c) => c.id)).toEqual(['mon']);
  });

  it('removes a check (T5b un-check)', async () => {
    await storage.saveCheck(makeCheck('x', 'gtg-pull', '2026-07-23'));
    await storage.deleteCheck('x');
    expect(await storage.getChecksForDay('2026-07-23')).toEqual([]);
  });
});

describe('week grouping is daylight-saving safe (edge)', () => {
  it('maps every day of a DST-transition week to the same Monday boundary', () => {
    // US spring-forward week: Mon 2026-03-02 .. Sun 2026-03-08 (DST change 03-08).
    const days = ['03-02', '03-03', '03-04', '03-05', '03-06', '03-07', '03-08'];
    for (const d of days) {
      const range = storage.weekRange(`2026-${d}`);
      expect(range.startKey, d).toBe('2026-03-02');
      expect(range.endKey, d).toBe('2026-03-08');
    }
  });
});

describe('error handling (AC6)', () => {
  it('rejects with StorageError when IndexedDB is unavailable', async () => {
    const g = globalThis as unknown as { indexedDB?: IDBFactory };
    const saved = g.indexedDB;
    g.indexedDB = undefined;
    try {
      await expect(storage.getSettings()).rejects.toBeInstanceOf(storage.StorageError);
    } finally {
      g.indexedDB = saved;
    }
  });
});

// ─── Bodyweight store (T15 AC1, AC8) ─────────────────────────────────────────

describe('bodyweight', () => {
  it('stores one reading per local day, replacing rather than accumulating', async () => {
    await storage.saveBodyweight({ date: '2026-07-20', lb: 176 });
    await storage.saveBodyweight({ date: '2026-07-20', lb: 177.5 });
    expect(await storage.getAllBodyweights()).toEqual([{ date: '2026-07-20', lb: 177.5 }]);
  });

  it('returns readings oldest first', async () => {
    await storage.saveBodyweight({ date: '2026-07-20', lb: 176 });
    await storage.saveBodyweight({ date: '2026-07-01', lb: 180 });
    await storage.saveBodyweight({ date: '2026-07-13', lb: 178 });
    expect((await storage.getAllBodyweights()).map((e) => e.date)).toEqual([
      '2026-07-01',
      '2026-07-13',
      '2026-07-20',
    ]);
  });

  it('deletes by date', async () => {
    await storage.saveBodyweight({ date: '2026-07-20', lb: 176 });
    await storage.deleteBodyweight('2026-07-20');
    expect(await storage.getAllBodyweights()).toEqual([]);
  });

  it('reads as empty before anything is recorded', async () => {
    expect(await storage.getAllBodyweights()).toEqual([]);
  });
});

describe('v1 → v2 upgrade (T15 AC8)', () => {
  // The owner's whole 8-week log has to survive a feature, not just a deploy
  // (T13's finding). This builds the database exactly as T14 and earlier left it
  // — v1, three stores, real data — and then opens it through the app's own
  // storage module, which requests v2.
  async function buildV1Database(): Promise<void> {
    await storage._resetForTests();
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('sendboard', 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        const logs = d.createObjectStore('logs', { keyPath: 'id' });
        logs.createIndex('by-startedAt', 'startedAt');
        d.createObjectStore('checks', { keyPath: 'id' });
        d.createObjectStore('settings');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['logs', 'checks', 'settings'], 'readwrite');
      tx.objectStore('logs').put({
        id: 'pre-upgrade',
        routineId: 'day-1-fingerboard',
        startedAt: '2026-07-18T18:00:00.000Z',
        completedAt: '2026-07-18T19:00:00.000Z',
        entries: [
          {
            exerciseId: 'max-hang-half-crimp',
            notes: '',
            completed: true,
            sets: [{ load: '', reps: '', rpe: null, holdSec: 8, addedLb: 30, edgeMm: 20 }],
          },
        ],
        sessionNotes: 'written by a v1 database',
      });
      tx.objectStore('checks').put({
        id: 'c-old',
        kind: 'climbing-volume',
        date: '2026-07-18',
        notes: '',
      });
      tx.objectStore('settings').put({ installGuideDismissed: true }, 'app');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  it('keeps every pre-existing record and adds the new store', async () => {
    await buildV1Database();

    // First read through the app's module triggers the upgrade to DB_VERSION.
    const logs = await storage.getAllLogs();
    expect(logs.map((l) => l.id)).toEqual(['pre-upgrade']);
    expect(logs[0].entries[0].sets[0].addedLb).toBe(30);
    expect(await storage.getAllChecks()).toHaveLength(1);
    expect(await storage.getSettings()).toEqual({ installGuideDismissed: true });

    // The v2 store exists and is empty — nothing is backfilled, because no
    // bodyweight was recorded before it existed (D24).
    expect(await storage.getAllBodyweights()).toEqual([]);
  });

  it('accepts writes to the new store immediately after upgrading', async () => {
    await buildV1Database();
    await storage.saveBodyweight({ date: '2026-07-20', lb: 176 });
    expect(await storage.getAllBodyweights()).toEqual([{ date: '2026-07-20', lb: 176 }]);
    // And the upgraded log is still there alongside it.
    expect(await storage.getAllLogs()).toHaveLength(1);
  });
});
