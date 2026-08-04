import type { BodyweightEntry, Check, Settings, WorkoutLog } from '../types';
import { getAllBodyweights, getAllChecks, getAllLogs, getSettings, replaceAll } from './storage';

// T7 backup format. This version describes the shape of the EXPORT FILE and is
// independent of the IndexedDB `DB_VERSION`. Bump it when the file shape changes.
// v2 (T15) adds `bodyweight`.
export const BACKUP_SCHEMA_VERSION = 2;

/**
 * The oldest file this build still reads (D28).
 *
 * Older files are upgraded, never refused: a collection the file predates reads
 * as empty, exactly as an absent optional field does. Refusing them would turn
 * every backup the owner already exported into "unsupported version" the moment
 * the app gained a feature — which would invert D5, since manual export exists
 * precisely because on-device data is one cache-clear from gone.
 *
 * The asymmetry is deliberate. A *newer* file is still refused, because the app
 * cannot know what it would be dropping, and a silent partial import of an
 * 8-week log is worse than a clear refusal.
 */
const MIN_READABLE_SCHEMA_VERSION = 1;

export interface BackupFile {
  schemaVersion: number;
  exportedAt: string; // ISO 8601
  logs: WorkoutLog[];
  checks: Check[];
  settings: Settings;
  bodyweight: BodyweightEntry[]; // v2+; a v1 file reads as []
}

// Export scope (D6): logs, checks, and settings only — NOT the exercise catalog,
// which is code-seeded and ships with the app.
export function buildBackup(
  data: { logs: WorkoutLog[]; checks: Check[]; settings: Settings; bodyweight: BodyweightEntry[] },
  exportedAt: string,
): BackupFile {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt,
    logs: data.logs,
    checks: data.checks,
    settings: data.settings,
    bodyweight: data.bodyweight,
  };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

// Filename-safe ISO timestamp: ':' and '.' are invalid in filenames on iOS and
// Windows, so replace them. e.g. sendboard-backup-2026-07-24T07-09-08-123Z.json
export function backupFilename(exportedAt: string): string {
  return `sendboard-backup-${exportedAt.replace(/[:.]/g, '-')}.json`;
}

type ParseResult =
  | {
      ok: true;
      data: BackupFile;
      /** Set when an older file was upgraded (D28), so the owner is told rather than surprised. */
      upgradedFrom?: number;
    }
  | { ok: false; reason: 'malformed' | 'unsupported-version'; message: string };

// Pure validation — no storage side effects, so callers can safely decide before
// touching data (AC5: malformed leaves existing data untouched).
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      ok: false,
      reason: 'malformed',
      message: 'That file is not valid JSON. Nothing was changed.',
    };
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return {
      ok: false,
      reason: 'malformed',
      message: 'That file is not a Sendboard backup. Nothing was changed.',
    };
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.schemaVersion !== 'number') {
    return {
      ok: false,
      reason: 'malformed',
      message: 'That file is not a Sendboard backup. Nothing was changed.',
    };
  }
  // Newer than this build → refused, because the app cannot know what it would
  // be dropping. Older → read and upgraded below (D28).
  if (
    obj.schemaVersion > BACKUP_SCHEMA_VERSION ||
    obj.schemaVersion < MIN_READABLE_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      reason: 'unsupported-version',
      message: `Unsupported backup version (${obj.schemaVersion}). This app reads versions ${MIN_READABLE_SCHEMA_VERSION}–${BACKUP_SCHEMA_VERSION}. Nothing was changed.`,
    };
  }
  if (
    !Array.isArray(obj.logs) ||
    !Array.isArray(obj.checks) ||
    typeof obj.settings !== 'object' ||
    obj.settings === null
  ) {
    return {
      ok: false,
      reason: 'malformed',
      message: 'That backup is missing required data. Nothing was changed.',
    };
  }
  // A v1 file has no `bodyweight` at all; a v2 one with a non-array there is
  // malformed rather than old, so it is read as empty rather than trusted.
  const bodyweight = Array.isArray(obj.bodyweight) ? (obj.bodyweight as BodyweightEntry[]) : [];
  const upgradedFrom =
    obj.schemaVersion < BACKUP_SCHEMA_VERSION ? (obj.schemaVersion as number) : undefined;
  return {
    ok: true,
    ...(upgradedFrom === undefined ? {} : { upgradedFrom }),
    data: {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
      logs: obj.logs as WorkoutLog[],
      checks: obj.checks as Check[],
      settings: obj.settings as Settings,
      bodyweight,
    },
  };
}

// ─── IO (thin wrappers; not unit-tested for DOM behavior) ────────────────────

// Gather everything currently stored into a backup file object.
export async function collectBackup(exportedAt: string): Promise<BackupFile> {
  const [logs, checks, settings, bodyweight] = await Promise.all([
    getAllLogs(),
    getAllChecks(),
    getSettings(),
    getAllBodyweights(),
  ]);
  return buildBackup({ logs, checks, settings, bodyweight }, exportedAt);
}

// Replace all stored data with a validated backup (atomic — see storage.replaceAll).
export async function importBackup(data: BackupFile): Promise<void> {
  await replaceAll({
    logs: data.logs,
    checks: data.checks,
    settings: data.settings,
    bodyweight: data.bodyweight,
  });
}

// Trigger a client-side file download. On an installed iOS PWA this routes through
// the share sheet — the known-fragile path flagged in T7's edge cases (device check).
export function triggerDownload(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke so the browser has started the download before the URL is freed
  // (revoking synchronously can cancel the download in some browsers).
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
