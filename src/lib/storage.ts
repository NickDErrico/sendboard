import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Check, Exercise, Routine, Settings, WorkoutLog } from '../types';
import { EXERCISES } from '../data/exercises';
import { ROUTINES } from '../data/routines';

// Single storage module (D4): the only place that touches IndexedDB, so the
// backend can be swapped without changing UI code. All failures surface as a
// typed StorageError rather than a silent undefined.
export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'StorageError';
  }
}

export const DB_VERSION = 1;
const DB_NAME = 'sendboard';
const SETTINGS_KEY = 'app';
const DEFAULT_SETTINGS: Settings = { installGuideDismissed: false };

interface SendboardDB extends DBSchema {
  logs: { key: string; value: WorkoutLog; indexes: { 'by-startedAt': string } };
  checks: { key: string; value: Check };
  settings: { key: string; value: Settings };
}

// The exercise catalog and routines are code-seeded constants (D6): editing the
// source file and redeploying is how the catalog changes. They are deliberately
// NOT persisted in IndexedDB — a no-overwrite copy would go stale the moment the
// source changed, defeating D6's redeploy workflow. IndexedDB holds only mutable
// user data (logs, checks, settings). See T2 amendment for the reasoning behind
// this reading of acceptance criterion 1.

let dbPromise: Promise<IDBPDatabase<SendboardDB>> | null = null;

function getDb(): Promise<IDBPDatabase<SendboardDB>> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new StorageError('IndexedDB is not available in this environment'));
  }
  if (!dbPromise) {
    dbPromise = openDB<SendboardDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1 initial schema. Future versions branch on oldVersion to migrate;
        // this switch is the upgrade-path stub the spec asks for.
        if (oldVersion < 1) {
          const logs = db.createObjectStore('logs', { keyPath: 'id' });
          logs.createIndex('by-startedAt', 'startedAt');
          db.createObjectStore('checks', { keyPath: 'id' });
          db.createObjectStore('settings');
        }
      },
    }).catch((err: unknown) => {
      dbPromise = null;
      throw new StorageError('Failed to open IndexedDB', { cause: err });
    });
  }
  return dbPromise;
}

async function withDb<T>(fn: (db: IDBPDatabase<SendboardDB>) => Promise<T>): Promise<T> {
  try {
    const db = await getDb();
    return await fn(db);
  } catch (err) {
    if (err instanceof StorageError) throw err;
    throw new StorageError('Storage operation failed', { cause: err });
  }
}

// ─── Catalog (read-only, from code constants) ────────────────────────────────
export async function getAllExercises(): Promise<Exercise[]> {
  return EXERCISES;
}
export async function getExercise(id: string): Promise<Exercise | undefined> {
  return EXERCISES.find((e) => e.id === id);
}
export async function getAllRoutines(): Promise<Routine[]> {
  return ROUTINES;
}
export async function getRoutine(id: string): Promise<Routine | undefined> {
  return ROUTINES.find((r) => r.id === id);
}

// ─── Workout logs ────────────────────────────────────────────────────────────
// Concurrent writes from two open instances are last-write-wins (put by id).
export async function saveLog(log: WorkoutLog): Promise<void> {
  await withDb((db) => db.put('logs', log));
}
export async function getLog(id: string): Promise<WorkoutLog | undefined> {
  return withDb((db) => db.get('logs', id));
}
export async function getAllLogs(): Promise<WorkoutLog[]> {
  return withDb(async (db) => {
    const all = await db.getAll('logs');
    return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  });
}
export async function deleteLog(id: string): Promise<void> {
  await withDb((db) => db.delete('logs', id));
}

// ─── Settings ────────────────────────────────────────────────────────────────
export async function getSettings(): Promise<Settings> {
  return withDb(async (db) => {
    const stored = await db.get('settings', SETTINGS_KEY);
    return stored ?? { ...DEFAULT_SETTINGS };
  });
}
export async function saveSettings(settings: Settings): Promise<void> {
  await withDb((db) => db.put('settings', settings, SETTINGS_KEY));
}

// ─── Bulk replace (backup import, T7) ────────────────────────────────────────
// Atomically clears logs, checks, and settings, then writes the supplied data in
// a single transaction — so a mid-write failure cannot leave a half-imported
// store. Callers validate the payload (see lib/backup.ts) before calling this.
export async function replaceAll(data: {
  logs: WorkoutLog[];
  checks: Check[];
  settings: Settings;
}): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction(['logs', 'checks', 'settings'], 'readwrite');
    await tx.objectStore('logs').clear();
    await tx.objectStore('checks').clear();
    await tx.objectStore('settings').clear();
    for (const log of data.logs) await tx.objectStore('logs').put(log);
    for (const check of data.checks) await tx.objectStore('checks').put(check);
    await tx.objectStore('settings').put(data.settings, SETTINGS_KEY);
    await tx.done;
  });
}

// ─── Checks (climbing weekly + GtG daily) ────────────────────────────────────
export async function saveCheck(check: Check): Promise<void> {
  await withDb((db) => db.put('checks', check));
}
export async function deleteCheck(id: string): Promise<void> {
  await withDb((db) => db.delete('checks', id));
}
export async function getAllChecks(): Promise<Check[]> {
  return withDb((db) => db.getAll('checks'));
}

// D10: a week starts Monday 00:00 local. All grouping is computed from local
// calendar dates (year/month/day), never from UTC offsets, so a daylight-saving
// transition inside a week cannot shift the boundary.
function toLocalMidnight(input: string | Date): Date {
  if (input instanceof Date) return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  const [y, m, d] = input.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function dateKey(input: string | Date): string {
  const d = toLocalMidnight(input);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
export function mondayOf(input: string | Date): Date {
  const d = toLocalMidnight(input);
  const daysFromMonday = (d.getDay() + 6) % 7; // getDay: 0=Sun..6=Sat → 0=Mon
  d.setDate(d.getDate() - daysFromMonday);
  return d;
}
export function weekRange(input: string | Date): { startKey: string; endKey: string } {
  const monday = mondayOf(input);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { startKey: dateKey(monday), endKey: dateKey(sunday) };
}

export async function getChecksForWeek(date: string | Date): Promise<Check[]> {
  const { startKey, endKey } = weekRange(date);
  return withDb(async (db) => {
    const all = await db.getAll('checks');
    return all.filter((c) => {
      const key = c.date.slice(0, 10);
      return key >= startKey && key <= endKey;
    });
  });
}
export async function getChecksForDay(date: string | Date): Promise<Check[]> {
  const key = dateKey(date);
  return withDb(async (db) => {
    const all = await db.getAll('checks');
    return all.filter((c) => c.date.slice(0, 10) === key);
  });
}

// ─── Test support ────────────────────────────────────────────────────────────
// Closes and deletes the database so each test starts from an empty store.
export async function _resetForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise.catch(() => null);
    db?.close();
    dbPromise = null;
  }
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}
