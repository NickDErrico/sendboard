# SPEC: Personal Climbing Training App ("Sendboard")

Version 1.8 — 2026-07-25
Status: PRD approved with amendments — Gate 1 passed. **T1–T16 built — Wave 0 is complete, so the block can start.** T17–T28 remain as a prioritized backlog (v1.8), specced and built one at a time in wave order. See the Amendments log at the end of this file for what changed from v1.0 and why.

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
- ~~Rest timers with audio (nice-to-have, deferred to v2)~~ **BUILT in T10 (2026-07-24).** This was deferred, not rejected; the deferral expired when the owner asked for it. See D17–D19.
- ~~Charts/analytics beyond a plain reverse-chronological history list~~ **NARROWED by T12 (2026-07-24), narrowed again by v1.8.** A per-exercise progress line exists for the three exercises the training plan actually progresses (D20). v1.8 additionally permits *arithmetic aggregates that report* — time under tension, an edge × week grid (T26), a session sigil (T27), a block poster (T28) — under the single rule in **D23**. What remains out, permanently: PRs, streaks, badges, adherence percentages, trend arrows, projections, session rankings, scores, and any chart for an exercise the plan does not progress.
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
| D15 | **"Which routine am I supposed to do" is answered by rotation order, never by a calendar day** | Owner decision 2026-07-24. The two strength routines alternate (A → B → A), so "up next" is derivable from *which was completed least recently* with no schedule state at all. A day-of-week assignment would reverse D2a (which removed scheduling), require a rest-day/missed-day concept, and produce a "you're behind" state on any week that shifts — which training plan §3's "rest 2–3 days" and §4F's "take a lighter week regardless of the schedule" both explicitly invite. Rotation degrades correctly: a skipped or shifted week just changes what is oldest. `Routine.dayOfWeek` stays `null` on both seeds and remains unused. |
| D20 | **An exercise is charted only if the training plan progresses it, and the catalog declares which metrics it progresses by** | Owner decision 2026-07-24, after a pass over `docs/training-plan.md` found that most of the catalog has nothing to plot. §4F progresses the max hangs by load ("add small load increments (1–3%)") and §5B progresses the weighted lock-off ("add kettlebell via dip belt as this gets easy") — those three, and only those three, are charted. §4B says PIMA progresses "by feel, not by adding weight" and §4E adds "don't test PIMA numerically; there's nothing to measure without a force gauge," which rules out both PIMA entries and, by the same argument, the three bar pulls and the wall press. §8 says to keep GtG pull-ups trivial and never near failure, so charting them would encourage exactly the behaviour the plan warns about. Warm-ups and prehab are not progressed at all. A per-exercise `metrics` list — rather than one global rule — is required because the metrics are not uniform: a max hang has an edge, the lock-off is a bar and has none. |
| D22 | **Where an exercise declares an edge, edge size is the *condition* the other metrics are measured under — not a peer metric. A series never connects two points recorded on different edges** | Owner's stated progression, 2026-07-24: drop to a smaller edge, rebuild hold time on it, then add weight or drop again. Under that pattern a single continuous time line renders real progress as a sawtooth — 7s→10s on 20mm, then 6s on 18mm — which reads as repeated regression when nothing regressed. The same applies to load: `+35lb` on 20mm and `+35lb` on 18mm are different performances, and joining them asserts an equivalence that is false. So time and load series break at every edge change and each segment is labelled with its edge; progress is legible both *within* a segment (the line rising) and *across* them (a new edge starting higher than the previous one did). This is the charting form of §4E's "changing edge size invalidates the comparison more than any training variable" — the app declines to draw the invalid comparison rather than annotating it after the fact. The weighted lock-off declares no edge, so its series is unsegmented. |
| D21 | **Measurements are stored as typed optional numbers next to the free-text fields, never parsed out of them. Canonical units are pounds, millimetres, and seconds** | The same reasoning as D17, applied to logging instead of the catalog: `load` is deliberately free text ("20mm +10kg", "BW", "35lb") and a parser over it silently mis-reads anything off-pattern — on a chart that means a wrong trend line, which is worse than no line, because §7's whole point is spotting a *downward* trend before it becomes an injury. Free text stays exactly as it is for grip, edge and context notes; the numbers live beside it and appear only on exercises that declare the metric. Pounds because that is the equipment the owner actually picks up (a 35lb kettlebell lands on a whole number); the plan's kg notation stays in the prose. Optional fields → no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` bump, and pre-T12 sets simply do not plot. |
| D17 | **Hold and rest durations are typed catalog fields (`holdSeconds`, `restSeconds`), never parsed out of `prescription` text** | `prescription` is prose written for a human mid-session ("5 sets x 7–10s hang @ ~85–90% of max for the edge, 3 min rest"), and several entries carry two variants in one string (§4B's weeks 1–4 vs 5–8 PIMA). A regex over that is a silent-wrong-number machine on a max-effort finger protocol, which is the exact failure the PRD's problem #2 names. Typed optional fields cost two lines per exercise in a file that is already the hand-authored source of truth (D6). Absent field = that exercise simply has no timer; nothing is invented for the rep-based movements. |
| D18 | **Timer state is ephemeral and session-local: never persisted, never in a backup, never a data type** | The timer answers "how long have I been pulling *right now*." Nothing downstream reads it, so persisting it would add a store, a schema version, and a stale-timer-on-resume problem in exchange for nothing. It is held as React state with an **absolute target timestamp** rather than a tick counter, so backgrounding, re-render, and iOS throttling cannot drift it — that, not persistence, is what makes it correct. A force-quit loses a running timer, which is acceptable: the owner has lost track of the interval by then anyway. `DB_VERSION` and `BACKUP_SCHEMA_VERSION` do not change. |
| D19 | **Prefilled set values are a draft, never a claim.** Carry-forward seeds the input; it never marks an exercise completed and never writes a set the owner did not ask for | Preserves D16's separation of "logged numbers" from "I did this." A prefilled row appears only on an explicit `+ Add set` or `Log Ns` tap, and every field stays editable — so a seeded value that is wrong costs one edit, never a corrupted record. The rule that makes this safe: prefill copies *what you last did*, and the app never infers what you *should* do next (that would be adaptive load calculation, a standing non-goal). |
| D16 | **A logged exercise carries an explicit `completed` flag, separate from its sets** | T4 AC6 omits zero-set exercises from `entries`, which makes "did it, didn't log numbers" indistinguishable from "skipped it." Several plan items have nothing numeric worth typing (warm-up progression, Turkish get-ups, the wall press), so the owner is forced to either fabricate a set row or lose the record. A boolean answers "was this session actually completed" without weakening AC6 for genuinely untouched exercises. |
| D23 | **The app reports and cites. It never ranks, scores, projects, or congratulates** | Owner decision 2026-07-24, adopted as the governing rule for the whole v1.8 backlog. T5b already fenced streaks and guilt copy, and D20 already refused trendlines and PR badges, but v1.8 adds five surfaces that are exactly where a fitness app grows a score: a stop-signal card (T17), a symptom stream (T17), time under tension (T26), a session sigil (T27), a block poster (T28). One rule, stated once, instead of re-litigating each. **Permitted:** reporting what was recorded; aggregating it arithmetically; quoting `docs/training-plan.md` with a `§` reference. **Forbidden:** ranking sessions, computing an adherence or completion percentage, asserting a trend direction, projecting a future value, and any praise or reproach. The reason is in the plan, not in taste: §8 lists the conditions for *stopping* GtG and §4F prescribes a lighter week "regardless of the schedule," so a UI that rewarded consistency would argue against the owner's own safety rules — and §7 reads a *falling* number as the signal to deload, which a cheerful arrow inverts. Corollary: every aggregate the app renders must be a fact ("41 hangs · 6m22s under tension"), never a verdict. |
| D27 | **Why a set ended is a closed four-value enum on the set, recorded only where the plan prescribes a hold** | Owner accepted 2026-07-24 (idea #8). `hit target / dropped / form broke / pain` is the highest-information-per-tap field available: it makes an existing charted number *interpretable* — a 6s hang that stopped for pain and one that stopped for strength are the same `holdSec` and completely different training facts — and §7's whole instruction is to spot a downward trend before it becomes an injury, which a bare number cannot support. Closed enum rather than free text because the value has to be countable and comparable across a block; free text already exists beside it in `notes` for anything the four values don't cover. Scoped to exercises declaring `holdSeconds` (D17) because "why did it end" is meaningful for a hold and vacuous for 3 × 10 goblet squats — no new catalog field is needed, the existing timing declaration already draws that line. Never carried forward, for RPE's reason (D19): it is a fresh judgment about a set that has not happened. The one automatic write is the timer's own auto-stop → `target`, which is a measurement of what the app itself did, not a guess. And under D23 it stays *data*: recording `pain` never triggers advice, a modal, or a changed prescription. |
| D24 | **Bodyweight is a dated single number, entered opportunistically, and never estimated** | Resolves the revisit gate v1.6 left open. §4E records bodyweight alongside added load because neither means anything alone: `+35lb` at 175lb and at 182lb are different performances, and the block's headline number is currently missing half its denominator. At most one entry per day, no schedule, no prompt, no reminder (D2a). Charts gain a **% of bodyweight** view for `addedLb`, which is the climbing-relevant unit. The matching rule is deliberately strict: a session takes the most recent bodyweight recorded on or before it, within 14 days; with none in range the point is **omitted** from the %BW view rather than interpolated or carried indefinitely — the same refusal-to-draw-an-invalid-comparison as D22. |
| D25 | **Block position is derived from the first completed session, not scheduled** | Un-defers the periodization question v1.4 parked, using D15's method: derive, don't store. "Session 11 · ~week 6" comes from the log; the only stored state is an optional block-start marker for when the owner deliberately begins a new block. Past week 8 reads **"week 8+"** — never "overdue," never "behind," which is the same state D15 refuses and §4F explicitly invites by prescribing a lighter week whenever fingers feel beat up. What this buys is the thing D17 works around: §4B carries a weeks-1–4 rep-structured PIMA variant and a weeks-5–8 max-effort variant in one `prescription` string, and derived block position lets the app show the live one first. The other variant stays readable on the detail screen — the app narrows emphasis, never hides the plan. |
| D28 | **A backup file older than the current schema is read and upgraded, never refused. Newer or unrecognised files are still refused** | Forced by T15, which adds the first new collection since T7. T7's gate accepts only `schemaVersion === BACKUP_SCHEMA_VERSION`, so bumping the version would turn every file the owner has already exported into "unsupported version — nothing was changed." That inverts D5: manual export exists *because* on-device data is one cache-clear from gone, and a backup that stops being importable the moment the app gains a feature is not a backup. The rule is therefore asymmetric, and the asymmetry is the point: reading an **older** file is well-defined (a collection the file predates reads as empty, exactly as an absent optional field does), while reading a **newer** one is not (the app cannot know what it is dropping, and a silent partial import of an 8-week log is worse than a refusal). Every version between `1` and current stays readable indefinitely; imports name the version they upgraded from so the owner is told rather than surprised. |
| D26 | **Available gear is Settings data, not catalog content** | Board edges, added-load increments, dip belt yes/no. Every numeric input in the app currently opens an iOS keyboard, and the hands typing on it are chalked and mid-protocol — which is the PRD's problem #2 in its most literal form. Knowing the four edges that actually exist on the board turns edge entry into a segmented pick, and knowing the load increments turns `addedLb` into ± chips at the 1–3% steps §4F asks for. This is not D6 reversed: it configures *input affordances*, not exercises. The catalog stays a typed constant in source, and gear never changes a prescription. |
| D29 | **The §4E battery is a logged session against a non-rotating test routine, recorded on test-only catalog entries. Its conditions are derived from what is already stored, never re-entered** | Forced by T16. Everything §4E's table asks to record already has a typed home — edge is `edgeMm`, added weight is `addedLb`, seconds are `holdSec`, bodyweight is T15's `BodyweightEntry` — so a parallel `Retest` record would duplicate four fields, need its own backup array and version bump, and split a max-hang number across two stores. Modelling the battery as a `WorkoutLog` instead buys the set logger, the timer, the set-end reason (D27), history, and export/import for free. Two consequences make it a decision rather than an implementation detail. **(a) Test-only entries.** §4E is a maximum under one fixed protocol; §4C training is 85–90% for 5 sets. Logging both against `max-hang-half-crimp` would put two spikes on the trained series at weeks 1 and 8 that read as progress and are actually a different test — D22's refusal-to-draw-an-invalid-comparison applied to intensity instead of edge. The tests therefore get their own entries and their own two-point series, which is the only comparison §4E actually asks for. **(b) Nothing new is stored about conditions.** §4E's "identical conditions" are time of day (`startedAt`), grip (which entry it is), warm-up (D16's `completed` on the warm-up), rest before it (days since the previous completed log), and edge (D30) — every one derivable. The app *shows* the conditions at both occasions rather than asking the owner to certify them, which is D15's derive-don't-store applied a third time. |
| D30 | **The standard edge is one stored number, chosen at the baseline and prefilled at every test thereafter** | §4E: "Pick **one** standard edge (14–20mm) and never change it mid-block — changing edge size invalidates the comparison more than any training variable." An 8-week gap is exactly long enough to forget which edge week 1 was on, and a retest on the wrong edge does not produce a worse comparison, it produces no comparison at all (D22). So the choice is made once and carried, in `Settings` rather than in the catalog — the same line D26 draws: it configures an input, it does not change a prescription. If it is ever changed mid-block the app keeps both values and declines the delta rather than silently comparing across edges. |
| D31 | **Gear offers; it never restricts. Every input that gains a picker keeps a way to record a value the gear list does not contain** | Forced by T18. D26's whole justification is chalked hands and an iOS keyboard mid-protocol, which argues for a pick — but a pick that cannot express reality is worse than the keyboard it replaced: the owner hangs on a friend's board, or the 18mm rung is actually 17.5mm, and the choices are then to record a *wrong* number or to record nothing. Both destroy the measurement the whole app exists to keep (§7). So the gear list decides what is **one tap**, never what is **possible**, and a value already recorded off the list is displayed as it was stored and never silently snapped to the nearest chip. The same rule makes an unconfigured install safe: no gear means the T12 keyboard inputs, unchanged, rather than an invented board. |
| D32 | **A stepper steps the value the owner already has. It never proposes the next one** | The line D19 draws, restated for a control that is easy to slide across it. `+` from a carried-forward `+35lb` is the owner deciding to add; a chip labelled "suggested" or a stepper that pre-moves the value on open would be adaptive load calculation — a standing non-goal — and §4F deliberately puts the 1–3% judgment with the person who can feel whether the last session was an 8 or a 10. The increment is therefore **gear** (what the owner can physically add), not advice: it configures the size of a tap and asserts nothing about whether to take it. No chip is ever highlighted as recommended, and no step is ever applied without a tap. |

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
| T9 | Routine rotation, routine preview, in-session detail + per-exercise completion | T8 | — |
| T10 | In-session hold + rest timer (audio, wake lock, one-tap log) | T9 | T11 |
| T11 | Last-time carry-forward on the exercise card | T9 | T10 |
| T12 | Structured measurements + per-exercise progress chart | T10, T11 | — |

**Gate 2 (decomposition review) happens here** — before T1 starts, after T0 reports.

### Backlog decomposition (v1.8)

Nineteen accepted ideas from the 2026-07-24 ideation pass, grouped into fifteen tasks. Two ideas were rejected outright and three deferred — recorded in the v1.8 amendment so they are not re-proposed.

**Ordering principle: unbackfillable first.** The owner has **not started the block** (confirmed 2026-07-24). That fact, not estimated value, sets the order. A set-end reason, a bodyweight, and a §4E week-1 baseline cannot be reconstructed after the fact: every session logged without them is a session whose record is permanently thinner, and the baseline is a single unrepeatable event that §4E requires *before* week 1 under rested, warmed-up, identical conditions. Ergonomics, by contrast, lose nothing by landing in week 2 — they pay off on every session that remains. So capture precedes comfort, and the biggest-value item on the list (T16) is also the most time-critical.

| ID | Task | Ideas | Wave | Depends on |
|---|---|---|---|---|
| T14 | Set-end reason: why a hold ended, in one tap | #8 | 0 — before session 1 | T12 |
| T15 | Bodyweight capture + % of bodyweight chart view | #11 | 0 — before session 1 | T12 |
| T16 | §4E baseline / retest battery with condition capture | #7 | 0 — before session 1 | T15 |
| T17 | Symptom check + plan-cited stop-signal card | #10, #9 | 1 — every session | T14, T16 |
| T18 | Gear settings + stepper / picker set entry | #4, #1 | 1 — every session | — |
| T19 | Chained sets: set *n* of *N* against the prescription | #3 | 1 — every session | T18 |
| T20 | Spoken cues: "3–2–1–pull", set announcements, band-pitch tone | #2, #20 | 1 — every session | T19 |
| T21 | Eyes-shut hold mode | #16 | 1 — every session | T20 |
| T22 | Rest screen as the teaching surface | #15 | 2 — dead time | T19 |
| T23 | Warm-up runner | #5 | 2 — dead time | T19 |
| T24 | Block position derived from the first session | #13 | 2 — dead time | — |
| T25 | In-app training-plan search | #6 | 2 — dead time | — |
| T26 | Edge × week grid + time under tension | #12, #14 | 3 — insight | T15 |
| T27 | Session sigil + history as a story | #17 | 3 — insight | T26 |
| T28 | Week-8 block poster | #18 | 3 — insight | T24, T26, T27 |

**Wave semantics.** Wave 0 must land before the first logged session. Wave 1 is used on every session from whenever it ships, so it is ordered by ergonomic payoff per unit of work. Wave 2 fills the ~15 minutes of prescribed rest a Day 1 session contains (5 sets × 3 min, §4C) — the app's largest unused surface. Wave 3 pays off at week 8 and needs a block's worth of data to show anything, so it cannot usefully come earlier.

**Level 3 specs are written just-in-time**, one task ahead of building it, not fifteen upfront — the same reason T9–T13 were specced as they were requested. A spec written now for T28 would be written against a data model that T15, T24 and T26 are going to change. Each task's full spec is appended to Level 3 below when it starts.

---

## LEVEL 3 — Task specs

---

### [T0] Outcome: Confirmed on the owner's actual iPhone that an installed PWA persists IndexedDB data across days and can be opened by a scheduled Shortcuts automation.
Spec: this file | Status: [] | Depends on: none

#### Context manifest
Create: throwaway repo or branch `spike/ios-pwa`. Nothing from this task ships. | Conform to: nothing | Imitate: nothing

#### Acceptance criteria
1. WHEN a minimal Vite PWA is deployed to GitHub Pages over HTTPS THE owner SHALL be able to add it to the iPhone home screen and launch it in standalone mode (no Safari chrome visible). [x]
2. WHEN a value is written to IndexedDB, the app is closed, and it is reopened after ≥48h with no intervening use THE stored value SHALL still be present. []
3. WHEN an iOS Shortcuts personal automation is set to run at a specified time with an "Open URL" action pointing at the PWA URL THE automation SHALL fire and open the installed PWA (not Safari). [f] — FAILED: the automation fired but the "Open URLs" action opened **Safari**, not the installed standalone PWA. See T0 amendment 2026-07-23 (device pass). This is a known iOS behavior, not a bug in the app; it forces a change to T6/D2a (escalated below), not to D1/D4.
4. WHEN the automation fires THE owner SHALL confirm whether it required manual confirmation or ran automatically, and this SHALL be recorded in the spike report. [x] — ran **automatically**, no manual confirmation required (with "Ask Before Running" off).

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

**2026-07-23 — T0 device pass results (owner, against the live URL).** Owner installed the deployed shell on their iPhone and ran the checks:

- **AC1 standalone launch — PASS.** Added to home screen from Safari, launches with no browser chrome; probe reads "standalone ✓".
- **AC2 48h persistence — PENDING.** Immediate write→close→reopen persisted correctly. The ≥48h eviction check (the D4 gate) is still running; owner reports back ~2026-07-25.
- **AC3 Shortcuts opens the installed PWA — FAIL.** A Time-of-Day personal automation with an "Open URLs" action pointed at the PWA URL fired automatically, but opened the URL in **Safari**, not the installed standalone PWA. This is expected iOS behavior: iOS has no URL-scheme routing that hands an https URL to an installed home-screen web app the way Android deep-links to an installed PWA scope. An "Open URLs" action therefore always lands in the default browser.
- **AC4 manual vs automatic — PASS/recorded.** Ran fully automatically, no confirmation tap.
- Also passing (T1 AC4): offline launch from the icon rendered from the service-worker cache.
- **iOS version:** _pending from owner._

**Escalation — impact on D2a / T6 (the deep-link deliverable).** D2a kept exactly one reminder-adjacent feature: a deep link so an external alarm/Todoist/Shortcut could "open the app straight to today's routine." AC3 shows the URL path opens **Safari**, a *different* browsing context from the installed PWA — which on iOS has historically had a **separate storage jar** from the home-screen app. So a URL-based reminder would (a) not land in the installed app, and (b) risk fragmenting logged data into a second Safari-side store. This defeats the deep link's purpose. Two candidate resolutions, owner to choose (see T6 — do not build the URL deep-link as the primary mechanism until decided):
1. **Shortcuts "Open App" action targeting the installed Sendboard PWA** (iOS 16.4+ lists installed web apps as openable apps). Opens the *real* installed app in the correct storage context, but cannot carry a `/routine/:id` path — it lands wherever the app opens (the T8 home screen, which already gives one-tap Start for both routines). Needs a 30-second device confirmation that the PWA is selectable in "Open App".
2. **Keep the URL `/routine/:id` route in T6 as a low-value bonus** for the Safari path / manual bookmarks only, and demote it from "T6's main deliverable" to nice-to-have; the primary documented reminder path becomes a repeating alarm + tapping the installed icon (or option 1's "Open App").

**2026-07-23 — resolution: option 1 eliminated, deep-link dropped as a reminder mechanism.** Owner confirmed on device that the installed Sendboard PWA does **not** appear in Shortcuts' "Open App" action picker either. So *no* external trigger (URL action → Safari; App action → PWA not listed) can open the installed standalone PWA on this iOS. **Conclusion:** the external deep-link has no viable path on iOS and is cut from the reminder story entirely. **Reminder mechanism going forward:** a repeating iPhone alarm or Todoist recurring task supplies the *timing*; the owner taps the home-screen Sendboard icon to open it. This is fully consistent with D2a's core thesis ("the app's job is answering *what to do*, not *when*"). **T6 scope shrinks accordingly:** settings shell (version + install-guide link) + a README reminder-setup section documenting the alarm/Todoist + tap-icon flow. Client-side routing still exists for *internal* navigation (needed by T8), but the *externally-triggered* `/routine/:id` deep-link is no longer a deliverable. Final T6 copy to be written when T6 is built. iOS version still to be recorded from owner.

**2026-07-23 — T0 folded into T1 as the spike vehicle (owner decision).** The device spike cannot be run by the executor (needs the owner's iPhone + a live HTTPS deploy). Rather than build a throwaway button-and-textfield PWA, the owner approved building the real T1 shell and using *it* to satisfy T0's on-device criteria — T1 acceptance criteria 3–5 overlap T0's 1, 2, and 4. No throwaway work; strict "don't proceed to T1 before T0" is knowingly relaxed, logged here. **Remaining owner actions against https://nickderrico.github.io/sendboard/:** (1) Add to Home Screen, confirm standalone launch [T0 AC1]; (2) write a value, reopen after ≥48h, confirm it persists [T0 AC2 — the one gate that, if it fails, forces revisiting D1/D4]; (3) set an iOS Shortcuts "Open URL" automation at a time, confirm it opens the PWA not Safari, and record whether it needed manual confirmation [T0 AC3/AC4]; record the iOS version. Gate 2 (decomposition review) is unblocked for T2 planning since the build/deploy/subpath assumptions are now machine-confirmed; only the storage-persistence gate (AC2) stays genuinely open pending the 48h check.

---

### [T1] Outcome: An empty but installable, auto-deploying PWA shell is live at a stable HTTPS URL.
Spec: this file | Status: [] | Depends on: T0

#### Context manifest
Create: repo root — `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `public/manifest.webmanifest`, `public/icons/` (192px + 512px + maskable), `.github/workflows/deploy.yml`, `docs/training-plan.md` (owner supplies this file — the source training plan). | Conform to: `vite-plugin-pwa` config API | Imitate: standard Vite React-TS template

