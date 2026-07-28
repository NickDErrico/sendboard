import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LEAD_IN_SEC,
  bandPipSeconds,
  countUtterance,
  leadInMsOf,
  leadInSecOf,
  parseLeadIn,
  pipFrequency,
  restDonePhrase,
  restReadyPhrase,
  voiceEnabled,
} from './cues';
import type { HoldSpec } from './timer';

const HANG: HoldSpec = { min: 7, max: 10 };
const PIMA: HoldSpec = { min: 3, max: 5 };
const FIXED: HoldSpec = { min: 5, max: 5 };
const OPEN: HoldSpec = { min: 0, max: null };

describe('voiceEnabled', () => {
  it('is on when nothing has been chosen — the owner asked for the voice (D34)', () => {
    expect(voiceEnabled({})).toBe(true);
  });

  it('is off only when explicitly turned off', () => {
    expect(voiceEnabled({ voiceCues: false })).toBe(false);
    expect(voiceEnabled({ voiceCues: true })).toBe(true);
  });
});

describe('leadInSecOf', () => {
  it('defaults to 3 when unset (D33)', () => {
    expect(leadInSecOf({})).toBe(DEFAULT_LEAD_IN_SEC);
    expect(leadInMsOf({})).toBe(3000);
  });

  it('honours 0 as "no count" rather than treating it as unset', () => {
    expect(leadInSecOf({ leadInSec: 0 })).toBe(0);
    expect(leadInMsOf({ leadInSec: 0 })).toBe(0);
  });

  it('reads a chosen count', () => {
    expect(leadInSecOf({ leadInSec: 5 })).toBe(5);
    expect(leadInMsOf({ leadInSec: 1.5 })).toBe(1500);
  });

  it('falls back rather than counting for a nonsense stored value', () => {
    expect(leadInSecOf({ leadInSec: -2 })).toBe(DEFAULT_LEAD_IN_SEC);
    expect(leadInSecOf({ leadInSec: Number.NaN })).toBe(DEFAULT_LEAD_IN_SEC);
    expect(leadInSecOf({ leadInSec: 900 })).toBe(30);
  });
});

describe('parseLeadIn', () => {
  it('accepts 0 — "start on the tap" is an answer, not an empty field', () => {
    expect(parseLeadIn('0')).toBe(0);
  });

  it('accepts a plain count and rounds to a tenth', () => {
    expect(parseLeadIn('3')).toBe(3);
    expect(parseLeadIn(' 4.25 ')).toBe(4.3);
  });

  it('refuses junk, blanks, negatives and counts longer than a rest', () => {
    for (const raw of ['', '   ', 'soon', '-1', '31']) {
      expect(parseLeadIn(raw)).toBeNull();
    }
  });
});

describe('countUtterance', () => {
  it('counts down and lands on the word that starts the clock', () => {
    expect([3, 2, 1, 0].map(countUtterance)).toEqual(['3', '2', '1', 'pull']);
  });
});

describe('bandPipSeconds', () => {
  it('pips each whole second inside the band, leaving the top to the end tone', () => {
    expect(bandPipSeconds(HANG)).toEqual([7, 8, 9]);
    expect(bandPipSeconds(PIMA)).toEqual([3, 4]);
  });

  it('says nothing where there is no window to report', () => {
    expect(bandPipSeconds(FIXED)).toEqual([]); // a fixed target has no range
    expect(bandPipSeconds(OPEN)).toEqual([]); // §4E prescribes none at all
    expect(bandPipSeconds(null)).toEqual([]);
  });

  it('never pips at second 0, which would be indistinguishable from the go tone', () => {
    expect(bandPipSeconds({ min: 0, max: 3 })).toEqual([1, 2]);
  });
});

describe('pipFrequency', () => {
  it('rises across the band, low at the bottom and high near the top', () => {
    const [low, mid, high] = bandPipSeconds(HANG).map((s) => pipFrequency(s, HANG));
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
    expect(low).toBe(620);
  });

  it('stays inside the audible range it declares, even asked outside the band', () => {
    expect(pipFrequency(0, HANG)).toBe(620);
    expect(pipFrequency(99, HANG)).toBe(1060);
  });

  it('has one pitch where there is no band to spread across', () => {
    expect(pipFrequency(5, FIXED)).toBe(620);
    expect(pipFrequency(5, OPEN)).toBe(620);
  });
});

describe('restReadyPhrase (T30)', () => {
  it('says how long is left and what to do with it', () => {
    expect(restReadyPhrase(5)).toBe('5 seconds. Get ready.');
  });

  // Spoken on whichever second the window is first seen, so it has to be right
  // for a phone that was throttled through the top of it.
  it('agrees with itself at one second', () => {
    expect(restReadyPhrase(1)).toBe('1 second. Get ready.');
  });

  it('never announces a number it cannot honour', () => {
    expect(restReadyPhrase(0)).toBe('1 second. Get ready.');
    expect(restReadyPhrase(-3)).toBe('1 second. Get ready.');
  });
});

describe('restDonePhrase', () => {
  it('says which set is next when the plan declares a count', () => {
    expect(restDonePhrase('set 4 of 5')).toBe('Rest done. Set 4 of 5.');
  });

  it('says only that the rest is over when it does not', () => {
    expect(restDonePhrase(null)).toBe('Rest done.');
  });
});
