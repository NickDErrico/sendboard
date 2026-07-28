// Canonical app data types. See climbing-app-spec.md §T2. Do not add a
// Settings.reminders field (D2a) or a catalog editor API (D6).

export type Equipment =
  | 'hangboard'
  | 'pullup-bar'
  | 'kettlebell'
  | 'dip-belt'
  | 'band'
  | 'bodyweight'
  | 'climbing-wall';

export type IsoType = 'overcoming' | 'yielding' | 'dynamic' | 'none';

export type Category =
  | 'fingers'
  | 'pulling'
  | 'antagonist'
  | 'lower-body'
  | 'climbing'
  | 'warmup';

export interface Exercise {
  id: string; // stable kebab-case slug, never reused
  name: string;
  category: Category;
  isoType: IsoType;
  equipment: Equipment[];
  summary: string; // one line, shown in list view
  howTo: string[]; // ordered steps, shown in detail view
  prescription: string; // e.g. "4-6 sets x 3-5s @ 100% effort, 3 min rest"
  // D17: the machine-readable half of `prescription`, typed rather than parsed
  // out of that prose — several entries carry two variants in one string, and a
  // regex over them is a silent-wrong-number machine on a max-effort protocol.
  // Both optional: absent means this exercise simply has no timer (T10).
  //
  // T16 adds `'open'` for §4E's lock-off test, where the duration IS the
  // measurement: there is no prescribed maximum, so nothing to auto-stop at
  // (T13) and no `target` end reason to write. A union member on this field
  // rather than a new one keeps every existing gate — `holdSpecOf`,
  // `setReason.reasonApplies` — reading one declaration.
  holdSeconds?: [min: number, max: number] | 'open'; // min === max for a fixed target
  restSeconds?: number; // prescribed rest between sets
  /**
   * How many sets the plan asks for (T19), typed beside the prose for D17's
   * reason: §4B carries "4–6 sets" and a weeks-1–4 variant of "5 sets" in one
   * string, and a regex over that picks a number by luck.
   *
   * A range stays a range — rounding `4–6` to a single target would invent a
   * prescription the plan deliberately left open. Absent means the app shows no
   * position at all, exactly as an absent `holdSeconds` means no timer, and it is
   * absent wherever the plan states a duration or a rep count instead of a set
   * count. The number is a *position*, never a quota: nothing is blocked at it
   * and nothing is graded against it (D23).
   */
  prescribedSets?: [min: number, max: number]; // min === max for a fixed count
  // D20: charted only where the training plan actually progresses something —
  // three exercises. Absent means no numeric fields and no chart. Order matters:
  // it is the chart toggle's order and its default selection.
  metrics?: ProgressMetric[];
  /**
   * Week-scoped protocols carried by one `prescription` string (T24, D41).
   *
   * §4B is the only case: a rep-structured ~90% variant for weeks 1–4 and a
   * single-max-effort variant for weeks 5–8, with "use this variant for weeks
   * 1–4, then the single-max-effort version above for weeks 5–8" living in the
   * plan and, until T24, nowhere in the app. Typed rather than parsed for D17's
   * reason, and each `text` is the substring already present in `prescription` —
   * split, never authored (D6). `prescription` itself is unchanged and is still
   * what every surface falls back to.
   *
   * Absent on every other entry, which therefore renders exactly as before.
   */
  variants?: PrescriptionVariant[];
  /**
   * The single grip this exercise is performed in (T29).
   *
   * Present where a section names one — §4B's half-crimp and its open-hand
   * rotation, §4C's two max hangs, §4E's tests. Until now the grip lived only in
   * the entry's *name*, which meant no surface could show it beside a running set
   * and nothing could assert it. Absent on every exercise the plan gives no grip
   * for, which is most of them.
   *
   * Mutually exclusive with `gripSequence` in practice, not in the type: an
   * exercise has one grip or a rotation through several, never both.
   */
  grip?: string;
  /**
   * An ordered grip rotation, one block per position, for exercises the plan
   * prescribes as a *sequence* rather than a single grip (T29, §10A).
   *
   * The abrahangs are the only entry that carries one. Each block's `rounds` is
   * a count of this exercise's own cadence — 6 rounds of `holdSeconds` /
   * `restSeconds`, not 6 sets of anything else — so the sequence and the timer
   * cannot disagree about how long the session is. Summing `rounds` against the
   * cadence is how §10A's "20 hangs, 10:00" is checked rather than asserted.
   *
   * Declaration order is the order they are run (§10A). Absent everywhere else.
   */
  gripSequence?: GripBlock[];
  cues: string[]; // form/technique reminders
  safetyNotes: string[]; // may be empty; rendered visually distinct
  /**
   * The plan sections this entry was transcribed from (T25, D42) — `['4B']`,
   * `['5D', '8']`.
   *
   * Typed rather than regexed out of the prose beside it, for the reason every
   * other declaration in this interface is typed: a citation that resolves to the
   * *wrong* section is worse than one that does not resolve at all. Absent is a
   * supported state — the catalog is not required to cite, and an entry without
   * refs simply shows no link.
   *
   * This is an address, never a source: no prescription, duration, set count or
   * any other value is ever read out of the section it names (D42, D6).
   */
  planRefs?: string[];
  gtgEligible: boolean; // true = suitable for greasing-the-groove use; drives a badge in T3
}

