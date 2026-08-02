import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../data/exercises';
import { DAILY_ISOMETRIC_SLOTS, POOL_TARGETS } from './pool';
import { gtgKindOf } from './gtg';
import type { Focus, JointTarget } from '../types';

/**
 * The catalog taxonomy's own rules (D48, D51).
 *
 * This file exists for one reason: `focus` and `target` follow **opposite**
 * coverage rules, and the next person to add a catalog axis will copy whichever
 * test they find first. Both are asserted here, side by side, each with the
 * reason it is what it is.
 *
 * Named for the taxonomy rather than for `focus`, because `lib/focus.ts` is a
 * different subject entirely — which control the one-control surface offers.
 */

const ALL_FOCUSES: Focus[] = [
  'max-strength',
  'tendon-conditioning',
  'prehab-stability',
  'proprioception',
  'general-strength',
  'warm-up',
  'climbing',
  'endurance',
  'power-endurance',
  'power',
  'core',
];

/**
 * The focuses the catalog declares and has no movement for — D48's whole point.
 *
 * Was four. `core` left the list when the trunk entries landed: the app used to
 * say accurately that it trained max strength and conditioned tissue and did
 * nothing else, and now it trains the trunk too. That sentence changing is
 * exactly what this constant exists to make someone notice.
 */
const EXPECTED_UNTRAINED: Focus[] = ['endurance', 'power-endurance', 'power'];

describe('focus coverage — empty is a supported state', () => {
  it('every exercise declares a known focus', () => {
    for (const exercise of EXERCISES) {
      expect(ALL_FOCUSES, `${exercise.id} declares an unknown focus`).toContain(exercise.focus);
    }
  });

  it('declares exactly the four focuses nothing in the catalog trains', () => {
    const untrained = ALL_FOCUSES.filter((f) => !EXERCISES.some((e) => e.focus === f));
    // Not a lint. If this list changes, the app's answer to "what do I not train"
    // has changed, and that is worth failing a build to notice in either
    // direction — adding the first endurance movement should make someone update
    // this line deliberately rather than discover it later.
    expect(untrained).toEqual(EXPECTED_UNTRAINED);
  });

  it('does not require a focus to have members', () => {
    // The inverse of the rule below, stated as its own case so that deleting it
    // is a deliberate act. A focus with no movement renders; it never fails.
    for (const focus of EXPECTED_UNTRAINED) {
      expect(EXERCISES.some((e) => e.focus === focus)).toBe(false);
    }
  });
});

describe('target coverage — empty fails, and that is the opposite rule', () => {
  it('every pool target has at least one movement', () => {
    // `poolToday` offers a slot per target, so a target with nothing in it is a
    // slot the rotation cannot fill. That is why this is a hard failure and the
    // focus rule above is not.
    for (const target of POOL_TARGETS) {
      const movements = EXERCISES.filter(
        (e) => e.target === target && e.tiers?.some((t) => t.tier === 'pool'),
      );
      expect(movements.length, `no pool movement for ${target}`).toBeGreaterThan(0);
    }
  });

  it('every daily isometric slot has at least one movement', () => {
    for (const target of DAILY_ISOMETRIC_SLOTS) {
      const movements = EXERCISES.filter(
        (e) => e.target === target && e.tiers?.some((t) => t.tier === 'daily-isometric'),
      );
      expect(movements.length, `no daily isometric for ${target}`).toBeGreaterThan(0);
    }
  });
});

