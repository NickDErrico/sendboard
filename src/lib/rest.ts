import type { Exercise, SetEntry } from '../types';
import { describeWhen, formatSet, summarizeSets, type LastPerformance } from './lastTime';

/**
 * What a prescribed rest has to read (T22).
 *
 * A Day 1 session is five 3 minute rests on the max hangs (§4C) plus four to six
 * more on the PIMA pulls (§4B) — roughly fifteen minutes, eight weeks running,
 * that the app has so far spent on a countdown and two small buttons. This module
 * decides what goes in that time.
 *
 * Three rules hold it together:
 *
 * 1. **D37: dead time is a reading surface, never a control surface.** Nothing
 *    here is tappable and nothing here writes anything, which is exactly why it
 *    is allowed to advance on its own. D36 forbids ambient contact ending a hold
 *    because ending a hold *authors a number* in the series §7 asks the owner to
 *    read; a card that cannot be acted on has no equivalent failure.
 * 2. **D38: it teaches from the catalog, never from the plan file.** Every word
 *    it shows was transcribed from `docs/training-plan.md` once, at T2, under
 *    D6's no-invention rule — and the safety notes still carry their citations
 *    inline. Nothing here authors training copy, and the plan file stays T25's.
 * 3. **D18: the reading position is elapsed time, not a stored cursor.** Which
 *    card is up is `floor(elapsed / CARD_MS)`, so a backgrounded rest returns on
 *    the card the clock says rather than the one it left, and there is nothing to
 *    clean up when the rest ends.
 *
 * Pure, like `chain.ts` and for the same reason: the bar and the focus surface
 * disagree about size and agree about content, so the content is a function and
 * the disagreement is CSS.
 */

/** One card, one minute. The unit the deck is measured in. */
export const CARD_MS = 60_000;

type RestCardSource = 'how-to' | 'cue' | 'safety';

export interface ProtocolCard {
  kind: 'protocol';
  source: RestCardSource;
  /** "How to · step 2 of 4" — where in the exercise's own material this came from. */
  label: string;
  text: string;
}

/** The numbers the next set is chosen against. The view renders it; this names it. */
interface ReportCard {
  kind: 'report';
  label: string;
}

export type RestCard = ReportCard | ProtocolCard;

export interface RestReport {
  /** This session's sets for the exercise, oldest first, capped for the board. */
  lines: string[];
  /** How many earlier sets `lines` left out — stated rather than silently dropped. */
  hidden: number;
  /** The same sets collapsed to one line, which is all the timer bar can afford. */
  summary: string;
  /** "6 days ago · 7.0s · 20mm +30lb ×5", or null before there is a last time. */
  last: string | null;
}

/** The deck and the data its report card needs, resolved together. */
export interface RestReading {
  deck: RestCard[];
  report: RestReport | null;
}

/**
 * Everything the exercise can teach, in a fixed order: how it is done, then the
 * cues, then the safety notes.
 *
 * Order is fixed rather than prioritised because the deck walks the whole pool
 * across a session's rests — so "most important first" would only mean "shown on
 * rest one", and the safety notes would be the cards nobody reaches.
 */
export function protocolPool(exercise: Exercise): ProtocolCard[] {
  const pool: ProtocolCard[] = [];
  const { howTo, cues, safetyNotes } = exercise;

  howTo.forEach((text, i) =>
    pool.push({
      kind: 'protocol',
      source: 'how-to',
      label: `How to · step ${i + 1} of ${howTo.length}`,
      text,
    }),
  );
  cues.forEach((text, i) =>
    pool.push({
      kind: 'protocol',
      source: 'cue',
      label: cues.length === 1 ? 'Cue' : `Cue ${i + 1} of ${cues.length}`,
      text,
    }),
  );
  safetyNotes.forEach((text, i) =>
    pool.push({
      kind: 'protocol',
      source: 'safety',
      label: safetyNotes.length === 1 ? 'Safety' : `Safety ${i + 1} of ${safetyNotes.length}`,
      text,
    }),
  );

  return pool;
}

/**
 * The interval's reading list.
 *
 * Length is what the interval can afford — a card a minute, floored at one so a
 * 50 second rest reads one thing properly rather than flashing three, and capped
 * at the number of distinct cards that exist so nothing repeats inside one deck.
 *
 * `rotation` is how many sets of this exercise are already logged, which is what
 * makes consecutive rests teach different things: the protocol cards start that
 * many strides into the pool and wrap. Keyed on the logged count rather than on a
 * stored cursor for T19's reason — delete a set and the position moves back with
 * it, because there is no counter to fall out of sync.
 */
