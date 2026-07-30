import type { Check, SymptomKind } from '../types';

// The training plan's stop signals, and the responses it already prescribes for
// them (§7, §8, §10C, §10D).
//
// Every response below was already in the app — as a `safetyNotes` line on the
// movement it concerns — and none of it could ever fire, because nothing could
// record that a symptom existed. §8 names a drop order for elbow and shoulder
// symptoms; §10D names one for stiffness that does not clear. Both are schedule
// changes conditional on an input the app did not have.
//
// Pure: the table is data and the queries are folds over `Check[]`. No wording
// here is authored — each `response` is the plan's own instruction, and `source`
// says where to read it in full.
//
// What this module does not do: decide anything. It never hides a movement,
// never blocks a session and never marks a day unsafe. It reports which signals
// are up and what the plan says to do about them, and the owner acts (D23).

export interface SymptomSignal {
  /** Short name for the control that records it. */
  label: string;
  /** What the signal actually is, in the plan's terms — the thing to notice. */
  reading: string;
  /** What the plan says to do. Ordered where the plan orders it. */
  response: string[];
  /**
   * Movements the response names, first-to-drop first.
   *
   * Present so a surface can mark the affected rows in place rather than making
   * the owner map a sentence onto a list. Empty where the response changes no
   * specific movement.
   */
  dropOrder: string[];
  source: string;
}

export const SYMPTOM_SIGNALS: Record<SymptomKind, SymptomSignal> = {
  'finger-pain': {
    label: 'Sharp finger pain',
    reading: 'Sharp or pulley-specific pain, as opposed to normal forearm fatigue.',
    response: [
      'Stop the session. This is the difference between a plateau and a torn A2 pulley.',
      'Do not test or max on fingers that are painful — a max attempt on fatigued fingers is how pulleys tear.',
    ],
    dropOrder: [],
    source: '§7',
  },
  elbow: {
    label: 'Elbow soreness',
    reading: 'Elbow soreness or medial/lateral symptoms that persist.',
    response: [
      'Drop full pull-ups first — they load the same elbows as your climbing days, Day 3 and every hangboard session.',
      'Drop the scapular pull-ups / dead hangs second, if symptoms persist.',
      'Pulling volume is the first thing to cut at any elbow symptom.',
    ],
    dropOrder: ['bodyweight-pullups', 'scapular-pullups-dead-hangs'],
    source: '§8, §10C',
  },
  shoulder: {
    label: 'Shoulder symptoms',
    reading: 'Shoulder symptoms that persist rather than settling between sessions.',
    response: [
      'Drop full pull-ups first, the scapular work second — §8 gives one drop order for elbow and shoulder alike.',
    ],
    dropOrder: ['bodyweight-pullups', 'scapular-pullups-dead-hangs'],
    source: '§8, §10C',
  },
  'forearm-stiffness': {
    label: 'Stiffness that won’t clear',
    reading: 'Forearm or finger stiffness that does not clear with a normal warm-up.',
    response: [
      'Drop the second abrahang session of the day first — it is the run that adds load without adding adaptation once the tissue has not recovered.',
      'This is one of the two readings §10D names for the daily load no longer being free.',
    ],
    dropOrder: ['abrahangs-no-hang'],
    source: '§10D',
  },
};

/** The kinds, in the order a recording control should offer them. */
export const SYMPTOM_KINDS = Object.keys(SYMPTOM_SIGNALS) as SymptomKind[];

export interface ActiveSymptom {
  kind: SymptomKind;
  signal: SymptomSignal;
  /** The day it was recorded, as a local date key. The most recent, if several. */
  since: string;
  /** Every check backing it — what a clear has to delete. */
  checkIds: string[];
}

/**
 * The signals currently up, most recently recorded first.
 *
 * "Up" means a `symptom` check exists, with no window and no expiry. The plan
 * gives no duration for any of these readings, and an app that quietly decided
 * an elbow had stopped hurting after seven days would be inventing the one
 * number that matters here. Clearing is an explicit act.
 */
export function activeSymptoms(checks: Check[]): ActiveSymptom[] {
  const byKind = new Map<SymptomKind, ActiveSymptom>();
  for (const check of checks) {
    if (check.kind !== 'symptom' || check.symptom === undefined) continue;
    const existing = byKind.get(check.symptom);
    if (existing === undefined) {
      byKind.set(check.symptom, {
        kind: check.symptom,
        signal: SYMPTOM_SIGNALS[check.symptom],
        since: check.date,
        checkIds: [check.id],
      });
      continue;
    }
    existing.checkIds.push(check.id);
    if (check.date > existing.since) existing.since = check.date;
  }
  return [...byKind.values()].sort((a, b) => (a.since < b.since ? 1 : -1));
}

/**
 * Exercise id → its position in the drop order of whichever active signal names
 * it soonest (1 = drop this first).
 *
 * Lets a surface mark the affected rows where they already are. Two signals can
 * name the same movement — elbow and shoulder share §8's order — so the lowest
 * position wins rather than the last one read.
 */
export function dropPositions(active: ActiveSymptom[]): Map<string, number> {
  const positions = new Map<string, number>();
  for (const symptom of active) {
    symptom.signal.dropOrder.forEach((exerciseId, i) => {
      const position = i + 1;
      const known = positions.get(exerciseId);
      if (known === undefined || position < known) positions.set(exerciseId, position);
    });
  }
  return positions;
}

/** "first out" / "second out" / "3rd out" — the mark a flagged row carries. */
export function describeDropPosition(position: number): string {
  if (position === 1) return 'first out';
  if (position === 2) return 'second out';
  return `${position}th out`;
}