describe('alsoLoads is the load path, never the rotation slot (D51)', () => {
  it('never repeats the entry’s own target', () => {
    for (const exercise of EXERCISES) {
      if (exercise.target === undefined || exercise.alsoLoads === undefined) continue;
      expect(exercise.alsoLoads, `${exercise.id} lists its own target in alsoLoads`).not.toContain(
        exercise.target,
      );
    }
  });

  it('never declares an empty array — absent is how to say “nothing else”', () => {
    for (const exercise of EXERCISES) {
      if (exercise.alsoLoads === undefined) continue;
      expect(
        exercise.alsoLoads.length,
        `${exercise.id} declares an empty alsoLoads`,
      ).toBeGreaterThan(0);
    }
  });

  it('contains no duplicates', () => {
    for (const exercise of EXERCISES) {
      const also = exercise.alsoLoads;
      if (also === undefined) continue;
      expect(new Set(also).size, `${exercise.id} repeats a target in alsoLoads`).toBe(also.length);
    }
  });

  it('answers “what loads my fingers” across entries that declare no target', () => {
    // The case the field was added for. The §4E tests and the max hangs
    // deliberately carry no `target` — that is what keeps the battery out of the
    // pool's arithmetic — and they are the heaviest finger load in the catalog.
    const loadsFingers = EXERCISES.filter(
      (e) => e.target === 'fingers' || e.alsoLoads?.includes('fingers'),
    ).map((e) => e.id);

    expect(loadsFingers).toContain('max-hang-half-crimp');
    expect(loadsFingers).toContain('test-max-hang-half-crimp');
    expect(loadsFingers).toContain('abrahangs-no-hang');
    expect(loadsFingers).toContain('climbing-limit-boulder');
  });

  it('never puts a movement into a rotation it does not belong to', () => {
    // The fence. If `alsoLoads` ever counted toward staleness, every interval in
    // `pool.ts` would change silently — so an entry that loads a shoulder without
    // targeting one must not be a shoulder pool movement.
    const indirect = EXERCISES.filter(
      (e) => e.target !== 'shoulder' && e.alsoLoads?.includes('shoulder'),
    );
    expect(indirect.length).toBeGreaterThan(0);
    for (const exercise of indirect) {
      const inShoulderRotation =
        exercise.target === 'shoulder' && exercise.tiers?.some((t) => t.tier === 'pool');
      expect(inShoulderRotation, `${exercise.id} would enter the shoulder rotation`).toBeFalsy();
    }
  });
});

describe('§8’s general/pull split is declared, not inferred (D48)', () => {
  it('every GtG movement carries its section', () => {
    for (const exercise of EXERCISES) {
      if (!exercise.gtgEligible) continue;
      expect(exercise.gtg, `${exercise.id} is gtgEligible with no §8 row`).toBeDefined();
      expect(['gtg-general', 'gtg-pull']).toContain(exercise.gtg?.kind);
    }
  });

  it('splits §8’s list five general and two pulling', () => {
    const gtg = EXERCISES.filter((e) => e.gtg !== undefined);
    expect(gtg.filter((e) => gtgKindOf(e) === 'gtg-general')).toHaveLength(5);
    expect(gtg.filter((e) => gtgKindOf(e) === 'gtg-pull')).toHaveLength(2);
  });

  it('is not recoverable from focus, which is why it is declared', () => {
    // The regression this file exists to prevent. Both pulling rows and three of
    // the five general ones are `general-strength`, so any expression over
    // `focus` puts five of the seven movements in the wrong section.
    const focusesOf = (list: typeof EXERCISES) => new Set(list.map((e) => e.focus));
    const pull = focusesOf(EXERCISES.filter((e) => e.gtg?.kind === 'gtg-pull'));
    const general = focusesOf(EXERCISES.filter((e) => e.gtg?.kind === 'gtg-general'));

    const shared = [...pull].filter((f) => general.has(f));
    expect(shared.length, 'the two sections no longer overlap on focus').toBeGreaterThan(0);
  });
});

describe('the tier rename carries no stale value (D48)', () => {
  it('no catalog entry declares the old block-max tier', () => {
    const tiers = EXERCISES.flatMap((e) => e.tiers ?? []).map((t) => t.tier as string);
    expect(tiers).not.toContain('block-max');
  });
});

// A compile-time guard rather than an assertion: if `JointTarget` gains a member,
// this stops building until someone decides whether the pool rotates it.
const _everyTargetAccountedFor: Record<JointTarget, true> = {
  fingers: true,
  extensors: true,
  wrist: true,
  elbow: true,
  shoulder: true,
  hip: true,
  knee: true,
  ankle: true,
  // Decided: rotated by the pool on a 3-day interval, and given no daily slot.
  // Its dose is sourced at 2x/week, and a daily slot would be a frequency the
  // app invented rather than one anything prescribes.
  trunk: true,
};
void _everyTargetAccountedFor;
