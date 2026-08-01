import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../data/exercises';
import type { Check, Exercise } from '../types';
import { ROUTINES } from '../data/routines';
import { variationStatus, variationsFor } from './variation';

const ex = (id: string, rotationGroup?: string): Exercise => ({
  id,
  name: id,
  focus: 'max-strength',
  rotationGroup,
  isoType: 'none',
  equipment: ['bodyweight'],
  summary: '',
  howTo: [],
  prescription: '',
  cues: [],
  safetyNotes: [],
  gtgEligible: false,
});

const check = (exerciseId: string, date: string): Check => ({
  id: `${exerciseId}-${date}`,
  kind: 'joint',
  date,
  notes: '',
  exerciseId,
});

describe('the catalog’s alternating pairs', () => {
  it('groups §4B’s two PIMA grips and §4C’s two max hangs, separately', () => {
    const groups = variationsFor(EXERCISES, [], []).map((v) => v.group);
    expect(groups).toContain('pima-grip');
    expect(groups).toContain('max-hang-grip');
    // Separate groups: alternating them in lockstep would mean a session never
    // sees both grips at all.
    expect(new Set(groups).size).toBe(groups.length);
  });

  it('puts exactly two entries in each pair', () => {
    for (const variation of variationsFor(EXERCISES, [], [])) {
      expect(variation.alternates, variation.group).toHaveLength(1);
    }
  });

  it('defaults to the grip the plan names first', () => {
    // §4B and §4C both name half-crimp as the grip and open-hand as the rotation,
    // so half-crimp must win the never-run tie-break.
    const status = variationStatus(EXERCISES, [], []);
    expect(status.get('pima-finger-pull-half-crimp')).toBe(true);
    expect(status.get('pima-finger-pull-open-hand')).toBe(false);
    expect(status.get('max-hang-half-crimp')).toBe(true);
    expect(status.get('max-hang-open-hand')).toBe(false);
  });

  it('keeps both members of every pair in Day 1’s list', () => {
    // The alternate is marked, never removed (D23). If a future change ever
    // filters the routine instead, this fails.
    const day1 = ROUTINES.find((r) => r.id === 'day-1-fingerboard')!;
    for (const variation of variationsFor(EXERCISES, [], [])) {
      for (const member of [variation.upNext, ...variation.alternates]) {
        expect(day1.exerciseIds, member.id).toContain(member.id);
      }
    }
  });
});

describe('variationStatus', () => {
  const catalog = [ex('a', 'g'), ex('b', 'g'), ex('solo')];

  it('omits entries that are not part of a rotation', () => {
    // Absent, not `false` — a boolean-only map would dim an exercise that has
    // no alternate at all.
    expect(variationStatus(catalog, [], []).has('solo')).toBe(false);
  });

  it('flips to the alternate once the current one is run', () => {
    const status = variationStatus(catalog, [], [check('a', '2026-07-24')]);
    expect(status.get('a')).toBe(false);
    expect(status.get('b')).toBe(true);
  });

  it('alternates back on the session after that', () => {
    const checks = [check('a', '2026-07-24'), check('b', '2026-07-26')];
    const status = variationStatus(catalog, [], checks);
    expect(status.get('a')).toBe(true);
    expect(status.get('b')).toBe(false);
  });

  it('reads only the most recent run of each, not the first', () => {
    const checks = [
      check('b', '2026-07-01'),
      check('a', '2026-07-20'),
      check('b', '2026-07-24'),
    ];
    expect(variationStatus(catalog, [], checks).get('a')).toBe(true);
  });
});