export interface Routine {
  id: string;
  name: string; // e.g. "Day 1 — Fingerboard"
  dayOfWeek: number | null; // 0-6, null = unscheduled
  exerciseIds: string[]; // ordered
  // D29: absent means true. The §4E battery is a routine so its results are
  // ordinary logs, but it is a test, not a training day — completing it must not
  // change which of the two strength routines is up next (D15).
  inRotation?: boolean;
}

/**
 * One of an exercise's week-scoped protocols (D41).
 *
 * `weeks` is inclusive on both ends and is read against the *derived* block week
 * (T24) — never against a calendar. Ranges are declared in order and are not
 * required to cover every week: past the last one the final variant stays live,
 * because a block that runs long is a training decision (§4F) and a protocol does
 * not expire.
 */
/**
 * One position in a grip rotation (T29, §10A).
 *
 * `grip` is the name as the addendum writes it and `digits` is the addendum's own
 * parenthetical — split so a board-legible surface can show the name large and
 * the fingers small, never so the app can reword either (D6).
 */
export interface GripBlock {
  grip: string; // "Front-3 open"
  digits?: string; // "digits 2–4" — only where the name alone is ambiguous
  /** Rounds of the exercise's own hold/rest cadence spent in this grip. */
  rounds: number;
}

/**
 * A set built from several short efforts rather than one (T31).
 *
 * §4B's weeks-1–4 variant is the only protocol in the plan shaped this way:
 * "5 sets x 4 reps x 3 sec at ~90% effort, ~10 sec between reps, 3 min between
 * sets". Until T31 the app ran one effort and went straight to the three
 * minutes, because `holdSeconds` and `restSeconds` describe the *peak* variant
 * and a set has only ever had one hold.
 *
 * Typed on the variant rather than the exercise for D41's reason: the two
 * protocols on one entry have different shapes, and an exercise-level field
 * would have to describe whichever one the week happened to select.
 */
export interface RepChain {
  reps: number; // 4
  holdSec: number; // 3 — fixed, not a range: the plan states one number
  /** Seconds between reps *inside* a set. Never the between-sets rest. */
  betweenSec: number; // ~10
}

export interface PrescriptionVariant {
  weeks: [min: number, max: number];
  label: string; // "Weeks 1–4 · tendon variant"
  text: string; // transcribed from `prescription`, never reworded (D6)
  /**
   * The rep structure this variant prescribes, where it has one (T31).
   *
   * A variant declaring this drives the clock while it is live — its `holdSec`
   * replaces the exercise's `holdSeconds`, and the gap between reps replaces the
   * between-sets rest until the last one. Which is why declaring it also makes
   * the variant count as `timed`: D41's "the timer follows the other protocol"
   * note must not keep appearing once the timer follows this one.
   */
  repChain?: RepChain;
  /**
   * This variant's own set count, where it differs from `prescribedSets` (T31).
   *
   * §4B carries "4–6 sets" for the peak variant and "5 sets" for the
   * rep-structured one. `prescribedSets` describes the former, so weeks 1–4 read
   * "set 3 of 4–6" against a protocol that asks for five — the same
   * wrong-number-by-luck D17 refuses regexes over prose to avoid.
   */
  sets?: [min: number, max: number];
  /**
   * True on the one variant that `holdSeconds` and `prescribedSets` describe.
   *
   * The whole reason this flag is typed on the declaration rather than assumed by
   * a component: during weeks 1–4 the live variant is *not* the one the clock
   * runs, T23 fenced a cadence runner for that variant off as needing its own
   * decision, and so the app has to say which variant the timer follows instead
   * of switching timings behind the owner's back (D41).
   */
  timed?: boolean;
}

// D20: what an exercise progresses by. Declaration order on `Exercise.metrics`
// is chart order and the default view — hold time leads on the max hangs because
// it is what moves session to session (D22).
export type ProgressMetric = 'holdSec' | 'addedLb' | 'edgeMm';

// D27: why a hold ended. A closed enum, because the value has to be countable
// and comparable across a block — free text for anything these four miss already
// exists in `LoggedExercise.notes`. `target` is the only value the app ever writes
// on its own (the T13 auto-stop, where the app itself ended the hold).
export type SetEndReason = 'target' | 'dropped' | 'form-broke' | 'pain';

