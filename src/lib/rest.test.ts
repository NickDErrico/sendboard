import { describe, expect, it } from 'vitest';
import {
  CARD_MS,
  buildRestReport,
  protocolPool,
  restCardIndex,
  restDeck,
  restReading,
  type ProtocolCard,
} from './rest';
import { EXERCISES } from '../data/exercises';
import type { Exercise, SetEntry } from '../types';

const base: Exercise = {
  id: 'x',
  name: 'X',
  focus: 'max-strength',
  isoType: 'none',
  equipment: [],
  summary: '',
  howTo: [],
  prescription: '',
  cues: [],
  safetyNotes: [],
  gtgEligible: false,
};

const rich: Exercise = {
  ...base,
  howTo: ['h1', 'h2', 'h3'],
  cues: ['c1', 'c2'],
  safetyNotes: ['s1'],
};

const REST_3MIN = 180_000;
const texts = (cards: { kind: string }[]) =>
  cards.filter((c): c is ProtocolCard => c.kind === 'protocol').map((c) => c.text);

const set = (over: Partial<SetEntry> = {}): SetEntry => ({
  load: '',
  reps: '',
  rpe: null,
  ...over,
});

describe('protocolPool', () => {
  it('walks howTo, then cues, then safety notes', () => {
    expect(protocolPool(rich).map((c) => c.text)).toEqual(['h1', 'h2', 'h3', 'c1', 'c2', 's1']);
    expect(protocolPool(rich).map((c) => c.source)).toEqual([
      'how-to',
      'how-to',
      'how-to',
      'cue',
      'cue',
      'safety',
    ]);
  });

  it('labels each card with where in the exercise it came from', () => {
    const pool = protocolPool(rich);
    expect(pool[1].label).toBe('How to · step 2 of 3');
    expect(pool[3].label).toBe('Cue 1 of 2');
    // A lone note is not "1 of 1" — that reads like something is missing.
    expect(pool[5].label).toBe('Safety');
  });

  it('is empty for an exercise with nothing to teach, inventing nothing (D6)', () => {
    expect(protocolPool(base)).toEqual([]);
  });
});

describe('restDeck', () => {
  const deckFor = (over: Partial<Parameters<typeof restDeck>[0]> = {}) =>
    restDeck({
      exercise: rich,
      restMs: REST_3MIN,
      prescribedRestMs: REST_3MIN,
      rotation: 0,
      hasReport: true,
      ...over,
    });

  it('affords one card a minute, with the report leading (AC1)', () => {
    const deck = deckFor();
    expect(deck).toHaveLength(3);
    expect(deck[0]).toEqual({ kind: 'report', label: 'This session' });
    expect(texts(deck)).toEqual(['h1', 'h2']);
  });

  it('shortens to what a shorter interval can actually be read in (AC4)', () => {
    // The abrahangs' 50s rest reads one thing properly rather than flashing three.
    expect(deckFor({ restMs: 50_000 })).toHaveLength(1);
    // §5A's 2 min gets two.
    expect(deckFor({ restMs: 120_000 })).toHaveLength(2);
  });

  it('walks the pool across consecutive rests instead of repeating (AC5)', () => {
    expect(texts(deckFor({ rotation: 0 }))).toEqual(['h1', 'h2']);
    expect(texts(deckFor({ rotation: 1 }))).toEqual(['h3', 'c1']);
    expect(texts(deckFor({ rotation: 2 }))).toEqual(['c2', 's1']);
    // Six cards, two a rest: the fourth rest is where it wraps.
    expect(texts(deckFor({ rotation: 3 }))).toEqual(['h1', 'h2']);
  });

  it('appends on +30s and never reorders what is already read (AC3)', () => {
    // Found in a browser, not in a test: with the stride derived from the
    // *running* length, +30s grew the deck, which grew the stride, which moved
    // the selection along the pool and swapped the card already on screen.
    const running = texts(deckFor({ rotation: 2 }));
    const extended = texts(
      deckFor({ rotation: 2, restMs: REST_3MIN + 30_000, prescribedRestMs: REST_3MIN }),
    );
    expect(extended.slice(0, running.length)).toEqual(running);
    expect(extended.length).toBeGreaterThan(running.length);
  });

  it('keeps the stride on the prescribed rest, not on the extended one (AC3)', () => {
    // Every rotation, not just the one that happened to be on screen.
    for (const rotation of [0, 1, 2, 3, 4]) {
      const base = texts(deckFor({ rotation }));
      const extended = texts(
        deckFor({ rotation, restMs: REST_3MIN + 60_000, prescribedRestMs: REST_3MIN }),
      );
      expect(extended.slice(0, base.length)).toEqual(base);
    }
  });

  it('falls back to the running length when the plan prescribes no rest', () => {
    expect(texts(deckFor({ rotation: 1, prescribedRestMs: 0 }))).toEqual(['h3', 'c1']);
  });

  it('never repeats a card inside one deck, however long the rest runs (edge case)', () => {
    // Seven cards' worth of rest against a six-card pool plus the report.
    const deck = deckFor({ restMs: 12 * CARD_MS });
    expect(deck).toHaveLength(7);
    expect(new Set(texts(deck)).size).toBe(6);
  });

  it('is protocol-only when there is nothing to report (edge case)', () => {
    const deck = deckFor({ hasReport: false });
    expect(deck.every((c) => c.kind === 'protocol')).toBe(true);
    expect(texts(deck)).toEqual(['h1', 'h2', 'h3']);
  });

  it('is empty rather than a frame around nothing (AC11)', () => {
    expect(restDeck({ exercise: base, restMs: REST_3MIN, rotation: 0, hasReport: false })).toEqual(
      [],
    );
  });

  it('survives a rotation that has run past the pool many times over', () => {
    expect(texts(deckFor({ rotation: 99 }))).toHaveLength(2);
  });
});

