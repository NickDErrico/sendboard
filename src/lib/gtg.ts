import type { Check, CheckKind, Exercise } from '../types';

// The training plan's §8 committed list, read out of the catalog and matched
// against a day's checks (T33, D11a). Pure, so the grouping and the roll-up are
// testable without IndexedDB — and so the two surfaces that render GtG (the home
// card's summary and the routine itself) cannot disagree about what a day holds.
//
// What this module deliberately does not do: count rounds. D11a keeps GtG a
// daily yes/no per movement — the dose is *prescribed* here, never logged — so
// nothing below returns a set, a rep, or a number of times.

/** A movement's kind. §8's list is split by the tissue it loads, which is D13's split. */
export function gtgKindOf(exercise: Exercise): CheckKind {
  return exercise.category === 'pulling' ? 'gtg-pull' : 'gtg-general';
}

/** Every catalog entry carrying a §8 row, in catalog order. */
export function gtgMovements(exercises: Exercise[]): Exercise[] {
  return exercises.filter((e) => e.gtg !== undefined);
}

export interface GtgSection {
  kind: CheckKind;
  movements: Exercise[];
}

/**
 * §8's list as the two sections D13 tracks, general first.
 *
 * Order inside a section is catalog order, which is §8's table order — the
 * preferred pulling movement above the one the plan says to drop first. A
 * section with no movements is still returned, so a surface renders a heading
 * with nothing under it rather than silently dropping a kind the app tracks.
 */
export function gtgSections(exercises: Exercise[]): GtgSection[] {
  const movements = gtgMovements(exercises);
  return [
    { kind: 'gtg-general', movements: movements.filter((e) => gtgKindOf(e) === 'gtg-general') },
    { kind: 'gtg-pull', movements: movements.filter((e) => gtgKindOf(e) === 'gtg-pull') },
  ];
}

/** The movement ids checked off among `dayChecks`. Checks naming no movement are not ids. */
export function doneMovementIds(dayChecks: Check[]): Set<string> {
  return new Set(
    dayChecks.flatMap((c) => (c.exerciseId !== undefined ? [c.exerciseId] : [])),
  );
}

/**
 * The kinds a day holds a check for that names no movement.
 *
 * Every check T5b wrote is one of these, and the check-log form still writes
 * them for past days. They keep the kind-level roll-up true — "GtG general
 * happened" — while naming nothing the routine can tick, so the routine says so
 * rather than showing an empty day beside a home card that reads done.
 */
export function unnamedKinds(dayChecks: Check[]): Set<CheckKind> {
  return new Set(
    dayChecks.flatMap((c) => (c.exerciseId === undefined ? [c.kind] : [])),
  );
}

export interface GtgKindToday {
  /** Movements of this kind checked off today. */
  done: number;
  /** Movements of this kind on §8's list. A population, never a quota (D23). */
  listed: number;
  /** A check for the kind that names no movement — T5b's shape, still valid. */
  unnamed: boolean;
}

/**
 * What today holds, per kind: how many of §8's movements were ticked, how many
 * the list contains, and whether an unnamed check covers the kind as well.
 *
 * `done` counts *movements*, not checks — a movement ticked, un-ticked and
 * ticked again is one movement, exactly as `last7DayGtgCounts` counts a day once
 * however many checks land on it.
 */
export function gtgToday(dayChecks: Check[], exercises: Exercise[]): Record<CheckKind, GtgKindToday> {
  const ids = doneMovementIds(dayChecks);
  const unnamed = unnamedKinds(dayChecks);
  const forKind = (section: GtgSection): GtgKindToday => ({
    done: section.movements.filter((e) => ids.has(e.id)).length,
    listed: section.movements.length,
    unnamed: unnamed.has(section.kind),
  });
  const [general, pull] = gtgSections(exercises);
  const empty: GtgKindToday = { done: 0, listed: 0, unnamed: false };
  return {
    'gtg-general': forKind(general),
    'gtg-pull': forKind(pull),
    // The climbing kinds are a week, not a day, and never carry a movement (D9).
    // Present so the record is total and callers need no fallback.
    'climbing-volume': empty,
    'climbing-limit': empty,
    // Empty for the same reason, by a different route: joint checks *do* name a
    // movement, but none of those movements carries a §8 `gtg` row, so §8's list
    // holds none of them and this roll-up has nothing to count. `pool.ts` is
    // where a joint check is read.
    joint: empty,
  };
}

/**
 * What a kind's row says about today, in facts only (D23).
 *
 * No denominator: "2 of 5" against a list the plan itself calls optional in its
 * last paragraph would read as a score out of five, and §8's own doses are
 * triggers ("whenever you pass a clear floor"), not a daily quota. So the count
 * is reported and nothing is compared to it.
 */
export function describeGtgToday(today: GtgKindToday): string {
  if (today.done === 0) {
    return today.unnamed ? 'Recorded for today' : 'Nothing recorded today';
  }
  const movements = `${today.done} ${today.done === 1 ? 'movement' : 'movements'} today`;
  return today.unnamed ? `${movements} · plus a whole-kind check` : movements;
}
