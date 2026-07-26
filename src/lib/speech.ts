// Spoken cues (T20). Web Speech in the foreground — NOT the Notification API,
// which D2a rules out and which an installed iOS PWA cannot fire anyway.
//
// D34: this is the channel that is *allowed to fail*. `beep.ts` earned its
// reliability the hard way (a primed AudioContext, a playback audio session so
// the ringer switch does not silence it, a resume on foregrounding); Web Speech
// has none of that history and can be missing, muted by the device, or still
// speaking when the next cue is due. So every function here is fire-and-forget:
// no promise a timer could await, no error a session could see, and silence as
// the failure mode. An install where the voice never sounds behaves exactly like
// one where it does, minus the words.

function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.speechSynthesis ?? null;
  } catch {
    return null;
  }
}

/**
 * Unlocks speech from a user gesture, alongside `primeAudio()`.
 *
 * iOS will not speak from a timer callback unless synthesis has been started
 * once from a tap. A silent utterance costs nothing and is the only way to spend
 * that gesture without saying something the owner did not ask for.
 */
export function primeSpeech(): void {
  const s = synth();
  if (!s) return;
  try {
    const utterance = new SpeechSynthesisUtterance(' ');
    utterance.volume = 0;
    s.speak(utterance);
  } catch {
    /* no speech on this device — every tone still fires */
  }
}

/**
 * Says one short cue, cancelling anything still in the mouth.
 *
 * Cues are perishable: "two" arriving after "pull" is worse than "two" never
 * arriving, so the newest one wins rather than queueing behind a slow voice.
 */
export function say(text: string): void {
  const s = synth();
  if (!s) return;
  try {
    s.cancel();
    s.speak(new SpeechSynthesisUtterance(text));
  } catch {
    /* silence, never a broken session */
  }
}

/** Stops mid-sentence — used when a count is cancelled. */
export function hush(): void {
  const s = synth();
  if (!s) return;
  try {
    s.cancel();
  } catch {
    /* nothing to stop */
  }
}
