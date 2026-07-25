// Storage durability (T13 AC1), following directly from D4 and D5.
//
// By default an origin's storage is "best-effort", which is the bucket a browser
// evicts first under pressure. `navigator.storage.persist()` asks to be moved to
// "persistent", which is exempted from that automatic clearing. For an installed
// home-screen web app the request is normally granted without a prompt.
//
// What this is NOT: a durability guarantee. Persistent storage still goes when
// the app is deleted or website data is cleared, and the browser may still
// decline. D5's manual JSON export remains the only real backup — which is why
// Settings shows this status *next to* the export button rather than instead of
// it.

export type PersistenceState = 'persisted' | 'denied' | 'unsupported' | 'unknown';

interface StorageManagerLike {
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
}

function getStorage(): StorageManagerLike | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { storage?: StorageManagerLike }).storage ?? null;
}

/** Current state without asking for anything — safe to call repeatedly. */
export async function checkPersistence(): Promise<PersistenceState> {
  const storage = getStorage();
  if (!storage?.persisted) return 'unsupported';
  try {
    return (await storage.persisted()) ? 'persisted' : 'denied';
  } catch {
    return 'unknown';
  }
}

/**
 * Asks for persistent storage, returning the resulting state.
 *
 * Checks first so an already-granted origin does not re-request on every launch.
 * A denial is reported rather than retried in a loop: browsers decide this on
 * their own heuristics (installed-ness, engagement), and hammering it would not
 * change the answer.
 */
export async function requestPersistence(): Promise<PersistenceState> {
  const storage = getStorage();
  if (!storage?.persist || !storage.persisted) return 'unsupported';
  try {
    if (await storage.persisted()) return 'persisted';
    return (await storage.persist()) ? 'persisted' : 'denied';
  } catch {
    return 'unknown';
  }
}

export const PERSISTENCE_COPY: Record<PersistenceState, string> = {
  persisted:
    'Granted — this device has been asked not to evict your log automatically. Deleting the app or clearing website data still removes it, so keep exporting.',
  denied:
    'Not granted — the browser may evict your log if the device runs low on space. Export a backup regularly.',
  unsupported:
    'This browser does not support the request. Your log is still stored on-device; export a backup regularly.',
  unknown: 'Could not be determined. Export a backup regularly.',
};