export function restDeck({
  exercise,
  restMs,
  prescribedRestMs,
  rotation,
  hasReport,
}: {
  exercise: Exercise;
  /** The interval actually running, `+30s` and all — this sets the deck's length. */
  restMs: number;
  /**
   * The interval the *plan* prescribes — this sets where in the pool the deck
   * starts, and it is a separate number for one reason found in a browser: with
   * the stride derived from the running length, `+30s` grew the deck by a card,
   * which grew the stride, which moved the whole selection along the pool and
   * changed the card *already on screen*. The interval the owner is running is
   * theirs to extend; where the reading picks up is a property of the exercise.
   */
  prescribedRestMs?: number;
  rotation: number;
  hasReport: boolean;
}): RestCard[] {
  const pool = protocolPool(exercise);
  const available = (hasReport ? 1 : 0) + pool.length;
  const cardsIn = (ms: number) => Math.min(Math.max(1, Math.round(Math.max(0, ms) / CARD_MS)), available);

  const size = cardsIn(restMs);
  if (size <= 0) return [];

  const deck: RestCard[] = [];
  if (hasReport) deck.push({ kind: 'report', label: 'This session' });

  const slots = size - deck.length;
  if (slots > 0 && pool.length > 0) {
    // The stride an *unextended* rest would use. Falls back to the running length
    // where the plan prescribes none, so a rest with no declared duration still
    // walks the pool rather than repeating card one forever.
    const base = prescribedRestMs && prescribedRestMs > 0 ? prescribedRestMs : restMs;
    const stride = Math.max(1, cardsIn(base) - deck.length);
    const offset = (Math.max(0, Math.floor(rotation)) * stride) % pool.length;
    for (let i = 0; i < slots; i += 1) deck.push(pool[(offset + i) % pool.length]);
  }
  return deck;
}

/**
 * Which card is up, from the clock alone.
 *
 * Computed from elapsed time rather than from the deck, which is what makes
 * `+30s` safe: extending a rest can lengthen the deck, and a longer deck appends
 * cards *after* the ones already read. Nothing shifts under the reader. The last
 * card simply holds until the rest is over.
 */
export function restCardIndex(elapsedMs: number, deckLength: number): number {
  if (deckLength <= 0) return 0;
  const i = Math.floor(Math.max(0, elapsedMs) / CARD_MS);
  return Math.min(deckLength - 1, i);
}

/**
 * This session's sets against last time's — the §4F decision, in the three
 * minutes it is actually made in.
 *
 * A report and nothing else (D23): no delta, no percentage, no target, no
 * verdict. `hidden` is stated rather than dropped so a long exercise reads as
 * "there were more" instead of quietly showing four.
 */
export function buildRestReport(
  sets: SetEntry[],
  last: LastPerformance | null,
  maxLines = 4,
): RestReport {
  const lines = sets.slice(-Math.max(1, maxLines)).map(formatSet);
  return {
    lines,
    hidden: Math.max(0, sets.length - lines.length),
    summary: summarizeSets(sets),
    last: last ? `${describeWhen(last.daysAgo)} · ${summarizeSets(last.sets)}` : null,
  };
}

/**
 * The deck and its report, resolved for the exercise the *timer* belongs to.
 *
 * Deliberately keyed on the timer's exercise rather than on whatever is being
 * looked at: a rest running on the half-crimp hang while focus is open on the
 * open-hand one is still the half-crimp's rest, exactly as the cues are (T21 AC9).
 */
export function restReading({
  exercise,
  sets,
  last,
  restMs,
}: {
  exercise: Exercise | undefined;
  sets: SetEntry[];
  last: LastPerformance | null;
  restMs: number;
}): RestReading {
  if (!exercise) return { deck: [], report: null };

  const report = buildRestReport(sets, last);
  // Nothing logged and nothing to compare against — the first rest of a
  // first-ever session. The deck is protocol-only rather than carrying an empty
  // frame where the numbers would be.
  const hasReport = report.lines.length > 0 || report.last !== null;
  const deck = restDeck({
    exercise,
    restMs,
    prescribedRestMs: (exercise.restSeconds ?? 0) * 1000,
    rotation: sets.length,
    hasReport,
  });
  return { deck, report: hasReport ? report : null };
}
