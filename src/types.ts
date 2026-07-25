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
  holdSeconds?: [min: number, max: number]; // min === max for a fixed target
  restSeconds?: number; // prescribed rest between sets
  // D20: charted only where the training plan actually progresses something —
  // three exercises. Absent means no numeric fields and no chart. Order matters:
  // it is the chart toggle's order and its default selection.
  metrics?: ProgressMetric[];
  cues: string[]; // form/technique reminders
  safetyNotes: string[]; // may be empty; rendered visually distinct
  gtgEligible: boolean; // true = suitable for greasing-the-groove use; drives a badge in T3
}

export interface Routine {
  id: string;
  name: string; // e.g. "Day 1 — Fingerboard"
  dayOfWeek: number | null; // 0-6, null = unscheduled
  exerciseIds: string[]; // ordered
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
}
