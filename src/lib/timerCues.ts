import { useEffect, useRef, useState } from 'react';
import {
  beepBandPip,
  beepCountTick,
  beepGo,
  beepHoldEnd,
  beepRestEnd,
  resumeAudio,
} from './beep';
import { bandPipSeconds, countUtterance, pipFrequency, restDonePhrase } from './cues';
import { say } from './speech';
import {
  elapsedMs,
  isLeadInComplete,
  isLeadInStale,
  isRestComplete,
  leadInSecondsLeft,
  shouldAutoStop,
  type HoldSpec,
  type TimerState,
} from './timer';

/**
 * The clock and the cues, extracted from `SessionTimer` for T21.
 *
 * There are now two views of one timer — the bar and the full-screen focus
 * surface — and audio that lived inside a view would either fire twice or fire
 * for whichever one happened to be mounted. So the cues moved here, next to the
 * interval math they read (D18's reasoning applied to sound): **exactly one view
 * is mounted at a time, and it holds this hook.**
 *
 * Everything below is keyed on the phase's absolute start instant, so a
 * re-render never re-fires a cue and a throttled tick never skips one.
 */

/**
 * A ticking clock reading, at the resolution the display needs.
 *
 * The interval only drives *re-renders* — every value shown is recomputed from
 * the phase's absolute start instant (D18), so a throttled or skipped interval
 * costs a stale frame, never a drifted timer.
 */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 100);
    // A backgrounded tab throttles intervals, so re-read on the way back in
    // rather than waiting up to a full tick for the next one. iOS also suspends
    // the audio context while backgrounded, so re-arm it here too (T13 AC9).
    const onVisible = () => {
      setNow(Date.now());
      resumeAudio();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [active]);
  return now;
}

export function useTimerCues({
  state,
  now,
  hold,
  voice,
  chainSpoken,
  onStop,
  onCountEnd,
}: {
  state: TimerState;
  now: number;
  /** The hold spec of the timer's *own* exercise, not of whatever is on screen. */
  hold: HoldSpec | null;
  voice: boolean;
  chainSpoken: string | null;
  onStop: (auto?: boolean) => void;
  onCountEnd?: () => void;
}): void {
  // T13 AC4: the hold ends itself at the prescribed maximum. Keyed on the hold's
  // start instant so it fires once per hold rather than on every tick past the
  // threshold, and it sounds *before* the state change so the cue is not waiting
  // on a render — the owner is mid-hang and listening, not watching.
  const autoStoppedAt = useRef<number | null>(null);
  const autoStop = shouldAutoStop(state, now, hold);
  useEffect(() => {
    if (!autoStop) return;
    if (autoStoppedAt.current === state.startedAt) return;
    autoStoppedAt.current = state.startedAt;
    beepHoldEnd();
    onStop(true);
  }, [autoStop, state.startedAt, onStop]);

  // One cue per rest, keyed on the phase's start instant so an extend (+30s)
  // re-arms it and a re-render never re-fires it. T20 adds the one spoken
  // announcement in the app, *after* the tone: the rest ending is where the
  // phone is furthest away and the set number is most worth knowing.
  const restDone = isRestComplete(state, now);
  const beepedFor = useRef<number | null>(null);
  useEffect(() => {
    if (!restDone) return;
    if (beepedFor.current === state.startedAt) return;
    beepedFor.current = state.startedAt;
    beepRestEnd();
    if (voice) say(restDonePhrase(chainSpoken));
  }, [restDone, state.startedAt, voice, chainSpoken]);
  useEffect(() => {
    if (!restDone) beepedFor.current = null;
  }, [restDone, state.restMs]);

  // T20: one tick per second of the count, keyed on (this count, this second) so
  // a 100ms render loop fires each of them exactly once. The tick is the count
  // (D34); the spoken digit rides on top and may be absent.
  const counting = state.phase === 'counting';
  const secondsLeft = leadInSecondsLeft(state, now);
  const tickedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!counting || secondsLeft <= 0) return;
    const key = `${state.startedAt}:${secondsLeft}`;
    if (tickedFor.current === key) return;
    tickedFor.current = key;
    beepCountTick();
    if (voice) say(countUtterance(secondsLeft));
  }, [counting, secondsLeft, state.startedAt, voice]);

  // "Pull". Fires once per count, and stays silent when the app slept through it
  // — a hold nobody heard begin must not begin (T20 AC9); the caller drops it.
  const countEndedFor = useRef<number | null>(null);
  const countDone = isLeadInComplete(state, now);
  const countStale = isLeadInStale(state, now);
  useEffect(() => {
    if (!countDone) return;
    if (countEndedFor.current === state.startedAt) return;
    countEndedFor.current = state.startedAt;
    if (!countStale) {
      beepGo();
      if (voice) say(countUtterance(0));
    }
    onCountEnd?.();
  }, [countDone, countStale, state.startedAt, voice, onCountEnd]);

  // T20 / idea #20: one pip per whole second inside the target band, rising in
  // pitch across it. Nothing before `min` (the owner is building), nothing for a
  // fixed target (no window), nothing for an open hold (§4E prescribes no range
  // a pitch could place them in) — `bandPipSeconds` decides all three.
  const pippedFor = useRef<string | null>(null);
  const elapsedSec = state.phase === 'holding' ? Math.floor(elapsedMs(state, now) / 1000) : 0;
  useEffect(() => {
    if (state.phase !== 'holding' || !hold) return;
    if (!bandPipSeconds(hold).includes(elapsedSec)) return;
    const key = `${state.startedAt}:${elapsedSec}`;
    if (pippedFor.current === key) return;
    pippedFor.current = key;
    beepBandPip(pipFrequency(elapsedSec, hold));
  }, [state.phase, state.startedAt, elapsedSec, hold]);
}
