import { describe, expect, it } from 'vitest';
import { focusStep } from './focus';
import {
  IDLE_TIMER,
  startHold,
  startLeadIn,
  startRest,
  stopHold,
  type TimerState,
} from './timer';

const T0 = 1_700_000_000_000;
const MIN_3 = 180_000;
const HANG = 'max-hang-half-crimp';
const OTHER = 'max-hang-open-hand';

const step = (state: TimerState, restDone = false) => focusStep(state, HANG, restDone);

describe('focusStep', () => {
  it('offers a start when nothing is running', () => {
    expect(step(IDLE_TIMER)).toEqual({ action: 'start', otherRunning: false });
  });

  it('offers cancel while the count runs, and stop while the hold does', () => {
    expect(step(startLeadIn(HANG, 3000, T0)).action).toBe('cancel');
    expect(step(startHold(HANG, T0)).action).toBe('stop');
  });

  it('offers the log the moment a hold ends, ahead of the rest that just started', () => {
    const stopped = stopHold(startHold(HANG, T0), T0 + 8400, MIN_3);
    expect(stopped.phase).toBe('resting'); // both are true at once…
    expect(step(stopped).action).toBe('log'); // …and the unrecorded set wins
  });

  it('offers nothing large while a rest runs, and the next set once it is over', () => {
    const resting = startRest(HANG, MIN_3, T0);
    expect(step(resting, false).action).toBe('wait');
    expect(step(resting, true).action).toBe('start-next');
  });

  it('still offers a start when the timer belongs to another exercise, and says so', () => {
    expect(step(startRest(OTHER, MIN_3, T0))).toEqual({ action: 'start', otherRunning: true });
    expect(step(startHold(OTHER, T0))).toEqual({ action: 'start', otherRunning: true });
  });

  it('does not report another exercise as running once its timer is idle and empty', () => {
    const done = { ...IDLE_TIMER, exerciseId: OTHER };
    expect(step(done)).toEqual({ action: 'start', otherRunning: false });
  });

  it('reports another exercise holding an unlogged result as still running', () => {
    // The result belongs to that exercise; starting here would discard it, which
    // is exactly what the warning is for.
    const held = stopHold(startHold(OTHER, T0), T0 + 5000, null);
    expect(step(held)).toEqual({ action: 'start', otherRunning: true });
  });

  it('never offers to log a hold measured on a different exercise', () => {
    const held = stopHold(startHold(OTHER, T0), T0 + 5000, null);
    expect(focusStep(held, HANG, false).action).toBe('start');
    expect(focusStep(held, OTHER, false).action).toBe('log');
  });
});
