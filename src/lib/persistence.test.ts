import { afterEach, describe, expect, it, vi } from 'vitest';
import { PERSISTENCE_COPY, checkPersistence, requestPersistence } from './persistence';

const original = Object.getOwnPropertyDescriptor(globalThis.navigator ?? {}, 'storage');

function stubStorage(storage: unknown) {
  Object.defineProperty(globalThis.navigator, 'storage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  if (original) Object.defineProperty(globalThis.navigator, 'storage', original);
  else stubStorage(undefined);
});

describe('requestPersistence', () => {
  it('reports persisted when the browser grants the request', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    stubStorage({ persisted: vi.fn().mockResolvedValue(false), persist });
    expect(await requestPersistence()).toBe('persisted');
    expect(persist).toHaveBeenCalledOnce();
  });

  it('does not re-request when the origin is already persisted', async () => {
    const persist = vi.fn();
    stubStorage({ persisted: vi.fn().mockResolvedValue(true), persist });
    expect(await requestPersistence()).toBe('persisted');
    expect(persist).not.toHaveBeenCalled();
  });

  it('reports a denial rather than retrying', async () => {
    const persist = vi.fn().mockResolvedValue(false);
    stubStorage({ persisted: vi.fn().mockResolvedValue(false), persist });
    expect(await requestPersistence()).toBe('denied');
    expect(persist).toHaveBeenCalledOnce();
  });

  it('reports unsupported when the API is missing, without throwing', async () => {
    stubStorage(undefined);
    expect(await requestPersistence()).toBe('unsupported');
    stubStorage({});
    expect(await requestPersistence()).toBe('unsupported');
    stubStorage({ persisted: vi.fn() }); // persisted but no persist
    expect(await requestPersistence()).toBe('unsupported');
  });

  it('survives a throwing implementation', async () => {
    stubStorage({
      persisted: vi.fn().mockRejectedValue(new Error('nope')),
      persist: vi.fn(),
    });
    expect(await requestPersistence()).toBe('unknown');
  });
});

describe('checkPersistence', () => {
  it('reads the state without requesting it', async () => {
    const persist = vi.fn();
    stubStorage({ persisted: vi.fn().mockResolvedValue(true), persist });
    expect(await checkPersistence()).toBe('persisted');
    expect(persist).not.toHaveBeenCalled();
  });

  it('reports denied and unsupported distinctly', async () => {
    stubStorage({ persisted: vi.fn().mockResolvedValue(false) });
    expect(await checkPersistence()).toBe('denied');
    stubStorage(undefined);
    expect(await checkPersistence()).toBe('unsupported');
  });
});

describe('copy', () => {
  it('tells the owner to keep exporting in every state — persistence is not a backup (D5)', () => {
    for (const state of ['persisted', 'denied', 'unsupported', 'unknown'] as const) {
      expect(PERSISTENCE_COPY[state].toLowerCase()).toContain('export');
    }
  });
});
