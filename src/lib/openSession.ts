import type { WorkoutLog } from '../types';
import { createLog, finishLog, isStarted, unstarted } from './session';
import { deleteLog, getAllLogs, saveLog } from './storage';

// The open session's life against storage: the three moments — start, leave,
// finish — where a log that recorded nothing must not survive.
//
// A log is created by the Start tap because ActiveSession needs somewhere to
// write, and for four screens that meant opening a routine, looking at it and
// backing out left a permanent "In progress · tap to resume" behind: a session
// the app insisted on, offered no way to be rid of, and would have counted as
// the week's routine had it been finished. D46 decides what counts as started
// (`isStarted`); this module is where that decision meets the store, so no
// screen has to remember to apply it on the way out.

/**
 * Begin a session for `routineId` and return its log.
 *
 * Sweeps unstarted in-progress logs first, so the single-open-session invariant
 * stays exactly true rather than true-modulo-abandoned-empties. Only a
 * force-close mid-look can leave one (every exit path below takes its own with
 * it), and the tap that starts a real session is a deterministic moment to be
 * rid of it — no timer, no boot-time sweep that could race a resume.
 */
export async function startSession(routineId: string): Promise<WorkoutLog> {
  for (const stale of unstarted(await getAllLogs())) await deleteLog(stale.id);
  const log = createLog(routineId, crypto.randomUUID(), new Date().toISOString());
  await saveLog(log);
  return log;
}

/**
 * Leave without finishing: a session that recorded something waits to be
 * resumed, and one that recorded nothing goes with you.
 */
export async function leaveSession(log: WorkoutLog): Promise<void> {
  if (!isStarted(log)) await deleteLog(log.id);
}

/**
 * Finish: the same rule, one step further on. An empty log is discarded rather
 * than completed, because a completed one would land in History, mark the
 * routine done for the week (rotation), and be eligible to anchor the block
 * (D25) — an 8-week block moved by a Start tap and a Finish tap with nothing
 * between them.
 */
export async function finishSession(log: WorkoutLog, completedAt: string): Promise<void> {
  if (isStarted(log)) await saveLog(finishLog(log, completedAt));
  else await deleteLog(log.id);
}
