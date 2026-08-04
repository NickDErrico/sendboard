import { describe, expect, it } from 'vitest';
import { StorageError } from './storage';
import { storageFailureMessage } from './storageFailure';

describe('storageFailureMessage', () => {
  it('speaks for a StorageError, naming the export as the action that helps', () => {
    const message = storageFailureMessage(new StorageError('Failed to open IndexedDB'));
    expect(message).not.toBeNull();
    expect(message).toContain('export a backup');
  });

  it('carries the same message however the StorageError was raised', () => {
    // storage.ts raises it three ways — no IndexedDB at all, a failed open, and
    // a wrapped operation failure. The owner's situation is the same in each.
    const wrapped = new StorageError('Storage operation failed', { cause: new TypeError('x') });
    expect(storageFailureMessage(wrapped)).toBe(
      storageFailureMessage(new StorageError('IndexedDB is not available in this environment')),
    );
  });

  it('stays silent for anything that is not a storage failure', () => {
    // The discrimination is the whole point: a genuine bug must keep its own
    // unhandled rejection rather than being reported as a storage problem.
    expect(storageFailureMessage(new TypeError('cannot read properties of undefined'))).toBeNull();
    expect(storageFailureMessage(new Error('something else'))).toBeNull();
    expect(storageFailureMessage('a bare string')).toBeNull();
    expect(storageFailureMessage(undefined)).toBeNull();
    expect(storageFailureMessage(null)).toBeNull();
    expect(storageFailureMessage({ name: 'StorageError' })).toBeNull();
  });
});
