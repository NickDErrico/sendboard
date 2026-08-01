import type { Check, Exercise, Routine, WorkoutLog } from '../types';
import { dailyStatus, describeRunsToday, describeSpacing, DAILY_ROUTINE_ID } from './daily';
import {
  JOINT_TARGET_LABELS,
  dailyIsometricsToday,
  describeSlot,
  poolToday,
  type SlotStatus,
} from './pool';
import { describeLastCompleted, rotates, routineRotation } from './rotation';

/**
 * The four tiers as one ordered surface (T36, D47).
 *
 * This module composes and decides nothing about training. Every lane's state
 * comes from that tier's own engine — `daily.ts` for collagen,
 * `dailyIsometricsToday` and `poolToday` for the two rotations, `rotation.ts`
 * for the heavy work — and none of them is modified or re-implemented here. If a
 * lane's state looks wrong the bug is in a module this file only calls.
 *
 * What lives here instead is the shape every lane shares, in one tested place
 * rather than in four branches of JSX: a name, a quoted cadence, the lines that
 * tier's engine returns, and exactly one control.
 *
 * **D49, and it is the reason this is a module.** A five-lane surface with
 * per-lane state is one design slip from a list of five things the day owes, so
 * the refusals are structural rather than editorial:
 *
 * - Nothing here reads more than one lane. There is no total, no count of lanes
 *   touched, no day-complete condition, and no value on `Lane` that could
 *   express one — which is why `lanesToday` returns an array the view maps and
 *   never an object the view could summarise.
 * - `LANES` is declared in frequency order and never sorted. Frequency is a
 *   fixed property of the tier, so the screen cannot rearrange itself and the
 *   thing reached for yesterday is where it was left. Ordering by staleness
 *   would make the surface a queue of debts.
 * - `daily` is a property of the *cadence*, not of the log. It is what the view
 *   raises a lane on, and it cannot vary with whether anything was run — which
 *   is what stops elevation drifting into a done-state.
 * - No line returned from here contains a fraction against a prescribed count.
 *   "two of six slots" is a score out of six; the slots are named instead.
 *
 * Pure, like every other derivation in `lib/`: a function of
 * `(exercises, routines, logs, checks, today)`, so all of the above is a unit
 * test rather than a screenshot.
 */

export type LaneId = 'collagen' | 'daily-isometric' | 'pool' | 'heavy';

/**
 * The lane's single control.
 *
 * Three kinds, because a tier is either run as a session, ticked on the surface
 * that owns its rotation, or has nothing in the catalog to offer. A lane always
 * carries one — a lane with no control would be a report the owner cannot act
 * on, and every tier here is something they can do today.
 */
export type LaneAction =
  /** Start a session against this routine. */
  | { kind: 'start-routine'; routineId: string; label: string }
  /** Open the surface where this tier's movements are ticked. */
  | { kind: 'open-joints'; label: string }
  /** The catalog declares no movement for this tier. Stated, never hidden. */
  | { kind: 'empty'; label: string };

export interface Lane {
  id: LaneId;
  /** The tier's name, as the surface shows it. */
  name: string;
  /**
   * The tier's own cadence, transcribed (D6, D53) — never composed from an
   * interval constant, which would be the app authoring a prescription.
   */
  cadence: string;
  /** Where that cadence comes from. Every number in this app carries one. */
  source: string;
  /**
   * True where the cadence is daily.
   *
   * The one visual property a lane varies, and it is a function of the *tier*.
   * Nothing about the log can change it, which is the whole reason it is here
   * rather than computed in the view (D49).
   */
  daily: boolean;
  /** This tier's state, from this tier's engine. Never empty. */
  lines: string[];
  action: LaneAction;
}

/**
 * The lanes, in frequency order, declared rather than sorted.
 *
 * Collagen twice a day, the isometric slots once, the pool two or three times a
 * week per target, the heavy work once or twice. Cadences are the README's tier
 * table, which transcribed them from the plan and the research file.
 */
