import { StorageError } from './storage';

/**
 * What to tell the owner when the on-device store rejects an operation.
 *
 * `storage.ts` throws `StorageError` rather than resolving to undefined so a
 * failure can never pass for an empty result. Until now nothing acted on that:
 * of the 23 write call sites across the screens, none caught anything, so a
 * failed save produced an unhandled rejection, no console any owner reads, and
 * a UI that had already re-rendered as though the set were logged. The store is
 * the only copy of the log — a write that fails silently is the one bug this app
 * cannot afford.
 *
 * Returning `null` for anything that is not a `StorageError` is the point of the
 * function. A TypeError from a genuine bug must keep its ordinary unhandled
 * rejection rather than being dressed up as a storage problem, which would hide
 * the bug and tell the owner to export a backup they do not need.
 *
 * The copy does not claim to know whether a read or a write failed, because the
 * rejection does not say. It names the one action that helps either way (D5's
 * export is the real backup) and does not invent a retry the store cannot honour.
 */
export function storageFailureMessage(reason: unknown): string | null {
  if (!(reason instanceof StorageError)) return null;
  return 'On-device storage did not respond. Recent changes may not have been saved — export a backup from Settings before closing the app.';
}
