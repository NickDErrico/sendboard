# SPEC: Personal Climbing Training App ("Sendboard")

Version 1.3 — 2026-07-23
Status: PRD approved with amendments — Gate 1 passed. See the Amendments log at the end of this file for what changed from v1.0 and why.

> **Executor note:** This file is the source of truth. Read it in full before writing code. Mark task status markers in place as you go. If a decision you need was not made here, STOP, mark the task `[f]` with one line why, and escalate — do not improvise.

---

## LEVEL 1 — PRD

### Problem & user

A single climber (the owner) follows a written 8-week training plan that currently lives in a markdown file. Three failures happen in practice:

1. **Losing track of what the week still owes.** The plan specifies 4 training days/week. A repeating phone alarm or a Todoist recurring task handles *when* to train (D2a) — that part is already solved by tools he has. What is missing is a fast answer to two questions: *what am I doing today*, and *has this week's volume climbing day and limit/projecting day both actually happened?* Without that, the week silently drifts into two projecting days and no volume day.
2. **Not remembering execution details mid-session.** Overcoming-isometric protocols have specific effort levels, durations, rest intervals, and grip positions. Reopening a long markdown doc on a phone mid-session and scrolling for one number is slow enough that he guesses instead — and a guessed load on a max-effort finger protocol is an injury risk, not just a training-quality issue.
3. **No record of what was actually done.** Without a log of edge size, added weight, and how it felt, there is no way to spot a downward trend before it becomes a pulley injury, and no way to know whether the block worked at week 8.

Evidence: the training plan document itself flags "Track everything" and "spot a downward trend before it becomes an injury" as safety-critical, with no tool to do it.

### Success metrics

| Metric | Baseline | Target |
|---|---|---|
| Training weeks with both a volume day and a limit day recorded | untracked | ≥7 of 8 |
| Sessions logged with load + notes | 0 | ≥90% of sessions performed |
| Time to find "how do I do this exercise" mid-session | ~30–60s (scroll a doc) | <5s (2 taps) |
| Weeks of continuous use without data loss | n/a | 8+ |

### Non-goals (v1)

Explicitly out of scope. Do not build these; do not add scaffolding "in case."

- Multi-user, accounts, auth, sharing, social features
- Cloud sync or any backend server (v1 is 100% on-device)
- App Store / TestFlight distribution
- Video hosting or embedded video playback
- Automatic periodization, adaptive load calculation, or 1RM estimation
- Apple Watch app, HealthKit integration
- **In-app reminder scheduling, storage, or notification delivery of any kind** (D2a — owned by an external alarm/Todoist)
- Rest timers with audio (nice-to-have, deferred to v2)
- Charts/analytics beyond a plain reverse-chronological history list
- Editing the exercise catalog from inside the app (catalog is code-seeded in v1)

### Prior decisions & constraints

Recorded once here so no downstream task re-derives or contradicts them.

| # | Decision | Rationale |
|---|---|---|
| D1 | **Installable PWA, not a native app** | Target is iPhone; build machine is Windows. Native iOS builds from Windows require Expo EAS cloud builds **and** a paid Apple Developer account ($99/yr) for device provisioning. A PWA costs $0, needs no Apple account, and deploys from Windows. |
| ~~D2~~ | ~~Reminders are delivered by iOS Shortcuts automation~~ | **SUPERSEDED by D2a on 2026-07-23.** |
| D2a | **The app has no reminder feature at all. Reminders live entirely in an external tool (repeating iPhone alarm or Todoist recurring task), configured by the owner outside this codebase.** | iOS Safari cannot schedule local notifications from a PWA, so the app was never going to *fire* anything. With Q1 resolved to a single fixed time for all training days, the remaining in-app value — storing one time and rendering setup instructions — is less than the value of a repeating alarm the owner sets in 15 seconds. The app's job is answering *what to do*, not *when*. The one piece worth keeping is a **deep link**, so an alarm's Todoist task or a Shortcuts automation can open the app straight to today's routine (T6). |
| D9 | **Climbing days are tracked as lightweight weekly check-offs, not `WorkoutLog` sessions** | Q2: the owner does not want to log sets for climbing, only to confirm that a volume day and a limit/projecting day each happened this week. A full session log for a checkbox is unjustified, and an empty log would pollute history. |
| D10 | **A "week" starts Monday 00:00 local time** | The climbing-balance metric needs a boundary or the executor invents one. ISO-8601 week convention; matches how the 8-week training block is written. |
| D11 | **Greasing-the-groove (GtG) items are tracked as a daily yes/no check, never as sets and reps** | GtG's defining property is that sets are scattered through the day and deliberately unmemorable ("5 push-ups whenever I walk past"). Logging each set would cost more attention than the exercise itself and would defeat the method. The question worth answering is only "did I touch this today," which is the same shape as D9's climbing check. |
| D13 | **GtG covers general movements only — fingers are excluded, and pulling is tracked separately from everything else** | Owner's decision: fingers stay on their own protocol (max hangs + PIMA); Abrahangs remain a warm-up, not a tracked habit. Pulling is split into its own `CheckKind` because it is the one GtG category that loads tissue already loaded by climbing days, Day 3, and every hangboard session — the training plan names it as the first thing to drop at any elbow symptom. Separate tracking makes that volume visible instead of hidden inside a single "did GtG today" flag. |
| D14 | **Tendon adaptation is attributed to the isometrics protocol, not to GtG** | Research correction (2026-07-23): tendon stiffness and modulus respond to load *magnitude* (~90% MVC, ~3s holds); low-strain protocols are largely ineffective for this. Any UI copy or exercise content implying GtG is the tendon-strengthening intervention would contradict the training plan. Exercise `summary` and `cues` fields must not make that claim. |
| D3 | **Stack: Vite + React + TypeScript + Tailwind CSS** | Fast, zero-config-ish, first-class PWA plugin support, well-represented in training data → cheap for any model tier to extend. |
| D4 | **Storage: IndexedDB via `idb`, wrapped in a single storage module** | Installed home-screen PWAs are exempt from WebKit's 7-day script-writable-storage eviction, but the exemption is not a guarantee. A single module means the storage backend can be swapped later without touching UI code. |
| D5 | **Manual JSON export/import is a v1 requirement, not a nice-to-have** | Follows directly from D4. On-device-only data with no backup path is one Safari cache clear away from losing an 8-week log. |
| D6 | **Exercise catalog is a typed constant in source, seeded at first run** | 18 exercises, changed rarely, authored by the owner. A CRUD editor is unjustified complexity in v1. Adding an exercise = edit one file, redeploy. |
| D7 | **Hosting: GitHub Pages from the repo, via GitHub Actions on push to `main`** | Free, no account beyond GitHub, HTTPS by default (required for PWA install), deploys from Windows with no extra tooling. |
| D8 | **Routines are first-class; a workout log always references a routine** | The plan is structured as named days (Day 1 Fingerboard, Day 3 Pull/Antagonist, etc.), not a flat exercise pool. Logging "did some exercises" would not answer "did I complete week 3." |