const LANES: { id: LaneId; name: string; cadence: string; source: string; daily: boolean }[] = [
  {
    id: 'collagen',
    name: 'Collagen',
    cadence: 'up to 2×/day, ≥6h apart',
    source: 'plan §10D',
    daily: true,
  },
  {
    id: 'daily-isometric',
    name: 'Daily isometrics',
    cadence: 'daily, ~8–10 min',
    source: 'research §6',
    daily: true,
  },
  {
    id: 'pool',
    name: 'Rotating pool',
    cadence: '2–3×/week per target',
    source: 'research §6',
    daily: false,
  },
  {
    id: 'heavy',
    name: 'Heavy',
    cadence: '1–2×/week per pattern',
    source: 'plan §3',
    daily: false,
  },
];

export interface LaneInput {
  exercises: Exercise[];
  routines: Routine[];
  logs: WorkoutLog[];
  checks: Check[];
  /** Passed in, never read from the clock — the rule every derivation follows. */
  today: Date;
}

/** `Shoulder`, `Ankle` — a target's label, for the lanes that name targets. */
function labelOf(status: SlotStatus): string {
  return JOINT_TARGET_LABELS[status.target];
}

/**
 * The collagen lane: §10D's two numbers, in T34's own words.
 *
 * Both are quoted and neither is enforced. Nothing here returns a fraction, a
 * thing that is owed, or a state in which the start control would be withheld.
 */
function collagenLines(input: LaneInput): string[] {
  const status = dailyStatus(input.logs, input.today);
  return [describeRunsToday(status), describeSpacing(status)];
}

/**
 * The daily isometric lane: which slots today has not loaded, named.
 *
 * Named rather than counted, and that is AC12 rather than a style choice — "two
 * of six slots" is a score out of a prescription, and six is prescribed. The
 * slots are listed instead, stalest first among those still open, with the
 * movement the rotation has up for the first of them.
 *
 * Every slot is returned by the engine every day, because that is what daily
 * means; this reads their `due` and says which are open.
 */
function isometricLines(input: LaneInput): string[] {
  // Always the six slots, whatever the catalog holds: they are declared in
  // `pool.ts` as constants, and a slot the catalog cannot fill comes back with a
  // null `exercise` rather than vanishing. So there is no empty-catalog branch
  // here — an uncovered tendon is named as uncovered, which is more useful than
  // a lane reporting it has nothing.
  const slots = dailyIsometricsToday(input.exercises, input.logs, input.checks, input.today);
  const open = slots.filter((s) => s.due);
  if (open.length === 0) return ['Every slot loaded today.'];

  // Stalest first among the open ones. The lane's own ordering, over one lane's
  // own contents — the fixed ordering D49 protects is the order of the *lanes*.
  const ranked = [...open].sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity));
  const [first, ...rest] = ranked;
  const lead =
    first.exercise === null
      ? `${labelOf(first)} — no movement declared`
      : `${labelOf(first)} — ${first.exercise.name}`;

  if (rest.length === 0) return [lead, describeSlot(first)];
  return [lead, `${describeSlot(first)} · also open: ${rest.map(labelOf).join(', ')}`];
}

/**
 * The pool lane: the stalest targets, in the order `poolToday` ranks them.
 *
 * That ordering is overdue-ness against each target's own interval, so an elbow
 * at three days outranks an ankle at three days. It is not re-sorted here, and
 * the number of targets shown is a display limit rather than a judgement about
 * how many are worth doing.
 */
