import { useEffect } from 'react';

// Keeps the screen awake during an active session (T10 AC8).
//
// Two reasons this is not a nicety. The phone sits on the floor while the owner
// is on the board, so a screen that sleeps mid-interval takes the rest countdown
// with it visually; and because iOS suspends a backgrounded PWA, an awake screen
// is the only state in which the rest-complete beep can actually fire.
//
// iOS releases the lock whenever the page is hidden and does not restore it, so
// re-acquiring on visibilitychange is required, not defensive. Unsupported
// platforms (and jsdom) simply never acquire one; nothing else depends on it.

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}
interface WakeLockLike {
  request: (type: 'screen') => Promise<WakeLockSentinelLike>;
}

function getWakeLock(): WakeLockLike | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock ?? null;
}

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const api = getWakeLock();
    if (!api) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let released = false;

    const acquire = async () => {
      if (released || document.visibilityState !== 'visible') return;
      try {
        sentinel = await api.request('screen');
      } catch {
        // Denied (low battery, an unsupported build) — the session works without it.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
