import type { Check, Settings, WorkoutLog } from '../types';
import { getAllChecks, getAllLogs, getSettings, replaceAll } from './storage';

// T7 backup format. This version describes the shape of the EXPORT FILE and is
// independent of the IndexedDB `DB_VERSION`. Bump it if the file shape changes;
// imports of any other value are refused (AC3).
export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupFile {
  schemaVersion: number;
  exportedAt: string; // ISO 8601
  logs: WorkoutLog[];
  checks: Check[];
  settings: Settings;
}

// Export scope (D6): logs, checks, and settings only — NOT the exercise catalog,
// which is code-seeded and ships with the app.
export function buildBackup(
  data: { logs: WorkoutLog[]; checks: Check[]; settings: Settings },
  exportedAt: string,
): BackupFile {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt,
    logs: data.logs,
    checks: data.checks,
    settings: data.settings,
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

export type ParseResult =
  | { ok: true; data: BackupFile }
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
  if (obj.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      reason: 'unsupported-version',
      message: `Unsupported backup version (${obj.schemaVersion}). This app reads version ${BACKUP_SCHEMA_VERSION}. Nothing was changed.`,
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
  return {
    ok: true,
    data: {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
      logs: obj.logs as WorkoutLog[],
      checks: obj.checks as Check[],
      settings: obj.settings as Settings,
    },
  };
}

// ─── IO (thin wrappers; not unit-tested for DOM behavior) ────────────────────

// Gather everything currently stored into a backup file object.
export async function collectBackup(exportedAt: string): Promise<BackupFile> {
  const [logs, checks, settings] = await Promise.all([
    getAllLogs(),
    getAllChecks(),
    getSettings(),
  ]);
  return buildBackup({ logs, checks, settings }, exportedAt);
}

// Replace all stored data with a validated backup (atomic — see storage.replaceAll).
export async function importBackup(data: BackupFile): Promise<void> {
  await replaceAll({ logs: data.logs, checks: data.checks, settings: data.settings });
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
