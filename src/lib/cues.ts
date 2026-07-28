import type { Settings } from '../types';
import type { HoldSpec } from './timer';

/**
 * What the app says and sounds, as pure functions (T20).
 *
 * D34 splits the two channels and only one of them is load-bearing: **the tone
 * carries the event, the voice carries the words.** Every cue here has a tone
 * that fires regardless of settings or platform; speech is added on top and is
 * allowed to be absent, muted, or late without changing anything about the
 * session. `speech.ts` holds the part that can fail; this module holds the part
 * that can be tested — which phrase, which second, which pitch.
 *
 * Nothing here is spoken *during* a hold. At 100% effort a voice reading numbers
 * is noise the owner cannot act on, so the band is reported in pitch instead
 * (`bandPipSeconds` / `pipFrequency`), which needs no parsing.
 */

/** Absent means 3 (D33): the count the plan implies for a max-effort pull. */
export const DEFAULT_LEAD_IN_SEC = 3;
/** A count longer than the rest between sets is not a count. 0 is "off". */
export const MAX_LEAD_IN_SEC = 30;

/** Absent means on — the owner asked for the voice (D34). */
export function voiceEnabled(settings: Pick<Settings, 'voiceCues'>): boolean {
  return settings.voiceCues !== false;
}

export function leadInSecOf(settings: Pick<Settings, 'leadInSec'>): number {
  const value = settings.leadInSec;
  if (value === undefined || !Number.isFinite(value) || value < 0) return DEFAULT_LEAD_IN_SEC;
  return Math.min(MAX_LEAD_IN_SEC, value);
}

export function leadInMsOf(settings: Pick<Settings, 'leadInSec'>): number {
  return Math.round(leadInSecOf(settings) * 1000);
}

/**
 * Reads a typed count-in, or null to refuse it.
 *
 * `StandardEdge`'s rule, which every Settings field in this app now follows: a
 * value that parses to nothing leaves the stored one alone rather than clearing
 * it. 0 is a real answer ("no count"), not an empty one.
 */
export function parseLeadIn(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > MAX_LEAD_IN_SEC) return null;
  return Math.round(value * 10) / 10;
}

// ─── The count (D33) ─────────────────────────────────────────────────────────

/** "3" … "2" … "1" … then "pull", which is the instant the hold clock starts. */
export function countUtterance(secondsLeft: number): string {
  return secondsLeft > 0 ? String(secondsLeft) : 'pull';
}

// ─── The band (idea #20) ─────────────────────────────────────────────────────

const PIP_LOW_HZ = 620;
const PIP_SPAN_HZ = 440;

/**
 * The whole seconds inside a hold's target band that get a pip.
 *
 * `min` up to but excluding `max`: a 7–10s hang pips at 7, 8 and 9, because 10
 * is `beepHoldEnd`'s and that tone says something different — "let go", not
 * "still going". Empty where there is nothing to report: before `min` the owner
 * is building, a fixed target has no window at all, and §4E's open hold has no
 * prescribed range that a pitch could honestly place them in.
 *
 * Second 0 never pips even if a band started there — a pip at the instant the
 * clock starts is indistinguishable from the go tone.
 */
export function bandPipSeconds(hold: HoldSpec | null): number[] {
  if (hold === null || hold.max === null) return [];
  const seconds: number[] = [];
  for (let s = Math.max(1, Math.ceil(hold.min)); s < hold.max; s++) seconds.push(s);
  return seconds;
}

/**
 * The pitch for a pip, rising across the band.
 *
 * Low at the bottom of the window, high near the top, so "am I at 7 yet" and
 * "how much of the window is left" are one sound rather than two readings off a
 * screen the owner is not looking at.
 */
export function pipFrequency(second: number, hold: HoldSpec): number {
  if (hold.max === null || hold.max <= hold.min) return PIP_LOW_HZ;
  const fraction = Math.min(1, Math.max(0, (second - hold.min) / (hold.max - hold.min)));
  return Math.round(PIP_LOW_HZ + PIP_SPAN_HZ * fraction);
}

// ─── The rest (T19's position, spoken) ───────────────────────────────────────

/**
 * "5 seconds. Get ready." — the heads-up at the top of a rest's last seconds
 * (T30), and the only thing spoken during the countdown.
 *
 * The digits themselves are not said, and that is D34 rather than restraint:
 * `say` cancels whatever is still in the mouth, so a spoken "one" would be cut
 * off mid-word by `restDonePhrase` a second later — and the phrase carries the
 * set number, which is the part worth hearing. The seconds are the tick's.
 */
export function restReadyPhrase(secondsLeft: number): string {
  const n = Math.max(1, Math.round(secondsLeft));
  return `${n} second${n === 1 ? '' : 's'}. Get ready.`;
}

/**
 * "Rest done. Set 4 of 5." — the one announcement in the app.
 *
 * It fires where the phone is furthest away and the number is most useful: the
 * rest is over and the owner is across the room. Reports a position and nothing
 * else (D23) — no praise, no count of what remains, no verdict.
 */
export function restDonePhrase(chainSpoken: string | null): string {
  if (chainSpoken === null) return 'Rest done.';
  // Sentence-cased because it *is* a second sentence: some voices read a
  // mid-sentence "set" with the falling intonation of a continuation.
  const sentence = chainSpoken.charAt(0).toUpperCase() + chainSpoken.slice(1);
  return `Rest done. ${sentence}.`;
}