export interface SetEntry {
  // Free text, unchanged, and still the only fields on the seventeen exercises
  // that declare no metrics. On the three that do, the numeric fields below
  // replace these in the UI — entering "20mm +35lb" and then 20 and 35 again
  // would be the same data twice.
  load: string; // free-text: "35lb", "20mm +10kg", "5s"
  reps: string;
  rpe: number | null;
  // D21: typed measurements, never parsed out of the strings above. Present only
  // where the exercise declares the metric, and optional so pre-T12 sets and
  // backups read as "no measurement" with no migration.
  holdSec?: number; // measured, not carried forward — see lastTime.CARRIED_METRICS
  addedLb?: number;
  edgeMm?: number;
  // D27: why the hold ended. Optional so pre-T14 sets and backups read as
  // "not recorded" with no migration, and absent entirely on the rep-based
  // exercises, which declare no `holdSeconds` and so are never asked.
  endReason?: SetEndReason;
}

export interface LoggedExercise {
  exerciseId: string;
  sets: SetEntry[];
  notes: string;
  // D16: explicit "I did this" mark, independent of sets. Optional so logs and
  // backup files written before T9 read as not-completed without a migration —
  // this is why BACKUP_SCHEMA_VERSION and DB_VERSION are unchanged.
  completed?: boolean;
}

export interface WorkoutLog {
  id: string; // uuid
  routineId: string;
  startedAt: string; // ISO 8601
  completedAt: string | null;
  entries: LoggedExercise[];
  sessionNotes: string;
}

/**
 * A bodyweight reading (D24). Keyed by local calendar day, which is what gives
 * "at most one per day" for free — a second reading the same day replaces the
 * first instead of accumulating, with no dedupe logic anywhere.
 *
 * Pounds (D21). This is a *condition* the added-load numbers are measured under,
 * like edge size (D22), not a metric the app charts or has an opinion about.
 */
export interface BodyweightEntry {
  date: string; // ISO 8601 local date key, yyyy-mm-dd — also the primary key
  lb: number;
}

export type CheckKind = 'climbing-volume' | 'climbing-limit' | 'gtg-general' | 'gtg-pull';
export type CheckScope = 'weekly' | 'daily'; // climbing-* are weekly; gtg-* are daily

export interface Check {
  id: string; // uuid
  kind: CheckKind;
  date: string; // ISO 8601 date, local day it happened
  notes: string; // optional free text, may be empty
}

export const CHECK_SCOPE: Record<CheckKind, CheckScope> = {
  'climbing-volume': 'weekly',
  'climbing-limit': 'weekly',
  'gtg-general': 'daily', // push-ups, squats, wrist extensors, external rotations, wall press
  'gtg-pull': 'daily', // scapular pull-ups, dead hangs, full pull-ups — dose-limited, see D13
};

export interface Settings {
  installGuideDismissed: boolean;
  /**
   * The one standard edge the block is tested on (D30), in millimetres.
   *
   * §4E: "Pick **one** standard edge (14–20mm) and never change it mid-block —
   * changing edge size invalidates the comparison more than any training
   * variable." Eight weeks is long enough to forget which edge week 1 was on, and
   * a retest on the wrong edge produces no comparison at all rather than a worse
   * one. Optional, so a pre-T16 database and every already-exported backup read
   * as "not chosen yet" with no migration and no BACKUP_SCHEMA_VERSION bump.
   */
  standardEdgeMm?: number;
  /**
   * The rungs that actually exist on the owner's board, largest first (D26, T18).
   *
   * Gear, not catalog: it decides which edge is one tap, never which edge is
   * possible (D31), and it changes no prescription. Absent means the edge cell
   * stays the T12 text input rather than showing a board the app invented.
   */
  edgesMm?: number[];
  /**
   * The smallest load the owner can physically add, in pounds (D26, D32).
   *
   * Drives the − / + step on `addedLb`, which is what §4F's "small load
   * increments (1–3%)" costs in taps. It is equipment, not advice: the app never
   * proposes taking a step, and no chip is ever marked recommended.
   */
  loadStepLb?: number;
  /**
   * Whether the app speaks its cues (T20, D34).
   *
   * **Absent means on** — the owner asked for the voice, and every cue is
   * foreground-only (D2a is untouched: this is Web Speech while the app is on
   * screen, never a notification). Turning it off silences the *words*; every
   * tone still fires, because the tone carries the event and the voice only
   * carries the words.
   */
  voiceCues?: boolean;
  /**
   * The local day a new block was deliberately started (T24, D25).
   *
   * `yyyy-mm-dd`, the same date-key shape as `BodyweightEntry.date`. This is the
   * *only* block state the app stores: absent means the position is derived from
   * the first completed rotating session, which is D15's derive-don't-store
   * applied a fourth time. Present means weeks and sessions are counted from this
   * day instead, so beginning a second block does not read as week 14 of the
   * first. Optional → a pre-T24 database and every exported backup read as
   * "derived" with no migration and no BACKUP_SCHEMA_VERSION bump.
   */
  blockStartedAt?: string;
  /**
   * Seconds counted off before a hold's clock starts (T20, D33).
   *
   * **Absent means 3; 0 turns the count off.** The count owns the clock: the
   * hold is measured from "pull", not from the tap, so `holdSec` is the effort
   * rather than the effort plus the time it took to step up and load.
   */
  leadInSec?: number;
}
