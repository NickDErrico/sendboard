import { describe, expect, it } from 'vitest';
import {
  RPE_OPTIONS,
  edgeOptions,
  gearOf,
  hasEdgePicker,
  hasLoadStepper,
  normalizeEdges,
  parseEdgeList,
  parseLoadStep,
  stepLoad,
} from './gear';
import type { Settings } from '../types';

describe('normalizeEdges', () => {
  it('sorts largest-first, the order the rungs sit in', () => {
    expect(normalizeEdges([15, 20, 10, 18])).toEqual([20, 18, 15, 10]);
  });

  it('dedupes, so a doubled entry is one chip', () => {
    expect(normalizeEdges([18, 20, 18])).toEqual([20, 18]);
  });

  it('drops what cannot be an edge rather than storing NaN', () => {
    expect(normalizeEdges([20, NaN, 0, -5, 18])).toEqual([20, 18]);
  });

  it('rounds to 0.1, like every other measurement', () => {
    expect(normalizeEdges([17.54])).toEqual([17.5]);
  });
});

describe('parseEdgeList', () => {
  it('reads a comma-separated board', () => {
    expect(parseEdgeList('20, 18, 15, 10')).toEqual([20, 18, 15, 10]);
  });

  it('reads spaces, units, and trailing separators', () => {
    expect(parseEdgeList('20mm / 18mm  15,')).toEqual([20, 18, 15]);
  });

  it('keeps the real numbers and drops the junk (edge case)', () => {
    expect(parseEdgeList('20, 18, x, 15,')).toEqual([20, 18, 15]);
  });

  it('returns empty for a list that parses to nothing, so callers keep what is stored', () => {
    expect(parseEdgeList('')).toEqual([]);
    expect(parseEdgeList('nonsense')).toEqual([]);
  });

  it('refuses a value no edge can be, via the same bounds as the standard edge', () => {
    expect(parseEdgeList('20, 500')).toEqual([20]);
  });
});

describe('parseLoadStep', () => {
  it('accepts the plate sizes an owner actually has', () => {
    expect(parseLoadStep('2.5')).toBe(2.5);
    expect(parseLoadStep(' 5 ')).toBe(5);
    expect(parseLoadStep('35')).toBe(35);
  });

  it('does not refuse a big step — that is a kettlebell, not an error (D31)', () => {
    expect(parseLoadStep('50')).toBe(50);
  });

  it('refuses what cannot be an increment', () => {
    expect(parseLoadStep('')).toBeNull();
    expect(parseLoadStep('0')).toBeNull();
    expect(parseLoadStep('-5')).toBeNull();
    expect(parseLoadStep('abc')).toBeNull();
    expect(parseLoadStep('900')).toBeNull();
  });
});

describe('edgeOptions', () => {
  it('offers the configured board', () => {
    expect(edgeOptions({ edgesMm: [20, 18, 15] })).toEqual([20, 18, 15]);
  });

  it('falls back to the standard edge alone when no board is configured (D30)', () => {
    expect(edgeOptions({ standardEdgeMm: 20 })).toEqual([20]);
  });

  it('prefers the board over the standard edge, and still includes it', () => {
    expect(edgeOptions({ edgesMm: [18, 15], standardEdgeMm: 20 })).toEqual([18, 15]);
  });

  it('offers nothing when nothing is configured — the cell stays a text input (AC5)', () => {
    expect(edgeOptions({})).toEqual([]);
    expect(edgeOptions({ edgesMm: [] })).toEqual([]);
  });

  it('includes an off-board value already recorded, never snapping it (AC6, D31)', () => {
    expect(edgeOptions({ edgesMm: [20, 18, 15] }, 17.5)).toEqual([20, 18, 17.5, 15]);
  });

  it('does not duplicate a current value that is already on the board', () => {
    expect(edgeOptions({ edgesMm: [20, 18] }, 18)).toEqual([20, 18]);
  });

  it('offers nothing for an off-board value when nothing is configured', () => {
    // A lone recorded value is not a board: one chip showing what is already in
    // the cell would be a control that cannot change anything.
    expect(edgeOptions({}, 17.5)).toEqual([]);
  });
});

describe('hasEdgePicker / hasLoadStepper', () => {
  it('reports what each cell can offer', () => {
    expect(hasEdgePicker({ edgesMm: [20] })).toBe(true);
    expect(hasEdgePicker({ standardEdgeMm: 20 })).toBe(true);
    expect(hasEdgePicker({})).toBe(false);
    expect(hasLoadStepper({ loadStepLb: 2.5 })).toBe(true);
    expect(hasLoadStepper({ loadStepLb: 0 })).toBe(false);
    expect(hasLoadStepper({})).toBe(false);
  });
});

describe('stepLoad', () => {
  it('steps the value already there, in both directions (D32)', () => {
    expect(stepLoad(35, 2.5, 1)).toBe(37.5);
    expect(stepLoad(35, 2.5, -1)).toBe(32.5);
  });

  it('never drifts on floats — 32.5 + 2.5 is 35, stored exactly', () => {
    expect(stepLoad(32.5, 2.5, 1)).toBe(35);
    expect(stepLoad(1.1, 0.1, 1)).toBe(1.2);
    expect(stepLoad(0.3, 0.1, -1)).toBe(0.2);
  });

  it('clamps at bodyweight — added load is never negative (edge case)', () => {
    expect(stepLoad(2, 2.5, -1)).toBe(0);
    expect(stepLoad(0, 5, -1)).toBe(0);
  });

  it('from an empty cell, + records one step and − records bodyweight (edge case)', () => {
    expect(stepLoad(undefined, 2.5, 1)).toBe(2.5);
    expect(stepLoad(undefined, 2.5, -1)).toBe(0);
  });

  it('treats a non-finite current value as empty rather than propagating it', () => {
    expect(stepLoad(NaN, 5, 1)).toBe(5);
  });
});

describe('gearOf', () => {
  it('reads the gear slice, and pre-T18 settings read as nothing configured (AC9)', () => {
    const old: Settings = { installGuideDismissed: false, standardEdgeMm: 20 };
    expect(gearOf(old)).toEqual({
      edgesMm: undefined,
      loadStepLb: undefined,
      standardEdgeMm: 20,
    });
    expect(hasEdgePicker(gearOf(old))).toBe(true); // via the standard edge alone
    expect(hasLoadStepper(gearOf(old))).toBe(false);
  });

  it('carries a configured board through', () => {
    const settings: Settings = {
      installGuideDismissed: true,
      standardEdgeMm: 20,
      edgesMm: [20, 18, 15, 10],
      loadStepLb: 2.5,
    };
    expect(gearOf(settings)).toEqual({
      edgesMm: [20, 18, 15, 10],
      loadStepLb: 2.5,
      standardEdgeMm: 20,
    });
  });
});

describe('RPE_OPTIONS', () => {
  it('covers what a max-effort protocol produces, and stays a scale not a gate', () => {
    expect([...RPE_OPTIONS]).toEqual([6, 7, 8, 9, 10]);
  });
});
