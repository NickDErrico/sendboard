/**
 * What comes after the exercise you just finished (T32).
 *
 * The gap this closes is a navigation one, not a logging one. Finishing the
 * fifth of §4C's five max hangs leaves the app offering *"Start set 6 (5
 * prescribed)"* on every surface that can see the timer, and the only way to say
 * "that exercise is done, I'm moving on" is to leave the surface, scroll to the
 * card the timer bar was covering, tap Mark done, and find the next card. Three
 * of those four steps are the app's fault.
 *
 * Two rules from older tasks decide the shape, and neither is relaxed here:
 *
 * 1. **D16/D19: completion is a tap, never an inference.** Reaching the
 *    prescribed count marks nothing. This module says what a *control* would do
 *    if the owner tapped it; the tap is still theirs, and the same
 *    `setExerciseCompleted` the card calls does the writing (D35).
 * 2. **D23: a position, never a verdict.** Nothing here blocks a sixth set,
 *    counts one as excess, or reads the plan's floor as a quota — §4F prescribes
 *    a lighter week "regardless of the schedule", so stopping under the top of a
 *    range is as often correct as reaching it. The offer appears; the surfaces
 *    keep the start control beside it.
 *
 * Pure, like `chain.ts` next door: which exercise comes next is a function of an
 * order and a set of completions, and it is decided in one tested place rather
 * than in whichever view happens to have the routine in scope.
 */

export type SessionStep =
  /** Move to this exercise — the next one in the routine still unmarked. */
  | { kind: 'exercise'; exerciseId: string }
  /** Nothing left unmarked: the only place left to go is out of the session. */
  | { kind: 'finish' };

/**
 * The next unmarked exercise after `currentId`, wrapping to any left behind it.
 *
 * Forward first, because that is the order the plan is written in and the order
 * the session list renders. Then wrapping, because an exercise skipped earlier
 * (the warm-up nobody marks, the prehab left for the end) is still work the
 * routine declares, and "next" pointing past it would quietly write it off.
 * Which is also why the surfaces name their destination rather than just saying
 * *next*: the owner reads where they are going and can disagree.
 *
 * `currentId` is excluded whatever its own completion says, so this answers the
 * same question before and after the mark lands — the caller does not have to
 * sequence the write ahead of the query to get a sane result.
 */
export function nextStepAfter(
  order: readonly string[],
  currentId: string,
  completed: ReadonlySet<string>,
): SessionStep {
  const size = order.length;
  if (size === 0) return { kind: 'finish' };
  // An id the routine does not contain (a catalog edit mid-session, a hand-built
  // log) starts the walk at the top rather than at -1, which would skip nothing
  // but would read as deliberate to the next person in here.
  const from = Math.max(0, order.indexOf(currentId));
  for (let i = 1; i <= size; i += 1) {
    const id = order[(from + i) % size];
    if (id === currentId) continue;
    if (!completed.has(id)) return { kind: 'exercise', exerciseId: id };
  }
  return { kind: 'finish' };
}

/**
 * What the control says it will do — both halves of it.
 *
 * "Mark done" is the card's own words for the same act (D35: one act, one
 * vocabulary, wherever it is tapped), and the destination is named rather than
 * implied because this control both closes something and moves somewhere. A
 * button that said only *Next* would hide the write; one that said only *Mark
 * done* would hide the jump.
 */
export function advanceLabel(nextExerciseName: string | null): string {
  return nextExerciseName === null
    ? 'Mark done · finish session'
    : `Mark done · next: ${nextExerciseName}`;
}
