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

export interface SetEntry {
  load: string; // free-text: "35lb", "20mm +10kg", "5s"
  reps: string;
  rpe: number | null;
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