Stack is fixed by D3/D7. Use `vite-plugin-pwa` with `registerType: 'autoUpdate'`.

#### Acceptance criteria
1. WHEN `npm run build` is run THE build SHALL complete with zero TypeScript errors. [x]
2. WHEN a commit lands on `main` THE GitHub Action SHALL build and publish to GitHub Pages without manual steps. [x]
3. WHEN the deployed URL is opened on iPhone Safari THE "Add to Home Screen" flow SHALL produce a standalone app with the correct name and icon. []
4. WHEN the installed app is launched offline THE shell SHALL render (service worker precache). []
5. WHEN `vite.config.ts` `base` is set THE app SHALL load correctly from the GitHub Pages subpath (no 404s on assets). [x]

#### Edge cases
- GitHub Pages subpath breaking asset URLs and the service worker scope — the single most common failure mode for this stack; verify explicitly. [x]
- Manifest `display: standalone` and `theme_color` present, or iOS falls back to a browser-chrome launch. [x]
- Apple-specific meta tags (`apple-mobile-web-app-capable`, `apple-touch-icon`) present — iOS ignores parts of the webmanifest. [x]

#### Non-goals & do-not-touch
- MUST NOT add any application feature, route, or data model.
- MUST NOT add a backend, analytics, or any third-party runtime dependency beyond React, Tailwind, `idb`, and the PWA plugin.

#### Verify
`npm run build && npm run preview` — then confirm criteria 3–5 on device.

#### Amendments

**2026-07-23 — T1 scaffold built and deployed.** Fresh git repo initialised in place; `overcoming-isometrics-climbing-plan.md` relocated to `docs/training-plan.md`. Live at **https://nickderrico.github.io/sendboard/** via `.github/workflows/deploy.yml` (Actions → Pages, `build_type=workflow`, HTTPS enforced).

