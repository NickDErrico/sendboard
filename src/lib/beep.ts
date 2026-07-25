// Rest-complete alert (T10 AC5). Web Audio only — deliberately NOT the
// Notification API, which D2a rules out entirely and which iOS Safari cannot
// fire from an installed PWA anyway.
//
// Two platform facts shape this:
//
// 1. An AudioContext created outside a user gesture starts suspended and stays
//    silent, so `primeAudio()` is called from the first timer tap — always a
//    gesture — rather than on mount.
// 2. iOS suspends a backgrounded PWA, so a beep cannot fire while the app is off
//    screen. That is a platform limit with no workaround available to us; the
//    screen wake lock (see wakeLock.ts) is the mitigation, and the rest bar still
//    reads correctly on return because the timer is timestamp-based (D18).
//
// Every entry point is failure-tolerant: no AudioContext, a blocked resume, or a
// jsdom test environment all degrade to silence. The timer never depends on it.

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

/** Unlocks audio. Must be called from a user gesture, or the context stays silent. */
export function primeAudio(): void {
  const context = getContext();
  if (context?.state === 'suspended') void context.resume().catch(() => {});
}

function tone(context: AudioContext, at: number): void {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880;
  // Ramped rather than switched, so the beep doesn't start with a click.
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.25, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(at);
  osc.stop(at + 0.18);
}

/** Short double beep. Silent, never throwing, wherever Web Audio is unavailable. */
export function beep(count = 2): void {
  const context = getContext();
  if (!context) return;
  try {
    if (context.state === 'suspended') void context.resume().catch(() => {});
    for (let i = 0; i < count; i++) tone(context, context.currentTime + i * 0.22);
  } catch {
    /* no audio on this device — the visual state change still fires */
  }
}