describe('restCardIndex', () => {
  it('advances about once a minute (AC1)', () => {
    expect(restCardIndex(0, 3)).toBe(0);
    expect(restCardIndex(59_999, 3)).toBe(0);
    expect(restCardIndex(60_000, 3)).toBe(1);
    expect(restCardIndex(125_000, 3)).toBe(2);
  });

  it('holds the last card rather than running off the end (AC2)', () => {
    expect(restCardIndex(10 * CARD_MS, 3)).toBe(2);
  });

  it('is a function of elapsed time alone, so a longer deck cannot move it (AC3)', () => {
    // +30s can append a card; the one on screen at 2:30 is unaffected.
    expect(restCardIndex(150_000, 3)).toBe(2);
    expect(restCardIndex(150_000, 4)).toBe(2);
  });

  it('never returns a negative index or one into an empty deck', () => {
    expect(restCardIndex(-5_000, 3)).toBe(0);
    expect(restCardIndex(120_000, 0)).toBe(0);
  });
});

describe('buildRestReport', () => {
  const sets = [
    set({ edgeMm: 20, addedLb: 35, holdSec: 7 }),
    set({ edgeMm: 20, addedLb: 35, holdSec: 7 }),
  ];

  it('reports this session and last time, and nothing else (AC6)', () => {
    const report = buildRestReport(sets, {
      logId: 'l',
      performedAt: '2026-07-19T10:00:00.000Z',
      daysAgo: 6,
      sets: [set({ edgeMm: 20, addedLb: 30, holdSec: 7 })],
    });
    expect(report.lines).toEqual(['20mm · +35lb · 7.0s', '20mm · +35lb · 7.0s']);
    expect(report.last).toBe('6 days ago · 20mm · +30lb · 7.0s');
    // The report is exactly these four fields (D23): +35 against +30 is a
    // difference the owner draws, so there is nowhere for the app to put one.
    expect(Object.keys(report).sort()).toEqual(['hidden', 'last', 'lines', 'summary']);
  });

  it('says how many earlier sets it left out rather than dropping them silently', () => {
    const many = Array.from({ length: 6 }, (_, i) => set({ holdSec: i + 1 }));
    const report = buildRestReport(many, null);
    expect(report.lines).toEqual(['3.0s', '4.0s', '5.0s', '6.0s']);
    expect(report.hidden).toBe(2);
  });

  it('has no "Last" line before there is a last time (edge case)', () => {
    expect(buildRestReport(sets, null).last).toBeNull();
  });

  it('carries a one-line form for the bar', () => {
    expect(buildRestReport(sets, null).summary).toBe('20mm · +35lb · 7.0s ×2');
  });
});

describe('restReading', () => {
  const maxHang = EXERCISES.find((e) => e.id === 'max-hang-half-crimp') as Exercise;

  it('drops the report card entirely when there are no numbers at all (edge case)', () => {
    const reading = restReading({ exercise: rich, sets: [], last: null, restMs: REST_3MIN });
    expect(reading.report).toBeNull();
    expect(reading.deck.every((c) => c.kind === 'protocol')).toBe(true);
  });

  it('leads with the report once a set exists', () => {
    const reading = restReading({
      exercise: rich,
      sets: [set({ holdSec: 7 })],
      last: null,
      restMs: REST_3MIN,
    });
    expect(reading.deck[0].kind).toBe('report');
    expect(reading.report?.lines).toEqual(['7.0s']);
  });

  it('rotates on the logged count, so a deleted set moves the next rest back (AC5)', () => {
    const twoLogged = restReading({
      exercise: rich,
      sets: [set({ holdSec: 7 }), set({ holdSec: 7 })],
      last: null,
      restMs: REST_3MIN,
    });
    const oneLogged = restReading({
      exercise: rich,
      sets: [set({ holdSec: 7 })],
      last: null,
      restMs: REST_3MIN,
    });
    expect(texts(twoLogged.deck)).not.toEqual(texts(oneLogged.deck));
  });

  it('reads nothing for an exercise the catalog does not have', () => {
    expect(restReading({ exercise: undefined, sets: [], last: null, restMs: REST_3MIN })).toEqual({
      deck: [],
      report: null,
    });
  });

  it('covers a real §4C max-hang rest with the exercise\'s own material (AC1)', () => {
    const seen = new Set<string>();
    for (let logged = 0; logged < 5; logged += 1) {
      const { deck } = restReading({
        exercise: maxHang,
        sets: Array.from({ length: logged }, () => set({ holdSec: 7 })),
        last: null,
        restMs: (maxHang.restSeconds ?? 0) * 1000,
      });
      expect(deck).toHaveLength(3);
      texts(deck).forEach((t) => seen.add(t));
    }
    // Five rests of a Day 1 max-hang exercise walk its whole protocol.
    expect(seen.size).toBe(protocolPool(maxHang).length);
  });
});
