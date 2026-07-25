import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import * as storage from './storage';
import {
  BACKUP_SCHEMA_VERSION,
  backupFilename,
  buildBackup,
  collectBackup,
  importBackup,
  parseBackup,
  serializeBackup,
} from './backup';
import type { Check, Settings, WorkoutLog } from '../types';

beforeEach(async () => {
  await storage._resetForTests();
});

function makeLog(id: string, startedAt: string): WorkoutLog {
  return {
    id,
    routineId: 'day-1-fingerboard',
    startedAt,
    completedAt: startedAt,
    entries: [{ exerciseId: 'max-hang-half-crimp', sets: [{ load: '20mm +10kg', reps: '5s', rpe: 8 }], notes: '' }],
    sessionNotes: 'felt strong',
  };
}
function makeCheck(id: string): Check {
  return { id, kind: 'climbing-volume', date: '2026-07-20', notes: '' };
}
const SETTINGS: Settings = { installGuideDismissed: true };

describe('buildBackup / serialize (AC1)', () => {
  it('stamps the current schema version and carries every collection', () => {
    const backup = buildBackup(
      { logs: [makeLog('a', '2026-07-20T10:00:00.000Z')], checks: [makeCheck('c1')], settings: SETTINGS, bodyweight: [] },
      '2026-07-24T07:09:08.123Z',
    );
    expect(backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(backup.exportedAt).toBe('2026-07-24T07:09:08.123Z');
    expect(backup.logs).toHaveLength(1);
    expect(backup.checks).toHaveLength(1);
    expect(backup.settings).toEqual(SETTINGS);
  });

  it('produces a filename with a filesystem-safe timestamp (no colons or dots)', () => {
    const name = backupFilename('2026-07-24T07:09:08.123Z');
    expect(name).toBe('sendboard-backup-2026-07-24T07-09-08-123Z.json');
    expect(name).not.toMatch(/[:.](?!json)/);
  });

  it('round-trips through serialize → parse', () => {
    const backup = buildBackup(
      { logs: [makeLog('a', '2026-07-20T10:00:00.000Z')], checks: [makeCheck('c1')], settings: SETTINGS, bodyweight: [] },
      '2026-07-24T07:09:08.123Z',
    );
    const result = parseBackup(serializeBackup(backup));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual(backup);
  });
});

describe('parseBackup validation (AC3, AC5)', () => {
  it('rejects malformed JSON as malformed', () => {
    const result = parseBackup('{ not json');
    expect(result).toMatchObject({ ok: false, reason: 'malformed' });
  });

  it('rejects a truncated (partial) file as malformed', () => {
    const good = serializeBackup(buildBackup({ logs: [], checks: [], settings: SETTINGS, bodyweight: [] }, '2026-07-24T00:00:00.000Z'));
    const result = parseBackup(good.slice(0, Math.floor(good.length / 2)));
    expect(result).toMatchObject({ ok: false, reason: 'malformed' });
  });

  it('rejects a wrong schemaVersion as unsupported-version, distinct from malformed', () => {
    const result = parseBackup(JSON.stringify({ schemaVersion: 999, logs: [], checks: [], settings: SETTINGS }));
    expect(result).toMatchObject({ ok: false, reason: 'unsupported-version' });
    if (!result.ok) expect(result.message).toContain('999');
  });

  it('rejects a non-object (JSON array) as malformed', () => {
    expect(parseBackup('[1,2,3]')).toMatchObject({ ok: false, reason: 'malformed' });
  });

  it('rejects an object missing the collections as malformed', () => {
    const result = parseBackup(JSON.stringify({ schemaVersion: BACKUP_SCHEMA_VERSION, settings: SETTINGS }));
    expect(result).toMatchObject({ ok: false, reason: 'malformed' });
  });

  it('accepts a valid backup', () => {
    const text = serializeBackup(buildBackup({ logs: [], checks: [], settings: SETTINGS, bodyweight: [] }, '2026-07-24T00:00:00.000Z'));
    expect(parseBackup(text).ok).toBe(true);
  });
});

describe('collect → import round trip through storage (AC2)', () => {
  it('exports current data and restores it into an empty store', async () => {
    await storage.saveLog(makeLog('a', '2026-07-20T10:00:00.000Z'));
    await storage.saveCheck(makeCheck('c1'));
    await storage.saveSettings(SETTINGS);

    const backup = await collectBackup('2026-07-24T07:09:08.123Z');
    expect(backup.logs).toHaveLength(1);
    expect(backup.checks).toHaveLength(1);

    await storage._resetForTests();
    expect(await storage.getAllLogs()).toHaveLength(0);

    await importBackup(backup);
    expect(await storage.getAllLogs()).toHaveLength(1);
    expect(await storage.getAllChecks()).toHaveLength(1);
    expect(await storage.getSettings()).toEqual(SETTINGS);
  });

  // T18 AC9. Gear rides inside `settings`, which the backup carries whole — the
  // same property that made T16's standardEdgeMm free. Asserted rather than
  // assumed, because a board and a load increment silently lost on restore would
  // put the keyboard back with no visible reason.
  it('round-trips gear, and a settings object written before T18 reads as none', async () => {
    await storage.saveSettings({
      installGuideDismissed: true,
      standardEdgeMm: 20,
      edgesMm: [20, 18, 15, 10],
      loadStepLb: 2.5,
    });

    const backup = await collectBackup('2026-07-25T07:09:08.123Z');
    expect(backup.settings.edgesMm).toEqual([20, 18, 15, 10]);

    await storage._resetForTests();
    await importBackup(backup);
    expect(await storage.getSettings()).toEqual({
      installGuideDismissed: true,
      standardEdgeMm: 20,
      edgesMm: [20, 18, 15, 10],
      loadStepLb: 2.5,
    });

    // A pre-T18 file: the fields are simply absent, which is exactly what
    // "no gear configured" means — no migration, no default board invented.
    await storage._resetForTests();
    await importBackup(
      buildBackup(
        { logs: [], checks: [], settings: { installGuideDismissed: true }, bodyweight: [] },
        '2026-07-25T07:09:08.123Z',
      ),
    );
    const restored = await storage.getSettings();
    expect(restored.edgesMm).toBeUndefined();
    expect(restored.loadStepLb).toBeUndefined();
  });

  it('replaces existing data rather than merging (AC4 semantics)', async () => {
    // Pre-existing data that should be wiped by the import.
    await storage.saveLog(makeLog('old-1', '2026-07-01T10:00:00.000Z'));
    await storage.saveLog(makeLog('old-2', '2026-07-02T10:00:00.000Z'));
    await storage.saveCheck(makeCheck('old-check'));

    const incoming = buildBackup(
      { logs: [makeLog('new-1', '2026-07-20T10:00:00.000Z')], checks: [], settings: SETTINGS, bodyweight: [] },
      '2026-07-24T07:09:08.123Z',
    );
    await importBackup(incoming);

    const logs = await storage.getAllLogs();
    expect(logs.map((l) => l.id)).toEqual(['new-1']);
    expect(await storage.getAllChecks()).toHaveLength(0);
  });

  it('exports a valid file even with zero logs (edge case)', async () => {
    const backup = await collectBackup('2026-07-24T00:00:00.000Z');
    expect(backup.logs).toEqual([]);
    expect(parseBackup(serializeBackup(backup)).ok).toBe(true);
  });
});

// ─── Bodyweight and older-file compatibility (T15 AC6, AC7; D28) ─────────────

describe('bodyweight in a backup (AC6)', () => {
  it('carries readings out and back in', async () => {
    await storage.saveBodyweight({ date: '2026-07-20', lb: 176 });
    await storage.saveBodyweight({ date: '2026-07-13', lb: 178 });

    const backup = await collectBackup('2026-07-24T07:09:08.123Z');
    expect(backup.bodyweight).toEqual([
      { date: '2026-07-13', lb: 178 },
      { date: '2026-07-20', lb: 176 },
    ]);

    await storage._resetForTests();
    await importBackup(backup);
    expect(await storage.getAllBodyweights()).toHaveLength(2);
  });

  it('replaces readings rather than merging them', async () => {
    await storage.saveBodyweight({ date: '2026-01-01', lb: 999 });
    await importBackup(
      buildBackup(
        { logs: [], checks: [], settings: SETTINGS, bodyweight: [{ date: '2026-07-20', lb: 176 }] },
        '2026-07-24T00:00:00.000Z',
      ),
    );
    expect(await storage.getAllBodyweights()).toEqual([{ date: '2026-07-20', lb: 176 }]);
  });

  it('clears stale readings when importing a file that has none', async () => {
    // Otherwise a pre-T15 restore would leave an orphaned denominator behind for
    // the new logs to be silently divided by.
    await storage.saveBodyweight({ date: '2026-01-01', lb: 999 });
    await importBackup(
      buildBackup({ logs: [], checks: [], settings: SETTINGS, bodyweight: [] }, '2026-07-24T00:00:00.000Z'),
    );
    expect(await storage.getAllBodyweights()).toEqual([]);
  });
});

describe('older backups are upgraded, not refused (AC7, D28)', () => {
  // A v1 file, exactly as T7 wrote it: no bodyweight key at all.
  const v1 = JSON.stringify({
    schemaVersion: 1,
    exportedAt: '2026-07-24T00:00:00.000Z',
    logs: [makeLog('a', '2026-07-20T10:00:00.000Z')],
    checks: [makeCheck('c1')],
    settings: SETTINGS,
  });

  it('reads a v1 file, filling in an empty bodyweight collection', () => {
    const result = parseBackup(v1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.logs).toHaveLength(1);
    expect(result.data.bodyweight).toEqual([]);
    // Normalized to the current version, so what is written back is honest.
    expect(result.data.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
  });

  it('reports which version it upgraded from, so the owner is told', () => {
    const result = parseBackup(v1);
    if (!result.ok) throw new Error('expected ok');
    expect(result.upgradedFrom).toBe(1);
  });

  it('does not claim an upgrade for a current-version file', () => {
    const current = serializeBackup(
      buildBackup({ logs: [], checks: [], settings: SETTINGS, bodyweight: [] }, '2026-07-24T00:00:00.000Z'),
    );
    const result = parseBackup(current);
    if (!result.ok) throw new Error('expected ok');
    expect(result.upgradedFrom).toBeUndefined();
  });

  it('still refuses a newer file, because it cannot know what it would drop', () => {
    const future = JSON.stringify({
      schemaVersion: BACKUP_SCHEMA_VERSION + 1,
      logs: [],
      checks: [],
      settings: SETTINGS,
      bodyweight: [],
    });
    expect(parseBackup(future)).toMatchObject({ ok: false, reason: 'unsupported-version' });
  });

  it('restores a v1 file end to end', async () => {
    const result = parseBackup(v1);
    if (!result.ok) throw new Error('expected ok');
    await importBackup(result.data);
    expect(await storage.getAllLogs()).toHaveLength(1);
    expect(await storage.getAllChecks()).toHaveLength(1);
    expect(await storage.getAllBodyweights()).toEqual([]);
  });

  it('treats a non-array bodyweight on a current-version file as no readings', () => {
    const bad = JSON.stringify({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      logs: [],
      checks: [],
      settings: SETTINGS,
      bodyweight: 'heavy',
    });
    const result = parseBackup(bad);
    if (!result.ok) throw new Error('expected ok');
    expect(result.data.bodyweight).toEqual([]);
  });
});