- **Machine-verified (passing):** criterion 1 (`npm run build`, zero TS errors), criterion 2 (push → CI build + publish, no manual steps — first run's deploy failed only because Pages was not yet enabled; enabling it and re-running went green), criterion 5 + the subpath/manifest/apple-meta edge cases (`index.html`, `manifest.webmanifest`, `icons/*`, `sw.js` all return HTTP 200 from the `/sendboard/` subpath; all `index.html` refs and SW precache entries are `base`-prefixed).
- **Device-pending (owner, against the live URL — these double as the T0 spike):** criterion 3 (Add to Home Screen → standalone launch, correct name/icon) and criterion 4 (offline render on device). Local preview registers the service worker with no console errors, but true standalone + offline can only be confirmed on the iPhone.

Design calls made (each within spec latitude, recorded per "amend before you code"):
1. **Manifest is generated by `vite-plugin-pwa`, not a hand-authored `public/manifest.webmanifest`.** A static manifest with absolute icon/`start_url` paths breaks under the Pages subpath — exactly this task's headline failure mode. The plugin emits `manifest.webmanifest` at the same path with relative, base-correct paths. Same deliverable, safer.
2. **Tailwind v3 (with `tailwind.config.js` + `postcss.config.js`), not v4.** Matches the file named in the context manifest and D3's "well-represented in training data" rationale; v4's CSS-first config would contradict the listed `tailwind.config.js`.
3. **Icons generated by a committed zero-dependency Node script** (`scripts/generate-icons.mjs`, built-in `zlib` only) rather than adding an image toolchain — honours the "no third-party runtime dependency" constraint.

**Gate note:** built directly as the T0 spike vehicle per owner decision (see T0 amendment). The live shell is the artifact the owner installs to close the remaining T0 device criteria.

---

### [T2] Outcome: All app data types, a single storage module, and the seeded exercise/routine catalog exist and are unit-tested.
Spec: this file | Status: [x] | Depends on: T1

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
1. WHEN the app starts for the first time (empty IndexedDB) THE storage module SHALL seed the catalog and routines and SHALL NOT overwrite them on subsequent starts. [x] — served from code constants (see amendment); trivially never overwritten.
2. WHEN a `WorkoutLog` is saved and the module is re-instantiated THE log SHALL be retrievable by id and SHALL appear in `getAllLogs()` sorted by `startedAt` descending. [x]
3. WHEN `getSettings()` is called with no stored settings THE module SHALL return a default `Settings` object, not `undefined`. [x]
3a. WHEN a `Check` is saved THE module SHALL persist it, and `getChecksForWeek(date)` SHALL return every check whose `date` falls in the Monday-start week containing `date` (D10), and `getChecksForDay(date)` SHALL return every check on that local calendar date. [x]
3b. WHEN either getter is called for a period with no checks THE module SHALL return an empty array, not `undefined`. [x]
4. WHEN any exercise in the seed catalog is checked THE fields `summary`, `howTo`, `prescription` SHALL be non-empty and their content SHALL be traceable to `docs/training-plan.md`. [x]
5. WHEN the seed catalog is validated THE set of every `Routine.exerciseIds` entry SHALL be a subset of existing `Exercise.id` values (assert this in a test). [x]
6. WHEN IndexedDB is unavailable or throws THE module SHALL throw a typed `StorageError` rather than failing silently. [x]

#### Edge cases
- Empty database on first run. [x]
- Schema version bump: include a `DB_VERSION` constant and an upgrade path stub, even though v1 has one version. [x] — `DB_VERSION = 1`, `upgrade()` branches on `oldVersion`.
- A log referencing an `exerciseId` that no longer exists in the catalog (catalog edited later) → reads must not crash; render the id as a fallback name. [x] — storage side: `getExercise()` returns `undefined` safely; the fallback-name rendering is done by the consuming screens (T3/T5).
- Concurrent writes from two open instances → last-write-wins is acceptable; document it in a code comment. [x] — documented above `saveLog`.
- Week boundary: a check dated Sunday 23:59 and one dated Monday 00:01 belong to *different* weeks (D10). Assert both sides of the boundary in a test. [x] — checks store a local date-only key, so the boundary is exact; both sides asserted.
- Daylight-saving transition inside a week → week grouping must not shift; compute boundaries from local calendar dates, not UTC offsets. [x] — calendar-based helpers; asserted across the US spring-forward week.

#### Non-goals & do-not-touch
- MUST NOT build any UI in this task.
- MUST NOT add a catalog CRUD/editor API (D6).
- MUST NOT invent exercise descriptions not present in `docs/training-plan.md`.

#### Verify
`npm run test -- storage` (Vitest; all tests pass) and `npm run build`.

#### Amendments

**2026-07-23 — T2 built. Build + lint + 17 Vitest cases green.** Files: `src/types.ts`, `src/data/exercises.ts` (20 exercises, all content from `docs/training-plan.md`), `src/data/routines.ts` (2 routines), `src/lib/storage.ts`, `src/lib/storage.test.ts`. Added `fake-indexeddb` (dev) for tests; bumped the app `tsconfig` target/lib to ES2022 so `Error(message, { cause })` type-checks (safe for the iOS 16.4+ target). Removed the T0 persistence probe from `App.tsx`.

**Deliberate design call — catalog/routines are served from code constants, not persisted in IndexedDB.** AC1's wording ("the storage module SHALL seed the catalog and routines") reads like it wants them written into IDB. Implemented instead as: `getAllExercises`/`getAllRoutines` return the source constants directly, and IndexedDB holds only mutable user data (logs, checks, settings). Reason: D6 makes the source file canonical and expects "edit one file, redeploy" to change the catalog. A seeded IDB copy with AC1's "SHALL NOT overwrite on subsequent starts" guard would go **stale** the instant the source changed — existing installs would keep the old catalog forever, directly contradicting D6's workflow and creating a silent-divergence bug class. Serving from constants satisfies AC1's *intent* (a full, stable catalog present from first run) while eliminating that bug. The API is still async (`Promise`-returning) so a future backend swap (D4) needs no UI change. Logged here per "amend before you code."

**Note for D6/edge case:** because the catalog isn't in IDB, the "catalog edited later → log references a missing exercise" case is handled by `getExercise()` returning `undefined`; the fallback-to-raw-id rendering belongs to the display screens (T3 detail, T5 log detail) and is called out in those tasks.

---

### [T3] Outcome: The owner can browse all exercises and open one to see how to perform it and what equipment it needs.
Spec: this file | Status: [x] | Depends on: T2 | Parallel-safe with T4

#### Context manifest
Create: `src/screens/ExerciseList.tsx`, `src/screens/ExerciseDetail.tsx`, `src/components/EquipmentBadge.tsx` | Read: `src/types.ts`, `src/lib/storage.ts` | Conform to: `Exercise` type | Imitate: n/a (first UI task — establishes the pattern others follow)

#### Acceptance criteria
1. WHEN the exercise list renders THE screen SHALL show all 25 seeded exercises (20 + T16's five §4E test entries) grouped by `category`, each row showing name, `summary`, and equipment badges. [x]
1a. WHEN an exercise has `gtgEligible: true` THE row and detail screen SHALL show a distinct "GtG" badge, and a filter SHALL exist to show only GtG-eligible exercises. [x]
2. WHEN a filter control is set to an `Equipment` value THE list SHALL show only exercises whose `equipment` array contains it. [x]
3. WHEN an exercise row is tapped THE detail screen SHALL render `name`, `prescription`, all `howTo` steps as an ordered list, all `cues`, and all `safetyNotes`. [x]
4. WHEN an exercise has a non-empty `safetyNotes` array THE notes SHALL render in a visually distinct warning block, not as body text. [x]
5. WHEN the detail screen is open on a 390px-wide viewport THE full `prescription` SHALL be readable without horizontal scrolling. [x]
6. WHEN an exercise has `isoType` of `overcoming` or `yielding` THE detail screen SHALL display that label. [x]

#### Edge cases
- Exercise with empty `safetyNotes` → warning block omitted entirely, no empty container. [x] — conditional on `safetyNotes.length > 0`.
- Filter selection matching zero exercises → explicit empty state, not a blank screen. [x] — verified with GtG-only + Hangboard (0 matches → empty state + Clear filters).
- Long `howTo` step text → wraps, does not clip. [x] — verified no horizontal scroll at 390px.
- Back navigation from detail → returns to the list with the filter still applied. [x] — filter state lives in `ExerciseList`; detail is a conditional render, so it is preserved.

#### Non-goals & do-not-touch
- MUST NOT allow editing or creating exercises.
- MUST NOT modify `src/lib/storage.ts` or `src/data/*`.
- MUST NOT add images or video.

#### Verify
`npm run build && npm run lint`, plus device check of criteria 3–5 on the installed PWA.

#### Amendments

**2026-07-23 — T3 built. Build + lint (0 warnings) + 17 tests green; all criteria verified in a 390px browser.** Files: `src/components/EquipmentBadge.tsx` (equipment + GtG badges), `src/screens/ExerciseList.tsx`, `src/screens/ExerciseDetail.tsx`. Two deliberate additions beyond the 3-file context manifest, both to keep this pattern-setting task clean:
- **`src/lib/equipment.ts`** — holds `EQUIPMENT_LABELS`/`EQUIPMENT_OPTIONS`. Moved out of the component file because `react-refresh/only-export-components` warns on exporting an object constant alongside components; a shared non-component module is the rule's own recommended fix.
- **Navigation is local component state, not a router.** No router exists yet (T6 creates `routes.ts`, T8 wires `App`). ExerciseList holds filter + selected-id state and conditionally renders ExerciseDetail, which is what makes "back preserves the filter" fall out for free. `App.tsx` gained a **temporary** `home`↔`exercises` switch so the screen is reachable on device; this is replaced by T8's tab bar. The persistence heartbeat stays on the temporary home until the 48h gate closes.

Pattern established for T4/T5b/T5 to imitate: screen components under `src/screens`, shared bits under `src/components`, mobile-first `max-w-md` layout, brand-surface cards, load data via the `storage.ts` async API in `useEffect`.

---

### [T4] Outcome: The owner can start a session from a routine, log sets per exercise, and save it.
Spec: this file | Status: [x] | Depends on: T2 | Parallel-safe with T3

#### Context manifest
Create: `src/screens/RoutineList.tsx`, `src/screens/ActiveSession.tsx`, `src/components/SetLogger.tsx` | Read: `src/types.ts`, `src/lib/storage.ts` | Modify: none outside the files above | Conform to: `WorkoutLog`, `LoggedExercise`, `SetEntry`

`load` and `reps` are free-text strings by design (D: a hangboard entry is "20mm +10kg", a kettlebell entry is "35lb x 8") — do not add numeric parsing or validation.

#### Acceptance criteria
1. WHEN a routine is selected and "Start" is tapped THE app SHALL create a `WorkoutLog` with `startedAt` set and `completedAt` null, and persist it immediately. [x]
2. WHEN the active session renders THE screen SHALL list the routine's exercises in order, each expandable to show `prescription` and `cues` inline without leaving the screen. [x]
3. WHEN "Add set" is tapped on an exercise THE app SHALL append a `SetEntry` and persist the log within 1 second, with no explicit save action required. [x]
4. WHEN the app is force-closed mid-session and reopened THE in-progress session SHALL be resumable with all logged sets intact. [x] — verified via full page reload: resume banner appears, sets restored.
5. WHEN "Finish session" is tapped THE app SHALL set `completedAt` and return to the home screen. [x]
6. WHEN an exercise is left with zero sets THE session SHALL still save, omitting or empty-listing that exercise — an unfinished session is valid data. [x] — untouched exercises are omitted from `entries`.

#### Edge cases
- Two sessions started without finishing the first → prompt to resume or discard; never silently create a second in-progress log. [x] — verified: modal with Resume/Discard/Cancel; in-progress count stays 1.
- Session spanning midnight → `startedAt` governs which day it belongs to. [x] — `startedAt` fixed at creation; History (T5) groups on it.
- Rapid taps on "Add set" → no duplicate or dropped entries. [x] — a ref mirrors the latest log so handlers never build from a stale closure; double-tap yielded exactly 2 sets.
- Deleting a set → confirm before removal. [x] — `window.confirm`; verified cancel keeps, confirm removes.

#### Non-goals & do-not-touch
- MUST NOT add rest timers, audio, or haptics (v2).
- MUST NOT auto-suggest loads from history.
- MUST NOT modify `src/data/*`.

#### Verify
`npm run test -- session && npm run build`, plus a device check of criterion 4 (force-close and resume).

#### Amendments

**2026-07-23 — T4 built. Build + lint clean, 27 tests green (10 new session cases); full flow verified in-browser.** Files: `src/components/SetLogger.tsx`, `src/screens/RoutineList.tsx`, `src/screens/ActiveSession.tsx`, plus one justified extra: **`src/lib/session.ts`** — pure, immutable log-mutation helpers (`createLog`, `addSet`, `updateSet`, `deleteSet`, `finishLog`, notes) with `src/lib/session.test.ts`. Extracted so the session rules are unit-testable without a DOM (the `npm run test -- session` verify), keeping the components thin.

Notable implementation choices:
- **Auto-persist on every mutation** via a `logRef` that mirrors the latest log, so rapid "Add set" taps build from current state, not a stale closure — this is what prevents dropped/duplicate entries.
- **Zero-set omission:** entries are created lazily and pruned when they have no sets and no notes, so untouched exercises never appear in `entries` (AC6).
- **Single in-progress log enforced in `RoutineList`:** starting a routine while an unfinished log exists opens a Resume/Discard/Cancel modal rather than creating a second one.
- **`App.tsx` modified** (the temporary shell) to add `routines`/`session` views and a home Resume banner — the same temporary-integration seam as T3, replaced by T8's tab bar. Device check of criterion 4 remains for the owner on the installed PWA (browser reload already confirms the resume path).

---

### [T5] Outcome: The owner can see past sessions and open any one to review what was logged.
Spec: this file | Status: [x] | Depends on: T4 | Parallel-safe with T6

#### Context manifest
Create: `src/screens/History.tsx`, `src/screens/LogDetail.tsx` | Read: `src/lib/storage.ts`, `src/types.ts` | Conform to: `WorkoutLog`

#### Acceptance criteria
1. WHEN the history screen renders THE app SHALL list completed sessions newest-first, each showing date, routine name, and exercise count. [x]
2. WHEN a session is tapped THE detail SHALL show every logged exercise with all its sets (load, reps, rpe) and notes. [x]
3. WHEN no sessions exist THE screen SHALL show an empty state directing the owner to start one. [x]
4. WHEN a session is in progress THE history screen SHALL show it at the top, labeled as in-progress and tappable to resume. [x]

#### Edge cases
- A log referencing a deleted/renamed `exerciseId` → render the raw id, do not crash (mirrors T2 edge case). [x] — verified with a seeded `deleted-old-exercise` entry; heading falls back to the id.
- 100+ logs → list renders without noticeable lag; no pagination required at v1 scale. [x] — plain list, no pagination; v1 scale is ~32 sessions over the 8-week block.

#### Non-goals & do-not-touch
- MUST NOT add charts, PRs, streaks, or trend analysis (explicit non-goal).
- MUST NOT allow editing a completed log in v1.

#### Verify
`npm run build && npm run lint`

#### Amendments

**2026-07-23 — T5 built. Build + lint clean, 27 tests still green; all criteria + edge cases verified in-browser with seeded logs.** Files: `src/screens/History.tsx`, `src/screens/LogDetail.tsx`. Both read-only (no edit path, per non-goal). History reuses `getAllLogs` (already sorted newest-first), splits out `completedAt === null` to a pinned in-progress card that calls `App`'s `openSession` to resume; completed rows open `LogDetail` via local state. `LogDetail` looks up routine + exercise names, falling back to the raw id for missing catalog entries. `App.tsx` gained a `history` view + a home "History" button (temporary shell, replaced by T8's tab bar). No new dependencies, no new types.

**Milestone:** all three problems from the PRD are now addressed end-to-end — browse *how to* an exercise (T3), *record* a session (T4), and *review* past sessions to spot a trend (T5). Remaining: T5b (checks), T6 (settings/deep-link — reduced per the T0 escalation), T7 (backup), T8 (nav shell + install onboarding).

---

### [T5b] Outcome: The owner can check off a climbing day or a greasing-the-groove habit in two taps, and see whether this week has had both climbing types and whether today's GtG is done.
Spec: this file | Status: [x] | Depends on: T2 | Parallel-safe with T5, T6

#### Context manifest
Create: `src/components/WeekStatus.tsx`, `src/components/DailyGtgStatus.tsx`, `src/screens/CheckLog.tsx` | Read: `src/types.ts`, `src/lib/storage.ts` (`Check`, `CHECK_SCOPE`, `getChecksForWeek`, `getChecksForDay`) | Conform to: `Check`, D10 week boundary, D11/D12 | Imitate: the screen structure established in T3

This is deliberately not a workout log (D9, D11). No sets, no loads, no timers. A check-off and an optional note. Both weekly and daily checks use the same `Check` record and differ only by `CHECK_SCOPE[kind]`.

#### Acceptance criteria
1. WHEN the week status component renders THE app SHALL show the current Monday-start week with a distinct done/not-done state for `climbing-volume` and `climbing-limit`. [x]
2. WHEN a weekly check is tapped off THE app SHALL persist a `Check` dated today and the status SHALL update to done without a reload. [x]
3. WHEN both climbing types are done for the current week THE component SHALL render a visually distinct "week complete" state. [x]
4. WHEN a check is tapped again THE app SHALL offer to remove it, and on confirmation the status SHALL revert to not-done. [x]
5. WHEN the daily GtG status component renders THE app SHALL show today's done/not-done state for `gtg-general` and `gtg-pull`, and SHALL reset to not-done at local midnight. [x] — reads use `new Date()` each refresh, re-run on focus/visibilitychange, so the day rolls over.
6. WHEN the daily GtG status renders THE component SHALL also show a count of how many of the last 7 days each GtG kind was completed. [x]
7. WHEN the check log screen renders THE app SHALL list past weeks newest-first, each showing which climbing types were completed and how many GtG days that week contained. [x]
8. WHEN a check is being added THE owner SHALL be able to attach an optional free-text note and SHALL be able to save without one. [x]

#### Edge cases
- Two volume days in one week → allowed, still renders as done once; do not block or warn. [x] — status is a boolean; unit-tested with two volume days.
- Two `gtg-general` checks on one day → allowed, renders as done once. GtG is many sets a day; the check means "I did this today," not "I did it once." [x] — 7-day count uses distinct days; unit-tested (two same-day → counts once).
- A check dated Sunday 23:59 vs Monday 00:01 → different weeks (D10 test in T2 covers storage; verify UI reflects it). [x] — UI uses `getChecksForWeek`; storage boundary tested in T2.
- App left open across local midnight → daily status must roll over on next render or focus, not stay stuck on yesterday. [x] — focus/visibilitychange listener re-reads with a fresh `new Date()`.
- Backdating: the owner forgot to check off yesterday → the add flow MUST allow choosing a date other than today, for both scopes. [x] — CheckLog add form has a native date picker + kind selector (all four scopes); verified with a backdated gtg-pull.
- A week with zero checks appearing in history → render it as an explicitly empty week, do not silently omit it, or the "did I skip?" question goes unanswered. [x] — `summarizePastWeeks` fills the contiguous week range; verified an empty middle week renders "No checks this week".
- Timezone change while traveling → week and day grouping computed from local calendar dates (D10). [x] — all keys via the local-calendar helpers.

#### Non-goals & do-not-touch
- MUST NOT create a `WorkoutLog` for climbing days or GtG.
- MUST NOT log individual GtG sets, reps, or times (D11) — the check is the whole feature.
- MUST NOT add streak pressure mechanics (streak-break warnings, badges, guilt copy). GtG is dropped deliberately when fatigued; the training plan §8 lists conditions for stopping. UI that punishes a missed day argues against the plan.
- MUST NOT add grades, send tracking, or problem names.
- MUST NOT modify `src/data/*` or the routine seeds.

#### Verify
`npm run test -- checks && npm run build`

#### Amendments

**2026-07-24 — T5b built. Build + lint clean, 35 tests green (8 new checks cases); all criteria + edge cases verified in-browser.** Files: `src/components/WeekStatus.tsx`, `src/components/DailyGtgStatus.tsx`, `src/screens/CheckLog.tsx`, plus the justified extra `src/lib/checks.ts` (+ `checks.test.ts`) — pure aggregation (week status, daily status, 7-day counts, contiguous past-week summaries) so the logic is testable without IndexedDB (the `npm run test -- checks` verify).

Design choices:
- **Quick two-tap toggles** on `WeekStatus`/`DailyGtgStatus` mark/un-mark **today** (per the "two taps" outcome). Un-mark deletes all checks of that kind in the period (reverts to not-done) behind a confirm.
- **Backdating + notes** live in the `CheckLog` add form (kind selector covering all four scopes, native date picker, optional note) — this is what satisfies AC8 and the backdate edge without cluttering the quick toggles.
- **Midnight/timezone safety:** every read uses a fresh `new Date()` and re-runs on window focus/visibilitychange, and all grouping goes through the local-calendar helpers (D10). No streak/guilt mechanics anywhere (non-goal, and the training-plan §8 stop-conditions make punishing a missed day actively wrong).
- `App.tsx` gained temporary `checks`/`checklog` views + a home "Check-offs" button; T8 folds `WeekStatus` + `DailyGtgStatus` onto the real home and the check log under a tab.

---

### [T6] Outcome: A settings screen exists, and an external alarm or Todoist task can deep-link straight into today's routine.
Spec: this file | Status: [x] | Depends on: T2 | Parallel-safe with T5, T5b

> **Scope reconciled 2026-07-24 (see Amendments).** The T0 device spike cut the external deep-link entirely (no iOS path opens the installed PWA). The ACs below are the pre-spike wording; read them together with the amendment: **AC2 is cut**, **AC1 is internal-only routing**, and the **deep-link URLs in AC3/AC4 are dropped**. What shipped: a hash-based internal router, a Settings shell, a not-found route, and an honest README reminder section.

#### Context manifest
Create: `src/screens/Settings.tsx` (shell only — T7 adds the backup section), `src/lib/routes.ts`, `README.md` reminder-setup section | Modify: `src/App.tsx` (route table) | Conform to: `Settings`

**Read this before implementing.** Per D2a the app has **no reminder feature**. Do not add a time picker, a reminder list, a `reminders` field, `Notification.requestPermission()`, service-worker push, or the Notification Triggers API. None of it works on iOS from a PWA, and shipping UI that implies otherwise is worse than shipping nothing. Reminders are a repeating iPhone alarm or a Todoist recurring task that the owner configures himself. This task's only reminder-adjacent deliverable is a **stable deep-link URL** those external tools can open, plus documentation of it.

#### Acceptance criteria
1. WHEN `#/routine/:routineId` is opened THE app SHALL navigate directly to that routine's start screen, bypassing the home screen. [x] — internal hash route (external deep-link cut, see amendment); valid id → focused start screen, unknown id → not-found.
2. WHEN `/routine/:routineId` is opened from the iPhone home-screen icon's scope THE installed PWA SHALL handle it (not a new Safari tab). [f] — **CUT.** Undeliverable on iOS (URL action → Safari; "Open App" → PWA unlisted). Resolved-as-cut in the 2026-07-23 T0 escalation; no code satisfies it. Left `[f]` for consistency with T0 AC3.
3. WHEN the settings screen renders THE app SHALL display the app version, a link to the install guide, and the deep-link URLs for both seeded routines as selectable text. [x] — version + install-guide link shipped; **deep-link URLs dropped** (advertising them points the owner at Safari's separate storage jar — the exact fragmentation the T0 amendment cut them to avoid).
4. WHEN `README.md` is read THE reminder-setup section SHALL give both options — repeating iPhone alarm, and Todoist recurring task with the deep-link URL in the task — in numbered steps. [x] — both options in numbered steps; **no deep-link URL** (each ends in "tap the Sendboard icon"), and the section states why no URL is given.
5. WHEN an unknown route is opened THE app SHALL render a not-found state with a link home, not a blank screen. [x]

#### Edge cases
- Deep link to a `routineId` that does not exist → not-found state, no crash. [x] — `#/routine/bogus` → not-found.
- Deep link opened while a session is already in progress → the T4 resume prompt takes precedence. [x] — the focused start route surfaces the unfinished session with Resume instead of silently starting a second log.
- GitHub Pages subpath + client-side routing: a direct deep-link hit will 404 on a static host without a fallback. Use hash routing, or add a `404.html` redirect shim. **Verify on the deployed site, not just locally** — this passes in dev and fails in production. [x] — **hash routing chosen**, so internal routes never hit the static host (path stays `/sendboard/`, only the fragment changes); no `404.html` shim needed. A quick deployed smoke-check is still worth doing.

#### Non-goals & do-not-touch
- MUST NOT implement notifications, web push, VAPID, or any backend.
- MUST NOT claim in any UI copy that the app sends reminders.
- MUST NOT add the backup UI (that is T7).

#### Verify
`npm run build && npm run lint`, plus device confirmation of criteria 2 and the edge case above against the **deployed** URL.

#### Amendments

**2026-07-24 — T6 built, reconciled against the T0 escalation. Build + lint clean.** The ACs were written before the T0 device spike, which cut the external deep-link entirely (see the 2026-07-23 T0 resolution: no iOS path opens the installed standalone PWA). Two owner decisions taken before coding, then implemented:

1. **Hash-based internal router** (over a state-only route registry). `#/`, `#/exercises`, `#/routines`, `#/routine/:id`, `#/session`, `#/history`, `#/checks`, `#/checklog`, `#/settings`, `#/install`, else → not-found. Hash routing sidesteps the subpath-404 edge case by construction (the server path stays `/sendboard/`; only the fragment changes), so no `404.html` shim is needed. Real URLs + browser back for free; this is the routing seam T8's tab bar sits on.
2. **Deep-link URLs dropped, not demoted.** Advertising a `#/routine/:id` URL for external reminders would point the owner at Safari (separate storage jar) — the precise data-fragmentation risk the T0 amendment cut them to avoid. So Settings shows version + install-guide link only, and the README documents alarm/Todoist → *tap the icon*, with no URL and a note on why.

Files: `src/lib/routes.ts` (typed `Route` union, `parseHash`, `go`, `useRoute` via `useSyncExternalStore`), `src/screens/Settings.tsx` (shell; no reminder UI per D2a — T7 adds the backup section here), `src/App.tsx` (temporary `View` switch replaced by the route table; `#/routine/:id` focused-start behavior, `#/session` resolves the single in-progress log, not-found state, Settings entry point added to the temp home), `README.md` (reminder section rewritten).

Design/scope calls (each logged per "amend before you code"):
- **`#/routine/:id` uses existing screens only** (context manifest forbids new screen files beyond `Settings.tsx`). Valid id → a small focused start block rendered inline in `App.tsx` (routine name + Start, or the unfinished-session Resume card if a log is in progress — resume precedence). Unknown id → not-found. No new screen component, `RoutineList` untouched.
- **`#/install` is a forward reference.** `InstallGuide.tsx` is a T8 deliverable, so T6 renders a minimal inline install block for the Settings link to target; T8 replaces it with the real screen. Flagged in an `App.tsx` comment.
- **T0 persistence heartbeat left in place** on the temp home — its 48h gate (T0 AC2) is still pending the owner's ~2026-07-25 report; not T6's to remove.
- **Session route relies on the single-in-progress-log invariant** (enforced in T4/`RoutineList`): `#/session` loads the one `completedAt === null` log; if none, it redirects home.

Not built (correctly, per non-goals): any notification/push/VAPID, any reminder UI, any claim the app sends reminders, and the T7 backup UI.

---

### [T7] Outcome: The owner can export all data to a JSON file and restore it on a fresh install.
Spec: this file | Status: [x] | Depends on: T2, T6

#### Context manifest
Create: `src/lib/backup.ts`, `src/lib/backup.test.ts`, backup section within `src/screens/Settings.tsx` (created by T6) | Read: `src/lib/storage.ts` | Conform to: `WorkoutLog`, `Check`, `Settings`

Export scope is: all `WorkoutLog`s, all `Check`s, and `Settings`. Not the exercise catalog (D6).

#### Acceptance criteria
1. WHEN "Export" is tapped THE app SHALL produce a JSON file containing all workout logs, all checks, and settings, with a `schemaVersion` field and an ISO timestamp in the filename. [x] — `schemaVersion: 1`, `exportedAt`, and filename `sendboard-backup-<safe-iso>.json`; unit-tested + browser-verified (data collected without error).
2. WHEN a previously exported file is imported into an app with empty storage THE logs, checks, and settings SHALL be fully restored. [x] — `collect → reset → import` round-trip unit-tested; empty store imports directly (no confirm).
3. WHEN a file with an unrecognized `schemaVersion` is imported THE app SHALL refuse the import with an explicit message and change nothing. [x] — `parseBackup` returns `unsupported-version` (distinct from malformed), naming the version; no storage touched.
4. WHEN an import would overwrite existing data THE app SHALL require an explicit confirmation naming how many logs will be replaced. [x] — non-empty store shows an inline confirm naming current vs incoming session/check counts before `replaceAll`.
5. WHEN malformed JSON is imported THE app SHALL show an error and leave existing data untouched. [x] — `parseBackup` is pure (no side effects); malformed/truncated/non-object/missing-collections all return an error before any write.

#### Edge cases
- Export with zero logs → valid file, not an error. [x] — unit-tested.
- Import on iOS Safari — verify the file picker and the download/share-sheet path actually work in standalone PWA mode; this is the known-fragile part of this task. [] — **device-pending.** The in-app test browser navigates on the blob-anchor click instead of downloading (it ignores the `download` attribute); iOS Safari standalone routes it through the share sheet. Owner to confirm export download + import file-picker on device.
- Partial/truncated file → treated as malformed (criterion 5). [x] — unit-tested (half-file → malformed).

#### Non-goals & do-not-touch
- MUST NOT add cloud backup, iCloud, or auto-export.
- MUST NOT export the exercise catalog (it is code-seeded, D6).

#### Verify
`npm run test -- backup && npm run build`, plus a device check of criterion 2 (export, clear site data, reinstall, import).

#### Amendments

**2026-07-24 — T7 built. Build + lint clean, 12 new backup tests green (47 total).** Files: `src/lib/backup.ts`, `src/lib/backup.test.ts`, backup section added to `src/screens/Settings.tsx`. One storage addition: `src/lib/storage.ts` gained `replaceAll({logs, checks, settings})` — an atomic single-transaction clear-and-write for import. Modifying storage.ts (context manifest listed it only under Read) is justified by D4: all IndexedDB access must stay in the storage module, so the bulk import couldn't live in backup.ts. Logged per "amend before you code."

Design:
- **`backup.ts` splits pure logic from IO.** `buildBackup`/`serializeBackup`/`parseBackup`/`backupFilename` are pure and carry the tests; `collectBackup`/`importBackup` wrap storage; `triggerDownload` is the DOM download. This keeps AC3/AC5 (validation refuses before touching data) unit-testable without a DOM.
- **`parseBackup` distinguishes `malformed` from `unsupported-version`** (AC5 vs AC3) so the two get different messages; both are pure and side-effect-free, guaranteeing "change nothing" on a bad file.
- **Import replaces, not merges.** Empty store → import directly (AC2). Non-empty → inline confirm naming current vs incoming counts (AC4), then atomic `replaceAll`.
- **Filename uses a filesystem-safe ISO stamp** (`:`/`.` → `-`), invalid in iOS/Windows filenames.

**Device-pending (owner):** the export download + import file-picker path in the installed PWA — T7's known-fragile edge case. The in-app test browser navigates on the blob-anchor click rather than downloading (it ignores `download`); iOS Safari standalone uses the share sheet. `triggerDownload` defers `revokeObjectURL` so a real browser's download isn't cut short.

---

### [T8] Outcome: The app is a coherent, navigable, installed tool the owner uses for a real training session end to end.
Spec: this file | Status: [x] | Depends on: T3, T4, T5, T5b, T6, T7

#### Context manifest
Create: `src/components/TabBar.tsx`, `src/screens/Home.tsx`, `src/screens/InstallGuide.tsx` | Modify: `src/App.tsx` (routing, alongside T6's route table) | Read: all screens

#### Acceptance criteria
1. WHEN the app opens THE home screen SHALL show both seeded routines with a one-tap Start each, the last session's date, the T5b climbing week status, and the T5b daily GtG status. [x] — `src/screens/Home.tsx`; browser-verified (both routines + Start, "Last session: …" / "No sessions yet", `WeekStatus` + `DailyGtgStatus`).
2. WHEN any screen is open THE tab bar SHALL offer: Home, Exercises, History, Settings. [x] — `src/components/TabBar.tsx`, rendered globally except on immersive/transient screens (active session, focused routine start, install guide, not-found), which carry their own back/done affordances. Verified present on Home/Settings, hidden during a session.
3. WHEN the app is opened in Safari rather than as an installed PWA THE app SHALL show the install guide once. [x] — standalone detection (`display-mode: standalone` / `navigator.standalone`) + `Settings.installGuideDismissed`; verified it shows on first load, and stays gone after "Got it" across a reload.
4. WHEN the app renders on the owner's iPhone THE layout SHALL respect safe-area insets (no content under the notch or home indicator). [x] — `viewport-fit=cover` + body safe-area padding (from T1) and a `pb-[env(safe-area-inset-bottom)]` fixed tab bar. CSS in place; final look is part of the criterion-5 device pass.
5. WHEN a full session is performed on-device — start, log ≥3 exercises, finish, view in history, export — THE flow SHALL complete with no crash, no data loss, and no unreadable text. [] — **device-pending.** Verified in-browser (start → log → finish → appears in history, no console errors); the on-device pass + export step is the owner's, and pairs with the T7 device download check.

#### Edge cases
- Week already complete for climbing → home still allows adding another check, it just reads as complete. [x] — `WeekStatus` toggles are always live on Home; "week complete" is a visual state, not a lock (T5b).
- Landscape orientation → usable, not broken. [] — **device-pending** (mobile-first `max-w-md` centers; no fixed heights that would break landscape, but confirm on device).
- iOS text-size accessibility setting at maximum → no clipped or overlapping controls. [] — **device-pending** (relative units throughout; confirm on device).
- App opened via a T6 deep link while a session is already in progress → resume prompt wins. [x] — the focused routine-start route surfaces Resume, never a second log; verified in T6 and unchanged.

#### Non-goals & do-not-touch
- MUST NOT add features not specified in T1–T7.
- MUST NOT restyle screens delivered by earlier tasks beyond what safe-area and tab-bar integration require.

#### Verify
`npm run build && npm run lint && npm run test`, then the criterion-5 device walkthrough with the result recorded in Amendments.

#### Amendments

**2026-07-24 — T8 built. Build + lint clean, 47 tests green; full nav + session loop verified in-browser.** Files: `src/components/TabBar.tsx`, `src/screens/Home.tsx`, `src/screens/InstallGuide.tsx`; `src/App.tsx` reworked (real Home, global tab bar, first-run onboarding gate, `#/install` → real InstallGuide).

Design/scope calls:
- **Tab bar rendered globally, hidden on immersive/transient routes** (`session`, `routine`, `install`, `notFound`) via a `NO_TAB_BAR` set. Every screen that shows it already has `pb-24`, so no earlier screen needed restyling (respects the T8 non-goal). Interpreting AC2's "any screen" as the primary browsing surfaces; hiding it mid-log keeps the session focused, and auto-persist (T4) makes leaving safe anyway.
- **One-tap Start on Home** creates the log and opens the session directly. If a session is already in progress it routes to the T6 focused start (which shows Resume) instead of silently opening a second log — reusing T6's resume-precedence rather than duplicating a modal. `RoutineList` (T4) untouched.
- **Install onboarding** reuses `InstallGuide` in two modes via a `ctaLabel`/`onCta` prop: a first-run overlay ("Got it" → sets `installGuideDismissed`) and the Settings reference view ("Back"). One component, no duplication.
- **T0 persistence heartbeat relocated** from the temp home into a "Diagnostics (temporary)" block in Settings, so the real Home matches AC1 while the 48h probe (T0 AC2, still pending the owner's ~2026-07-25 report) stays reachable on device. Delete it once that gate closes.

**Device-pending (owner):** criterion 5 on-device walkthrough incl. export (pairs with T7's download check), safe-area look on a notched device, landscape, and max text size. In-browser the whole loop — start → log → finish → history — runs clean with no console errors.

---

### [T9] Outcome: The owner opens the app, is told which routine is up next, can preview its exercises before committing, can read any exercise's full protocol without leaving the session, and can mark an exercise done without inventing set data.
Spec: this file | Status: [x] | Depends on: T8

#### Context manifest
Create: `src/lib/rotation.ts`, `src/lib/rotation.test.ts`, `src/screens/RoutineDetail.tsx` | Modify: `src/types.ts` (`LoggedExercise.completed`), `src/lib/session.ts` (+ `session.test.ts`), `src/screens/Home.tsx`, `src/screens/ActiveSession.tsx`, `src/screens/LogDetail.tsx`, `src/App.tsx` (route `routine` → the new screen) | Read: `src/lib/checks.ts` (local-calendar helpers), `src/screens/ExerciseDetail.tsx` | Conform to: D15, D16, D10

**The routine content is not in scope and does not change.** Training plan §3 fixes the week at four training days: Day 1 (fingerboard), Day 2 (climbing volume), Day 3 (pull/antagonist), Day 4 (climbing limit). Two of those are the seeded routines; the other two are climbing check-offs per D9. The seeded set of two routines is therefore already correct and complete — this task adds *selection and completion*, not new routines. Do not add a third routine, do not reverse D9, and do not edit `src/data/*`.

`rotation.ts` is pure (no storage import beyond the calendar helpers) for the same reason `checks.ts` and `session.ts` are: the ordering rules must be testable without IndexedDB.

#### Acceptance criteria
1. WHEN the home screen renders THE app SHALL designate exactly one routine as "up next" — the one whose most recent *completed* log is oldest, with a never-completed routine ranking ahead of any completed one, ties broken by seed order. [x]
2. WHEN a routine is displayed on home THE app SHALL show when it was last completed in relative terms ("2 days ago", "never"), and both routines SHALL remain startable in one tap regardless of which is up next. [x]
3. WHEN the home screen renders THE app SHALL show which of the two routines have been completed in the current Monday-start week (D10). [x]
4. WHEN `#/routine/:id` is opened THE screen SHALL list that routine's exercises in order with name and summary, before any session is started. [x]
5. WHEN an exercise row on that screen is tapped THE app SHALL show that exercise's full detail — `prescription`, all `howTo` steps, `cues`, and `safetyNotes` — and back SHALL return to the routine, not to home. [x]
6. WHEN an exercise is tapped during an active session THE app SHALL show the same full detail, and back SHALL return to the session with all logged sets intact. [x]
7. WHEN an exercise's "Done" control is toggled on during a session THE app SHALL persist `completed: true` for that exercise even if it has zero sets and no notes, and the entry SHALL survive in `entries`. [x]
8. WHEN "Done" is toggled off and the exercise has no sets and no notes THE entry SHALL be pruned from `entries`, matching T4 AC6's treatment of untouched exercises. [x]
9. WHEN a completed session is viewed in history THE detail SHALL distinguish exercises marked done from those merely logged, and SHALL render a done-with-no-sets exercise without an empty or misleading block. [x]

#### Edge cases
- No sessions ever logged → the first routine in seed order is up next; "never" rather than a computed interval. [x]
- Both routines completed today → still exactly one up next (the earlier `completedAt`); no "rest day" state and no lock on starting either. This is the D15 no-guilt corollary — mirrors T5b's no-streak-mechanics non-goal. [x]
- An in-progress (uncompleted) log SHALL NOT count as "last completed" for rotation, or an abandoned session would silently advance the rotation. The existing Resume banner is what surfaces it. [x]
- A log whose `routineId` no longer exists → ignored by rotation, no crash. [x]
- Backup files written before this task have entries with no `completed` field → treated as `false`, import unaffected. The field is optional and `BACKUP_SCHEMA_VERSION` does NOT change (an added optional field is backward-compatible in both directions). [x]
- Marking done, then adding a set, then deleting the set → the entry survives on the `completed` flag alone. [x]
- Daylight-saving / timezone change inside a week → "days ago" and "this week" computed from local calendar dates via the existing helpers, never from millisecond deltas (D10). [x]

#### Non-goals & do-not-touch
- MUST NOT add day-of-week scheduling, a rest-day concept, or any "you are behind / you missed X" copy (D15, and T5b's non-goal for the same reason).
- MUST NOT add a third routine, edit `src/data/exercises.ts` or `src/data/routines.ts`, or reverse D9's climbing check-offs.
- MUST NOT add 8-week block/periodization tracking (owner deferred 2026-07-24). §4B's week 1–4 vs 5–8 PIMA variants stay in the exercise `prescription` text for the owner to apply.
- MUST NOT bump `BACKUP_SCHEMA_VERSION` or `DB_VERSION` — the added field is optional.
- MUST NOT auto-mark an exercise done when a set is added; done is an explicit tap.

#### Verify
`npm run test -- rotation && npm run test -- session && npm run build && npm run lint`, plus an in-browser pass of criteria 1–9.

#### Amendments

**2026-07-24 — T9 built. Build + lint clean, 69 tests green (15 new rotation cases, 7 new session cases); all 9 criteria and all 7 edge cases verified in-browser at 375px with seeded logs.** Files: `src/lib/rotation.ts` (+ `rotation.test.ts`), `src/screens/RoutineDetail.tsx`; modified `src/types.ts`, `src/lib/session.ts`, `src/screens/Home.tsx`, `src/screens/ActiveSession.tsx`, `src/screens/LogDetail.tsx`, `src/App.tsx`. No new dependencies, no storage schema change, no catalog change.

**Scope note — no new routines were added, deliberately.** The request that opened this task asked for "an A and B routine, possibly more depending on research." Research was unnecessary: training plan §3 already fixes the week at four training days, of which exactly two are strength routines (already seeded since T2) and two are climbing days (check-offs per D9). A and B is therefore the correct count, and the gap was never *content* — it was that nothing told the owner which one to do, nothing let them preview a routine before starting it, and nothing let them mark an exercise done without inventing set data. This task closed those three.

**Bug found and fixed while building (worth recording — it would have silently mis-dated sessions).** `storage.dateKey()` string-slices the first 10 characters of a string input. That is correct for `Check.date`, which is always a local date-only key, but **wrong for `WorkoutLog.completedAt`, which is a full UTC instant** (`new Date().toISOString()`). West of UTC, an evening session would have been attributed to the *next* calendar day — so "days ago" would read one high, and a Sunday-evening session would have landed in the following Monday-start week, corrupting the D10 week grouping this task depends on. `rotation.ts` now normalizes through `localDayKey()`, which routes anything carrying a time component through `new Date()` so `dateKey` takes its local-getters path. Caught because the rotation tests were written with local wall-clock times rather than UTC ones. **T5b/checks.ts is not affected** — verified that every `Check` write (`WeekStatus`, `DailyGtgStatus`, `CheckLog`) stores `dateKey(new Date())`, i.e. date-only.

Design calls (each logged per "amend before you code"):
- **Rotation is derived, never stored.** `routineRotation()` is a pure function of (routines, logs, today), so there is no schedule state to keep in sync, nothing to migrate, and nothing that can drift from the logs. It also means an imported backup immediately produces the right "up next" with no rebuild step.
- **In-progress logs are excluded from "last completed"**, so an abandoned session cannot silently advance the rotation. The T4/T8 resume banner remains the only thing that surfaces an unfinished log.
- **Up next is a suggestion, never a lock.** Both routines keep a one-tap Start (T8 AC1 preserved), both are always startable, and there is no rest-day, missed-day, or streak state anywhere — D15's no-guilt corollary, consistent with T5b's non-goal and training plan §7/§8, which both treat *stopping* as correct behavior under fatigue.
- **`RoutineDetail.tsx` replaces T6's inline start block in `App.tsx`.** T6 kept that block inline only because its context manifest forbade new screen files; that constraint does not apply here, and the screen now needs real content (the exercise list). `App.tsx` keeps ownership of id-resolution and the not-found decision, so the screen stays presentational. `RoutineList.tsx` (the `#/routines` screen) is untouched.
- **`ExerciseDetail` is reused verbatim in three places** (exercise list, routine preview, active session) as a conditional render over the current route rather than a navigation. Back therefore returns to wherever it was opened from, with no route state to manage — the same pattern T3 established for "back preserves the filter."
- **`completed` is optional on `LoggedExercise`**, so pre-T9 logs and backup files read as not-completed with no migration. `DB_VERSION` and `BACKUP_SCHEMA_VERSION` are both unchanged, and a T9 backup restored into an older build simply loses the flag rather than failing to parse.
- **The zero-set prune rule generalized rather than being weakened.** T4 AC6 dropped entries with no sets and no notes; the predicate is now `sets || notes || completed`, so genuinely untouched exercises still vanish from `entries` while an explicit "I did this" survives.

---

### [T10] Outcome: The owner can time a hold and its prescribed rest without leaving the session or reaching for the Clock app, and log the held duration in one tap.
Spec: this file | Status: [x] | Depends on: T9

#### Context manifest
Create: `src/lib/timer.ts` (+ `timer.test.ts`), `src/components/SessionTimer.tsx`, `src/lib/beep.ts`, `src/lib/wakeLock.ts` | Modify: `src/types.ts` (`Exercise.holdSeconds`, `Exercise.restSeconds`), `src/data/exercises.ts` (timing on the timed entries only), `src/screens/ActiveSession.tsx` | Read: `src/lib/session.ts`, `src/components/SetLogger.tsx` | Conform to: D17, D18, D19, D16

**Why this reverses a non-goal, and why that is in bounds.** "Rest timers with audio" was listed as *deferred to v2*, not rejected — the v1 line was a scoping call, not a judgment that timers are wrong. The training plan is built out of intervals (§4B 3 min between sets and ~10s between reps; §4C 3 min; §5A 2 min; §5B 2 min; §8 Abrahangs 10s on / 50s off), and the owner currently leaves the PWA for the Clock app to run them. That is the same "reopen another thing mid-session" failure the PRD's problem #2 names, and rest length is a *training variable* on a max-effort protocol, so guessing it degrades the block rather than merely annoying.

`timer.ts` is pure — a state machine over (state, now) with no `Date.now()` inside it and no React import — for the same reason `checks.ts`, `session.ts`, and `rotation.ts` are: the interval math must be testable without a DOM or a clock.

#### Acceptance criteria
1. WHEN an exercise with `holdSeconds` is shown in an active session THE app SHALL offer a "Start hold" control on that exercise. [x]
2. WHEN a hold is running THE app SHALL count **up** from zero and render the target range as a band, visibly distinguishing below-range, in-range, and past-max — never counting down from a single invented target (a range is a range). [x]
3. WHEN a hold is stopped THE app SHALL report the elapsed time to 0.1s, and IF that exercise has `restSeconds` THE rest countdown SHALL start immediately without a second tap. [x]
4. WHEN a rest countdown is running THE app SHALL show remaining time as `m:ss`, and offer Skip and +30s. [x]
5. WHEN a rest countdown reaches zero THE app SHALL change state visibly AND emit an audible beep. [x]
6. WHEN a hold has just completed THE app SHALL offer a one-tap control that appends a set whose `reps` is the measured duration (e.g. `8.4s`), leaving `load` and `rpe` for the owner. [x]
7. WHEN the app is backgrounded and refocused mid-interval THE displayed time SHALL be correct to the wall clock, not behind by the time spent backgrounded (D18's absolute-timestamp rule). [x]
8. WHILE a session is open THE app SHALL hold a screen wake lock where the platform supports it, and SHALL re-acquire it on refocus. [x]
9. WHEN an exercise has `restSeconds` but no `holdSeconds` THE app SHALL offer a standalone "Start rest" control. [x]

#### Edge cases
- Wake Lock API, Web Audio, or an `AudioContext` unavailable (older iOS, jsdom, a denied lock) → every one of these degrades to a no-op; **the timer itself never depends on any of them.** [x]
- iOS autoplay policy: an `AudioContext` created without a user gesture is suspended and silent. It is therefore created and resumed on the *first timer tap*, which is always a gesture. [x]
- App backgrounded when rest hits zero → iOS suspends the PWA, so the beep does not fire. This is a platform limit, not a bug; the wake lock (AC8) is the mitigation, and the rest bar still reads correctly on return (AC7). Do not add a Notification API fallback — that is D2a. [x]
- A hold left running for minutes (owner forgot to stop) → keeps counting, no cap, no auto-stop. The measured value is still true, and an auto-stop would silently invent a number. [x]
- Starting a hold on exercise B while A's rest is still running → B takes over the single timer slot. There is exactly one timer, because there is exactly one owner with two hands. [x]
- Navigating to an exercise's detail view mid-interval and back → the timer survives (it lives in `ActiveSession`, above the detail branch). [x]
- Finishing the session mid-interval → timer is discarded with the screen; nothing is persisted (D18). [x]
- An exercise with neither timing field (rows, squats, get-ups, prehab) → no timer controls at all, card unchanged. [x]

#### Non-goals & do-not-touch
- MUST NOT persist timer state, add a store, or bump `DB_VERSION` / `BACKUP_SCHEMA_VERSION` (D18).
- MUST NOT use the Notification API, request notification permission, or schedule anything — the beep is Web Audio in the foreground only (D2a is not reversed by this task).
- MUST NOT auto-mark an exercise completed when a hold finishes or a set is logged (D16, D19).
- MUST NOT parse durations out of `prescription` strings (D17).
- MUST NOT add timing fields to exercises the training plan does not prescribe a duration for.
- MUST NOT add a rep-cadence/EMOM runner for §4B's "~10s between reps" tendon variant in this task — that is a third interval type stacked inside a set, and the plan runs it only in weeks 1–4. Revisit if the owner asks.

#### Verify
`npm run test -- timer && npm run test -- session && npm run build && npm run lint`, plus an in-browser pass of criteria 1–9 at 390px.

#### Amendments

**2026-07-24 — T10 built. Build + lint clean, 122 tests green (31 new timer cases). Criteria 1–7 and 9 verified in-browser against a seeded session; AC8 (wake lock) is code-verified only — see below.** Files: `src/lib/timer.ts` (+ `timer.test.ts`), `src/components/SessionTimer.tsx`, `src/lib/beep.ts`, `src/lib/wakeLock.ts`; modified `src/types.ts`, `src/data/exercises.ts`, `src/screens/ActiveSession.tsx`. No new dependencies, no storage or backup schema change.

**Verification levels, stated separately because they are not equal.**
- *In-browser, observed:* the count-up and its band transitions at the exact boundaries (a 3–5s hold read `building`/sky at 1.0s, `✓ in range`/emerald at 3.5s, `past target`/amber at 5.5s); stop measuring 8.0s and starting the 3 min rest in the same tap; `+30s` moving 2:46 → 3:15 without restarting; the rest reaching 0:00 and flipping to "Rest complete — go" with Skip becoming Done; the one-tap log writing `load="20mm +10kg"` (carried from the prior session) and `reps="8.0s"` with RPE left blank; the exercise remaining un-completed afterwards (D16 intact); a hold with no prescribed rest (wall press) ending as a result-only bar with no countdown; untimed movements showing no timer control at all; and the bar surviving a trip into an exercise's detail view, still counting down on return.
- *Instrumented:* the beep. `AudioContext` was wrapped to count oscillators — exactly 2 started at rest-complete, the context reached state `running` (so `primeAudio()` on the first tap does unlock it), and no further tones fired on later renders, confirming the `beepedFor` guard. **Audibility itself was not confirmed** — that needs the device pass.
- *Unit test + construction:* AC7. The "backgrounding" cases assert a rest and a hold read correctly across a long gap with no intermediate evaluation, which is the whole content of the claim — readings are `(now - startedAt)`, so there is no accumulator to fall behind. A real iOS suspend/resume is still a device-pass item.
- *Not verified here:* AC8. `navigator.wakeLock` exists in the preview browser, but a request throws `NotAllowedError: the requesting page is not visible` because the preview pane was hidden. `useWakeLock` guards on `document.visibilityState` before requesting and re-acquires on `visibilitychange`, so it correctly declined to request rather than throwing — but an actual acquired sentinel was never observed. **Add to the on-device pass.**

**AC9's branch is real but the shipped catalog never reaches it.** No exercise has a prescribed rest without a prescribed hold, so "Start rest" cannot appear today. It was verified by temporarily giving `kb-single-arm-row` a `restSeconds` (the control rendered as `▶ Start rest · 1:30`), then reverting. The branch is kept deliberately: `restSeconds` is an independent optional field, and a value the owner adds during the block being *silently ignored* would be a worse trap than twelve lines of currently-unreached UI. This is a judgment call against the "no scaffolding in case" rule and is recorded as such.

Design calls:
- **Timing is catalog data, not parsed prose (D17).** Two of the timed entries carry both a peak and a weeks-1–4 variant in one `prescription` string; any regex over those picks a number by luck. The typed fields cost two lines each in a file that is already hand-authored.
- **Count up, not down (AC2).** Every finger and lock-off prescription in the plan is a *range*. Counting down from the top of it would force a single invented target onto the range and would render a deliberately-shortened 6s hang as a failed 10s one, when what actually happened is a 6s hang. Counting up also means the measured value is true whenever the owner drops off, which is what AC6 then logs.
- **The timer never stops itself.** Passing the top of the range reports `past target` and keeps counting. An auto-stop would silently invent the number that gets logged, and the plan puts "how hard, how long" with the owner (§4B "progress by feel").
- **One timer, not one per card.** There is one owner with two hands. Starting a hold anywhere takes over the slot and discards an unlogged result, because the thing just tapped is the thing meant. This also removes any question of what several running timers would mean.
- **The bar renders over the exercise-detail view too**, since reading the cues is exactly what the owner does during a 3 minute rest — a countdown that vanishes to allow that would defeat the feature.
- **The interval only drives re-renders, never the reading.** `useNow` ticks at 100ms purely to repaint; every displayed value is recomputed from the phase's absolute start instant, so a throttled interval costs a stale frame rather than a drifted timer (D18). It also re-reads on `visibilitychange`/`focus` so the first frame back is correct rather than up to a tick late.
- **The beep is Web Audio, foreground-only, and D2a is not reversed.** No Notification API, no permission prompt, nothing scheduled. A backgrounded iOS PWA is suspended and cannot beep; the wake lock is the mitigation, and the countdown still reads correctly on return. This limitation is documented rather than worked around.

---

### [T11] Outcome: When logging an exercise the owner can see what they did last time without leaving the session, and a new set starts prefilled from it instead of blank.
Spec: this file | Status: [x] | Depends on: T9

#### Context manifest
Create: `src/lib/lastTime.ts` (+ `lastTime.test.ts`) | Modify: `src/screens/ActiveSession.tsx` | Read: `src/lib/session.ts` (`addSet` already takes a seed `SetEntry`), `src/lib/storage.ts` (`getAllLogs`) | Conform to: D19, D16

**Why this is a recall feature, not an analytics feature.** Training plan §4F asks for 1–3% load increments and §7 asks the owner to "note edge size, added weight, and how hangs *felt*, so you can spot a downward trend before it becomes an injury." Neither is possible against a number you cannot see: today, answering "what did I hang last Day 1?" costs History → find the session → open it → read, which is the ~30–60s scroll the PRD's success metrics set out to eliminate. Showing the previous performance *on the card being logged* is the same information the history screen already renders, moved to where the decision is made.

**What a chart would still need (recorded so the next task does not assume this one delivered it).** `SetEntry.load` is free text by design — `"20mm +10kg"`, `"35lb"`, `"BW"` are all valid and all unparseable. A trend line needs (a) this non-goal reversed, (b) structured load: at minimum bodyweight and the standard edge size, since §4E says added-weight numbers are meaningless without bodyweight and a mid-block edge change invalidates the comparison outright, and (c) the §4E retest battery, which is the plan's own before/after instrument. This task is the precondition for all three, because carrying a value forward is what makes consecutive entries *consistent* rather than freshly retyped. It does not deliver any of them.

#### Acceptance criteria
1. WHEN an exercise is shown during an active session AND it was performed with at least one set in an earlier **completed** session THE card SHALL show that previous performance and how long ago it was. [x]
2. WHEN more sets were logged last time than fit on one line THE app SHALL summarize compactly rather than wrapping the card (e.g. first few sets, then a count of the rest). [x]
3. WHEN `+ Add set` is tapped AND the exercise already has sets in the current session THE new row SHALL be prefilled from the **previous set in this session** — the single biggest saving, since a max-hang exercise is five near-identical rows. [x]
4. WHEN `+ Add set` is tapped AND the exercise has no sets yet in this session THE new row SHALL be prefilled from the corresponding set of the last completed session, or blank if there is none. [x]
5. WHEN a set is logged from a finished hold (T10 AC6) THE measured duration SHALL win for `reps`, with `load` still carried forward. [x]
6. WHEN nothing was ever logged for an exercise THE card SHALL render exactly as it does today — no empty "Last: —" row. [x]
7. WHEN a prefilled value is wrong THE owner SHALL be able to edit it like any other field, and prefill SHALL NOT mark the exercise completed (D19). [x]

#### Edge cases
- The current in-progress log MUST be excluded from the "last time" lookup, or an exercise would cite itself. [x]
- Only completed logs count (`completedAt !== null`) — an abandoned session is not a performance, the same rule rotation already applies to "last completed" (D15). [x]
- The most recent log containing the exercise wins, even if it is a different routine (an exercise can appear in more than one routine). [x]
- A prior entry with `completed: true` but zero sets → not a performance for prefill purposes; skip it and look further back. [x]
- Sets whose fields are all empty → prefill produces a blank row, i.e. today's behavior. No crash, no `"undefined"` string. [x]
- An imported backup immediately produces correct carry-forward, because the lookup is derived from logs rather than stored (same property as rotation). [x]

#### Non-goals & do-not-touch
- MUST NOT compute, suggest, or auto-increment a *target* load — that is adaptive load calculation / 1RM estimation, a standing v1 non-goal. Carry-forward reports what happened; it never proposes what should happen next.
- MUST NOT add charts, sparklines, PRs, or trend arrows (standing non-goal — see the note above for what reversing it would actually require).
- MUST NOT parse or normalize the free-text `load` string.
- MUST NOT make history editable, or write to any log other than the in-progress one.

#### Verify
`npm run test -- lastTime && npm run test -- session && npm run build && npm run lint`, plus an in-browser pass of criteria 1–7 with a seeded prior session.

#### Amendments

**2026-07-24 — T11 built. Build + lint clean, 122 tests green (22 new lastTime cases); all 7 criteria verified in-browser against a seeded prior session.** Files: `src/lib/lastTime.ts` (+ `lastTime.test.ts`); modified `src/screens/ActiveSession.tsx`. No new dependencies, no type change, no storage or backup schema change — the whole feature is derived from logs that already existed.

Observed in-browser: a prior session of five identical max hangs rendered as `LAST 3 DAYS AGO 20mm +10kg × 7s @8 ×5`; a varied exercise rendered its sets separately (`20mm +5kg × 8s @7 · 20mm +7kg × 7s @9`); exercises never logged showed no line at all (AC6); `+ Add set` copied the previous set *in the current session* including reps, with RPE blank (AC3, AC7); and the hold-log path carried the prior session's load while the measured duration won on reps (AC5). The prior log's `abrahangs-no-hang` entry — `completed: true` with zero sets — correctly did **not** register as a performance, which is the edge case that would otherwise let one "did it, typed nothing" session hide the last real numbers.

Design calls:
- **`addSet` needed no signature change.** It already accepted an optional `SetEntry`, so carry-forward is entirely a matter of computing the seed; `session.ts` is untouched and its 17 tests still cover it unchanged.
- **RPE is never carried forward.** Load and reps describe a setup worth repeating; RPE is a fresh judgment about a set that has not happened yet. Pre-filling it would fabricate precisely the "how did it feel" signal the plan asks the owner to watch for a downward trend (§7) — the one field where a convenient default is actively harmful.
- **Precedence is this session's previous set, then last session's, then blank.** A max-hang exercise is five near-identical rows, so the within-session copy is the bulk of the saving; the cross-session seed matters only for the first row.
- **Consecutive identical sets collapse (`×5`).** Five repeated rows is the common case for hangboarding and the compressed form is both shorter and more readable. Distinct runs stay in order, and the line caps at three runs with a `+N more` tail so a varied session summarizes rather than wrapping the card.
- **Ordering is by `completedAt`, not `startedAt`.** A session opened before midnight and finished after it is the more recent performance; `getAllLogs()` sorts by `startedAt`, so this module sorts for itself rather than inheriting that.
- **Derived, never stored** — same property as rotation, and the reason an imported backup produces correct carry-forward with no rebuild step. (Verified by construction: the function's only input is the log list. Not separately exercised through the import UI.)

**Explicitly not delivered: charts.** See "What a chart would still need" above. The owner's stated direction is progress charts; this task makes consecutive entries *consistent* (a carried-forward value is reused rather than retyped), which is the precondition, but the free-text `load` field, the missing bodyweight/edge-size context, and the absent §4E retest battery all still stand between here and a trend line. Reversing the charts non-goal without those would produce a graph of unparseable strings.

---

### [T12] Outcome: For the three exercises the plan actually progresses, the owner can log the measurement as a number and see it as a line over the block, switching between load, edge, and time.
Spec: this file | Status: [x] | Depends on: T10, T11

#### Context manifest
Create: `src/lib/progress.ts` (+ `progress.test.ts`), `src/components/ProgressChart.tsx`, `src/components/ExerciseProgress.tsx` | Modify: `src/types.ts` (`SetEntry` measurements, `Exercise.metrics`), `src/data/exercises.ts` (three entries), `src/components/SetLogger.tsx`, `src/screens/ActiveSession.tsx`, `src/screens/ExerciseDetail.tsx`, `src/lib/lastTime.ts` (carry the numbers forward too) | Read: `src/lib/timer.ts`, `src/lib/storage.ts` | Conform to: D20, D21, D19, D6

**Only three exercises are in scope**, per D20: `max-hang-half-crimp`, `max-hang-open-hand`, `weighted-lockoff-hold`. Every other catalog entry is untouched and shows no numeric fields and no chart. Adding a fourth is a catalog edit plus a line in the amendments log explaining which section of the training plan progresses it — not a code change.

**Metrics are per-exercise, not universal.** Both max hangs declare `['holdSec', 'addedLb', 'edgeMm']`; the weighted lock-off declares `['holdSec', 'addedLb']`, because it hangs from a bar via a dip belt and has no edge. A chart is offered for a metric only if the exercise declares it. **Declaration order is display order and the default view** — hold time leads because, under the owner's progression (D22), it is the metric that moves session to session, while added load steps rarely and edge size steps rarest of all.

**Edge is a condition, not a peer (D22).** For an exercise declaring `edgeMm`, the time and load series are cut into one segment per contiguous run of the same edge, each labelled. Edge itself still gets its own view — the step-down over the block — where it is the subject rather than the condition.

**`holdSec` is free.** T10's timer already measures the hold and writes it into `reps` as text (`"8.0s"`); the one-tap log path fills the numeric field at the same time, so the time series costs the owner no additional typing on exactly these three exercises.

`progress.ts` is pure — series building and aggregation as functions of (logs, exerciseId, metric) — for the same reason `timer.ts`, `lastTime.ts`, and `rotation.ts` are.

#### Acceptance criteria
1. WHEN a set is logged for an exercise that declares metrics THE logger SHALL offer a numeric input per declared metric (added lb, edge mm, hold s), alongside the existing free-text `load`/`reps` fields, which are unchanged. [x]
2. WHEN an exercise declares no metrics THE logger SHALL render exactly as it does today — no numeric inputs, no chart, no empty section. [x]
3. WHEN a set is logged from a finished hold THE app SHALL populate `holdSec` from the measured duration without the owner typing it. [x]
4. WHEN a new set row is seeded by carry-forward (T11) THE declared measurements SHALL carry forward on the same precedence rule as load and reps — a max hang's edge and added weight rarely change between sets. [x]
5. WHEN an exercise detail is opened AND at least two sessions have logged the selected metric THE app SHALL draw a line chart of that metric over time. [x]
6. WHEN an exercise declares more than one metric THE app SHALL let the owner switch between them, showing one chart at a time. [x]
7. WHEN the charted metric is `edgeMm` THE y-axis SHALL be inverted, so a smaller edge reads as upward progress, and SHALL be labelled so the inversion is not ambiguous. [x]
8. WHEN a session logged several sets THE chart SHALL plot one point per session, using the best set for that metric (highest `addedLb`, highest `holdSec`, smallest `edgeMm`). [x]
9. WHEN fewer than two sessions carry the metric THE app SHALL say so plainly instead of drawing a line through one point or an empty box. [x]
10. WHEN the chart renders THE x-axis SHALL be proportional to elapsed time, so a skipped or deload week reads as a gap rather than being evenly spaced away. [x]
11. WHEN the charted metric is `holdSec` or `addedLb` AND the exercise declares `edgeMm` THE series SHALL be broken into one segment per contiguous run of the same edge, with no line drawn across an edge change, and each segment SHALL be labelled with its edge (D22). [x]
12. WHEN a segment contains a single session THE app SHALL render its point without a connecting line, rather than dropping it or joining it to the neighbouring edge's segment. [x]

#### Edge cases
- A pre-T12 set with free-text load only → contributes no point; the chart starts from the first structured entry rather than guessing. Never parse the string (D21). [x]
- Only in-progress (uncompleted) sessions carry the metric → treated as no data, matching how rotation and carry-forward already treat unfinished logs. [x]
- Two sessions on the same local calendar day → one point per session, not per day; the x-axis is time, so they sit close together rather than collapsing. [x]
- A metric declared but never logged (e.g. edge left blank all block) → that metric's toggle is offered but its chart shows the AC9 empty state; the other metrics still chart. [x]
- Sessions logged with no `edgeMm` on an edge-declaring exercise → grouped as one "edge not recorded" segment rather than silently merged into an adjacent edge's run. [x]
- The owner returns to a previously used edge (18mm → 16mm → 18mm) → three segments, not two. Runs are contiguous in time, never merged by value, or a return to an easier edge would read as continued progress on the harder one. [x]
- Every session on the same edge (no edge change all block) → exactly one segment, rendering identically to an unsegmented line. Segmentation must not add visual noise when there is nothing to separate. [x]
- All values identical (five weeks at +35lb) → a flat line, drawn honestly, not auto-scaled into a fake slope. A zero-range y-axis must not divide by zero. [x]
- A single outlier (mistyped 350lb) → plotted as logged. The chart is a record, not a validator; the fix is editing the set, and history editing remains out of scope. [x]
- Numeric input left blank → no measurement stored; the set still logs its free text normally. Blank is not zero. [x]
- A backup written before T12, restored → imports cleanly, contributes no points, and `BACKUP_SCHEMA_VERSION` is unchanged (added optional fields are compatible both directions, per the T9 precedent). [x]

#### Non-goals & do-not-touch
- MUST NOT chart any exercise outside the three named in D20, and MUST NOT add a "chart everything that has a number" fallback.
- MUST NOT parse, normalize, or migrate the free-text `load`/`reps` strings (D21).
- MUST NOT add a charting dependency. Inline SVG only — the whole feature is a polyline and some labels, and every prior task shipped with no new dependencies.
- MUST NOT compute or display a projection, target, trendline fit, PR badge, streak, or "you're improving/declining" verdict. The line is the record; §4E's interpretation rubric is the owner's to apply, and a cheerful arrow on a declining line would invert the plan's safety guidance.
- MUST NOT add cross-exercise dashboards, a whole-block summary screen, or a new tab.
- MUST NOT bump `DB_VERSION` or `BACKUP_SCHEMA_VERSION`.
- MUST NOT make history editable (still out of scope, and named in the outlier edge case above).

#### Known limitation, deliberately accepted
**Bodyweight is not tracked, so an added-load line is only comparable against a stable bodyweight.** Training plan §4E records bodyweight alongside added weight for exactly this reason: +35lb at 165lb bodyweight is not the same performance as +35lb at 172lb. Tracking it means a capture surface and a decision about per-session vs. per-block granularity that no decision covers yet, and the owner has not asked for it. Recorded here so the chart is not later mistaken for a complete strength measure. **Revisit gate:** the owner's bodyweight moves enough over the block to matter, or the §4E retest battery gets built — whichever comes first.

#### Verify
`npm run test -- progress && npm run test -- lastTime && npm run build && npm run lint`, plus an in-browser pass of criteria 1–12 at 390px with a seeded multi-session history, including the flat-line, single-point, and inverted-edge cases.

#### Amendments

**2026-07-24 — T12 built. Build + lint clean, 153 tests green (23 new progress cases, 7 new lastTime cases); all 12 criteria verified in-browser against a seeded eight-session progression across three edges.** Files: `src/lib/progress.ts` (+ `progress.test.ts`), `src/components/ProgressChart.tsx`, `src/components/ExerciseProgress.tsx`; modified `src/types.ts`, `src/data/exercises.ts`, `src/components/SetLogger.tsx`, `src/lib/lastTime.ts`, `src/screens/ActiveSession.tsx`, `src/screens/ExerciseDetail.tsx`, `src/screens/LogDetail.tsx`. No new dependencies, no storage or backup schema change.

Observed in-browser against a seeded block (20mm ×4 → 18mm ×3 → 16mm ×1): the time view drew **two** polylines and eight points, the single-session 16mm run correctly rendering as a bare point with no line (AC12); segment labels read 20mm / 18mm / 16mm (AC11); the load view segmented identically and its axis read `+35lb` to `BW`, with zero added load shown as bodyweight; the edge view was the one **unsegmented** line, axis inverted (16mm top, 20mm bottom) with the explanatory caption (AC7); x positions were unevenly spaced in proportion to the real day gaps (AC10). PIMA and the Turkish get-up showed no progress section at all (AC2, D20); the weighted lock-off offered Time and Load but no Edge; an exercise with one session showed "One session so far — 8.2s" and drew nothing (AC9). In a live session the max-hang card rendered `edge mm / added lb / hold s` numeric columns with a single header row, `+ Add set` carried edge and load forward but left time blank (AC4), the hold timer wrote `holdSec: 2.9` numerically (AC3), and the stored set was `{edgeMm, addedLb, holdSec, load: "", reps: ""}` — no string parsing anywhere. History and the last-time line both render measured sets from their numbers (`16mm · BW · 6.5s @8`).

Design calls:
- **The segmentation rule earns its complexity.** Drawn as one line, the owner's real progression is a sawtooth that reads as three regressions; the same data cut at edge changes reads as three builds, each rising. This is the whole reason D22 exists, and it is visible in the verification data above.
- **Runs are contiguous in time, never grouped by value.** 18mm → 16mm → 18mm yields three segments. Merging the two 18mm runs would draw the later work as a continuation of the harder block and assert progress that did not happen.
- **`holdSec` is not carried forward, for the same reason `rpe` is not.** Edge and added load are *setup* — what you hung on and what you clipped on — and repeating them across five near-identical hangs is the real saving. Hold time is a *result*, measured after the fact by the T10 timer; seeding it would pre-fill an achievement that has not happened yet. This is recorded as `CARRIED_METRICS` rather than left implicit.
- **Two orderings, deliberately.** `Exercise.metrics` order is chart order and the default view (time first — it moves session to session). Input order is fixed separately as edge → load → time, which follows the physical act: set up, then hang.
- **`ExerciseProgress` self-loads so `ExerciseDetail` stays presentational.** The detail screen is rendered from three places (catalog list, routine preview, mid-session) and none of them should have to fetch logs to show it. A consequence worth having: the chart is reachable *during* a session, which is when "am I back to where I was before I dropped the edge" is actually asked.
- **The chart asserts nothing.** No trendline fit, no projection, no PR marker, no improving/declining verdict. §4E's interpretation rubric is the owner's, and §7 treats a downward trend as a signal to deload — an encouraging arrow drawn on one would invert the plan's own safety guidance.
- **A flat series is drawn flat.** Zero range centres the line rather than auto-scaling it into a fake slope, and the axis shows one value instead of "8 / 8".

**Deliberately still absent:** bodyweight (see the known-limitation section above — the revisit gate is unchanged), any cross-exercise or whole-block view, and any chart for the other seventeen exercises.

---

### [T13] Outcome: The owner's data survives an update without being reinstalled away, storage is requested as persistent, the hold timer ends itself at the prescribed time, and the rest beep is audible on device.
Spec: this file | Status: [x] | Depends on: T10, T12

#### Context manifest
Create: `src/lib/persistence.ts` (+ `persistence.test.ts`) | Modify: `src/lib/beep.ts`, `src/lib/timer.ts` (+ `timer.test.ts`), `src/components/SessionTimer.tsx`, `src/screens/Settings.tsx`, `vite.config.ts`, `src/vite-env.d.ts`, `src/App.tsx` | Conform to: D4, D5, D18 | Delete: the temporary T0 `PersistenceHeartbeat` component in `Settings.tsx`

**The data-loss cause is the update workflow, not eviction.** Owner reported 2026-07-24: "I need to remove the app from my phone to get our updates so it is gone." That is the whole 8-week log destroyed on every deploy, and it is unnecessary — `registerType: 'autoUpdate'` already makes the service worker skip waiting and claim clients, so a relaunch picks up a new build. What is missing is any way to *confirm* it: `Settings` renders `v{__APP_VERSION__}` from a `package.json` version that has never changed from `0.1.0`, so an update and a non-update look identical, and uninstalling is the only workflow that feels reliable. A build stamp is therefore a data-durability feature, not a nicety.

**AC4 reverses a T10 design call at the owner's request.** T10 had the hold count past its target and never stop itself, reasoning that the owner decides when to drop off and an auto-stop would invent the logged number. The owner has decided otherwise (2026-07-24). The reversal is recorded rather than argued: stopping at the prescribed maximum is the behaviour, and a manual Stop before then still measures the real duration. It also *requires* an audible cue — the reason to auto-stop is not having to watch the screen mid-hang.

#### Acceptance criteria
1. WHEN the app starts THE app SHALL request persistent storage, and Settings SHALL show whether it was granted, denied, or is unsupported. [x]
2. WHEN Settings is opened THE app SHALL show a build identifier that changes with every deploy, so the owner can confirm an update landed without reinstalling. [x]
3. WHEN Settings is opened THE temporary T0 persistence-probe component SHALL be gone, replaced by the AC1 status. [x]
4. WHEN a hold reaches the top of its prescribed range THE timer SHALL stop itself, record that duration, and start the prescribed rest — the same transition a manual Stop performs. [x]
5. WHEN a hold auto-stops THE app SHALL emit an audible cue distinct from the rest-complete cue, since the owner is mid-hang and not watching the screen. [x]
6. WHEN a hold is stopped manually before its maximum THE measured duration SHALL be the real elapsed time, unchanged from T10. [x]
7. WHEN audio is initialized THE app SHALL declare a playback audio session where the platform supports it, so the beep is not silenced by the ringer switch. [ ] — **device-pass only.** `navigator.audioSession` is a WebKit API and is absent from the preview browser, so the code path is guarded and unexercised here. This is the specific fix for the reported silence; it can only be confirmed on the iPhone.
8. WHEN Settings is opened THE app SHALL offer a control that plays the beep on demand, so audio can be diagnosed without running a session. [x]
9. WHEN the app returns to the foreground THE audio context SHALL be resumed, so a beep after a backgrounded stretch is not silent. [ ] — wired to `visibilitychange`, but a real background/resume cycle is a device-pass item.

#### Edge cases
- `navigator.storage.persist` absent (older iOS) → reported as unsupported; nothing else changes, and the app keeps working exactly as it does today. [x]
- Persistence denied → stated plainly in Settings alongside the export button, since manual backup (D5) is then the only durable copy. [x]
- `navigator.audioSession` absent → skipped silently; the beep still plays when the ringer is on. [x]
- A fixed-target hold (`[5, 5]`) auto-stops at 5s; a ranged one (`[7, 10]`) at 10s. [x]
- An exercise with a hold but no prescribed rest (the wall press) auto-stops and offers its result with no countdown, exactly as a manual stop does. [x]
- Auto-stop must fire once per hold, not on every render tick while the threshold is exceeded. [x]
- The build stamp must not be a random value regenerated on every page load, or it would report an update that did not happen. [x]

#### Non-goals & do-not-touch
- MUST NOT add cloud sync, an account, or any backend (standing non-goal). Persistent storage is a request to the browser, not a durability guarantee — D5's manual export stays the real backup.
- MUST NOT add an update-available prompt, a forced reload, or version-check polling. `autoUpdate` already handles the update; this task only makes it *visible*.
- MUST NOT use the Notification API for the audio cue (D2a).
- MUST NOT change how a manually stopped hold is measured (AC6).

#### Verify
`npm run test -- timer && npm run test -- persistence && npm run build && npm run lint`, plus an in-browser pass. **AC5, AC7 and AC9 are device-pass items** — audibility cannot be confirmed off the phone, and the ringer-switch behaviour is the specific thing being fixed.

#### Amendments

**2026-07-24 — T13 built. Build + lint clean, 169 tests green (9 new timer cases, 8 new persistence cases). AC1–AC6 and AC8 verified in-browser; AC7 and AC9 carried to the device pass, see above.** Files: `src/lib/persistence.ts` (+ `persistence.test.ts`); modified `src/lib/beep.ts`, `src/lib/timer.ts` (+ tests), `src/components/SessionTimer.tsx`, `src/screens/Settings.tsx`, `src/App.tsx`, `vite.config.ts`, `src/vite-env.d.ts`. The temporary T0 `PersistenceHeartbeat` is deleted along with its `sendboard-spike` database. No new dependencies, no schema change.

**Bug found in verification, and it would have quietly corrupted the T12 charts.** The first auto-stop implementation ended the hold at whatever the clock read when the render tick noticed the threshold. In the preview browser — a hidden tab, so `setInterval` is throttled to roughly 1Hz — a 5s hold recorded **5.9s**. The same throttling applies to a backgrounded or busy phone. Since `holdSec` is now a charted measurement, that jitter would have shown up as noise in the trend, and worse, as *improvement*: a laggier tick reads as a longer hang. `autoStopHold()` therefore records exactly `hold.max`, and starts the rest from when the hold *should* have ended rather than from detection, so a late tick cannot silently shorten a prescribed 3 minutes either. A **manual** stop still records real elapsed time (AC6) — there the number belongs to the owner, not to the prescription.

**Root cause of the reported data loss, which was not eviction.** The owner reported deleting and reinstalling the app to pick up each deploy, destroying the log every time. `registerType: 'autoUpdate'` already sets `skipWaiting` and `clientsClaim`, so a relaunch installs a new build unaided; what was missing was any way to *tell*. Settings rendered `v{__APP_VERSION__}` from a `package.json` version that has never moved off `0.1.0`, so an updated app and a stale one were indistinguishable and reinstalling was the only workflow that felt reliable. The build stamp is therefore a data-durability fix, and the copy beside it says so directly.

Design calls:
- **The ringer switch is the prime suspect for the silent beep.** On iOS, Web Audio is muted by the hardware silent switch unless the page declares `navigator.audioSession.type = 'playback'` (Safari 16.4+). A phone on a climbing-wall floor is a phone on silent. Gain was also raised and the tones lengthened, but the audio session is the actual fix.
- **Two distinct cues.** Hold-end is one long low tone (520Hz, 0.45s); rest-end is three short high ones (880/880/1170). The owner is hanging with their eyes shut, and "stop pulling" must not sound like "start pulling."
- **Persistence is requested on every launch, not once.** A denial is not permanent — browsers weigh installed-ness and engagement — so asking again next launch costs nothing and may succeed later. The result is reported in Settings, and every status string tells the owner to keep exporting, because `persist()` is a request, not a guarantee (D5 is unchanged).
- **`__BUILD_TIME__` is evaluated at build time, not page load.** A per-load timestamp would report an update on every launch, which is worse than reporting none.
- **The T0 heartbeat probe is deleted rather than kept.** It could never answer its own question under the owner's workflow — deleting the app deleted the probe with it — and the browser's own `storage.persisted()` answers the real question directly.

---

### [T14] Outcome: The owner can record why a hold ended in one tap, and the chart no longer reads a pain-stopped set as a strength result.
Spec: this file | Status: [x] | Depends on: T12 | Wave 0

#### Context manifest
Create: `src/lib/setReason.ts` (+ `setReason.test.ts`) | Modify: `src/types.ts`, `src/lib/timer.ts` (+ `timer.test.ts`), `src/lib/lastTime.ts` (+ `lastTime.test.ts`), `src/lib/progress.ts` (+ `progress.test.ts`), `src/components/SetLogger.tsx`, `src/components/ProgressChart.tsx`, `src/screens/ActiveSession.tsx` | Conform to: D19, D21, D23, D27 | Delete: nothing

**Why this is first.** It is one optional field, and it is the only change in the backlog that makes *already-charted* data mean something. T12 charts `holdSec` for the two max hangs and the weighted lock-off. A 6s hang that ended because the fingers opened and a 6s hang that ended because something hurt plot at the identical height, and §7 asks the owner to read that chart for an injury trend. Recording the difference costs one tap; recovering it later costs the whole block, because nobody remembers in week 8 why a set in week 2 was short.

**The auto-stop write is free information, not a guess.** T13 made the timer end a hold at its prescribed maximum. When it does, the reason the set ended is known with certainty by the app itself — it hit the target — so that set is logged with `endReason: 'target'` and no tap. A *manual* stop is the ambiguous case (dropped? pain? form?), and there the app records nothing and puts the four chips on the row it just created. This mirrors T13 AC6's split exactly: the auto path records the prescription, the manual path defers to the owner.

#### Acceptance criteria
1. WHEN a set exists on an exercise that declares `holdSeconds` THE app SHALL offer four one-tap end reasons — hit target, dropped, form broke, pain — and record the choice on that set. [x]
2. WHEN a hold ends by reaching its prescribed maximum THE logged set SHALL carry `target` without a tap. [x]
3. WHEN a hold is stopped manually THE logged set SHALL carry no reason, and its chips SHALL be presented open so recording one is a single tap. [x]
4. WHEN an exercise declares no `holdSeconds` THE set logger SHALL be visually unchanged from T12 — no chips, no extra row, no shifted columns. [x]
5. WHEN a new set is seeded from a previous one THE end reason SHALL NOT be carried forward (D19). [x]
6. WHEN a progress chart is drawn THE points whose best set ended for pain or a form breakdown SHALL be marked distinctly from the rest, with a caption naming what the mark means. [x]
7. WHEN a set is summarized (the last-time line, history detail) THE reason SHALL appear only if it is `pain` or `form-broke`; `target` and `dropped` SHALL be omitted, because `holdSec` against the prescribed range already says which of those happened. [x]
8. WHEN a pre-T14 set or an imported backup is read THE absent reason SHALL read as not-recorded, with no migration, no `DB_VERSION` bump, and no `BACKUP_SCHEMA_VERSION` bump. [x]

#### Edge cases
- An exercise with a hold but nothing numeric to log (the PIMA pulls, the wall press) → chips still offered; the reason is the *only* thing worth recording there, which is much of the point. [x]
- Correcting a reason: tapping a recorded reason reopens the chips; tapping the already-active chip clears it back to not-recorded. A wrong tap must cost one tap, never a deleted set. [x]
- Five sets × four chips is twenty controls on one card — at most one set's chips are open at a time. [x]
- Chips open by rule, not by stored UI state: the last set, when its reason is unrecorded. So the row created by "Log 7.4s" is already open, and older rows stay collapsed. [x]
- A `pain` reason must not change the best-set selection in `progress.sessionValue`. It was still a real measurement, and silently dropping it would hide precisely the trend §7 asks the owner to watch. [x]
- The reason must round-trip through export → import unchanged (it is inside `SetEntry`, which `backup.ts` passes through whole). [x] — by construction: `backup.ts` passes `logs` through as whole objects and validates only the file envelope, so a new optional field on `SetEntry` needs no export or import change.

#### Non-goals & do-not-touch
- MUST NOT show chips on rep-based exercises (AC4).
- MUST NOT react to `pain` with an alert, a modal, a hidden exercise, a blocked timer, or a changed prescription (D23, D27). The surface that cites §7/§8 when a plan-named condition fires is **T17's**, and it is deliberately not in this task.
- MUST NOT bump `DB_VERSION` or `BACKUP_SCHEMA_VERSION` — the field is optional (AC8).
- MUST NOT carry the reason forward, and MUST NOT infer one from `holdSec` versus the target range. A hold that fell 1s short of the range was not necessarily "dropped," and guessing would fabricate the safety signal §7 depends on.
- MUST NOT persist which chip row is open (D18's reasoning: ephemeral UI state is not data).

#### Verify
`npm run test && npm run build && npm run lint`, plus an in-browser pass: a manual stop leaves the chips open on the new row; an auto-stop lands on `target` with no tap; a rep-based exercise's logger is pixel-unchanged; a pain-marked session renders a distinct point on the chart.

#### Amendments

**2026-07-24 — T14 built. Build + lint clean, 194 tests green (25 new: 10 in `setReason`, 4 timer, 7 lastTime, 4 progress). All eight ACs verified in-browser against a real session.** Files: `src/lib/setReason.ts` (+ `setReason.test.ts`); modified `src/types.ts`, `src/lib/timer.ts`, `src/lib/lastTime.ts`, `src/lib/progress.ts` (+ their tests), `src/components/SetLogger.tsx`, `src/components/ProgressChart.tsx`, `src/screens/ActiveSession.tsx`. No new dependencies, no schema change, no migration.

Verified on the running app, not just in tests: the warm-up progression (no `holdSeconds`) shows no reason UI and keeps its `load / reps / RPE` inputs (AC4); a PIMA hold auto-stopped at exactly 5.0s and logged `reps: "5.0s"` with `endReason: "target"` and no tap (AC2); a max hang auto-stopped at 10.0s logged `holdSec: 10` the same way; a hand-stopped 1.4s hold logged with no reason and its four chips already open (AC3); re-tapping a recorded reason reopened it and re-tapping the active chip cleared it back to "Why did it end?"; and IndexedDB showed `endReason` present only on the sets that have one. With two sessions on the chart, the pain-marked point rendered as an `r=6` red ring around its dot, captioned "Ringed point — set ended on pain or form", with the same fact appended to the SVG's `aria-label` (AC6).

Design calls:
- **`TimerState` gained `heldAuto`, which is what makes AC2 free rather than a guess.** T13 already split auto-stop from manual stop for *duration* (the auto path records `hold.max`, the manual path records real elapsed time). The reason splits on the same line, so the timer carries one extra ephemeral boolean and the logging path reads it. Nothing is persisted (D18 unchanged).
- **Which exercises are asked is derived from `holdSeconds`, not from a new catalog field.** The existing timing declaration already separates holds from rep work, which is exactly the line the question needs. Ten catalog entries gain the chips with no catalog edit at all.
- **The open row is computed, not stored.** "The last set, while its reason is unrecorded" makes the row that `Log 7.4s` and `+ Add set` just created the open one, with no extra state to keep in sync and no stale-open row after a delete. A hand-opened row overrides it, so at most one row is ever open.
- **Only `pain` and `form-broke` appear in summaries.** `target` and `dropped` are already legible from `holdSec` against the prescribed range, and printing them would push the numbers off a card built for a mid-session glance. `summaryReason` owns that rule so the last-time line and history detail can't disagree.
- **A flagged point is annotated, never moved or excluded.** `sessionValue` still picks the best set even when that set ended on pain — dropping the low points would erase the only thing that makes a declining line visible, which is the one job §7 gives this chart. The chart marks it and says what the mark means; the interpretation stays the owner's (D23).
- **`isSafetySignal` accepts `null` and `undefined`.** The codebase spells "not recorded" two ways on purpose — optional fields on stored data so pre-T14 sets need no migration, explicit `null` on derived values like the `edgeMm` beside it. Reading both is the classifier's job rather than every caller's.

---

### [T15] Outcome: The owner can record bodyweight in one field, and read added load as a percentage of it — the denominator §4E says the number is meaningless without.
Spec: this file | Status: [x] | Depends on: T12 | Wave 0

#### Context manifest
Create: `src/lib/bodyweight.ts` (+ `bodyweight.test.ts`), `src/components/BodyweightCard.tsx` | Modify: `src/types.ts`, `src/lib/storage.ts` (+ `storage.test.ts`), `src/lib/backup.ts` (+ `backup.test.ts`), `src/lib/progress.ts` (+ `progress.test.ts`), `src/components/ProgressChart.tsx`, `src/components/ExerciseProgress.tsx`, `src/screens/Home.tsx`, `src/screens/Settings.tsx` | Conform to: D5, D10, D23, D24 | Delete: nothing

**Why this is Wave 0.** §4E's retest table records "edge size (mm), added weight, **bodyweight**" as one row, because added load without bodyweight is half a measurement: `+35lb` at 175 and at 182 are different performances, and the block's headline claim ("a 10–20% improvement in max hang load is a good block") is computed against a denominator the app currently does not have. T16's baseline needs it, and a bodyweight not recorded in week 1 cannot be recovered in week 8.

**This task owns the first schema bump since T7, and the compatibility rule that comes with it.** A second dated collection means a new object store (`DB_VERSION` 1 → 2) and a new array in the export file (`BACKUP_SCHEMA_VERSION` 1 → 2). `parseBackup` currently refuses any version that is not exactly current, which would strand every backup the owner has already exported — an unacceptable outcome for the one durability mechanism D5 makes a v1 requirement. See D28.

#### Acceptance criteria
1. WHEN the owner enters a bodyweight THE app SHALL store it against a local calendar day (D10) in pounds, with at most one value per day, and a second entry the same day SHALL replace the first rather than accumulate. [x]
2. WHEN home is opened THE app SHALL show the most recent bodyweight and how long ago it was recorded, or an invitation to record one if there is none — and SHALL NOT prompt, nag, chase a schedule, or show a target (D23, D24). [x]
3. WHEN an exercise declares `addedLb` and at least one bodyweight exists THE progress view SHALL offer added load as a percentage of bodyweight alongside pounds. [x]
4. WHEN a session's added load is converted to a percentage THE bodyweight used SHALL be the most recent recorded on or before that session's local day and within 14 days of it. [x]
5. WHEN no bodyweight is in range for a session THE point SHALL be omitted from the percentage view, never interpolated, extrapolated, or carried forward indefinitely — and the view SHALL say plainly when it is showing fewer points than the pounds view. [x]
6. WHEN a backup is exported THE file SHALL include every bodyweight entry, and importing it SHALL restore them atomically with the logs, checks, and settings. [x]
7. WHEN a `schemaVersion: 1` backup (written before this task) is imported THE import SHALL succeed, reading it as having no bodyweight entries — an older file is missing data, not malformed. [x]
8. WHEN a database created by T14 or earlier is opened THE new store SHALL be created by an upgrade path, with existing logs, checks, and settings intact. [x]
9. WHEN Settings is opened THE owner SHALL be able to see and correct recorded bodyweights, since a typo in a denominator silently distorts every percentage computed from it. [x]

#### Edge cases
- A non-numeric, zero, or negative entry is refused; the field is the denominator of a division. [x] — plus an upper bound, which catches the fat-fingered `1755` for `175.5`.
- Bodyweight recorded *after* a session (the common case — you weigh yourself Sunday, the session was Friday) does not apply to it. AC4 is deliberately backwards-looking only: applying a later weight would let a future measurement change a past record. [x]
- The 14-day window is measured in whole local calendar days (`rotation.daysBetween`), so a DST transition cannot make a 14-day gap read as 13.96. [x]
- Percentage series are still cut at every edge change (D22) — the edge is the condition regardless of the unit on the y-axis. [x]
- A percentage view with no points at all renders the same "nothing logged yet" copy the pounds view does, not an empty chart frame. [x] — with distinct wording: the load is recorded, the denominator is not, and naming which is missing is the difference between an actionable message and a dead end.
- Entering a bodyweight must not create, modify, or complete a session. It is a fact about the owner, not about a workout. [x]
- Two `edgeMm` segments whose points all fall outside the window collapse the percentage view to fewer segments than the pounds view; that is correct and must not throw. [x]
- A correction typed in Settings that parses to nothing leaves the stored value alone rather than deleting the denominator. [x]

#### Non-goals & do-not-touch
- MUST NOT add a weight goal, a target, a trend line on bodyweight itself, or any comment on the number (D23). The app stores a denominator; it has no opinion about it.
- MUST NOT prompt, remind, or schedule a weigh-in (D2a, D24).
- MUST NOT chart bodyweight as its own series. It is a condition, like edge size (D22) — the reason it exists here is to make `addedLb` interpretable.
- MUST NOT convert to kilograms anywhere. Canonical unit is pounds (D21); the plan's kg notation stays in its prose.
- MUST NOT infer bodyweight from anything, including a previous block's value.
- MUST NOT let a `schemaVersion: 2` file import into an older build silently — the version gate still refuses anything it does not recognise (AC7 relaxes it downward only).

#### Verify
`npm run test && npm run build && npm run lint`, plus an in-browser pass: record a bodyweight and see it on home; log added load across two sessions and switch pounds ↔ %BW; import a hand-written v1 backup and confirm it succeeds with no bodyweight; confirm an existing database upgrades with its logs intact.

#### Amendments

**2026-07-25 — T15 built. Build + lint clean, 235 tests green (42 new: 20 in `bodyweight`, 11 backup, 6 storage, 10 progress, less overlap).** Files: `src/lib/bodyweight.ts` (+ `bodyweight.test.ts`), `src/components/BodyweightCard.tsx`; modified `src/types.ts`, `src/lib/storage.ts`, `src/lib/backup.ts`, `src/lib/progress.ts`, `src/lib/rotation.ts` (+ their tests), `src/components/ProgressChart.tsx`, `src/components/ExerciseProgress.tsx`, `src/screens/Home.tsx`, `src/screens/Settings.tsx`. `DB_VERSION` 1 → 2, `BACKUP_SCHEMA_VERSION` 1 → 2, D28 added. No new dependencies.

Verified on the running app: recording `176.4` on home leaves the card reading "176.4 lb · today" with an Update control and no prompt of any kind (AC1, AC2); with a bodyweight of 180 recorded on 07-10, sessions on 07-12 (+30lb) and 07-20 (+35lb) chart as `+16.7%` and `+19.4%` while a 06-01 session — outside the window — is dropped from the percentage view and announced as "1 session hidden — no bodyweight recorded within 14 days" (AC3, AC4, AC5); the pounds view still shows all three; the `%BW` toggle appears only once a reading exists; Settings lists both readings newest-first, a correction to `181` persists, and a nonsense edit leaves `181` alone (AC9). AC6–AC8 are covered by unit tests, including a **real v1 database** built store-by-store with a session, a check and settings in it, then opened through the storage module and asserted intact with the new store added empty.

**Bug found in verification, and it was the one rotation.ts already documents.** `bodyweightFor` resolved a session's day with `storage.dateKey`, which string-slices the first ten characters — the *UTC* day — while an entry's `date` is a local day key. West of UTC (where the owner is) an 18:00 session is already tomorrow in UTC, so **a weigh-in taken the next morning would have attached to the previous evening's session**: a later measurement silently rewriting an earlier record, which is exactly what AC4's backwards-only rule exists to prevent. The fix was to stop reimplementing the conversion: `rotation.localDayKey` is now exported and shared, since it is the single place that subtlety is written down. Two regression tests pin it.

Design calls:
- **The store is keyed by the date, not by a uuid.** "At most one reading per day" (D24) then costs nothing: `put` is an upsert, correcting today's number is the same operation as recording it, and there is no dedupe path for the UI to forget to call.
- **`addedPctBw` is a `SeriesKind`, deliberately not a `ProgressMetric`.** `ProgressMetric` indexes `SetEntry`, so adding a percentage to it would invite reading a field that is never stored. The split keeps the reading path incapable of reading anything but real measurements, and `SERIES_CONFIG` extends `METRIC_CONFIG` for the things a chart can *plot*.
- **The chart counts what it dropped and says so.** A percentage view quietly missing three of eight sessions reads as a complete record of a shorter block. `droppedForNoBodyweight` travels on the series so the caption can name the number, and the remedy is the owner's.
- **The best-set rule needed no special case.** One session has one applicable bodyweight, so the conversion is monotonic within it and the heaviest set is still the best one.
- **14 days is a judgment, written down as one.** Generous enough for opportunistic weigh-ins, short enough that a two-month-old figure is never silently divided by.
- **Import clears the bodyweight store even when the incoming file has none.** Otherwise restoring a pre-T15 backup would leave an orphaned reading behind for the restored logs to be divided by — a wrong denominator that looks right, which is the failure this whole task exists to prevent.

---

### [T16] Outcome: The owner can run §4E's baseline battery before week 1 and the identical battery again at the end, and read the two side by side with the conditions they were produced under.
Spec: this file | Status: [x] | Depends on: T15 | Wave 0

#### Context manifest
Create: `src/lib/retest.ts` (+ `retest.test.ts`), `src/screens/Retest.tsx`, `src/components/RetestComparison.tsx` | Modify: `src/types.ts`, `src/data/exercises.ts`, `src/data/routines.ts`, `src/lib/rotation.ts` (+ `rotation.test.ts`), `src/lib/timer.ts` (+ `timer.test.ts`), `src/lib/routes.ts`, `src/screens/ActiveSession.tsx`, `src/screens/Home.tsx`, `src/screens/RoutineList.tsx`, `src/screens/Settings.tsx`, `src/App.tsx` | Conform to: D20, D21, D22, D23, D24, D27, D29, D30 | Delete: nothing

**Why this is the last Wave 0 task, and why it is the most time-critical thing in the backlog.** §4E's baseline is a single unrepeatable event: "once in week 1 (fully rested, after a thorough warm-up)… **identical conditions both times** — same edge, same grip, same time of day, same warm-up — or the comparison is meaningless." Every other item in v1.8 improves sessions that have not happened yet and can land in week 2 at no cost. This one cannot: a block started without a baseline has no week-8 comparison at all, and §4E's interpretation rubric — 10–20% is a good block, flat with better climbing means technical gains, declining means deload — is the plan's only instrument for answering whether eight weeks of max-effort finger loading worked. T15 shipped the denominator; this is the numerator, and the owner has not started the block.

**The task is mostly assembly, and that is the point.** Four of the five things §4E says to record are already typed fields the set logger already writes (D29). What T16 adds is a battery that puts them in one place, five test-only catalog entries so the test never contaminates the trained series, one setting (D30), one timer shape the app does not have yet (an open hold, below), and a comparison view that reports two numbers and quotes the plan instead of grading them (D23).

**The one genuinely new mechanism: an open hold.** §4E's lock-off test is "longest static hold at bodyweight, one attempt per side" — the duration *is* the measurement, so there is no prescribed maximum to auto-stop at (T13) and no `target` end reason to write. `holdSeconds` therefore gains an `'open'` form alongside `[min, max]`. A union member on the existing field rather than a new one is deliberate: `reasonApplies` already gates the D27 chips on `holdSeconds !== undefined` and keeps working unchanged, which matters because "why did it end" is *more* informative on a max-duration hold than anywhere else in the app — a lock-off that ended on pain and one that ended at failure are the same number and opposite training facts.

#### Catalog additions — five test-only entries, all content from §4E

| id | category | isoType | equipment | holdSeconds | metrics |
|---|---|---|---|---|---|
| `test-max-hang-half-crimp` | fingers | yielding | hangboard, dip-belt | `[7, 7]` | `addedLb`, `edgeMm` |
| `test-max-hang-open-hand` | fingers | yielding | hangboard, dip-belt | `[7, 7]` | `addedLb`, `edgeMm` |
| `test-max-pullup-load` | pulling | dynamic | pullup-bar, dip-belt, kettlebell | — | `addedLb` |
| `test-lockoff-90-left` | pulling | yielding | pullup-bar | `'open'` | `holdSec` |
| `test-lockoff-90-right` | pulling | yielding | pullup-bar | `'open'` | `holdSec` |

All five `gtgEligible: false` — §8 forbids GtG on max protocols, and these are the maximum of the maximums. Left and right are two entries rather than one entry with two sets because a session's series takes its *best* set (`progress.sessionValue`), and a best-of-both-arms number is not a per-side record; two entries make the arms as unmixable as two exercises are, at the cost of two catalog rows and no new type surface. Catalog count 20 → 25; T3 AC1's count moves with it when this ships.

**Seed routine** `baseline-retest` — "§4E — Baseline / Retest", `dayOfWeek: null`, `inRotation: false`, exercises in §4E's table order with the warm-up first: `finger-warmup-progression`, `test-max-hang-half-crimp`, `test-max-hang-open-hand`, `test-max-pullup-load`, `test-lockoff-90-left`, `test-lockoff-90-right`.

#### Acceptance criteria
1. WHEN the owner starts the battery THE app SHALL create an ordinary `WorkoutLog` against the `baseline-retest` routine, obeying the existing at-most-one-in-progress invariant, and the session SHALL log through the same set logger, timer, and end-reason chips every other session uses. [x]
2. WHEN the battery is run THE app SHALL show §4E's method text for each test — the working-up protocol, the 7s hold, "stop at the first failed attempt", one attempt per side — cited to §4E, not paraphrased into a new prescription. [x]
3. WHEN a completed battery exists THE app SHALL label the earliest one **Baseline** and each later one **Retest**, derived from completion order, and SHALL NOT name a week number (block position is T24's) or describe any retest as due, overdue, missed, or behind (D2a, D23). [x]
4. WHEN a standard edge is set THE two max-hang tests SHALL prefill `edgeMm` from it, and the setting SHALL be editable in Settings and offered at the baseline if it is unset (D30). [x]
5. WHEN both a baseline and a later battery are completed THE comparison view SHALL show, per test, the baseline value, the latest value, and their arithmetic difference — in pounds, seconds, and (where a bodyweight is in range) as a share of bodyweight (T15). [x]
6. WHEN the comparison is shown THE app SHALL quote §4E's interpretation lines verbatim with the `§` reference and SHALL NOT select which line applies, label the block, or render any verdict, badge, or arrow (D23). [x]
7. WHEN the two batteries were recorded on different standard edges THE app SHALL show both edges and SHALL NOT compute a difference for the edge-dependent tests (D22). [x]
8. WHEN a battery is displayed THE conditions it was produced under SHALL be shown for both occasions — time of day, whether the warm-up was marked completed, days since the previous completed session, and the edge — all derived from stored data, with nothing extra asked of the owner (D29). [x]
9. WHEN a lock-off test is timed THE hold SHALL run open — no target, no auto-stop, `holdSec` from the real elapsed time on manual stop — and the D27 chips SHALL still be offered, with `target` never written. [x]
10. WHEN the rotation is computed THE battery routine SHALL be excluded, and completing it SHALL NOT change which training routine is next up (D15). [x]
11. WHEN a test measurement is charted THE series SHALL contain only battery sessions, and the trained `max-hang-*` and `weighted-lockoff-hold` series SHALL be unchanged by any battery (D29a). [x]
12. WHEN a pre-T16 database or backup is read THE app SHALL show the battery as not recorded, with no migration, no `DB_VERSION` bump, and no `BACKUP_SCHEMA_VERSION` bump. [x]

#### Edge cases
- A battery abandoned part-way is not a baseline — it has `completedAt: null`, so rotation, comparison, and labelling all ignore it, and Home's existing resume banner is what surfaces it. [x]
- A partly-completed battery (three of five tests) compares per test: a test with no measurement on one side reads "not recorded" on that row, and no aggregate, average, or completion percentage is computed across rows (D23). [x]
- Two batteries completed on the same day → order by `completedAt`; the earliest completed one is the baseline, permanently, even if a later one is more thorough. [x]
- Deleting the baseline log promotes the next-earliest battery to Baseline. It is a report over the logs, not a stored flag. [x]
- No bodyweight within 14 days of a battery → the %BW column is omitted for that occasion and the pounds column still renders, with the reason named (T15 AC5's rule, not a new one). [x]
- The standard edge is unset when the baseline runs → the edge is typed per test as it is today, and whatever was recorded becomes what the retest is prefilled with and compared against. [x]
- An open hold backgrounded mid-attempt behaves like any other hold (D18's absolute timestamp); it simply never auto-stops. [x]
- `formatHoldTarget` and the hold progress band have no maximum to draw against on an open hold → render an elapsed count with no band rather than a bar that fills to an invented target. [x]
- A third, fourth, or fifth battery is legitimate (§4F's lighter weeks make a mid-block check plausible) → the comparison always reads baseline against the **latest**, and every occasion stays listed. [x]
- The five test entries appear in the T3 catalog browser like any other exercise, and must not be added to the Day 1 or Day 3 routines. [x]

#### Non-goals & do-not-touch
- MUST NOT add a `Retest` record type, a new object store, or a new backup array — the battery is a `WorkoutLog` (D29).
- MUST NOT bump `DB_VERSION` or `BACKUP_SCHEMA_VERSION`. The only new stored field is optional (`Settings.standardEdgeMm`), and `settings` already passes through the backup whole.
- MUST NOT schedule, remind, prompt, or nag about a retest, and MUST NOT compute how many weeks remain until one is due (D2a, D23, and T24 owns block position).
- MUST NOT grade the result. §4E's rubric is quoted and the owner applies it; the app never says "good block", never colours a delta green or red, and never draws an arrow (D23).
- MUST NOT log a test measurement against a trained exercise id, or a trained set against a test id.
- MUST NOT auto-stop, cap, or warn on an open hold.
- MUST NOT add the test entries to any training routine, mark them `gtgEligible`, or put the battery into rotation.
- MUST NOT ask the owner to certify conditions the app can derive (D29b).

#### Verify
`npm run test && npm run build && npm run lint`, plus an in-browser pass: set a standard edge and confirm both max-hang tests prefill it; run a full battery and confirm it logs like any other session and does not change which training routine is next up; time a lock-off with the open hold and confirm it runs past any prescribed duration, stops only by hand, and still offers the end-reason chips with no `target`; run a second battery and confirm the comparison shows baseline, latest, and the difference with §4E quoted and no verdict; change the standard edge between the two and confirm the edge-dependent deltas are withheld with both edges named.

#### Amendments

**2026-07-25 — T16 built. Build + lint clean, 276 tests green (41 new: 24 in `retest`, 6 timer, 4 rotation, 4 lastTime, 3 setReason). All twelve ACs verified in a running browser against a seeded v2 database.** Files: `src/lib/retest.ts` (+ `retest.test.ts`), `src/screens/Retest.tsx`, `src/components/RetestComparison.tsx`; modified `src/types.ts`, `src/data/exercises.ts` (20 → 25), `src/data/routines.ts` (2 → 3), `src/lib/timer.ts`, `src/lib/rotation.ts`, `src/lib/lastTime.ts`, `src/lib/setReason.ts`, `src/lib/progress.ts`, `src/lib/routes.ts` (+ their tests), `src/components/SessionTimer.tsx`, `src/components/SetLogger.tsx`, `src/screens/ActiveSession.tsx`, `src/screens/Home.tsx`, `src/screens/RoutineList.tsx`, `src/screens/Settings.tsx`, `src/App.tsx`. **No new dependencies, no new object store, no migration, and `DB_VERSION`/`BACKUP_SCHEMA_VERSION` both still 2** — as the spec predicted, correcting v1.8's expectation of a retest record and a version bump.

Verified on the running app, not only in tests: a standard edge of 20mm typed in Settings persisted into `Settings.standardEdgeMm` with the database still at version 2, and the first-ever set on the half-crimp test opened with `edgeMm: 20` already filled and no edge typed (AC4); the battery session listed the warm-up plus five tests, the hang tests offering `▶ Start hold · 7s` and the lock-offs `▶ Start hold · max` (AC1, AC2); a left-side lock-off ran to 20.3s without auto-stopping — past every other prescribed duration in the catalog — showed "target max" with no progress bar and the word "holding" rather than "in range", ended only on the Stop tap, and logged `holdSec: 20.4` with **no** `endReason` at all (AC9); with a second battery in place the comparison rendered `+30lb → +35lb · +5lb / +2.5%BW` for the half-crimp, `20.4s → 24.1s · +3.7s` for the lock-off, and §4E's three interpretation lines quoted underneath with nothing selecting between them (AC5, AC6); re-recording the retest on an 18mm edge replaced both hang deltas with "edge changed", kept both recorded values visible, left the pull-up and lock-off deltas alone, and named both edges in the §4E citation (AC7); each occasion card showed its derived conditions — `✓ warm-up completed · 5d since last session · 20mm edge · 180 lb` — with nothing typed twice (AC8); after two completed batteries Home still read "Up next: Day 3", the week line still listed only the two training routines, and the routine list still offered two (AC10); and the trained Max Hang — Half-Crimp chart still read "No time logged yet" while the test entry's own chart showed its two points (AC11).

Design calls:
- **`holdSeconds` gained `'open'` rather than a new catalog field.** Every gate that asks "does this exercise have a hold" already reads that one declaration, so `reasonApplies` needed no change at all and `holdSpecOf` needed one line. `HoldSpec.max` becomes `number | null`, and `null` propagates as a refusal everywhere it matters: `shouldAutoStop` returns false, `autoStopHold` returns the state untouched, `holdFraction`/`holdBandStart` return 0 so no bar is drawn, and `formatHoldTarget` says "max".
- **`target` is not offered on an open hold** (`reasonsFor`). Found in verification: the chips rendered all four, and "Hit target" on a test that prescribes no target is a value nobody could interpret later — the same standard D27 sets for the enum itself. The two safety signals are exactly why the chips are still asked there.
- **The comparison is computed from `progress.sessionValue`, which is now exported.** Reusing the best-set rule means the battery cannot disagree with the chart about what a session's number was; writing a second "find the best set" here is how those two drift apart.
- **Conditions are derived and displayed, never asked.** Time of day from `startedAt`, warm-up from D16's `completed`, rest from the previous completed log of *any* routine (a Day 3 two days before compromises a lock-off test exactly as much as another battery would), edge from the sets, bodyweight from T15's ±14-day rule. The battery therefore asks for zero extra taps beyond the measurements themselves.
- **`daysSincePrevious` is null rather than 0 when nothing precedes the baseline.** A first-ever session has no rest interval, and printing "0d since last session" would read as "trained yesterday".
- **`rotates()` filters inside `routineRotation`, not at each call site.** Three screens consume the rotation; a filter each would be three chances to forget. `RoutineList` still resolves names against every routine, so an unfinished battery is named in the resume banner instead of showing its id.
- **A bug caught in the browser, not by a test:** the first pass let `RoutineList` set its whole routine list to the filtered array, which made the resume banner render `baseline-retest` as a raw id whenever a battery was left open. Splitting "all routines, for names" from "startable routines" fixed it.

---

### [T18] Outcome: The owner can enter a set's edge, added load, and effort from the gear that actually exists on their board — with chalked hands, without the keyboard.
Spec: this file | Status: [x] | Depends on: — | Wave 1

#### Context manifest
Create: `src/lib/gear.ts` (+ `gear.test.ts`), `src/components/SetValuePicker.tsx` | Modify: `src/types.ts`, `src/components/SetLogger.tsx`, `src/screens/ActiveSession.tsx`, `src/screens/Settings.tsx` | Conform to: D19, D21, D23, D26, D30, D31, D32 | Delete: nothing

**Why this leads Wave 1 rather than T17.** Owner decision, 2026-07-25 (see the amendment). It is the only Wave 1 task with no dependencies, it is the one every other Wave 1 item sits on top of (T19's chained sets enter values through this logger), and it addresses the PRD's problem #2 in its most literal form: every numeric field in a session currently summons an iOS keyboard, and the hands typing on it are chalked, mid-protocol, and three minutes into a rest interval. Nothing here is unbackfillable — it improves sessions that have not happened yet — so it is ordered by payoff per unit of work, exactly as Wave 1's semantics prescribe.

**The mechanism, stated once: a cell becomes a button, and the panel opens beneath the row.** T14 already established this shape in this component — the end-reason chips render under the set they belong to, at most one row open at a time, with the open row *computed* rather than stored. T18 reuses it rather than inventing a second interaction: tapping a measured cell opens that cell's picker in the same place, and the same "at most one thing open" rule now spans pickers and reason chips together. The row itself does not change size, which is what keeps a five-set max hang readable at 390px (T3 AC5).

**What the keyboard costs, and what replaces it.** Three fields are entered per set on the charted exercises: `edgeMm` (a pick from four rungs), `addedLb` (a step from what was carried forward), and `rpe` (a pick from a ten-point scale). None of them is free text in practice, and all three currently are. The gear that decides the first two is the owner's board and the owner's plates, which is why it is Settings data (D26) — the catalog cannot know it and must not be edited to hold it (D6).

#### Settings additions — two optional fields, no schema movement

```ts
interface Settings {
  installGuideDismissed: boolean;
  standardEdgeMm?: number;   // D30, unchanged
  edgesMm?: number[];        // D26: the rungs that exist on the board, largest first
  loadStepLb?: number;       // D26/D32: the smallest load the owner can actually add
}
```

Both optional, and `settings` already passes through `backup.ts` whole — so `DB_VERSION` and `BACKUP_SCHEMA_VERSION` both stay at 2, exactly as T16's `standardEdgeMm` did.

#### Acceptance criteria
1. WHEN the owner enters their board's edges and their smallest load increment in Settings THE values SHALL be stored on `Settings`, normalised (deduped, sorted largest-first, junk refused rather than stored as `NaN`), and SHALL survive a reload. [x]
2. WHEN an exercise records `edgeMm` and edges are configured THE set's edge cell SHALL open a one-tap picker of those edges instead of focusing a text input, and the standard edge (D30) SHALL be marked in it. [x]
3. WHEN an exercise records `addedLb` and a load step is configured THE set's load cell SHALL open a − / + stepper at that increment, stepping from the value already in the row and never pre-moving it (D32). [x]
4. WHEN a set's RPE is entered THE owner SHALL be able to pick it from the scale in one tap, with a way to clear it back to not-recorded — and this SHALL NOT require any gear to be configured, since a ten-point scale is not equipment. [x]
5. WHEN no gear is configured THE edge and load cells SHALL behave exactly as T12/T14 left them — text inputs, same layout, nothing invented, no empty picker (D31). The RPE scale is not gear and is unaffected (AC4). [x]
6. WHEN a set already holds a value the gear list does not contain THE value SHALL be displayed as stored, SHALL NOT be snapped to the nearest option, and the panel SHALL still offer a way to type a replacement (D31). [x]
7. WHEN a picker is open THE app SHALL have at most one panel open across the whole logger — a second tap elsewhere closes the first — and SHALL NOT persist which one it was (D18's reasoning). [x]
8. WHEN a set row is created by carry-forward, the standard edge, or the timer THE seeded values SHALL be unchanged by this task (D19, D30): the picker changes how a value is *entered*, never what it is seeded to. [x]
9. WHEN gear is exported and re-imported THE fields SHALL round-trip inside `settings`, and a `settings` object written before this task SHALL read as "no gear configured" with no migration and no version bump. [x]
10. WHEN the panel is open on a 390px viewport THE set row SHALL keep its layout and the options SHALL be reachable without horizontal scrolling. [x]

#### Edge cases
- An edge list typed as `20, 18, x, 15,` → the three real numbers are kept and the junk is dropped; a list that parses to nothing leaves the stored value alone rather than clearing the board (`StandardEdge`'s existing rule). [x]
- Duplicates and out-of-order entry (`18, 20, 18`) → stored once each, largest-first, because that is the order the rungs sit in and the direction progression moves (D22: smaller is harder). [x]
- Stepping below zero → clamps at 0, which is bodyweight (`METRIC_CONFIG.addedLb` already formats 0 as `BW`), never negative. [x]
- Stepping from a not-recorded cell → `+` records one step, `−` records 0 (bodyweight). Both are one tap to the two values a first set is actually likely to be, and neither invents a number the owner did not choose. [x]
- Float drift: a 2.5 step from 32.5, or a 0.1 step anywhere, must never land `35.000000000000004` in a stored measurement — every stepped value is rounded to 0.1 like every other measurement in the app. [x]
- A load step larger than the owner's real plates (a fat-fingered `50`) is not refused — it is gear, and refusing it would be the app claiming to know the board better than the owner (D31). Bounds reject only what cannot be a load at all. [x]
- Clearing the edge list in Settings returns those cells to text inputs mid-block with no crash and no orphaned open panel. [x]
- The picker must not appear on cells belonging to exercises that declare no metrics — the seventeen free-text exercises are untouched, exactly as T14 AC4 required for the reason chips. [x]
- A picker open on a row that is then deleted → the panel closes rather than reopening against a shifted index (T14's stale-index rule, extended). [x]
- Gear must not alter `holdSec` entry: it is written by the timer as a measurement (T10/T13), and a stepper on a result would invite editing a recorded performance rather than entering a setup. [x]

#### Non-goals & do-not-touch
- MUST NOT propose, highlight, or pre-apply a next load (D19, D32, and adaptive load calculation is a standing non-goal). No chip is ever marked recommended.
- MUST NOT refuse, clamp, or snap a value because the gear list does not contain it (D31).
- MUST NOT change any `prescription`, hide any exercise, or alter rotation based on gear (D26 configures inputs, not content).
- MUST NOT store a dip-belt flag. D26 named it, and a pass over what it could drive found only forbidden answers — changing a prescription, hiding an exercise — or nothing at all. See the amendment; re-propose if a use appears.
- MUST NOT bump `DB_VERSION` or `BACKUP_SCHEMA_VERSION`; both fields are optional on an object the backup already carries whole (AC9).
- MUST NOT touch bodyweight or standard-edge entry in Settings. Both are entered out of session with clean hands, where a keyboard is the right control.
- MUST NOT persist open-panel state (D18's reasoning: view state is not data).
- MUST NOT add a dependency. The picker is the same buttons-and-flexbox the reason chips already are.

#### Verify
`npm run test && npm run build && npm run lint`, plus an in-browser pass: configure `20, 18, 15, 10` and a `2.5` step; confirm a max-hang set's edge cell opens four chips with 20 marked standard and never raises the keyboard; confirm `+`/`−` move added load by 2.5 from the carried-forward value and clamp at BW; confirm an RPE lands in one tap and clears in one; clear the gear and confirm the same row falls back to the T12 inputs; check that a set recorded on an off-list 17.5mm edge still reads 17.5.

#### Amendments

**2026-07-25 — T18 built. Build + lint clean, 305 tests green (29 new: 28 in `gear`, 1 backup). All ten ACs verified in a running browser against a real Day 1 session.** Files: `src/lib/gear.ts` (+ `gear.test.ts`), `src/components/SetValuePicker.tsx`; modified `src/types.ts`, `src/components/SetLogger.tsx`, `src/screens/ActiveSession.tsx`, `src/screens/Settings.tsx`, `src/lib/backup.test.ts`. **No new dependencies, no new object store, no migration, and `DB_VERSION`/`BACKUP_SCHEMA_VERSION` both still 2** — confirmed by reading the live database after configuring gear, exactly as the spec predicted.

Verified on the running app, not only in tests: `20, 18, x, 15, 10` typed into Settings stored `edgesMm: [20,18,15,10]` — junk dropped, order normalised — alongside `loadStepLb: 2.5`, with the database still at version 2 (AC1, AC9); a max-hang set's edge cell rendered as a button labelled "Set 1 edge: 20. Choose" and opened `20★ 18 15 10` with the standard edge marked in both the chip and its accessible name, while the hold cell stayed the text input the timer writes into (AC2, and the `holdSec` edge case); the load stepper opened reading "not recorded" with the cell untouched, then `+` → 2.5, `+ +` → 7.5, `−` → 5, and three more `−` taps walked 2.5 → 0 → 0 rather than going negative (AC3, D32, the clamp edge case); RPE opened `6 7 8 9 10` and an 8 landed in one tap on an exercise with no gear configured for it (AC4); typing `17.5` into the edge panel stored 17.5 and reopening the picker listed `20★ 18 17.5 15 10` — the off-board rung shown in board order, never snapped (AC6, D31); opening the edge picker closed the load stepper and collapsed the reason chips to "Why did it end?", and re-opening restored them (AC7); `+ Add set` seeded set 2 with `edgeMm 17.5, addedLb 0, rpe null` — carry-forward untouched, RPE still never carried (AC8, D19); clearing all three gear fields and reloading returned the edge and load cells to `INPUT`s with the recorded 17.5 and 8 intact, while RPE stayed a picker (AC5); and with a panel open the document measured `scrollWidth === clientWidth === 390` (AC10).

Design calls:
- **One `panel` state for pickers and reason chips together.** T14 kept an `openIndex` for the chips with a computed default; T18 needs "at most one thing open in this logger", which is one rule, not two that can disagree. `{index, field}` where `field` is a picker or `'reason'` keeps T14's computed default intact (`panel === null` still means "the last set's chips, if unrecorded") while making every other panel explicit. Nothing is persisted (D18).
- **A cell becomes a button, and the button is the same box as the input.** `cellButtonClass` deliberately mirrors `inputClass`: the row must not change size when gear is configured, or the five-row max-hang card stops fitting 390px. The measured verification of that is AC10 rather than a screenshot.
- **`canPick` is a type predicate, not a boolean.** `holdSec` has no picker by design, and a plain boolean let a widened `ProgressMetric` reach `PickerField` — the compiler caught it. Narrowing at the guard means the "the timer owns this value" rule is enforced by the type system rather than by a comment.
- **The picker holds no arithmetic.** Every ± tap calls `gear.stepLoad`, so the clamp and the 0.1 rounding live in the tested module rather than in a button handler — the same split `progress.sessionValue` and `retest` already use to stop two surfaces disagreeing about a number.
- **Deleting a set closes the panel explicitly.** T14's stale-index rule only catches an index that falls off the end; deleting set 1 of 2 leaves index 0 valid and would have pointed an open picker at a *different* set than the one it was opened on. One line in the delete handler, and it was worth the browser check that confirmed it.
- **RPE is offered as 6–10 rather than 1–10.** §4C's max hangs are "very hard by rep 3" and §4B's PIMA runs at 95–100% effort, so the useful range is the top of the scale and a 3 is a mistyped 8 far more often than a real rating. Five chips fit one row at 390px; anything outside the range is still typeable in the same panel (D31), and an already-recorded value is displayed as stored.
- **The load stepper stays open across taps; a pick closes.** Two `+` taps is the common case for a 5lb move on a 2.5lb rack, and closing after each would double the taps. An edge or an RPE is a single decision, so those close on choice — which is also what makes "at most one open" invisible in practice.
- **`GearSettings` follows `StandardEdge`'s refusal rule.** A list that parses to nothing, or a step that parses to nothing, leaves the stored value alone rather than clearing it. Mistyping a board must not delete it, and the field re-renders with what is actually stored so the refusal is visible rather than silent.

---

### [T19] Outcome: The owner always knows which set they are on against what the plan asked for, and finishing a rest offers the next set without scrolling back to the card.
Spec: this file | Status: [x] | Depends on: T18 | Wave 1

#### Context manifest
Create: `src/lib/chain.ts` (+ `chain.test.ts`) | Modify: `src/types.ts`, `src/data/exercises.ts`, `src/components/SessionTimer.tsx`, `src/screens/ActiveSession.tsx` | Conform to: D16, D17, D19, D23 | Delete: nothing

**The gap this closes.** A Day 1 session is 5 sets × (7–10s hang + 3 min rest) per grip, and the set count lives only in `prescription` prose — so mid-session the owner answers "which set am I on?" by counting logged rows on a phone on the floor, and answers "how many left?" by re-reading a sentence. Worse, the timer bar covers the card: when a 3 minute rest ends, the next hold is one scroll and one tap away rather than just one tap, and the thing that ends up skipped is the *rest*, not the scroll.

**No new decision is needed, and that is worth stating.** The set count is a typed catalog field beside the prose for exactly D17's reason (`4–6 sets` and a weeks-1–4 variant of `5 sets` live in one PIMA string, and a regex over that picks a number by luck). The counter reports position and never grades, per D23. Rows still appear only when logged, per D16/D19 — the app does not pre-create five blank sets, because a blank row is a claim that a set exists.

**The counter counts logged sets, never attempts.** That is the rule that keeps it honest: if a hold is stopped and not logged, the position does not advance, and the "Log 7.4s as a set" button that would advance it is already on screen. The alternative — counting holds performed — would let the app believe in a set that no record contains, which is the one thing D16 was added to prevent.

#### Catalog additions — one optional field, populated only where the plan states a count

```ts
interface Exercise {
  // …
  prescribedSets?: [min: number, max: number];   // min === max for a fixed count
}
```

| Exercise | `prescribedSets` | Source |
|---|---|---|
| `pima-finger-pull-half-crimp`, `pima-finger-pull-open-hand` | `[4, 6]` | §4B "4–6 sets" (the weeks 1–4 variant's 5 sets falls inside it) |
| `max-hang-half-crimp`, `max-hang-open-hand` | `[5, 5]` | §4C "Sets: 5" |
| `oi-bar-pull-extended`, `oi-bar-pull-90`, `oi-bar-pull-top` | `[3, 3]` | §5A "3 sets" |
| `weighted-lockoff-hold` | `[3, 3]` | §5B "3 holds" |
| `kb-single-arm-row`, `kb-goblet-squat`, `pushups-or-dips`, `oi-wall-press` | `[3, 3]` | §5C, §5D |
| `external-rotations`, `wrist-extensor-work` | `[2, 2]` | §5D |
| `test-max-hang-half-crimp`, `test-max-hang-open-hand` | `[3, 5]` | §4E "work up in 3–5 sets" |
| `test-lockoff-90-left`, `test-lockoff-90-right` | `[1, 1]` | §4E "one attempt per side" |

Left absent, deliberately: the warm-up progression and Abrahangs (a duration, not a set count), `bodyweight-pullups` and the GtG doses (§8 is a daily habit, not a session — D11), `kb-turkish-getup` ("2–3 per side" is reps), `test-max-pullup-load` (§4E's "heaviest single" is worked up to, with no prescribed number of attempts), and both climbing entries (never logged as sessions — D9). An absent field means the app shows no position, exactly as an absent `holdSeconds` means no timer.

#### Acceptance criteria
1. WHEN an exercise declares `prescribedSets` THE session SHALL show which set is next against that count, derived from the number of sets already logged for it in this session. [x]
2. WHEN a hold is started on such an exercise THE timer bar SHALL name the set being performed alongside the exercise, so the position is readable without leaving the timer. [x]
3. WHEN a rest is running or complete THE timer bar SHALL name the set that comes next, and the number SHALL advance only when a set is actually logged (never on a hold that was performed and not recorded). [x]
4. WHEN a rest completes on an exercise that declares a hold THE timer bar SHALL offer starting the next set in one tap, and that tap SHALL start the hold exactly as the card's control does. [x]
5. WHEN the app offers the next set THE hold SHALL NOT start by itself — no auto-start, no countdown into a hang — because the owner has to be on the board before the clock runs. [x]
6. WHEN the logged count reaches or passes the prescribed count THE app SHALL keep offering further sets, SHALL report the position plainly (both numbers), and SHALL NOT block, congratulate, mark the exercise complete, or show an adherence figure (D16, D23). [x]
7. WHEN an exercise declares no `prescribedSets` THE session SHALL look exactly as T18 left it — no position, no invented count. [x]
8. WHEN a set is deleted THE position SHALL move back with it, because it is a report over the logged sets and not a counter the app keeps. [x]
9. WHEN the catalog gains the field THE change SHALL require no migration, no `DB_VERSION` bump, and no `BACKUP_SCHEMA_VERSION` bump — the field is on the code-seeded catalog, which is not stored (T2's design call). [x]

#### Edge cases
- A range (`4–6`) reads as a range, not as a single target: "set 3 of 4–6". Rounding it to one number would invent a prescription the plan deliberately left open. [x]
- Beyond the prescribed count → "set 6 (5 prescribed)", which reports both facts and passes judgment on neither. §4F's "lighter week regardless of the schedule" makes *fewer* sets correct as often as more, so neither direction is an error to flag. [x]
- A set logged by `+ Add set` counts identically to one logged from the timer — the position is over the record, not over the timer's history. [x]
- An exercise with a hold but no rest (the wall press) still shows its position on the hold control; there is simply no rest view to carry it. [x]
- The §4E lock-off tests declare `[1, 1]`: the second attempt on a side reads "set 2 (1 prescribed)" rather than being refused, because §4E's "one attempt" is the protocol, not a lock the app enforces. [x]
- Deleting the set that a running rest belongs to leaves the rest running and the position recomputed — the clock is measuring a real interval either way (D18). [x]
- A hold performed and dismissed without logging leaves the position where it was, and the next hold reads the same set number. That is correct: no record, no set. [x]

#### Non-goals & do-not-touch
- MUST NOT auto-start a hold, ever (AC5).
- MUST NOT pre-create empty set rows to "fill in" (D16, D19 — a row is a claim that a set happened).
- MUST NOT block, cap, or warn at the prescribed count, and MUST NOT compute a percentage, a completion state, or a "sets remaining" call to action (D23).
- MUST NOT mark an exercise completed when the count is reached. Completion stays the explicit tap D16 made it.
- MUST NOT parse the set count out of `prescription` (D17).
- MUST NOT shorten, skip, or auto-advance a rest to keep a chain moving. §4C prescribes 3 minutes and the app's job is to run it, not to hurry it.
- MUST NOT add a "start next set" control while a rest is still running — Skip already exists for cutting one short, and a second control that does it silently is how a prescribed interval erodes.
- MUST NOT change the storage schema (AC9).

#### Verify
`npm run test && npm run build && npm run lint`, plus an in-browser pass: start a max hang and confirm the timer reads set 1 of 5; log it and confirm the rest view names set 2; let the rest run out and confirm one tap starts the next hold; stop a hold without logging it and confirm the position does not advance; add a sixth set and confirm it reads "set 6 (5 prescribed)" with nothing blocked; delete a set and confirm the position moves back; check a rep-based exercise with no declared count is unchanged.

#### Amendments

**2026-07-25 — T19 built. Build + lint clean, 324 tests green (19 new, all in `chain`). All nine ACs verified in a running browser, including a real 3 minute rest run to completion rather than a shortened one.** Files: `src/lib/chain.ts` (+ `chain.test.ts`); modified `src/types.ts`, `src/data/exercises.ts` (18 entries gain `prescribedSets`), `src/components/SessionTimer.tsx`, `src/components/SetLogger.tsx`, `src/screens/ActiveSession.tsx`. **No new decision, no new dependency, and no schema movement of any kind** — the field is on the code-seeded catalog, which T2 deliberately does not store, so `DB_VERSION` and `BACKUP_SCHEMA_VERSION` stay at 2 and the live database was confirmed unchanged at four stores.

Verified on the running app: a max-hang card with one set logged read `▶ Start set 2 of 5 · 7–10s` and `+ Add set 2 of 5` (AC1); starting the hold put `set 2 of 5 · target 7–10s` beside the running clock (AC2); stopping it at 3.2s **without logging** left the rest bar reading `next · set 2 of 5` — the position did not advance on a set that no record contained — with `Log 3.2s as a set` on the same bar, and tapping that moved it to `next · set 3 of 5` (AC3); the 3 minute rest was allowed to run out in real time, at which point the bar offered `▶ Start set 3 of 5 · 7–10s` and **sat at 0:00 waiting** rather than starting anything (AC4, AC5); tapping it opened `HOLD · set 3 of 5 · target 7–10s` (AC4); adding sets past five produced `set 6 (5 prescribed)` … `set 8 (5 prescribed)` with every control still working and no completion, percentage, or praise anywhere (AC6); deleting four sets walked the label back to `set 4 of 5` (AC8); and the warm-up progression, which declares no count, showed a plain `+ Add set` and no position at all (AC7).

Design calls:
- **One label serves both the hold and the rest views, because it is one fact.** "The set that is next to be logged" *is* the set being held while a hold runs, and the set after a rest — so `chainLabelFor` is computed once from `getSets(...).length` and read by both. The alternative (a "current" and a "next") would have had to disagree the moment a hold went unlogged, and picking which one to trust is exactly the ambiguity D16 exists to remove.
- **The position counts logged sets, so it self-corrects in public.** A hold performed and dismissed leaves the counter where it was, which looks wrong for about a second and then reads as the truth: there is no record, so there is no set. The remedy is on screen at that moment, which is the best possible place for it.
- **The start-next control appears only once the rest is actually complete.** Offering it mid-rest would put a second, quieter way to end a prescribed 3 minute interval next to the honest one (`Skip`), and §4C's rest is the part of the protocol most easily rationalised away. It also never fires itself (AC5): the owner has to be on the board before a max-effort finger clock runs.
- **`prescribedSets` is absent more often than present, and each absence is a reading of the plan.** A warm-up is a duration, Abrahangs are a ten-minute cycle, the get-up is "2–3 per side" (reps, not sets), §4E's max pull-up is worked *up to* with no prescribed attempts, GtG is a daily habit rather than a session (D11), and climbing is never logged (D9). A test pins each of those as `undefined` so a later edit cannot quietly invent a count.
- **The label format changed once, in verification.** `set 6 · 5 prescribed` inside a control that already carries a `·` separator produced `▶ Start set 8 · 5 prescribed · 7–10s` — three middots and no structure. It became `set 8 (5 prescribed)`, which is the same two facts and readable at a glance mid-set. Found by looking at the rendered button, not by reading the string.

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

---

**2026-07-24 — v1.3 → v1.4 — routine selection, preview, and per-exercise completion (T9 added).**

Owner request: "add routines… an A and B routine swapped throughout the week; I should be able to select the routine I am supposed to do, see the list of exercises, select an exercise to see the details, and log the exercise as completed."

Investigation before scoping found most of that already shipped (two seeded routines since T2, one-tap Start since T8, an ordered in-session exercise list since T4), and that the "possibly more routines depending on research" half needed no research: training plan §3 fixes four training days per week, of which two are strength routines and two are climbing days already covered by D9's check-offs. The real gaps were selection, preview, and completion.

| Change | Why |
|---|---|
| D15 added: "which routine" is answered by rotation order, never by a calendar | Owner chose next-up rotation over a day-of-week schedule. Rotation needs no schedule state, cannot produce a "you're behind" state, and degrades correctly on a shifted or skipped week — which §3's "rest 2–3 days" and §4F's "lighter week regardless of the schedule" both invite. `Routine.dayOfWeek` stays `null` and unused; D2a is not reversed. |
| D16 added: `LoggedExercise.completed`, independent of sets | T4 AC6 made "did it, logged no numbers" indistinguishable from "skipped it," and several plan items (warm-up progression, get-ups, wall press) have nothing numeric worth typing. Optional field → no schema bump, no migration. |
| T9 added: rotation, routine preview screen, in-session full detail, per-exercise completion | The four gaps between the request and what already shipped. |
| 8-week block / periodization tracking explicitly deferred | Owner decision. §4B's week 1–4 vs 5–8 PIMA variants and the week-7 deload stay in the exercise `prescription` text; tracking them needs a block start date and a post-week-8 policy that no decision covers yet. |

**Net effect on scope:** one task, two decisions, one optional type field. No new routines, no catalog change, no storage or backup schema change, no new dependencies, and no reversal of D2a or D9.

---

**2026-07-24 — v1.4 → v1.5 — in-session hold/rest timer and last-time carry-forward (T10, T11 added).**

Owner request, after a review of the app against `docs/training-plan.md` surfaced the gap: "active set for hold and rest timer… then last-time carry forward so we can aim for actual progress charts."

The review's finding was that the two largest remaining gaps are both *in-session* and both concern information the plan already specifies but the app cannot surface at the moment it is needed. The training plan is built out of intervals (§4B, §4C, §5A, §5B, §8), and the owner was leaving the PWA for the Clock app to run them — the same "reopen another thing mid-session" failure the PRD's problem #2 names, except that here the number being guessed is a training variable on a max-effort protocol. Separately, §4F asks for 1–3% load increments and §7 asks the owner to watch for a downward trend, neither of which is possible against a number that costs a four-step trip through History to read.

| Change | Why |
|---|---|
| "Rest timers with audio" un-deferred and built as T10 | It was deferred to v2, not rejected; the deferral expired when the owner asked for it. Nothing in the original rationale argued against timers — only against their cost in v1. |
| D17 added: `Exercise.holdSeconds` / `restSeconds` as typed catalog fields | Two entries carry both a peak and a weeks-1–4 variant in one `prescription` string, so parsing prose picks a number by luck. Optional fields, no schema bump; absent means no timer rather than an invented default. |
| D18 added: timer state is ephemeral, timestamp-based, never persisted | Nothing downstream reads a timer, so persisting it would buy a store and a stale-timer-on-resume problem for nothing. Absolute start instants — not persistence — are what make a backgrounded iOS PWA come back correct. |
| D19 added: a prefilled set value is a draft, never a claim | Keeps D16's separation of "logged numbers" from "I did this" intact under carry-forward, and fences the line between *reporting what happened* and *proposing what should happen next* — the latter being adaptive load calculation, a standing non-goal. |
| T11 added: last-time carry-forward, with RPE deliberately excluded | Load and reps are a setup worth repeating; RPE is a fresh judgment. Pre-filling it would fabricate the exact "how did it feel" signal §7 asks the owner to watch. |
| Charts non-goal **retained**, with the gap to it recorded | The owner's stated direction is progress charts. T11 is the precondition (consistent values rather than freshly retyped ones), but `load` is free text by design, bodyweight and edge size are untracked though §4E says added-weight numbers are meaningless without them, and the §4E retest battery — the plan's own before/after instrument — does not exist yet. A chart built now would plot unparseable strings. |

**Net effect on scope:** two tasks, three decisions, two optional type fields, and timing data on ten catalog entries. No new dependencies, no storage or backup schema change (`DB_VERSION` and `BACKUP_SCHEMA_VERSION` both unchanged), no new routines, and no reversal of D2a, D9, or D15 — the beep is foreground Web Audio, not a notification.

**Carried to the on-device pass:** beep audibility on iOS, wake-lock acquisition (unobservable in a hidden preview pane), and a real background/resume cycle mid-interval.

---

**2026-07-24 — v1.5 → v1.6 — structured measurements and per-exercise progress charts (T12 added).**

Owner request: "start planning the progress tracking and visualization… a clean line graph for exercises to show progress if there is progress built into the routine for that exercise," followed by three scoping answers (chart load, edge and time as switchable views; capture them as numbers rather than parsing text; pounds), a scope confirmation (only the three load exercises), and a description of the actual progression pattern that reshaped the design: *drop to a smaller edge, rebuild hold time on it, then add weight or drop again.*

That last detail is the substantive one. Under it, any single continuous line misrepresents the training: hold time sawtooths at every edge change and added load looks flat then arbitrary. The fix is not a smarter line but a refusal to draw an invalid one — see D22.

| Change | Why |
|---|---|
| Charts non-goal narrowed rather than dropped | Only the three exercises the plan progresses are charted. No dashboards, PRs, streaks, trend arrows, projections, or whole-block analytics — those remain out of scope, and the reasons are unchanged. |
| D20 added: charted only where the plan progresses something, metrics declared per exercise | A pass over the plan found most of the catalog has nothing to plot: §4B/§4E rule out PIMA numerically ("nothing to measure without a force gauge"), §8 says keep GtG pull-ups trivial, and warm-ups and prehab are not progressed at all. Metrics are per-exercise because they are not uniform — a max hang has an edge, the bar-hung lock-off does not. |
| D21 added: typed measurements beside the free text, never parsed from it; lb / mm / s | D17's reasoning applied to logging. A parser over "20mm +10kg" mis-reads anything off-pattern, and a wrong trend line is worse than no line when §7's entire purpose is spotting a *downward* trend early. |
| Numeric fields **replace** free-text load/reps on those three exercises | Owner decision. The trio fully covers what the strings held there, so keeping both would be the same data entered twice. The other seventeen exercises are untouched, and pre-T12 sets still render from their text. |
| D22 added: edge is the condition, not a peer metric — series never cross an edge change | The owner's progression pattern. This is the charting form of §4E's "changing edge size invalidates the comparison more than any training variable": the app declines to draw the comparison rather than annotating it afterwards. |
| Bodyweight recorded as a known limitation with a revisit gate | §4E records bodyweight alongside added load because the two are only meaningful together. Tracking it needs a capture surface and a granularity decision no decision covers, and the owner has not asked. Written down so the chart is not later mistaken for a complete strength measure. |

**Net effect on scope:** one task, three decisions, one new type plus three optional `SetEntry` fields and one optional `Exercise` field, and metric declarations on three catalog entries. No new dependencies (the chart is inline SVG), no storage or backup schema change (`DB_VERSION` and `BACKUP_SCHEMA_VERSION` both unchanged), and no reversal of D2a, D9, D15, or D16.

---

**2026-07-24 — v1.6 → v1.7 — storage durability, update visibility, hold auto-stop, audible cues (T13 added).**

Owner report, in one message: the T0 heartbeat is moot because "I need to remove the app from my phone to get our updates so it is gone"; realistically the data only needs to survive the 8-week cycle so the next block starts from the latest numbers; the hold timer should stop at the designated time rather than run over; and the sound does not appear to work.

The first of those reframed the whole persistence question. The threat to an 8-week log was never WebKit eviction — it was the update workflow deleting the app once per deploy. See T13's amendment.

| Change | Why |
|---|---|
| Build stamp in Settings; copy stating the app never needs deleting | `autoUpdate` already updates the service worker on relaunch, but `v0.1.0` never changed, so an update was unverifiable and reinstalling was the only workflow that felt safe. Making the update *visible* is what stops the data being deleted. |
| `navigator.storage.persist()` requested at launch, status shown in Settings | Moves the origin out of the browser's best-effort bucket, which is what eviction targets first. Requested every launch because a denial is not permanent. Reported honestly, and every status string still points at the export button — D5 is unchanged and persistence is a request, not a guarantee. |
| T0's `PersistenceHeartbeat` deleted | It could not survive the workflow it was meant to measure, and `storage.persisted()` answers the question directly. T0 AC2's 48h gate is superseded by this rather than left pending forever. |
| **T10's "the timer never stops itself" reversed** — holds now end at the prescribed maximum | Owner decision. Recorded as a reversal rather than argued: a manual stop still measures real elapsed time, so cutting a hold short is unaffected. It also forced an audible hold-end cue, since the point of auto-stopping is not having to watch the screen mid-hang. |
| Auto-stop records the prescription, not the clock at detection | Found in verification: a throttled render tick logged 5.9s for a 5s hold. `holdSec` is a charted measurement now (T12), so tick jitter would read as improvement. |
| Playback audio session, louder and longer tones, resume on foreground, "Test sound" in Settings | On iOS the ringer switch silences Web Audio unless the page declares a playback session — the most likely cause of the reported silence, and untestable off-device, which is why Settings now has a button that plays the cue on demand. |

**Net effect on scope:** one task, one new module, one reversed T10 design call, no new decisions, no dependencies, and no schema change. **Device pass still owes:** beep audibility with the ringer off, wake-lock acquisition, a real background/resume cycle, and confirmation that persistent storage is granted once installed.

**2026-07-24 — v1.7 → v1.8 — ideation pass accepted: nineteen ideas specced as a prioritized backlog (T14–T28).**

Owner request: "find some ways to make this app really easy, insightful and enjoyable to use… think outside the box." A review of the built app against `docs/training-plan.md` produced twenty-three ideas; the owner accepted nineteen, rejected one, and deferred three. This amendment records the decisions the accepted set needs, the priority order, and — for the record — what was turned down.

**The design problem worth naming.** Every stock mechanism for making a training app enjoyable is already fenced off, correctly: no streaks or badges (T5b), no PRs or trend arrows or projections (D20), no reminders (D2a), no adaptive prescription (standing non-goal). §8 lists conditions for *stopping* GtG and §4F prescribes a lighter week regardless of schedule, so any UI that rewards adherence argues against the owner's own safety rules. The accepted set therefore had to be enjoyable and insightful using report-only mechanics, which is what **D23** now states as one rule rather than five arguments.

| Change | Why |
|---|---|
| D23 added: the app reports and cites; never ranks, scores, projects, or congratulates | v1.8 adds five surfaces that are exactly where a fitness app grows a score. One governing rule is cheaper than re-litigating each, and it is derived from the plan (§7, §8, §4F) rather than from taste. |
| D27 added: set-end reason as a closed four-value enum, scoped to exercises declaring `holdSeconds` | Highest information per tap in the app. It makes an already-charted number interpretable: a pain-stopped 6s hang and a strength-limited 6s hang are the same `holdSec` and different training facts. Scoped by the existing timing declaration, so no catalog field is added. |
| D24 added: bodyweight as a dated single number, never estimated | Resolves the revisit gate v1.6 left open. §4E records bodyweight *with* added load because neither means anything alone. The strict ±14-day matching rule, and omitting rather than interpolating a point, is D22's refusal-to-draw-an-invalid-comparison applied to a second axis. |
| D25 added: block position derived from the first completed session | Un-defers v1.4's periodization parking, using D15's derive-don't-store method. Buys the thing D17 works around — showing the live PIMA variant (§4B weeks 1–4 vs 5–8) instead of both in one string — with no schedule state and no "behind" state. |
| D26 added: available gear (edges, load increments, dip belt) is Settings data | Every numeric input currently opens an iOS keyboard for chalked hands mid-protocol, which is PRD problem #2 in its most literal form. Not a reversal of D6: it configures input affordances, never exercises. |
| Charts non-goal narrowed a second time | Arithmetic aggregates that *report* are now permitted under D23 (time under tension, edge × week grid, session sigil, block poster). PRs, streaks, adherence percentages, trend arrows, projections, and rankings remain permanently out. |
| Backlog decomposition added at Level 2: T14–T28 in four waves | Fifteen tasks, ordered unbackfillable-first because the owner has not started the block. Level 3 specs are written just-in-time, one task ahead. |

**Ordering rationale, stated once.** The owner confirmed on 2026-07-24 that the 8-week block has **not started**. That inverts the intuitive order. Ergonomic wins (steppers, voice, chained sets, eyes-shut mode) are the most *felt* improvements and lose nothing by landing in week 2 — they pay off on every remaining session. Capture changes are the opposite: a set-end reason, a bodyweight, and a §4E baseline are unrepeatable, and §4E's baseline in particular is a single event requiring rested, warmed-up, identical conditions *before* week 1. Every session logged without them is a permanently thinner record. So Wave 0 is capture, Wave 1 is comfort, and the highest-value item in the whole backlog (T16, the retest battery) is also the most time-critical.

**Rejected, with reasons — do not re-propose.**

| Idea | Verdict |
|---|---|
| Printable wall card (protocol + current numbers as a PDF) | **Rejected by the owner:** "I'm just not going to print it." No further argument needed; the phone-on-the-floor problem it addressed is handled by T21's eyes-shut mode instead. |
| Backend-free sharing (session summary encoded in a URL fragment or QR) | **Deferred.** Solves a problem the owner has not reported having — there is no coach and no second device in the picture. Revisit only if one appears. |
| Motion-detected hang start/stop (`DeviceMotion` to time the hold from actual loading of the board) | **Deferred, needs a T0-shaped device spike.** It would fix a real defect — `holdSec` currently includes the tap-then-get-on-the-board offset — but iOS requires a permission gesture and standalone-PWA support for motion events has been historically unreliable. Do not build toward this without a spike that runs on the owner's actual iPhone. |
| Tremor / steadiness as a proxy quality signal (accelerometer variance during a yielding hold) | **Deferred.** Genuinely novel and honestly framed (it measures when a hold degraded, not how hard it was — §4E's "nothing to measure without a force gauge" stands for *force*), but it depends on the same unproven motion-event path, and no decision covers what a tremor number would mean. Gate: the motion spike passes first. |

**Net effect on scope:** fifteen tasks, five decisions, one non-goal narrowed. Expected schema impact across the whole backlog: optional fields on `SetEntry` (T14), one new dated record type for bodyweight (T15) and one for symptoms (T17), a retest record (T16), and gear on `Settings` (T18/D26) — the first `BACKUP_SCHEMA_VERSION` bump since T7 becomes likely at T15 or T16, and that task owns the migration decision. No reversal of D2a, D9, D15, D16, D18, D19, D20, D21, or D22. Spoken cues (T20) are Web Speech in the foreground, not notifications — D2a is untouched.

---

**2026-07-25 — T16 spec written (amend before you code), D29 and D30 added.**

The next task in wave order, specced one ahead as Level 2 prescribes. Three things were decided here rather than left to the build, because each one could reasonably have gone the other way and the wrong choice is expensive after the block starts:

| Decision | Why it was made now |
|---|---|
| D29: the battery is a `WorkoutLog`, not a new record type | The v1.8 amendment predicted "a retest record (T16)" and a likely `BACKUP_SCHEMA_VERSION` bump. Reading the code says otherwise: §4E's four recorded columns are already `edgeMm`, `addedLb`, `holdSec`, and T15's bodyweight, so a parallel record would duplicate all four, split the max-hang numbers across two stores, and buy a version bump for nothing. **Revised expectation: T16 needs no schema bump at all.** |
| D29a: the tests get their own catalog entries | The alternative — logging §4E's maximum against the trained `max-hang-half-crimp` — puts a week-1 and a week-8 spike on the series §7 asks the owner to read for a *downward* trend. Same argument as D22, applied to intensity instead of edge size. Costs five catalog rows (20 → 25) and zero new type surface. |
| D30: the standard edge is a stored setting | §4E's "never change it mid-block" is the strictest condition in the plan, and eight weeks is long enough to forget. Landing it in `Settings` now also means T18's gear work (D26) extends an existing field group rather than inventing one. |

**The one new mechanism, flagged rather than buried:** `holdSeconds` gains an `'open'` form for the lock-off test, where the duration is the measurement and there is nothing to auto-stop at (T13). A union member on the existing field keeps `reasonApplies`'s D27 gate working untouched — which matters, because a max-duration hold is the single place in the app where "why did it end" carries the most information.

**Net effect on scope:** one task, two decisions, five catalog entries, one seed routine, one optional `Routine` field (`inRotation`), one optional `Settings` field (`standardEdgeMm`), and one union member on `Exercise.holdSeconds`. No new dependencies, no new object store, no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` bump, and no reversal of D2a, D9, D15, D16, D18–D22, or D27.

**Built the same day; every prediction above held.** See T16's amendment for the verification pass. One thing the spec did not anticipate: an open hold must not offer `target` as an end reason, since a test with no prescribed duration cannot have hit one. **Wave 0 is now complete** — set-end reason (T14), bodyweight (T15) and the §4E battery (T16) are all in place, so nothing further is unbackfillable and the 8-week block can start. T17 (symptom check + plan-cited stop-signal card) leads Wave 1.

---

**2026-07-25 — Wave 1 reordered: T18 leads, T17 deferred. T18 spec written, D31 and D32 added.**

Owner decision, on being asked to settle T17's three open choices: *"I don't care about T17 that much."* That is a scoping fact, not an aside. A symptom check is worth exactly what gets tapped into it — an unrecorded stop signal is not a quiet safety net, it is a surface that **looks** like coverage and isn't, which is worse than the honest absence the app has today. Building it against stated indifference would produce that.

| Change | Why |
|---|---|
| T17 deferred within Wave 1; T18 leads | Nothing in T17 is unbackfillable (that was Wave 0's property, and it is spent) and nothing depends on it — T18–T21's stated dependencies are T18 → T19 → T20 → T21, with T17 outside that chain. Deferring it costs no ordering and no rework. |
| T18's dependency reads `—`, as the Level 2 table already had it | The backlog table lists T18 with no dependencies; only the wave-internal ordering moved. No table edit was needed, which is itself the check that the reorder is safe. |
| D31 added: gear offers, never restricts | The failure mode a picker introduces: a board it cannot express forces a wrong number or no number, and both destroy the measurement §7 asks the owner to watch. So the gear list decides what is one tap, never what is possible — which also makes an unconfigured install identical to today's app rather than a fabricated board. |
| D32 added: a stepper steps, it never proposes | ± is one small design slip from "suggested next load", which is adaptive load calculation (standing non-goal) and would take §4F's 1–3% judgment away from the only party who can feel whether the last session was an 8 or a 10. The increment is gear — what the owner can physically add — and asserts nothing about whether to add it. |
| **D26's dip-belt flag deliberately not built** | Recorded openly rather than dropped quietly. A pass over what a stored `hasDipBelt` could actually drive found three candidates: change a prescription (forbidden by D26 itself), hide or grey an exercise that needs one (forbidden — the app narrows emphasis, never hides the plan, per D25), or filter the T3 catalog browser (which already filters by `Equipment`, including `dip-belt`, with no setting at all). That leaves nothing, and a Settings toggle that configures nothing is a question the owner answers once and the app then ignores. Re-propose if a use appears. |

**Net effect on scope:** one task, two decisions, two optional `Settings` fields, one new pure module and one new component. No new dependencies, no new object store, no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` bump (`settings` already travels through the backup whole — the same property that made `standardEdgeMm` free in T16), and no reversal of D2a, D6, D9, D15, D16, D18–D22, or D27. T17 remains specced-but-unbuilt in the backlog table and can be picked up at any point in the block, in full or reduced to its cheap half (the plan-cited card firing on T14's existing `pain` / `form-broke` reasons, with no symptom record at all).

**Built the same day; every prediction above held, including the version numbers.** See T18's amendment for the verification pass. Two things the spec did not anticipate, both found while building: `canPick` had to be a type predicate rather than a boolean, so `holdSec` cannot reach a picker through a widened metric type; and deleting a set needs to close an open panel explicitly, since T14's stale-index rule only catches an index that falls off the end. **T19 (chained sets: set *n* of *N* against the prescription) is next in Wave 1**, and it now enters values through this logger.

---

**2026-07-25 — T19 specced and built: chained sets, and the first task in the backlog that needed no new decision.**

The set count moves out of `prescription` prose and into a typed `Exercise.prescribedSets`, populated on the 18 entries where the plan states a number. Everything about how it behaves was already settled: D17 says a machine-readable prescription is a typed field rather than a regex over prose (§4B carries "4–6 sets" *and* a weeks-1–4 "5 sets" variant in one string); D23 says the app reports a position and never scores it; D16 and D19 say a row exists only once a set is logged, so nothing is pre-created and the counter counts records rather than attempts. Worth recording as a fact about the spec rather than a fact about the task: five waves in, the decisions the PRD accumulated are now answering new questions without amendment, which is what they were for.

| Change | Why |
|---|---|
| `Exercise.prescribedSets?: [min, max]` added, 18 catalog entries populated | D17's pattern exactly. A range stays a range (`4–6`), because rounding it to a single target would invent a prescription §4B deliberately left open. |
| The timer bar names the set, and offers the next one when a rest completes | The bar covers the card, so the next hold used to cost a scroll — and what gets cut short to avoid a scroll is the 3 minute rest §4C prescribes, not the scroll. |
| Nothing auto-starts, nothing blocks, nothing completes | AC5 and AC6. A max-effort finger hold must not begin without the owner on the board, and §4F's lighter week makes *fewer* sets correct as often as more — so neither direction is an error to flag. |
| No `DB_VERSION` / `BACKUP_SCHEMA_VERSION` change | The catalog is code-seeded and not stored (T2's design call), so a new catalog field costs nothing at all in storage terms. Confirmed against the live database. |

**Net effect on scope:** one task, zero decisions, one optional catalog field, one new pure module. No new dependencies, no storage or backup change, and no reversal of anything. **T20 (spoken cues: "3–2–1–pull", set announcements, band-pitch tone) is next in Wave 1**, and it now has a set number to announce.

