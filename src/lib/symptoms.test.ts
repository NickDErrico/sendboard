import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../data/exercises';
import type { Check, SymptomKind } from '../types';
import {
  SYMPTOM_KINDS,
  SYMPTOM_SIGNALS,
  activeSymptoms,
  describeDropPosition,
  dropPositions,
} from './symptoms';

const symptom = (kind: SymptomKind, date: string, id = `${kind}-${date}`): Check => ({
  id,
  kind: 'symptom',
  date,
  notes: '',
  symptom: kind,
});

describe('the signal table', () => {
  it('names a real catalog entry in every drop order', () => {
    // The failure this prevents: a rename makes §8's drop order point at nothing,
    // and the rule silently stops firing on the movement it was written for.
    const ids = new Set(EXERCISES.map((e) => e.id));
    for (const kind of SYMPTOM_KINDS) {
      for (const exerciseId of SYMPTOM_SIGNALS[kind].dropOrder) {
        expect(ids, `${kind} → ${exerciseId}`).toContain(exerciseId);
      }
    }
  });

  it('puts full pull-ups ahead of the scapular work for elbow and shoulder alike', () => {
    // §8's order, and §10C's "second out, after full pull-ups".
    for (const kind of ['elbow', 'shoulder'] as const) {
      expect(SYMPTOM_SIGNALS[kind].dropOrder).toEqual([
        'bodyweight-pullups',
        'scapular-pullups-dead-hangs',
      ]);
    }
  });

  it('answers stiffness with the abrahangs, per §10D', () => {
    expect(SYMPTOM_SIGNALS['forearm-stiffness'].dropOrder).toEqual(['abrahangs-no-hang']);
  });

  it('gives sharp finger pain no drop order — it ends the session instead', () => {
    expect(SYMPTOM_SIGNALS['finger-pain'].dropOrder).toEqual([]);
    expect(SYMPTOM_SIGNALS['finger-pain'].response[0]).toMatch(/stop the session/i);
  });

  it('cites a plan section for every signal', () => {
    for (const kind of SYMPTOM_KINDS) expect(SYMPTOM_SIGNALS[kind].source, kind).toBeTruthy();
  });
});

describe('activeSymptoms', () => {
  it('is empty when nothing is flagged', () => {
    expect(activeSymptoms([])).toEqual([]);
  });

  it('ignores checks of other kinds', () => {
    const other: Check = { id: 'x', kind: 'gtg-general', date: '2026-07-24', notes: '' };
    expect(activeSymptoms([other])).toEqual([]);
  });

  it('reports a flagged signal with the day it was recorded', () => {
    const [active] = activeSymptoms([symptom('elbow', '2026-07-20')]);
    expect(active.kind).toBe('elbow');
    expect(active.since).toBe('2026-07-20');
  });

  it('never expires a signal — no window, no decay', () => {
    // Deliberate: the plan gives no duration for any of these readings, so the
    // app must not decide when an elbow has stopped hurting.
    expect(activeSymptoms([symptom('elbow', '2020-01-01')])).toHaveLength(1);
  });

  it('collapses repeats of one kind, keeping the most recent day and every id', () => {
    const checks = [
      symptom('elbow', '2026-07-20', 'a'),
      symptom('elbow', '2026-07-24', 'b'),
    ];
    const [active] = activeSymptoms(checks);
    expect(active.since).toBe('2026-07-24');
    expect(active.checkIds.sort()).toEqual(['a', 'b']); // a clear has to delete both
  });

  it('sorts most recently recorded first', () => {
    const checks = [symptom('elbow', '2026-07-20'), symptom('shoulder', '2026-07-24')];
    expect(activeSymptoms(checks).map((s) => s.kind)).toEqual(['shoulder', 'elbow']);
  });
});

describe('dropPositions', () => {
  it('is empty when nothing is flagged', () => {
    expect(dropPositions([]).size).toBe(0);
  });

  it('numbers the drop order from one', () => {
    const positions = dropPositions(activeSymptoms([symptom('elbow', '2026-07-24')]));
    expect(positions.get('bodyweight-pullups')).toBe(1);
    expect(positions.get('scapular-pullups-dead-hangs')).toBe(2);
  });

  it('takes the earliest position when two signals name the same movement', () => {
    // Elbow and shoulder share §8's order, so the answer must not depend on
    // which was read last.
    const active = activeSymptoms([symptom('elbow', '2026-07-24'), symptom('shoulder', '2026-07-25')]);
    expect(dropPositions(active).get('bodyweight-pullups')).toBe(1);
  });

  it('leaves unaffected movements unmarked', () => {
    const positions = dropPositions(activeSymptoms([symptom('elbow', '2026-07-24')]));
    expect(positions.has('kb-goblet-squat')).toBe(false);
  });
});

describe('describeDropPosition', () => {
  it('reads as the plan speaks', () => {
    expect(describeDropPosition(1)).toBe('first out');
    expect(describeDropPosition(2)).toBe('second out');
  });
});
