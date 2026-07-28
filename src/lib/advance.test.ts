import { describe, expect, it } from 'vitest';
import { advanceLabel, nextStepAfter } from './advance';

const DAY1 = [
  'finger-warmup-progression',
  'abrahangs-no-hang',
  'pima-finger-pull-half-crimp',
  'max-hang-half-crimp',
  'max-hang-open-hand',
];

const done = (...ids: string[]) => new Set(ids);

describe('nextStepAfter', () => {
  it('walks forward through the routine, in the order the plan is written', () => {
    expect(nextStepAfter(DAY1, 'max-hang-half-crimp', done())).toEqual({
      kind: 'exercise',
      exerciseId: 'max-hang-open-hand',
    });
  });

  it('skips what is already marked', () => {
    expect(
      nextStepAfter(DAY1, 'pima-finger-pull-half-crimp', done('max-hang-half-crimp')),
    ).toEqual({ kind: 'exercise', exerciseId: 'max-hang-open-hand' });
  });

  // The warm-up nobody marks is still work the routine declares — pointing past
  // it would write it off, which is not this module's call to make (D23).
  it('wraps back to anything left behind before calling the session done', () => {
    const late = done('pima-finger-pull-half-crimp', 'max-hang-half-crimp');
    expect(nextStepAfter(DAY1, 'max-hang-open-hand', late)).toEqual({
      kind: 'exercise',
      exerciseId: 'finger-warmup-progression',
    });
  });

  it('finishes only when nothing else is unmarked', () => {
    const all = done(...DAY1.filter((id) => id !== 'max-hang-open-hand'));
    expect(nextStepAfter(DAY1, 'max-hang-open-hand', all)).toEqual({ kind: 'finish' });
  });

  // The caller marks and asks in whichever order suits it: the answer is the
  // same, because the exercise being left is never its own destination.
  it('never offers the exercise being left, marked or not', () => {
    const single = ['max-hang-half-crimp'];
    expect(nextStepAfter(single, 'max-hang-half-crimp', done())).toEqual({ kind: 'finish' });
    expect(nextStepAfter(single, 'max-hang-half-crimp', done('max-hang-half-crimp'))).toEqual({
      kind: 'finish',
    });
  });

  it('starts at the top for an exercise the routine does not contain', () => {
    expect(nextStepAfter(DAY1, 'kb-goblet-squat', done())).toEqual({
      kind: 'exercise',
      exerciseId: 'abrahangs-no-hang',
    });
  });

  it('finishes an empty routine rather than reaching into it', () => {
    expect(nextStepAfter([], 'anything', done())).toEqual({ kind: 'finish' });
  });
});

describe('advanceLabel', () => {
  it('names both halves: what it writes and where it goes', () => {
    expect(advanceLabel('Max Hang — Open-Hand')).toBe('Mark done · next: Max Hang — Open-Hand');
  });

  it('says where the last one goes', () => {
    expect(advanceLabel(null)).toBe('Mark done · finish session');
  });
});