**Documented alternative, not chosen:** Expo + EAS Build → real native app with `expo-notifications` scheduling reminders in-app. Gate to revisit: owner is willing to pay $99/yr for the Apple Developer Program **and** external reminders have proven insufficient in real use (e.g. he wants the notification itself to name the day's routine). Revisit no earlier than the end of the 8-week block. Do not build toward this in v1.

### Open questions

| # | Question | Owner | Status |
|---|---|---|---|
| Q1 | Is the reminder one fixed time for all training days, or per-day-of-week times? | Owner | **RESOLVED 2026-07-23** — one fixed time, and it moves out of the app entirely. See D2a. |
| Q2 | Should climbing days be loggable sessions, or just reminders? | Owner | **RESOLVED 2026-07-23** — neither: a per-week check-off of which climbing type was done. See D9, T5b. |

No open questions remain. Any new question that arises during execution is an escalation, not a guess.

---

## LEVEL 2 — Decomposition

Risk-first ordering. T0 is a spike: the entire architecture rests on assumptions about iOS PWA behavior that must be verified on the actual device before eight tasks are built on top of them.

| ID | Task | Depends on | Parallel-safe with |
|---|---|---|---|
| T0 | Spike: verify iOS PWA install, storage persistence, Shortcuts deep link | — | — |
| T1 | Project scaffold, PWA config, CI deploy to GitHub Pages | T0 | — |
| T2 | Data layer: types, storage module, seeded catalog + routines | T1 | — |
| T3 | Exercise catalog + detail screens | T2 | T4 |
| T4 | Workout session logging | T2 | T3 |
| T5 | History screen | T4 | T5b, T6 |
| T5b | Climbing day check-off + weekly balance status | T2 | T5, T6 |
| T6 | Settings shell + deep-link routes | T2 | T5, T5b |
| T7 | Backup export/import | T2, T6 | — |
| T8 | Navigation shell, install onboarding, final device pass | T3–T7 | — |

**Gate 2 (decomposition review) happens here** — before T1 starts, after T0 reports.

---

## LEVEL 3 — Task specs

---

### [T0] Outcome: Confirmed on the owner's actual iPhone that an installed PWA persists IndexedDB data across days and can be opened by a scheduled Shortcuts automation.
Spec: this file | Status: [] | Depends on: none

#### Context manifest
Create: throwaway repo or branch `spike/ios-pwa`. Nothing from this task ships. | Conform to: nothing | Imitate: nothing

#### Acceptance criteria
1. WHEN a minimal Vite PWA is deployed to GitHub Pages over HTTPS THE owner SHALL be able to add it to the iPhone home screen and launch it in standalone mode (no Safari chrome visible). []
2. WHEN a value is written to IndexedDB, the app is closed, and it is reopened after ≥48h with no intervening use THE stored value SHALL still be present. []
3. WHEN an iOS Shortcuts personal automation is set to run at a specified time with an "Open URL" action pointing at the PWA URL THE automation SHALL fire and open the installed PWA (not Safari). []
4. WHEN the automation fires THE owner SHALL confirm whether it required manual confirmation or ran automatically, and this SHALL be recorded in the spike report. []

#### Edge cases
- Airplane mode / offline at launch → app must still open from cache (service worker). []
- Automation firing while phone is locked → record observed behavior. []
- iOS version — record it; behavior differs materially below iOS 16.4. []

#### Non-goals & do-not-touch
- MUST NOT build any real feature, catalog data, or UI beyond a single button and a text field.
- MUST NOT proceed to T1 before criteria 1–3 pass.

#### Verify
`npm run build` succeeds; then a written spike report appended to this file under "Amendments" stating pass/fail per criterion and the observed iOS version. If criterion 2 or 3 fails, STOP and escalate — decisions D1/D2 must be revisited.

#### Amendments (append-only: date — what changed — why)

---

### [T1] Outcome: An empty but installable, auto-deploying PWA shell is live at a stable HTTPS URL.
Spec: this file | Status: [] | Depends on: T0

#### Context manifest
Create: repo root — `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `public/manifest.webmanifest`, `public/icons/` (192px + 512px + maskable), `.github/workflows/deploy.yml`, `docs/training-plan.md` (owner supplies this file — the source training plan). | Conform to: `vite-plugin-pwa` config API | Imitate: standard Vite React-TS template

Stack is fixed by D3/D7. Use `vite-plugin-pwa` with `registerType: 'autoUpdate'`.

#### Acceptance criteria
1. WHEN `npm run build` is run THE build SHALL complete with zero TypeScript errors. []
2. WHEN a commit lands on `main` THE GitHub Action SHALL build and publish to GitHub Pages without manual steps. []
3. WHEN the deployed URL is opened on iPhone Safari THE "Add to Home Screen" flow SHALL produce a standalone app with the correct name and icon. []
4. WHEN the installed app is launched offline THE shell SHALL render (service worker precache). []
5. WHEN `vite.config.ts` `base` is set THE app SHALL load correctly from the GitHub Pages subpath (no 404s on assets). []

#### Edge cases
- GitHub Pages subpath breaking asset URLs and the service worker scope — the single most common failure mode for this stack; verify explicitly. []
- Manifest `display: standalone` and `theme_color` present, or iOS falls back to a browser-chrome launch. []
- Apple-specific meta tags (`apple-mobile-web-app-capable`, `apple-touch-icon`) present — iOS ignores parts of the webmanifest. []

#### Non-goals & do-not-touch
- MUST NOT add any application feature, route, or data model.
- MUST NOT add a backend, analytics, or any third-party runtime dependency beyond React, Tailwind, `idb`, and the PWA plugin.

#### Verify
`npm run build && npm run preview` — then confirm criteria 3–5 on device.

#### Amendments

---

### [T2] Outcome: All app data types, a single storage module, and the seeded exercise/routine catalog exist and are unit-tested.
Spec: this file | Status: [] | Depends on: T1

#### Context manifest
Create: `src/types.ts`, `src/data/exercises.ts`, `src/data/routines.ts`, `src/lib/storage.ts`, `src/lib/storage.test.ts` | Read: `docs/training-plan.md` (source of every description, cue, and prescription — do not invent exercise content) | Conform to: types below, exactly | Imitate: n/a

**Types — implement as written:**

```ts
type Equipment = 'hangboard' | 'pullup-bar' | 'kettlebell' | 'dip-belt' | 'band' | 'bodyweight' | 'climbing-wall';
type IsoType = 'overcoming' | 'yielding' | 'dynamic' | 'none';

interface Exercise {
  id: string;              // stable kebab-case slug, never reused
  name: string;
  category: 'fingers' | 'pulling' | 'antagonist' | 'lower-body' | 'climbing' | 'warmup';
  isoType: IsoType;
  equipment: Equipment[];
  summary: string;         // one line, shown in list view
  howTo: string[];         // ordered steps, shown in detail view
  prescription: string;    // e.g. "4-6 sets x 3-5s @ 100% effort, 3 min rest"
  cues: string[];          // form/technique reminders
  safetyNotes: string[];   // may be empty; rendered visually distinct
  gtgEligible: boolean;    // true = suitable for greasing-the-groove use; drives a badge in T3
}

interface Routine {
  id: string;
  name: string;            // e.g. "Day 1 — Fingerboard"
  dayOfWeek: number | null;// 0-6, null = unscheduled
  exerciseIds: string[];   // ordered
}

interface SetEntry { load: string; reps: string; rpe: number | null; }   // load/reps are free-text: "35lb", "20mm +10kg", "5s"

interface LoggedExercise { exerciseId: string; sets: SetEntry[]; notes: string; }

interface WorkoutLog {
  id: string;              // uuid
  routineId: string;
  startedAt: string;       // ISO 8601
  completedAt: string | null;
  entries: LoggedExercise[];
  sessionNotes: string;
}

type CheckKind = 'climbing-volume' | 'climbing-limit' | 'gtg-general' | 'gtg-pull';
type CheckScope = 'weekly' | 'daily';   // climbing-* are weekly; gtg-* are daily

interface Check {
  id: string;              // uuid
  kind: CheckKind;
  date: string;            // ISO 8601 date, local day it happened
  notes: string;           // optional free text, may be empty
}

const CHECK_SCOPE: Record<CheckKind, CheckScope> = {
  'climbing-volume': 'weekly',
  'climbing-limit': 'weekly',
  'gtg-general': 'daily',   // push-ups, squats, wrist extensors, external rotations, wall press
  'gtg-pull': 'daily',      // scapular pull-ups, dead hangs, full pull-ups — dose-limited, see D13
};

interface Settings {
  installGuideDismissed: boolean;
}
```

`Settings` holds no reminder data — see D2a. Do not add a `reminders` field.

**Seed catalog — 20 exercises, all content sourced from `docs/training-plan.md`:**

`gtgEligible: true` for exactly these six: `oi-wall-press`, `external-rotations`, `wrist-extensor-work`, `pushups-or-dips`, `kb-goblet-squat`, `bodyweight-pullups`. All others `false` — **including `abrahangs-no-hang`**, which is a warm-up, not a GtG habit (D13). Source: training plan §8 "What to GtG (the committed list)". Do not mark any Day 1 max-protocol exercise eligible — the plan explicitly forbids it.

| id | category | isoType | equipment |
|---|---|---|---|
| `finger-warmup-progression` | warmup | none | hangboard |
| `abrahangs-no-hang` | warmup | yielding | hangboard |
| `bodyweight-pullups` | pulling | dynamic | pullup-bar |
| `pima-finger-pull-half-crimp` | fingers | overcoming | hangboard |
| `pima-finger-pull-open-hand` | fingers | overcoming | hangboard |
| `max-hang-half-crimp` | fingers | yielding | hangboard, dip-belt |
| `max-hang-open-hand` | fingers | yielding | hangboard, dip-belt |
| `oi-bar-pull-extended` | pulling | overcoming | pullup-bar |
| `oi-bar-pull-90` | pulling | overcoming | pullup-bar |
| `oi-bar-pull-top` | pulling | overcoming | pullup-bar |
| `weighted-lockoff-hold` | pulling | yielding | pullup-bar, dip-belt |
| `kb-single-arm-row` | pulling | dynamic | kettlebell |
| `kb-goblet-squat` | lower-body | dynamic | kettlebell |
| `kb-turkish-getup` | antagonist | dynamic | kettlebell |
| `pushups-or-dips` | antagonist | dynamic | bodyweight |
| `oi-wall-press` | antagonist | overcoming | bodyweight |
| `external-rotations` | antagonist | dynamic | band, kettlebell |
| `wrist-extensor-work` | antagonist | dynamic | kettlebell |
| `climbing-volume-technique` | climbing | none | climbing-wall |
| `climbing-limit-boulder` | climbing | none | climbing-wall |

**Seed routines:** exactly two — `day-1-fingerboard` and `day-3-pull-antagonist`. Exercise ordering follows the training plan's section order exactly.

Per D9 there are **no** climbing routines. The two climbing exercises stay in the catalog so their `howTo` and `cues` are readable (T3), but they belong to no routine and are never logged as sessions — they are checked off via T5b.

#### Acceptance criteria
1. WHEN the app starts for the first time (empty IndexedDB) THE storage module SHALL seed the catalog and routines and SHALL NOT overwrite them on subsequent starts. []
2. WHEN a `WorkoutLog` is saved and the module is re-instantiated THE log SHALL be retrievable by id and SHALL appear in `getAllLogs()` sorted by `startedAt` descending. []
3. WHEN `getSettings()` is called with no stored settings THE module SHALL return a default `Settings` object, not `undefined`. []
3a. WHEN a `Check` is saved THE module SHALL persist it, and `getChecksForWeek(date)` SHALL return every check whose `date` falls in the Monday-start week containing `date` (D10), and `getChecksForDay(date)` SHALL return every check on that local calendar date. []
3b. WHEN either getter is called for a period with no checks THE module SHALL return an empty array, not `undefined`. []
4. WHEN any exercise in the seed catalog is checked THE fields `summary`, `howTo`, `prescription` SHALL be non-empty and their content SHALL be traceable to `docs/training-plan.md`. []
5. WHEN the seed catalog is validated THE set of every `Routine.exerciseIds` entry SHALL be a subset of existing `Exercise.id` values (assert this in a test). []
6. WHEN IndexedDB is unavailable or throws THE module SHALL throw a typed `StorageError` rather than failing silently. []

#### Edge cases
- Empty database on first run. []
- Schema version bump: include a `DB_VERSION` constant and an upgrade path stub, even though v1 has one version. []
- A log referencing an `exerciseId` that no longer exists in the catalog (catalog edited later) → reads must not crash; render the id as a fallback name. []
- Concurrent writes from two open instances → last-write-wins is acceptable; document it in a code comment. []
- Week boundary: a check dated Sunday 23:59 and one dated Monday 00:01 belong to *different* weeks (D10). Assert both sides of the boundary in a test. []
- Daylight-saving transition inside a week → week grouping must not shift; compute boundaries from local calendar dates, not UTC offsets. []

#### Non-goals & do-not-touch
- MUST NOT build any UI in this task.
- MUST NOT add a catalog CRUD/editor API (D6).
- MUST NOT invent exercise descriptions not present in `docs/training-plan.md`.

#### Verify
`npm run test -- storage` (Vitest; all tests pass) and `npm run build`.

#### Amendments

---

### [T3] Outcome: The owner can browse all exercises and open one to see how to perform it and what equipment it needs.
Spec: this file | Status: [] | Depends on: T2 | Parallel-safe with T4

#### Context manifest
Create: `src/screens/ExerciseList.tsx`, `src/screens/ExerciseDetail.tsx`, `src/components/EquipmentBadge.tsx` | Read: `src/types.ts`, `src/lib/storage.ts` | Conform to: `Exercise` type | Imitate: n/a (first UI task — establishes the pattern others follow)

#### Acceptance criteria
1. WHEN the exercise list renders THE screen SHALL show all 20 seeded exercises grouped by `category`, each row showing name, `summary`, and equipment badges. []
1a. WHEN an exercise has `gtgEligible: true` THE row and detail screen SHALL show a distinct "GtG" badge, and a filter SHALL exist to show only GtG-eligible exercises. []
2. WHEN a filter control is set to an `Equipment` value THE list SHALL show only exercises whose `equipment` array contains it. []
3. WHEN an exercise row is tapped THE detail screen SHALL render `name`, `prescription`, all `howTo` steps as an ordered list, all `cues`, and all `safetyNotes`. []
4. WHEN an exercise has a non-empty `safetyNotes` array THE notes SHALL render in a visually distinct warning block, not as body text. []
5. WHEN the detail screen is open on a 390px-wide viewport THE full `prescription` SHALL be readable without horizontal scrolling. []
6. WHEN an exercise has `isoType` of `overcoming` or `yielding` THE detail screen SHALL display that label. []

#### Edge cases
- Exercise with empty `safetyNotes` → warning block omitted entirely, no empty container. []
- Filter selection matching zero exercises → explicit empty state, not a blank screen. []
- Long `howTo` step text → wraps, does not clip. []
- Back navigation from detail → returns to the list with the filter still applied. []

#### Non-goals & do-not-touch
- MUST NOT allow editing or creating exercises.
- MUST NOT modify `src/lib/storage.ts` or `src/data/*`.
- MUST NOT add images or video.

#### Verify
`npm run build && npm run lint`, plus device check of criteria 3–5 on the installed PWA.

#### Amendments

---

### [T4] Outcome: The owner can start a session from a routine, log sets per exercise, and save it.
Spec: this file | Status: [] | Depends on: T2 | Parallel-safe with T3

#### Context manifest
Create: `src/screens/RoutineList.tsx`, `src/screens/ActiveSession.tsx`, `src/components/SetLogger.tsx` | Read: `src/types.ts`, `src/lib/storage.ts` | Modify: none outside the files above | Conform to: `WorkoutLog`, `LoggedExercise`, `SetEntry`

`load` and `reps` are free-text strings by design (D: a hangboard entry is "20mm +10kg", a kettlebell entry is "35lb x 8") — do not add numeric parsing or validation.

#### Acceptance criteria
1. WHEN a routine is selected and "Start" is tapped THE app SHALL create a `WorkoutLog` with `startedAt` set and `completedAt` null, and persist it immediately. []
2. WHEN the active session renders THE screen SHALL list the routine's exercises in order, each expandable to show `prescription` and `cues` inline without leaving the screen. []
3. WHEN "Add set" is tapped on an exercise THE app SHALL append a `SetEntry` and persist the log within 1 second, with no explicit save action required. []
4. WHEN the app is force-closed mid-session and reopened THE in-progress session SHALL be resumable with all logged sets intact. []
5. WHEN "Finish session" is tapped THE app SHALL set `completedAt` and return to the home screen. []
6. WHEN an exercise is left with zero sets THE session SHALL still save, omitting or empty-listing that exercise — an unfinished session is valid data. []

#### Edge cases
- Two sessions started without finishing the first → prompt to resume or discard; never silently create a second in-progress log. []
- Session spanning midnight → `startedAt` governs which day it belongs to. []
- Rapid taps on "Add set" → no duplicate or dropped entries. []
- Deleting a set → confirm before removal. []

#### Non-goals & do-not-touch
- MUST NOT add rest timers, audio, or haptics (v2).
- MUST NOT auto-suggest loads from history.
- MUST NOT modify `src/data/*`.

#### Verify
`npm run test -- session && npm run build`, plus a device check of criterion 4 (force-close and resume).

#### Amendments

---

### [T5] Outcome: The owner can see past sessions and open any one to review what was logged.
Spec: this file | Status: [] | Depends on: T4 | Parallel-safe with T6

#### Context manifest
Create: `src/screens/History.tsx`, `src/screens/LogDetail.tsx` | Read: `src/lib/storage.ts`, `src/types.ts` | Conform to: `WorkoutLog`

#### Acceptance criteria
1. WHEN the history screen renders THE app SHALL list completed sessions newest-first, each showing date, routine name, and exercise count. []
2. WHEN a session is tapped THE detail SHALL show every logged exercise with all its sets (load, reps, rpe) and notes. []
3. WHEN no sessions exist THE screen SHALL show an empty state directing the owner to start one. []
4. WHEN a session is in progress THE history screen SHALL show it at the top, labeled as in-progress and tappable to resume. []

#### Edge cases
- A log referencing a deleted/renamed `exerciseId` → render the raw id, do not crash (mirrors T2 edge case). []
- 100+ logs → list renders without noticeable lag; no pagination required at v1 scale. []

#### Non-goals & do-not-touch
- MUST NOT add charts, PRs, streaks, or trend analysis (explicit non-goal).
- MUST NOT allow editing a completed log in v1.

#### Verify
`npm run build && npm run lint`

#### Amendments

---

### [T5b] Outcome: The owner can check off a climbing day or a greasing-the-groove habit in two taps, and see whether this week has had both climbing types and whether today's GtG is done.
Spec: this file | Status: [] | Depends on: T2 | Parallel-safe with T5, T6

#### Context manifest
Create: `src/components/WeekStatus.tsx`, `src/components/DailyGtgStatus.tsx`, `src/screens/CheckLog.tsx` | Read: `src/types.ts`, `src/lib/storage.ts` (`Check`, `CHECK_SCOPE`, `getChecksForWeek`, `getChecksForDay`) | Conform to: `Check`, D10 week boundary, D11/D12 | Imitate: the screen structure established in T3

This is deliberately not a workout log (D9, D11). No sets, no loads, no timers. A check-off and an optional note. Both weekly and daily checks use the same `Check` record and differ only by `CHECK_SCOPE[kind]`.

#### Acceptance criteria
1. WHEN the week status component renders THE app SHALL show the current Monday-start week with a distinct done/not-done state for `climbing-volume` and `climbing-limit`. []
2. WHEN a weekly check is tapped off THE app SHALL persist a `Check` dated today and the status SHALL update to done without a reload. []
3. WHEN both climbing types are done for the current week THE component SHALL render a visually distinct "week complete" state. []
4. WHEN a check is tapped again THE app SHALL offer to remove it, and on confirmation the status SHALL revert to not-done. []
5. WHEN the daily GtG status component renders THE app SHALL show today's done/not-done state for `gtg-general` and `gtg-pull`, and SHALL reset to not-done at local midnight. []
6. WHEN the daily GtG status renders THE component SHALL also show a count of how many of the last 7 days each GtG kind was completed. []
7. WHEN the check log screen renders THE app SHALL list past weeks newest-first, each showing which climbing types were completed and how many GtG days that week contained. []
8. WHEN a check is being added THE owner SHALL be able to attach an optional free-text note and SHALL be able to save without one. []

#### Edge cases
- Two volume days in one week → allowed, still renders as done once; do not block or warn. []
- Two `gtg-general` checks on one day → allowed, renders as done once. GtG is many sets a day; the check means "I did this today," not "I did it once." []
- A check dated Sunday 23:59 vs Monday 00:01 → different weeks (D10 test in T2 covers storage; verify UI reflects it). []
- App left open across local midnight → daily status must roll over on next render or focus, not stay stuck on yesterday. []
- Backdating: the owner forgot to check off yesterday → the add flow MUST allow choosing a date other than today, for both scopes. []
- A week with zero checks appearing in history → render it as an explicitly empty week, do not silently omit it, or the "did I skip?" question goes unanswered. []
- Timezone change while traveling → week and day grouping computed from local calendar dates (D10). []

#### Non-goals & do-not-touch
- MUST NOT create a `WorkoutLog` for climbing days or GtG.
- MUST NOT log individual GtG sets, reps, or times (D11) — the check is the whole feature.
- MUST NOT add streak pressure mechanics (streak-break warnings, badges, guilt copy). GtG is dropped deliberately when fatigued; the training plan §8 lists conditions for stopping. UI that punishes a missed day argues against the plan.
- MUST NOT add grades, send tracking, or problem names.
- MUST NOT modify `src/data/*` or the routine seeds.

#### Verify
`npm run test -- checks && npm run build`

#### Amendments

---

### [T6] Outcome: A settings screen exists, and an external alarm or Todoist task can deep-link straight into today's routine.
Spec: this file | Status: [] | Depends on: T2 | Parallel-safe with T5, T5b

#### Context manifest
Create: `src/screens/Settings.tsx` (shell only — T7 adds the backup section), `src/lib/routes.ts`, `README.md` reminder-setup section | Modify: `src/App.tsx` (route table) | Conform to: `Settings`

**Read this before implementing.** Per D2a the app has **no reminder feature**. Do not add a time picker, a reminder list, a `reminders` field, `Notification.requestPermission()`, service-worker push, or the Notification Triggers API. None of it works on iOS from a PWA, and shipping UI that implies otherwise is worse than shipping nothing. Reminders are a repeating iPhone alarm or a Todoist recurring task that the owner configures himself. This task's only reminder-adjacent deliverable is a **stable deep-link URL** those external tools can open, plus documentation of it.

#### Acceptance criteria
1. WHEN `/routine/:routineId` is opened THE app SHALL navigate directly to that routine's start screen, bypassing the home screen. []
2. WHEN `/routine/:routineId` is opened from the iPhone home-screen icon's scope THE installed PWA SHALL handle it (not a new Safari tab). []
3. WHEN the settings screen renders THE app SHALL display the app version, a link to the install guide, and the deep-link URLs for both seeded routines as selectable text. []
4. WHEN `README.md` is read THE reminder-setup section SHALL give both options — repeating iPhone alarm, and Todoist recurring task with the deep-link URL in the task — in numbered steps. []
5. WHEN an unknown route is opened THE app SHALL render a not-found state with a link home, not a blank screen. []

#### Edge cases
- Deep link to a `routineId` that does not exist → not-found state, no crash. []
- Deep link opened while a session is already in progress → the T4 resume prompt takes precedence. []
- GitHub Pages subpath + client-side routing: a direct deep-link hit will 404 on a static host without a fallback. Use hash routing, or add a `404.html` redirect shim. **Verify on the deployed site, not just locally** — this passes in dev and fails in production. []

#### Non-goals & do-not-touch
- MUST NOT implement notifications, web push, VAPID, or any backend.
- MUST NOT claim in any UI copy that the app sends reminders.
- MUST NOT add the backup UI (that is T7).

#### Verify
`npm run build && npm run lint`, plus device confirmation of criteria 2 and the edge case above against the **deployed** URL.

#### Amendments

---

### [T7] Outcome: The owner can export all data to a JSON file and restore it on a fresh install.
Spec: this file | Status: [] | Depends on: T2, T6

#### Context manifest
Create: `src/lib/backup.ts`, `src/lib/backup.test.ts`, backup section within `src/screens/Settings.tsx` (created by T6) | Read: `src/lib/storage.ts` | Conform to: `WorkoutLog`, `Check`, `Settings`

Export scope is: all `WorkoutLog`s, all `Check`s, and `Settings`. Not the exercise catalog (D6).

#### Acceptance criteria
1. WHEN "Export" is tapped THE app SHALL produce a JSON file containing all workout logs, all checks, and settings, with a `schemaVersion` field and an ISO timestamp in the filename. []
2. WHEN a previously exported file is imported into an app with empty storage THE logs, checks, and settings SHALL be fully restored. []
3. WHEN a file with an unrecognized `schemaVersion` is imported THE app SHALL refuse the import with an explicit message and change nothing. []
4. WHEN an import would overwrite existing data THE app SHALL require an explicit confirmation naming how many logs will be replaced. []
5. WHEN malformed JSON is imported THE app SHALL show an error and leave existing data untouched. []

#### Edge cases
- Export with zero logs → valid file, not an error. []
- Import on iOS Safari — verify the file picker and the download/share-sheet path actually work in standalone PWA mode; this is the known-fragile part of this task. []
- Partial/truncated file → treated as malformed (criterion 5). []

#### Non-goals & do-not-touch
- MUST NOT add cloud backup, iCloud, or auto-export.
- MUST NOT export the exercise catalog (it is code-seeded, D6).

#### Verify
`npm run test -- backup && npm run build`, plus a device check of criterion 2 (export, clear site data, reinstall, import).

#### Amendments

---

### [T8] Outcome: The app is a coherent, navigable, installed tool the owner uses for a real training session end to end.
Spec: this file | Status: [] | Depends on: T3, T4, T5, T5b, T6, T7

#### Context manifest
Create: `src/components/TabBar.tsx`, `src/screens/Home.tsx`, `src/screens/InstallGuide.tsx` | Modify: `src/App.tsx` (routing, alongside T6's route table) | Read: all screens

#### Acceptance criteria
1. WHEN the app opens THE home screen SHALL show both seeded routines with a one-tap Start each, the last session's date, the T5b climbing week status, and the T5b daily GtG status. []
2. WHEN any screen is open THE tab bar SHALL offer: Home, Exercises, History, Settings. []
3. WHEN the app is opened in Safari rather than as an installed PWA THE app SHALL show the install guide once. []
4. WHEN the app renders on the owner's iPhone THE layout SHALL respect safe-area insets (no content under the notch or home indicator). []
5. WHEN a full session is performed on-device — start, log ≥3 exercises, finish, view in history, export — THE flow SHALL complete with no crash, no data loss, and no unreadable text. []

#### Edge cases
- Week already complete for climbing → home still allows adding another check, it just reads as complete. []
- Landscape orientation → usable, not broken. []
- iOS text-size accessibility setting at maximum → no clipped or overlapping controls. []
- App opened via a T6 deep link while a session is already in progress → resume prompt wins. []

#### Non-goals & do-not-touch
- MUST NOT add features not specified in T1–T7.
- MUST NOT restyle screens delivered by earlier tasks beyond what safe-area and tab-bar integration require.

#### Verify
`npm run build && npm run lint && npm run test`, then the criterion-5 device walkthrough with the result recorded in Amendments.

#### Amendments

---

## Execution notes

- **Gates:** Gate 1 = PRD approved (now, by the owner). Gate 2 = decomposition approved after T0's spike report. Gate 3 = implementation reviewed against acceptance criteria after T8.
- **Escalation is not failure.** If a task requires a judgment this spec did not make, mark it `[f]`, write one line about what was missing, and stop. Each escalation is a bug in this spec, and the fix is to amend this file — not to guess in code.
- **Amend before you code.** If reality diverges (an iOS behavior differs, a dependency breaks), update the relevant section and add a dated Amendments line first, then implement.

---

## Amendments log (append-only)

**2026-07-23 — v1.0 → v1.1 — Q1 and Q2 resolved by the owner.**

| Change | Why |
|---|---|
| D2 superseded by D2a: all reminder functionality removed from the app | Q1 answered "one fixed time, and it doesn't need to be in the app." Since a PWA on iOS can never fire a notification anyway, the app was only ever going to *store* a time and *print instructions*. At one fixed time that is worth less than a repeating alarm. Reminders now live in an iPhone alarm or Todoist. |
| Deep-link routing kept and promoted to T6's main deliverable | Still valuable and nearly free: the external reminder can open the app directly to a routine. This was the only genuinely useful half of old T6. |
| D9 added: climbing days become `ClimbingCheck` records, not `WorkoutLog` sessions | Q2 answered "don't need logging, but want to confirm a volume day and a limit day happened each week." |
| D10 added: week starts Monday 00:00 local | D9 needs a week boundary or the executor invents one, and would likely invent Sunday-start, splitting the training week. |
| `Settings.reminders` removed; `ClimbingCheck` and `getChecksForWeek` added to T2 | Follows D2a and D9. |
| Seed routines cut from 4 to 2 (`day-1-fingerboard`, `day-3-pull-antagonist`) | Climbing days are no longer routines (D9). The two climbing exercises stay in the catalog as reference content. |
| T5b added: climbing check-off + weekly balance status | New surface required by D9. |
| T6 rewritten: reminder UI → settings shell + deep-link routes | Follows D2a. |
| T7 now depends on T6 and exports climbing checks | T6 creates `Settings.tsx`; D9 adds a second data collection that must be backed up. |
| T8 home screen shows both routines plus climbing week status | No day-of-week scheduling exists anymore (D2a), so "today's routine" is no longer computable — the owner picks. |
| Success metric "sessions that fire a reminder" replaced with "weeks with both a volume and a limit day" | The old metric measured a feature that no longer exists; the new one measures the problem the owner actually named. |

**Net effect on scope:** one task removed in substance (reminders), one task added (climbing checks), roughly neutral on effort and clearly negative on complexity — no notification permissions, no Shortcuts documentation burden, no schedule state to keep in sync.

---

**2026-07-23 — v1.1 → v1.2 — greasing-the-groove (GtG) research folded in.**

Research finding driving this: GtG is not a competing philosophy to the isometrics block. Its climbing-specific form (Abrahangs) is the low-intensity protocol from the Gilmore et al. 2024 study already cited in the training plan, which found low-intensity and max-intensity finger training to be *additive*. The training plan gained a §8 covering allocation rules, intensity calibration, and stop conditions. The app changes needed to support it are small because T5b already built the right mechanism.

| Change | Why |
|---|---|
| D11 added: GtG tracked as a daily yes/no check, never sets and reps | GtG sets are scattered and deliberately unmemorable ("5 push-ups walking past the bar"). Logging each set costs more attention than the exercise. The only useful question is "did I touch this today." |
| D12 added: `ClimbingCheck` generalized to `Check` with `kind` + `CHECK_SCOPE` | Avoids a second parallel tracking system. Weekly-scope kinds answer the climbing-balance question; daily-scope kinds answer the GtG question. One type, one storage path, one component. |
| `Exercise.gtgEligible: boolean` added; five exercises marked true | Lets T3 badge and filter the GtG-appropriate movements. The plan explicitly forbids GtG on Day 1 max protocols, so the flag encodes that rather than leaving it to memory. |
| `abrahangs-no-hang` added to the seed catalog (18 → 19 exercises) | New exercise introduced by training plan §8; not expressible as a variant of an existing entry. |
| T5b expanded: daily GtG status + 7-day counts alongside the weekly climbing status | Same component family, same storage. This is the bulk of the added work and it is small. |
| T5b non-goal added: no streak mechanics, badges, or guilt copy | Training plan §8 lists explicit conditions for *stopping* GtG (elbow soreness, declining max-hang numbers). A UI that punishes a missed day would argue against the plan's own safety guidance. This is the one place the feature could do real harm, so it is fenced. |
| T3, T7, T8 updated for the renamed type and the 19th exercise | Consistency; no new surface. |

**Net effect on scope:** no new tasks. One new type field, one new catalog entry, one generalized record, and roughly four extra acceptance criteria on an already-planned task. Estimated addition: well under a day of executor work.

**Deliberately not built:** a GtG timer, per-set logging, reminder prompts to do GtG sets, and any adherence scoring. All would fight the method rather than support it.

---

**2026-07-23 — v1.2 → v1.3 — GtG scope narrowed by the owner; tendon-adaptation research correction.**

Two drivers. (1) Owner's scope decision: GtG applies to general movements — pull-ups, push-ups, squats, prehab — while fingers stay on their own protocol. (2) A research correction that reverses part of v1.2's rationale: the tendon-adaptation literature attributes tendon stiffness and modulus gains to load *magnitude* (~90% MVC, ~3s holds, high localised strain), with low-strain protocols largely ineffective. GtG at 40–60% is below that threshold. Tendon strengthening is therefore the **isometrics protocol's** contribution, not GtG's. The training plan §4B gained a rep-structured PIMA variant matching the evidenced dose, and §8 was rewritten with an honest goal-by-goal accounting.

| Change | Why |
|---|---|
| D13 added: GtG excludes fingers; pulling split into its own `CheckKind` | Owner's decision on fingers. Pulling is separated because it is the only GtG category loading tissue already loaded by climbing, Day 3, and hangboarding — the plan names it first-to-drop at any elbow symptom, so its volume must be visible rather than hidden inside one combined flag. |
| D14 added: tendon adaptation attributed to isometrics, not GtG | Prevents exercise copy from making a claim the evidence does not support and the training plan explicitly corrects. |
| `CheckKind`: `gtg-fingers`/`gtg-antagonist` → `gtg-general`/`gtg-pull` | Follows D13. |
| `abrahangs-no-hang` set to `gtgEligible: false` | It is a warm-up, not a daily habit (D13). Still in the catalog, still readable in T3. |
| `bodyweight-pullups` added and marked eligible; `kb-goblet-squat` marked eligible (19 → 20 exercises) | Matches the owner's stated movement list. No plain pull-up existed in the catalog — only isometric bar pulls and weighted lock-offs. |
| T3 exercise count 19 → 20; T5b criteria and edge cases renamed | Consistency; no new surface. |

**Net effect on scope:** no new tasks, no new components. One catalog entry, two renamed enum members, two flag flips.