function poolLines(input: LaneInput): string[] {
  // Seven targets, always, for `isometricLines`' reason: `POOL_TARGETS` is a
  // constant and an unfillable target returns a null `exercise`.
  const ranked = poolToday(input.exercises, input.logs, input.checks, input.today);
  const [first, ...rest] = ranked;
  const lead =
    first.exercise === null
      ? `${labelOf(first)} — no movement declared`
      : `${labelOf(first)} — ${first.exercise.name}`;
  const next = rest.slice(0, 2);
  if (next.length === 0) return [lead, describeSlot(first)];
  return [lead, `${describeSlot(first)} · then ${next.map(labelOf).join(', ')}`];
}

/**
 * The heavy lane: which routine is up next, and when each was last completed.
 *
 * `routineRotation` decides "next" from the log alone (D15) and already excludes
 * the battery and the daily. Nothing is added to what it returns — no week, no
 * phase, no block position: the block is stage 4's, and it belongs to this tier
 * rather than to the app (D50).
 */
function heavyLines(input: LaneInput): string[] {
  const rotating = input.routines.filter(rotates);
  if (rotating.length === 0) return ['No rotating routine declared.'];

  const statuses = routineRotation(input.routines, input.logs, input.today);
  const nameOf = (id: string) => input.routines.find((r) => r.id === id)?.name ?? id;
  // "Day 1 — Fingerboard" → "Day 1" for the secondary line only. The routine
  // names carry an em-dash, and a second one as a separator makes the state read
  // as part of the name ("Day 3 — Pull / Antagonist — never done"). The lead
  // keeps the full name, where it has the line to itself.
  const shortNameOf = (id: string) => nameOf(id).split('—')[0].trim() || nameOf(id);

  const upNext = statuses.find((s) => s.isNextUp);
  const lead = upNext ? nameOf(upNext.routineId) : nameOf(rotating[0].id);
  const rest = statuses
    .filter((s) => s.routineId !== upNext?.routineId)
    .map((s) => `${shortNameOf(s.routineId)} ${describeLastCompleted(s).toLowerCase()}`);

  const own = upNext ? describeLastCompleted(upNext) : 'Not yet completed';
  return rest.length === 0 ? [lead, own] : [lead, `${own} · ${rest.join(' · ')}`];
}

/** Which routine the heavy lane's control starts, or null where none rotates. */
function heavyRoutineId(input: LaneInput): string | null {
  const rotating = input.routines.filter(rotates);
  if (rotating.length === 0) return null;
  const upNext = routineRotation(input.routines, input.logs, input.today).find((s) => s.isNextUp);
  return upNext?.routineId ?? rotating[0].id;
}

function actionFor(id: LaneId, input: LaneInput): LaneAction {
  switch (id) {
    case 'collagen': {
      const exists = input.routines.some((r) => r.id === DAILY_ROUTINE_ID);
      return exists
        ? { kind: 'start-routine', routineId: DAILY_ROUTINE_ID, label: 'Start' }
        : { kind: 'empty', label: 'Nothing declared' };
    }
    case 'daily-isometric':
      return { kind: 'open-joints', label: "Today's holds" };
    case 'pool':
      return { kind: 'open-joints', label: 'Pool queue' };
    case 'heavy': {
      const routineId = heavyRoutineId(input);
      return routineId === null
        ? { kind: 'empty', label: 'Nothing declared' }
        : { kind: 'start-routine', routineId, label: 'Start' };
    }
  }
}

function linesFor(id: LaneId, input: LaneInput): string[] {
  switch (id) {
    case 'collagen':
      return collagenLines(input);
    case 'daily-isometric':
      return isometricLines(input);
    case 'pool':
      return poolLines(input);
    case 'heavy':
      return heavyLines(input);
  }
}

/**
 * The four lanes, always all four, always in this order.
 *
 * No lane is ever dropped: a hidden lane is indistinguishable from a satisfied
 * one, and the surface's whole claim is that it shows the four mechanisms the
 * training is organised by.
 */
export function lanesToday(input: LaneInput): Lane[] {
  return LANES.map((lane) => ({
    ...lane,
    lines: linesFor(lane.id, input),
    action: actionFor(lane.id, input),
  }));
}
