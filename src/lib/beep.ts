// Timer cues (T10 AC5, T13 AC5/AC7/AC9). Web Audio only — deliberately NOT the
// Notification API, which D2a rules out and which iOS Safari cannot fire from an
// installed PWA anyway.
//
// Three platform facts shape this, and the second one is why the beep was
// inaudible on device before T13:
//
// 1. An AudioContext created outside a user gesture starts suspended and stays
//    silent, so `primeAudio()` is called from the first timer tap.
// 2. **On iOS, Web Audio is silenced by the hardware ringer switch** unless the
//    page declares a playback audio session. `navigator.audioSession.type =
//    'playback'` (Safari 16.4+) opts out of that, which is the difference
//    between a beep the owner hears mid-hang and one they do not.
// 3. iOS suspends a backgrounded PWA and its audio context does not always
//    resume itself, so `resumeAudio()` runs on the way back to the foreground.
//
// Every entry point is failure-tolerant: no AudioContext, a blocked resume, a
// missing audioSession, or a jsdom test environment all degrade to silence. The
// timer never depends on any of it.

type AudioContextCtor = typeof AudioContext;

interface AudioSessionLike {
  type: string;
}

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

/**
 * Declares a playback audio session so the ringer switch does not mute the cue.
 *
 * Without this, an iPhone on silent — which is how most people carry one, and
 * certainly how one sits on a climbing-wall floor — plays nothing at all.
 */
function claimPlaybackSession(): void {
  try {
    const session = (navigator as Navigator & { audioSession?: AudioSessionLike }).audioSession;
    if (session && session.type !== 'playback') session.type = 'playback';
  } catch {
    /* not supported here — the beep still works with the ringer on */
  }
}

/** Unlocks audio. Must be called from a user gesture, or the context stays silent. */
export function primeAudio(): void {
  claimPlaybackSession();
  const context = getContext();
  if (context?.state === 'suspended') void context.resume().catch(() => {});
}

/** Re-arms audio after the app was backgrounded (AC9). Safe to call any time. */
export function resumeAudio(): void {
  if (!ctx) return;
  claimPlaybackSession();
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
}

function tone(context: AudioContext, at: number, frequency: number, seconds: number): void {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  // Ramped rather than switched, so the tone doesn't start with a click.
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.6, at + 0.015);
  gain.gain.setValueAtTime(0.6, at + seconds - 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(at);
  osc.stop(at + seconds + 0.02);
}

function play(pattern: { frequency: number; seconds: number; gap: number }[]): void {
  claimPlaybackSession();
  const context = getContext();
  if (!context) return;
  try {
    if (context.state === 'suspended') void context.resume().catch(() => {});
    let at = context.currentTime + 0.02;
    for (const step of pattern) {
      tone(context, at, step.frequency, step.seconds);
      at += step.seconds + step.gap;
    }
  } catch {
    /* no audio on this device — the visual state change still fires */
  }
}

/**
 * Hold is over, let go (T13 AC5).
 *
 * One long low tone, deliberately unlike the rest cue: the owner is hanging with
 * their eyes shut and needs to tell "stop pulling" from "start pulling" without
 * looking at anything.
 */
export function beepHoldEnd(): void {
  play([{ frequency: 520, seconds: 0.45, gap: 0 }]);
}

/** Rest is over, go again. Three short high tones. */
export function beepRestEnd(): void {
  play([
    { frequency: 880, seconds: 0.14, gap: 0.09 },
    { frequency: 880, seconds: 0.14, gap: 0.09 },
    { frequency: 1170, seconds: 0.22, gap: 0 },
  ]);
}

/** Settings' "Test sound" (AC8) — the rest cue, on demand, off the training floor. */
export function beepTest(): void {
  primeAudio();
  beepRestEnd();
}
