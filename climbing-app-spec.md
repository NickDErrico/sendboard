# SPEC: Personal Climbing Training App ("Sendboard")

Version 1.8 — 2026-07-25
Status: PRD approved with amendments — Gate 1 passed. **T1–T16 built — Wave 0 is complete, so the block can start.** Wave 1's chain is complete: T18–T21 built, T17 deferred within the wave. **Wave 2 is complete: T22–T25 built.** **Wave 3 is complete: T26, T27 and T28 built.** The v1.8 backlog is finished apart from **T17**, deferred within Wave 1 on the owner’s own scoping call. See the Amendments log at the end of this file for what changed from v1.0 and why.

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
| ~~D11~~ | ~~Greasing-the-groove (GtG) items are tracked as a daily yes/no check, never as sets and reps~~ | **NARROWED by D11a on 2026-07-28** — the tracking rule stands; what it silently also decided (that the app never *shows* the routine) does not. |
| D11a | **GtG is *prescribed* as a routine — every movement of §8's committed list, with its dose and its trigger — and *tracked* as a daily yes/no per movement. Never as sets, reps, load, or a count of times done** | Owner's report, 2026-07-28: *"The GTG general and pull daily exercises are just 'Did you do the thing or not?' instead of an actual daily routine with exercises, sets and reps."* D11 answered a question about **logging** and, without saying so, also answered one about **prescription** — the app shipped two tiles labelled General and Pull that named none of the seven movements behind them, gave none of their doses, and cited none of their triggers. §8's committed list is a table of movement, dose, trigger and risk class, and the app rendered the column that carries the least information. So the half of D11 that is about logging is kept **and its rationale is why**: GtG's sets are scattered through the day and deliberately unmemorable, so a rep counter would cost more attention than the exercise and there is nothing worth measuring in "8 push-ups I did not think about". What changes is that the dose is now on screen at the moment of the tap, and the tap names a movement instead of a category — which is the same one-tap-per-day shape D9 and D11 both settle on, applied one level down. Two consequences. **(a) A category tick is no longer offered.** Two ways to record the same day, one of which names nothing, is how a surface starts disagreeing with itself; the check-log's backfill form still writes one for a past day, and every check written before this task is one, so both stay readable forever (`Check.exerciseId` is optional — no migration, no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement). **(b) Nothing is scored against the list.** §8's doses are triggers ("whenever you walk past a clear floor"), not a daily quota, and §8's own last paragraph calls the pulling half optional — so the app reports which movements a day holds and never divides that by seven (D23). |
| D13 | **GtG covers general movements only — fingers are excluded, and pulling is tracked separately from everything else** | Owner's decision: fingers stay on their own protocol (max hangs + PIMA); Abrahangs remain a warm-up, not a tracked habit. Pulling is split into its own `CheckKind` because it is the one GtG category that loads tissue already loaded by climbing days, Day 3, and every hangboard session — the training plan names it as the first thing to drop at any elbow symptom. Separate tracking makes that volume visible instead of hidden inside a single "did GtG today" flag. **NARROWED by D13a on 2026-07-29** — the clause "Abrahangs remain a warm-up, not a tracked habit" is reversed (plan §10D); every other part of this decision stands, and fingers are still excluded from §8's committed GtG list. |
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
| D42 | **The training plan ships inside the app as read-only reference text. Nothing in the app ever derives a number, a prescription, or a behaviour from it — and the citations the app already writes become typed references rather than parsed ones** | Forced by T25, and it is the boundary D38 promised this task would draw. `docs/training-plan.md` is the document the whole app is a tool for, and until now it has been unreachable from the app: T22 had to fence itself off from it, and every `(plan §7)` in the catalog is a citation to something the owner cannot open. So the file is **bundled at build time** (not fetched, not stored, not editable) and rendered — which makes it work offline, version with the deploy, and stay outside IndexedDB entirely, exactly like the catalog it sits beside. The hard half is the fence: D6 says the catalog is the machine-readable source of exercise content, and a bundled plan is precisely the thing that would tempt a later task to parse a duration or a set count out of prose — the silent-wrong-number machine D17 exists to prevent, now with 17KB of surface. So the rule is absolute and stated once: the plan text is **displayed, searched, and quoted; never parsed for meaning**. Its one structural product is a `§` reference, which is a heading, not a training variable. The second half follows the same logic in the other direction: an exercise's link into the plan is a typed `planRefs` list on the catalog entry, not a regex over its own prose, because a citation that resolves to the wrong section is a worse answer than one that does not resolve at all. |
| D41 | **Where one `prescription` string carries two week-scoped protocols, the split is a typed catalog field — and the declaration says which of them the typed timing describes** | Forced by T24, and it is D17's argument twice over. §4B's string holds a rep-structured ~90% variant for weeks 1–4 and a single-max-effort variant for weeks 5–8; picking the live one by regex is the same silent-wrong-number machine on the same max-effort protocol that made `holdSeconds` a field. So `Exercise.variants` declares `weeks`, a `label` and the `text` — the text being the substring already present in `prescription`, split rather than authored, so no training copy is written and `prescription` itself is untouched (D6). The second half is the part that keeps the app honest: `holdSeconds` and `prescribedSets` describe the **peak** variant only, so during weeks 1–4 the emphasised protocol is not the one the clock runs. T23 fenced a cadence runner for that variant off as needing its own decision, so the app must not quietly switch timings — instead the variant the timing belongs to is flagged `timed`, and the surface says so. A declared flag rather than a component's assumption, for the reason the `category === 'warmup'` gate is in the catalog: the fence has to live where it cannot be forgotten. |
| D43 | **An aggregate counts only measured values, over one named population, and reports what it could not count** | Forced by T26, and written once because T27's sigil and T28's poster both aggregate the same log. Three rules. **(a) Measured, never prescribed.** Time under tension is the sum of recorded `holdSec` values; a set logged without one contributes zero. Multiplying `prescribedSets` by a `holdSeconds` target would produce a plausible number describing a session that did not happen — D17's silent-wrong-number machine pointed at the log instead of the catalog. **(b) One population, and it is the block's own.** Completed logs against rotating routines from the block anchor onward — the same predicate `blockPosition` counts sessions with (D15, D29), so no two surfaces can disagree about what a session is. §4E batteries are out because a maximum under a test protocol is not training volume (D29a's argument, applied to volume instead of to a series); warm-up holds are out because §4A is a condition of the work, which is already how `retest.ts` treats it. **(c) The gap is rendered beside the number.** Holds with no duration recorded are counted and shown wherever the total is, the way `droppedForNoBodyweight` already is: a total silently missing a third of its sets is worse than no total, because it looks complete. None of this relaxes D23 — a sum is a fact, and a maximum drawn out of the same sum is a PR, which stays out. |
| D44 | **A generated mark is readable or it is a badge. Every visual property maps to one recorded fact, the mapping is rendered where the mark is largest, and nothing is derived from a hash, a seed, or an id** | Forced by T27, and it is D23 applied to pixels instead of to words. A per-session glyph is the single most badge-shaped thing in the backlog: it is small, it is pretty, it accumulates down a list, and every fitness app that ships one means it as a reward. The rule that makes it a *report* is that it can be read back — spoke count is the hold count, spoke length is the recorded seconds on a **shared** scale, a gap is an exercise boundary, a tip is one of D27's two safety reasons — and that the legend saying so is rendered wherever the mark is large enough to read. Two consequences are load-bearing. **(a) No hash.** A hash-derived glyph would be more distinctive and completely indefensible: nothing about it could be checked against the log, so it could only be decoration that looks like information. Arithmetic over the sets, or nothing. **(b) A shared scale, never the session's own.** Normalising each mark against its own longest hold would draw a session of 3–5s PIMA pulls (§4B) identically to one of 7–10s max hangs (§4C) — different work, same picture, which is worse than no picture. The scale is one module constant and a longer hold is clamped rather than rescaling every other mark in the app. What this does not license: a mark is never captioned as full, light, strong or missed, and §4F's deload week is *supposed* to draw the smallest marks on the screen. |
| D45 | **The block poster is a screen, not an artifact — rendered, read, and left in place — and it is never gated on reaching week 8** | Forced by T28, and both halves are applications of verdicts v1.8 already reached, written down because the word "poster" actively invites reversing them. **(a) No artifact.** A printable wall card was **rejected by the owner** — "I'm just not going to print it" — and backend-free sharing (a summary in a URL fragment or a QR) was **deferred** for want of a coach or a second device. So there is no export, no download, no print stylesheet, no canvas, no image generation and no dependency: everything the poster shows is already in the app, and a second copy of it in a file is a second thing that can go stale. D5's JSON export remains the one durability mechanism, and it is about data, not presentation. **(b) No week-8 gate.** A surface that unlocks in week 8 must compute when week 8 is and therefore must tell the owner when they have not got there — a countdown, which D2a removed and which T24 refused when it declined to say a retest was due. The poster renders whenever the block holds a session and reads identically at week 3, week 8, and week 12: no "N weeks remaining", no progress bar toward eight, no "complete". §4F's lighter week is why — a block that runs long is as correct as one that does not (D25), so there is no moment the app is entitled to call the end. |
| D13a | **Abrahangs run daily — as a routine of their own, outside the rotation, with "did it happen today" derived from the log rather than checked off** | Owner's decision, 2026-07-29: *"The warm-up and abrahangs routine should be a daily exercise."* This reverses one clause of D13 — *"Abrahangs remain a warm-up, not a tracked habit"* — and nothing else in it: fingers stay off §8's committed GtG list, and the pull/general split stands. The plan document moved first (§10D), which is D6's mechanism and the same order T33 followed, and the addendum's argument is that §8's own sources always described a daily protocol (Abrahamsson's thirty consecutive days; Baar's ~6h responsiveness cycle; the Gilmore routine §10A adopts, measured as a daily intervention) — the warm-up-only restriction was an allocation choice under "GtG the things you're not maxing," and §8 names fingers as the exception to that rule in the same breath. Three consequences make it a decision rather than a seed edit. **(a) A routine, not a check.** D11a's shape — one tap per movement per day — is right for movements whose sets are scattered and unmemorable. This is a ten-minute cadenced protocol with six grips in a stated order, which the app already runs (T23, T29); recording it as a checkbox would throw away the runner and repeat the complaint that produced D11a. **(b) Outside the rotation, for D29's reason applied to a habit.** `inRotation: false`, so completing it never changes which training routine is up next (D15), never anchors or counts toward the block (D25), and never appears in the week's routine balance — a daily warm-up that advanced the alternation would make Day 1 and Day 3 unreachable. It is still startable and still logs like any session. **(c) A completed Day 1 is one of the day's two runs.** §10D says so, and Day 1 opens with exactly these two entries — so the count is derived from logs the app already has rather than asking for a second record of the same session, which is D15's derive-don't-store applied again and D43(b)'s disagreement avoided. §10D's twice-daily and ≥6h are **quoted and never enforced**: the routine is startable in every state, and nothing is ever due, owed, or missed (D2a, D23). |
| D32 | **A stepper steps the value the owner already has. It never proposes the next one** | The line D19 draws, restated for a control that is easy to slide across it. `+` from a carried-forward `+35lb` is the owner deciding to add; a chip labelled "suggested" or a stepper that pre-moves the value on open would be adaptive load calculation — a standing non-goal — and §4F deliberately puts the 1–3% judgment with the person who can feel whether the last session was an 8 or a 10. The increment is therefore **gear** (what the owner can physically add), not advice: it configures the size of a tap and asserts nothing about whether to take it. No chip is ever highlighted as recommended, and no step is ever applied without a tap. |
| D47 | **The tier is the app's top-level structure. Navigation, the today surface, and the catalog hierarchy are organised by loading mechanism** | Owner request, 2026-08-01, to rethink the structure rather than extend it. The finding is that the structure already existed and was never carried into the interface: the README's first structural section is the four-tier table, under the sentence *"Training is organised by loading mechanism, because the mechanisms have incompatible frequency requirements — one schedule cannot serve all of them."* That is a complete IA, and the app implements all four of its rules — `daily.ts` (collagen), `pool.ts` twice (daily isometrics, pool), `rotation.ts` + `block.ts` (heavy) — written separately across five months, each surfaced on a different screen, none named as what it is. The word "tier" appears in the navigation nowhere and `Tier` renders nowhere. So Home becomes **Today**: a climbing strip, then one lane per tier in frequency order, each stating name, cadence, state, and one action. `#/joints`, `#/gtg` and `#/checks` were each one tier's state on its own route and become lanes. Five tabs become four. The full reasoning is `docs/tier-architecture.md`, which this row points at as D42 points at the plan. |
| D48 | **`tier` → `focus` → `target` is a nesting, not three peers. `Category` is deleted** | The catalog carried three classifications as peers, one of which `types.ts:26` documents as incoherent in as many words — *"mixes body region with training role"*. They are not peers: tier answers why and how often a movement is loaded, focus answers what it develops, target answers which tissue, and each narrows the last. A movement is addressable as **pool → prehab-stability → shoulder**. `Category` is deleted rather than split into region and focus, because `target` already owns "where" on 31 of the 49 entries and a second region field is how two taxonomies begin disagreeing about one movement. Two consequences. **(a) `focus` declares values with no members** — `endurance`, `power-endurance`, `power`, `core` render precisely because they are empty, which is an accurate statement that this catalog trains max strength and conditions tissue and does nothing else. This *inverts* the `target` rule, where an unfillable slot fails the build because `pool.ts` would offer it; both rules are asserted in their own test so neither is copied onto the other. **(b) `block-max` is renamed `heavy`** — the tier means loaded heavy, run fresh, 1–2×/week, fixed within a block, which already admits a front-lever or muscle-up progression that is not a max. `Tier` is a code-seeded catalog field, so the rename has no stored value and no migration. |
| D49 | **A lane reports its own cadence and its own state. Nothing reads all lanes together** | D23 restated for a structure it was never written against, and recorded *before* the structure is built because every violation available here is one nobody has had the chance to make yet. A five-lane surface with per-lane state is one design slip from a list of five things the day owes. So, on Today and on anything rendering a lane: **no aggregation across lanes** — no count of lanes touched, no "3 of 5", no day-complete condition, no all-clear; **no done-state styling** — no lane changes colour, weight, elevation or icon because it ran today, and elevation encodes *cadence* (the two daily tiers are raised because they are always live) and never completion; **no ordering by staleness** — frequency is a fixed property of the tier, so lanes never reorder and the thing reached for yesterday is where it was left, while the pool still orders its own *targets* by staleness inside one lane; **no lane disabled, greyed, delayed or warned about** — T34 AC8 restated, because a lane is a new place to get the six-hour spacing wrong; and the words due, owed, missed, behind, late and streak stay out, along with any fraction whose denominator is a prescription. The reason is the plan's rather than a preference: §4F prescribes a lighter week "regardless of the schedule" and §7 reads a falling number as the deload signal, so a surface rewarding consistency argues against the owner's own safety rules. |
| D50 | **The 8-week block is the heavy lane's state, not the app's** | "Week 3 of 8" rides in the app header beside the wordmark, which frames the entire app as an eight-week program. It is not one and is not meant to be — owner's account, 2026-08-01: this is ongoing climbing and tendon training. Three of the four tiers are permanent and unperiodised; only `heavy` has phases, a deload and a retest at each end. So `BLOCK_PHASES`, the §4E battery and the edge×week tension grid move inside that lane and the global week chip is removed. Nothing in `block.ts` changes — D25's derive-don't-store is untouched — only what the week is allowed to frame. The three permanent tiers stop being visually enclosed by a countdown that has nothing to do with them. |
| D51 | **`target` is the rotation slot; `alsoLoads` is the load path. Two fields, because they answer two questions** | `target` is singular and `pool.ts` depends on it: staleness counts one movement as loading one tissue, and an array would silently change every interval in the rotation. But "which slot does this fill" and "what does this put load through" are different questions, and rehab asks the second — a muscle-up loads shoulder, elbow and wrist, and a front lever puts real load through the biceps tendon at the elbow. With one field, "what should I stop doing while this elbow settles" is answerable only for the movements §8 happened to name. So `target` stays primary and the rotation keeps reading only it, and `alsoLoads: JointTarget[]` is added beside it; symptom and emphasis surfaces read both. **Corollary: rehab and targeted prevention are one feature.** "Work this elbow back" and "bulletproof my shoulders for six weeks" are the same operation — temporarily raise one target's pool interval and mark everything whose `target ∪ alsoLoads` contains it. No new tier. It reports and marks; it never hides a movement, blocks a start, or scores adherence to the emphasis (D23, D31). |
| D52 | **A progression's rung is derived from the log. Advancing is a tap, never an inference** | A front lever is a ladder — tuck, advanced tuck, straddle, full — not an exercise, and nothing in the catalog expresses a rung. The obvious implementation breaks two rules at once: advancing when a target is hit is the app deciding the owner succeeded (D23, D16), and storing the current rung is state derivable from the log (D15, D25). So rungs are declared in the catalog in order, each with its own prescription; the current rung is derived from the most recent one logged, exactly as block position is derived from the first completed session; the app renders the ladder and the owner's place on it and offers the next rung as a **position**, never a promotion. Nothing regresses on its own either — a rung logged after a harder one is recorded as what it is, and §4F makes stepping back as often correct as stepping up. Not required by any stage of D47; recorded now because it was decided now, and because the shape must be settled before an implementation reaches for a stored `currentRung`. |
| D53 | **D42's rule applies to a set of sources, not to one document** | D42 bundled `docs/training-plan.md` and set the rule that survives verbatim here: sources are **displayed, searched and quoted; never parsed for meaning.** It renders one document because at the time there was one. There are already two, and `TierPrescription.source` is free text pointing at papers and coaches — *"Crimpd–Gilmore et al. 2024 cadence, Baar spacing"* — which is the newer and better shape and never reached the surface. So every prescription resolves to whichever source it cites rather than to a `§` in a document that may not be where the number came from. The citation discipline gets *stronger*: a dose sourced from a paper stops having to pretend it came from the plan. |

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
| T26 | Edge × week grid + time under tension | #12, #14 | 3 — insight | T24 (was T15 — see the 2026-07-25 T26 amendment) |
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

### [T20] Outcome: The owner can run a set with the phone on the floor and their eyes on the board — counted in, told which set is next, and told by pitch where they are in the hold window.
Spec: this file | Status: [x] | Depends on: T19 | Wave 1

#### Context manifest
Create: `src/lib/cues.ts` (+ `cues.test.ts`), `src/lib/speech.ts` | Modify: `src/types.ts`, `src/lib/timer.ts` (+ `timer.test.ts`), `src/lib/beep.ts`, `src/lib/chain.ts` (+ `chain.test.ts`), `src/components/SessionTimer.tsx`, `src/screens/ActiveSession.tsx`, `src/screens/Settings.tsx` | Conform to: D2a, D18, D19, D23, D31, D33, D34 | Delete: nothing

**The gap this closes, and it is the last purely visual one in a session.** Everything T19 added is on a screen the owner cannot look at: mid-hang the eyes are on the board and the phone is on the floor, and the two facts that matter at that exact moment — which set this is, and whether the hang has reached 7 seconds yet — are printed in 12px on a bar six feet away. §4B is worse still: 3–5 seconds at 100% max effort, and the app currently gives no signal at all for *when to start pulling*, so the owner taps Start, looks up, gets set, and pulls whenever they happen to be ready. Every one of those seconds is inside the measured hold.

**Two channels, and only one of them is allowed to matter (D34).** Tones already work on this device, and T13 paid for that: an `AudioContext` primed from a user gesture, `navigator.audioSession.type = 'playback'` so the ringer switch does not silence it, and a resume on the way back to the foreground. Web Speech is a *second* audio path with none of that history — it may be unavailable, may be muted, may lag, and on iOS may queue behind an utterance that is still speaking. So the rule is that the tone carries the **event** and the voice carries the **words**: every cue in this task fires as a tone regardless of settings or platform, and speech is added on top of it. Nothing in the session ever waits on `speechSynthesis`, and an install where speech never makes a sound behaves exactly as an install where it does, minus the words. This is the same failure-tolerance rule `beep.ts` already states, extended to a less reliable API.

**The count owns the clock (D33).** Owner decision, 2026-07-25: tapping Start begins a spoken count and the hold timer begins on **"pull"**, not on the tap. That makes `holdSec` measure the effort rather than the effort plus however long it took to step up and load — the same defect the deferred motion-sensor idea was going to fix, addressed here for the cost of a countdown that the protocol wants anyway. It is a change to what a recorded number *means*, which is why it is a decision and not an implementation detail, and it is free exactly once: the block has not started (confirmed 2026-07-24), so no logged hold exists that would be compared against a differently-measured one. After week 1 it would be D22's invalid comparison, on the axis §7 asks the owner to read.

The count is not an auto-start. T19 AC5 stands untouched: nothing begins a count except a tap, a completed rest still waits, and the seconds between the tap and "pull" are the owner's to cancel.

#### Settings additions — two optional fields, no schema movement

```ts
interface Settings {
  // …
  voiceCues?: boolean;   // D34: absent means on — the owner asked for the voice
  leadInSec?: number;    // D33: absent means 3; 0 turns the count off entirely
}
```

Both optional on an object `backup.ts` already carries whole, so `DB_VERSION` and `BACKUP_SCHEMA_VERSION` stay at 2 for the third task running.

#### Timer additions — one new phase, on the same absolute-instant math

```ts
type TimerPhase = 'idle' | 'counting' | 'holding' | 'resting';
interface TimerState { /* … */ leadInMs: number; }   // counting only
```

The count is a phase in `timer.ts`, not a `setTimeout` in a component, for D18's reason: every reading is `(now - startedAt)` against an absolute instant, so a throttled tick costs a stale frame and never a drifted count. The transition to `holding` sets `startedAt` to `countStart + leadInMs` rather than to the tick that noticed — the same correction `autoStopHold` already makes, and for the same reason: a late tick must not shorten a hold or lengthen a count.

#### The spoken set is closed, and short

| When | Tone (always) | Speech (when on) |
|---|---|---|
| Each second of the count | short tick | "three" … "two" … "one" |
| The count reaching zero | go tone, hold starts | "pull" |
| A whole second inside the target band | pip, pitch rising across the band | — |
| The hold reaching its maximum | `beepHoldEnd`, unchanged (T13) | — |
| A rest completing | `beepRestEnd`, unchanged (T13) | "Rest done. Set 4 of 5." |

**Nothing is spoken while a hold is running.** The owner is at 100% effort with their teeth together, and a voice reading numbers at them is noise they cannot act on. The band is reported in pitch instead, which needs no parsing: a pip at each whole second from `min` up to `max`, rising in frequency across the window, so "am I at 7 yet" and "how much of the window is left" are one sound. A fixed target (`min === max`) has no window and gets no pips — the end tone is the whole message. An open hold (T16's lock-off test) has no band at all and stays silent, because a pitch that reported a position in a range §4E deliberately does not prescribe would be inventing one.

#### Acceptance criteria
1. WHEN the owner taps Start on a timed hold and a count-in is configured THE app SHALL count down audibly and start the hold clock at zero, and the recorded `holdSec` SHALL measure from that instant rather than from the tap (D33). [x]
2. WHEN a count is running THE owner SHALL be able to cancel it in one tap, leaving no hold, no rest, no measurement, and no set (D19). [x]
3. WHEN the count-in is set to 0, or a hold is started with none configured THE hold SHALL begin at the tap exactly as T13/T19 left it. [x]
4. WHEN a hold is running inside its prescribed band THE app SHALL sound one pip per whole second, rising in pitch across the band, and SHALL sound none before `min`, none for a fixed target, and none for an open hold. [x]
5. WHEN a rest completes THE app SHALL speak which set is next, using T19's position, and SHALL still sound the existing rest tone whether or not speech is available or enabled. [x]
6. WHEN spoken cues are turned off THE app SHALL make every tone it makes with them on — count ticks, go, band pips, hold end, rest end — and say nothing. [x]
7. WHEN speech is unavailable, silenced by the device, or fails THE session SHALL be unaffected: no timer waits on it, no control is disabled, and no error is shown (D34). [x]
8. WHEN the owner opens Settings THE voice SHALL be togglable, the count-in length SHALL be editable in seconds, and both SHALL be testable off the training floor beside the existing "Test sound". [x]
9. WHEN the app is backgrounded during a count and returns after it would have ended THE app SHALL cancel the count rather than start (and possibly auto-finish) a hold nobody heard begin. [x]
10. WHEN a rest completes THE count SHALL NOT start by itself, and neither SHALL a hold (T19 AC5, restated because this task adds a second thing that could violate it). [x]
11. WHEN these settings are exported and re-imported THEY SHALL round-trip inside `settings`, and a `settings` object written before this task SHALL read as voice-on, count-in 3, with no migration and no version bump. [x]

#### Edge cases
- A count-in typed as junk, or negative, leaves the stored value alone — `StandardEdge`'s refusal rule, which every Settings field in this app now follows. Bounds accept 0–30: zero is "off", and a count longer than the rest between sets is not a count. [x]
- Starting a hold while a count is already running restarts the count rather than stacking two. There is one timer because there is one owner (`startHold`'s existing rule). [x]
- A band whose `min` is 0 (nothing in the catalog, but expressible) pips from second 1, not second 0 — a pip at the instant the clock starts would be indistinguishable from the go tone. [x]
- The 7–10s band pips at 7, 8 and 9; 10 belongs to `beepHoldEnd`, which already fires there and says something different ("let go", not "still going"). [x]
- Speech that is still speaking when the next cue fires is cut off, not queued: cues are perishable, and "two" arriving after "pull" is worse than "two" never arriving. [x]
- A hold started with a count on an exercise with no prescribed rest (the wall press) counts in identically and lands idle-with-a-result exactly as `stopHold` already leaves it. [x]
- Cancelling a count leaves the previous set's rest *gone*, because starting the hold took the timer slot — the same trade `startHold` has always made, and the reason cancel is one tap rather than buried. [x]
- The count runs during the §4E battery too. The tests are 7s max hangs and open lock-offs, and a count that starts the clock when the owner is actually loaded makes those numbers *more* comparable, not less. [x]

#### Non-goals & do-not-touch
- MUST NOT start a hold, a count, or a rest without a tap (T19 AC5, AC10 here).
- MUST NOT let any timer transition, control, or logged value depend on `speechSynthesis` succeeding (D34, AC7).
- MUST NOT speak during a running hold, and MUST NOT speak encouragement, adherence, ranking, or a verdict anywhere (D23). The voice reports a number and a word.
- MUST NOT add a voice picker, rate/pitch controls, or a downloaded voice asset. The platform voice is the platform's business.
- MUST NOT use the Notification API or anything that fires while the app is backgrounded (D2a, unchanged since v1.1).
- MUST NOT change `beepHoldEnd` or `beepRestEnd`. They are the two cues the owner has already learned, and T21 is about to lean on them harder.
- MUST NOT bump `DB_VERSION` or `BACKUP_SCHEMA_VERSION` (AC11).
- MUST NOT build any part of T21's eyes-shut mode. This task gives it the audio; the surface is its own.

#### Verify
`npm run test && npm run build && npm run lint`, plus an in-browser pass: start a max hang and confirm "3, 2, 1, pull" with the clock starting at zero on "pull" and the logged hold measuring from there; cancel a count mid-way and confirm nothing is left behind; set the count to 0 and confirm the hold starts on the tap; listen through a 7–10s hang for three rising pips then the low end tone; let a rest run out and hear "Rest done. Set 3 of 5."; turn the voice off and confirm every tone still fires and nothing is said; background the app mid-count and return late, confirming the count was cancelled rather than started.

#### Amendments

**2026-07-25 — T20 built. Build + lint clean, 356 tests green (32 new: 21 in `cues`, 9 in `timer`, 1 in `chain`, 1 in `backup`). All eleven ACs verified in a running browser against a real Day 1 session, including a 3 minute rest run to completion.** Files: `src/lib/cues.ts` (+ `cues.test.ts`), `src/lib/speech.ts`; modified `src/types.ts`, `src/lib/timer.ts` (+ `timer.test.ts`), `src/lib/beep.ts`, `src/lib/chain.ts` (+ `chain.test.ts`), `src/components/SessionTimer.tsx`, `src/screens/ActiveSession.tsx`, `src/screens/Settings.tsx`, `src/lib/backup.test.ts`. **No new dependencies, no new object store, and `DB_VERSION`/`BACKUP_SCHEMA_VERSION` both still 2** — read off the live database mid-session, four stores, exactly as the spec predicted for the third task running.

**The audio was verified by recording it, not by trusting it.** Cues are the one thing a screenshot cannot show, so the pass instrumented `AudioContext.prototype.createOscillator` and `speechSynthesis.speak` and read the log back. A max-hang set produced, in order: ticks at 440Hz on each of three seconds, the 990Hz go tone, then — measured from "pull" — pips at **7.00s (620Hz), 8.01s (767Hz) and 9.00s (913Hz)**, and the 520Hz hold-end tone at 9.99s, with the bar reading `✓ Held 10.0s` (AC1, AC4). Spoken alongside: "3", "2", "1", "pull", and nothing at all while the hold ran. A full 3 minute rest was allowed to run out, producing the rest tones followed by **"Rest done. Set 2 of 5."** with the bar offering `▶ Start set 2 of 5 · 7–10s` and sitting at 0:00 rather than starting it (AC5, AC10). Also verified: cancelling mid-count left no bar, no set and no go tone (AC2); a count-in of 0 put the tap straight into `HOLD` with no ticks and a manual Stop still recording real elapsed time (AC3); with the voice off, all five tones of a hold fired and the only utterance was the silent priming one (AC6); with `speak` rewired to throw on every call, the whole hold ran through — count, go, auto-stop at 10.0s, rest — with an empty console (AC7); the settings surface stored `leadInSec` and `voiceCues` and both survived a reload, with a junk count refused and the field snapping back to the stored value (AC8, AC11); and a count that was "slept through" (`Date.now` shifted forward 10s mid-count) was **dropped rather than started** — one tick, no go tone, no "pull", no hold (AC9).

Design calls:
- **A `counting` phase, and the hold back-dated to "pull".** The alternative — a `setTimeout` in the bar — would drift exactly where D18 says it must not, and would have to invent an answer for a count the app slept through. As a phase it is `(now - startedAt)` like everything else, and `holdFromLeadIn` sets the hold's `startedAt` to `countStart + leadInMs` rather than to the tick that noticed, the mirror of `autoStopHold`'s correction at the other end.
- **The stale-clock clamp, found by listening.** The bar's clock ticks every 100ms, so a count started while the bar was *already on screen* was first rendered against a `now` read up to a tick before it began — 3100ms of a 3 second count, and it said **"four"**. Clamping `leadInRemainingMs` to the count's own length fixed it; the browser log is what caught it, because the printed digit and the spoken one come from the same number and both were wrong for one frame. A count can never have more left than its length, which is now a test.
- **The refusal had to be made visible.** A junk count-in left the junk sitting in the field: the stored value was unchanged, so the value-keyed remount never happened. A read counter in the key remounts the input against what is actually stored, so a refused edit snaps back. The same wrinkle exists on the standard edge and gear fields (T16/T18) where the typed value differs from the stored one — noted, not touched, since it is those tasks' surface.
- **Nothing is spoken while a hold runs, and the band is pitched instead.** Confirmed as a deliberate silence rather than an omission: the words list for a full max-hang set is "3, 2, 1, pull" and then nothing until the rest ends. At 100% effort a voice reading numbers is noise the owner cannot act on; three rising pips are a fact they can.
- **The one announcement is at rest-end, not at set-start.** It was going to be both, and the two would have collided — "set 3 of 5" is still being spoken when the count needs to say "three", and `speak` cancels rather than queues (perishable cues). Rest-end is also where the phone is furthest away, which is where a spoken number is worth the most.
- **The spoken position drops the parenthetical.** `speakChain` says "set 6" past the prescription where the screen says "set 6 (5 prescribed)", and "4 to 6" where the screen says "4–6". A voice cannot punctuate, and the screen still carries both numbers — D23 is unchanged either way: a position, never a verdict.

---

### [T21] Outcome: The owner can run a whole exercise — start, hang, log, rest, next — from one full-screen surface whose every control is findable without reading, with the protocol legible from the board.
Spec: this file | Status: [x] | Depends on: T20 | Wave 1

#### Context manifest
Create: `src/lib/focus.ts` (+ `focus.test.ts`), `src/lib/timerCues.ts`, `src/components/FocusHold.tsx` | Modify: `src/components/SessionTimer.tsx`, `src/screens/ActiveSession.tsx` | Conform to: D16, D18, D19, D23, D33, D34, D35, D36 | Delete: nothing

**What is left after T20, stated precisely.** The cues now cover the parts of a set the owner cannot watch: counted in, pipped through the target window, told when the rest is done and which set is next. What they do not cover is the two moments that still require *finding something*: tapping Start, which lives on one of six cards in a scrolling list, and tapping "Log 8.4s as a set", which is a 14px strip on a bar at the bottom of the screen — with chalked hands, standing at the board, immediately after a maximum effort. Those two taps are the whole of what is left, and both are aim problems rather than reading problems.

**So the surface changes, not the behaviour (D35).** Focus is a *rendering* of the session that already exists: it calls the same handlers, writes through the same `addSet`, runs the same timer state, and stores nothing of its own. That is a decision rather than an implementation note because the obvious next request — "let me fix the load from in here" — is what would turn it into a second source of truth with its own rules about carry-forward and completion. Values are entered on the card, where the eyes are already open (T18's pickers exist for exactly that moment).

**And the screen is not a button (D36).** The owner chose one giant Stop over tap-anywhere, and the reason generalises: a hold ends on a deliberate control or on its prescribed maximum (T13), never on ambient contact. A knee, a hip, a brushed screen on the way past must not end a max hang, because ending it writes a number that then enters the series §7 asks the owner to read. Blind-operable means *findable by feel*, which a full-width control at the bottom of the screen is; it does not mean *triggerable by accident*.

**The wall card, on the screen that is already in the room.** The v1.8 ideation rejected a printable protocol card ("I'm just not going to print it") and recorded that this task covers the problem it addressed. So focus shows what that card would have: the exercise's prescription and cues, the position against the prescribed sets, and what the same exercise measured last time (T11) — at a size that reads from a few feet, in the two phases where the owner is standing still and can look (idle and resting), and never at the expense of the clock while a hold runs.

#### The cue seam — extracted, because two views must not both sound

The auto-stop and every cue currently live inside `SessionTimer`. A second view of the same timer would either double every tone or silence half of them, so both move into `useTimerCues(...)` in `src/lib/timerCues.ts` alongside `useNow`, and **exactly one of the two views is mounted at a time**. The hook is given the *timer's* exercise, not the focused one, so cues keep firing correctly even when focus is open on something else.

#### Acceptance criteria
1. WHEN an exercise declares a hold THE session SHALL offer a full-screen focus surface for it; an exercise with no hold SHALL be unchanged (no control, no surface). [x]
2. WHEN focus is open THE whole set loop — start, count, hold, log, rest, next set — SHALL be driven by one primary control at a time, filling the width and at least a fifth of the viewport height, positioned at the bottom of the screen and reachable without scrolling. [x]
3. WHEN a hold is running THE elapsed time SHALL be rendered at least four times the body text size, and the ONLY control that ends it SHALL be that primary button — the surface, the backdrop, and every readout SHALL be inert (D36). [x]
4. WHEN a hold ends THE measured time SHALL be loggable in one tap, and that tap SHALL produce exactly the set the card's control produces — same carry-forward, same standard edge, same auto-stop end reason (D35). [x]
5. WHEN focus is open THE cues SHALL fire exactly once each: no doubled tone, no doubled utterance, and the count, auto-stop, band pips and rest announcement SHALL behave exactly as T13/T19/T20 left them. [x]
6. WHEN focus is open and no hold is running THE exercise's prescription, cues, position, and last time's numbers SHALL be shown at a size readable from the board; WHEN a hold is running the clock SHALL have the screen. [x]
7. WHEN the owner leaves focus THE timer SHALL keep running, every logged set SHALL be intact, and re-entering SHALL show the phase the timer is actually in. [x]
8. WHEN a rest completes in focus THE next set SHALL start in one tap and SHALL NOT start by itself (T19 AC5, D33's count still applies). [x]
9. WHEN focus is opened on an exercise while the timer belongs to a different one THE surface SHALL say so plainly rather than hiding a running clock, and starting here SHALL take the timer exactly as it always has. [x]
10. WHEN a set's values need entering THE owner SHALL do it on the card: focus SHALL NOT reproduce the pickers, the reason chips, the notes field, or the delete control (D35). [x]
11. WHEN focus is open THE state SHALL be view state only — nothing persisted, nothing in the backup, no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement (D18). [x]

#### Edge cases
- An exercise with a hold but no rest (the wall press) returns to the Start control after logging rather than showing a rest that the plan does not prescribe. [x]
- §4E's open hold has no maximum to auto-stop at, so Stop is the only way it can end — which is exactly why it is the largest thing on the screen. No target band, no pips, no "in range" (T16). [x]
- An exercise with no `prescribedSets` shows no position at all, exactly as T19 AC7 requires — the surface does not invent one to fill the space. [x]
- Leaving focus mid-count leaves the count running on the bar; the count does not belong to the view (D18). [x]
- A hold performed and dismissed rather than logged leaves the position where it was, and the surface reads the same set number when it comes back around (T19's rule, unchanged). [x]
- Focus opened on an exercise with no last-time record shows the protocol without an empty "Last —" line. [x]
- The exit control is small and cornered on purpose: it is the one thing on this screen that must *not* be easy to hit by feel. [x]

#### Non-goals & do-not-touch
- MUST NOT end a hold on a tap outside the primary control, a swipe, a shake, or any ambient contact (D36).
- MUST NOT auto-start anything, auto-log anything, or mark an exercise completed (D16, D19, T19 AC5).
- MUST NOT duplicate any set-entry control: no pickers, no chips, no notes, no delete (D35, AC10).
- MUST NOT introduce a second timer, a second cue path, or a second definition of the position. Both views read one state through one hook.
- MUST NOT persist which exercise is focused, or restore focus on reload (D18: view state is not data).
- MUST NOT grade, congratulate, or show an adherence figure on a surface this prominent (D23 — a full-screen "3 of 5 done!" is exactly the thing the rule exists to prevent).
- MUST NOT add a dependency, an animation library, or a fullscreen/orientation API. It is a fixed-position div.

#### Verify
`npm run test && npm run build && npm run lint`, plus an in-browser pass at 390px: open focus on a max hang and confirm the primary control's measured height is at least a fifth of the viewport at every step; run a full set — count, hold, giant Stop, one-tap log — and confirm the logged set matches what the card writes; confirm the tone and utterance log shows each cue exactly once with focus open; leave focus mid-rest and confirm the bar has the same clock; re-enter and confirm the same phase; confirm an exercise with no hold offers no focus control.

#### Amendments

**2026-07-25 — T21 built. Build + lint clean, 364 tests green (8 new, all in `focus`). All eleven ACs verified in a running browser at 375×812, including a second real 3 minute rest run to completion inside the surface.** Files: `src/lib/focus.ts` (+ `focus.test.ts`), `src/lib/timerCues.ts`, `src/components/FocusHold.tsx`; modified `src/components/SessionTimer.tsx`, `src/screens/ActiveSession.tsx`. **No new dependencies, no storage of any kind, and the live database unchanged at version 2 with four stores** — focus is view state that does not survive a reload, which the pass confirmed by reloading into the session and finding the surface closed and every set intact.

**The controls were measured, not eyeballed.** "Findable by feel" is a size claim, so the pass read `getBoundingClientRect()` at every step of a full set rather than looking at it: Cancel, STOP, Log and Start each rendered **179px tall — 0.22 of an 812px viewport — full width, bottom edge at 796px**, with the clock at **72px, 4.5× the 16px body text**. The `min-h-[22vh]` is deliberate for that reason: a padding guess does not survive a short viewport, and AC2 is a fraction of the screen.

Verified on the running app: focus is offered on the five exercises that declare a hold and withheld from the warm-up progression, which does not (AC1); a full set ran count → hold → Stop → log entirely from the primary control, and the set it wrote (`holdSec 1.6`, carry-forward fields identical) matches the shape the bar writes, with no `endReason` because a manual stop is ambiguous and an auto-stop is not — exactly T14's rule (AC4); **three ambient taps during a running hold — the backdrop, the exercise title, and the clock itself — did nothing, the hold continuing from 1.1s to 1.6s with STOP still on screen** (AC3, D36); the cue log for a full auto-stopped hang read 440, 990, 620, 767, 913, 520 with each tone exactly once and no doubled utterance, proving the extracted `useTimerCues` fires for one mounted view only (AC5); the prescription and cues were on screen before the count and during it, **absent while holding**, and back the moment the hold ended (AC6); exiting mid-rest left the bar reading the same clock (2:31) and re-entering came back to the same phase at the same second (AC7); a 3 minute rest run out inside focus produced the rest tones, "Rest done. Set 4 of 5.", a clock sitting at **0:00**, and a control that had become `▶ Start set 4 of 5` **without starting anything** (AC8); opening focus on the open-hand hang while the half-crimp rest ran showed "A timer is still running on Max Hang — Half-Crimp. Starting here takes it over." rather than a hidden clock (AC9); and the surface contains **zero inputs and exactly three other buttons** — Exit, +30s, Skip rest — so no picker, chip, note or delete was reproduced (AC10).

Design calls:
- **The cues had to move before the second view could exist.** `useTimerCues` is not a refactor for tidiness: two views of one timer would double every tone and every utterance, and the alternative (keeping the bar mounted but hidden) would have made "which view is sounding" a rendering accident. Extracting it makes the rule enforceable — exactly one view is mounted, and it holds the hook. The hook is given the *timer's* exercise rather than the focused one, which is what lets a rest on one exercise announce correctly while focus is open on another.
- **An unlogged result outranks a running rest.** The bar can show both at once; a surface with one control has to choose, and `focusStep` chooses the set that stops existing if it is not tapped (D16). That is one line of a tested function rather than a ternary chain in a view, which is the same split `chain.ts` and `gear.ts` already use.
- **A running rest gets no button at all.** The `wait` step renders a dashed, non-interactive panel of the same height rather than a Skip — layout does not jump, and §4C's three minutes get no enormous escape hatch. Skip and +30s stay small, above, where a deliberate hand finds them and a hurried one does not (T19's rule, restated where the button would have been huge).
- **The exit is the one control that must not be findable by feel.** Small, cornered, and low-contrast on purpose. Everything else on this screen is designed to be hit without looking; leaving mid-set is the one action that should cost a glance.
- **The wall card yields to the clock.** The rejected printable card's content — prescription, cues, last time's numbers — lives here, but only while the owner is standing still. Rendering it under a running hold would trade the one number they cannot afford to lose for text they cannot read mid-effort.

---

### [T22] Outcome: The three minutes the plan prescribes between sets become the surface that teaches the protocol and reports the numbers the next set is chosen against — paced, unactionable, and drawn entirely from the catalog.
Spec: this file | Status: [x] | Depends on: T19 | Wave 2

#### Context manifest
Create: `src/lib/rest.ts` (+ `rest.test.ts`), `src/components/RestCard.tsx` | Modify: `src/lib/timer.ts` (+ `timer.test.ts`), `src/components/SessionTimer.tsx`, `src/components/FocusHold.tsx`, `src/screens/ActiveSession.tsx` | Conform to: D6, D18, D19, D23, D35, D37, D38 | Delete: nothing

**What the rest actually looks like today, stated precisely.** A Day 1 session is five sets of three minutes (§4C) plus four to six of the same on the PIMA pulls (§4B) — around fifteen minutes per session, eight weeks of them, and the app currently spends every one of those minutes on a countdown, a `+30s` and a `Skip`. Focus mode (T21) is the honest illustration: while a rest runs, the primary control renders a dashed box reading *"Rest — the app will tell you"*. That box is the task.

**Two things exist in the app and are never on screen when they are useful.** The first is each exercise's `howTo` and `safetyNotes` — authored from the plan at T2, and reachable only by leaving the session for the detail view. The second is a side-by-side of what this exercise has done *this session* against what it did *last* time, which is precisely the comparison §4F's "small load increments (1–3%)" and §7's "spot a downward trend" ask the owner to make, and which currently costs a scroll past the timer bar to the card. The rest is when both are wanted and neither is shown.

**Why it may pace itself, and why that is not D36 loosening.** D36 says a hold ends on a deliberate control or its prescribed maximum, never on ambient contact — because ending a hold *writes a number* into the series §7 asks the owner to read. Nothing on this surface writes anything, and nothing on it is tappable, so nothing about it can misfire. That asymmetry is worth stating as a rule rather than assuming, which is what **D37** does: dead time is a reading surface, never a control surface. Content that cannot be acted on is allowed to advance on its own; content that can, never is.

**And it teaches from the catalog, not from the plan file (D38).** `docs/training-plan.md` is not in the app and does not become so here — T25 owns that, and pulling the prose in early would fork the question of what "in-app plan" means across two tasks. The catalog is already the plan, transcribed once at T2 under D6's no-invention rule, and its `safetyNotes` already carry their citations inline ("…(plan §7)"). So D23's *report and cite* is satisfied by content that was cited when it was written, and this task authors no training copy at all.

#### The deck — one card a minute, chosen by a pure function

`restDeck(...)` builds the interval's reading list and `restCardIndex(...)` says which card is up. Both are pure, both live in `src/lib/rest.ts`, and both serve two renderings, exactly as `chain.ts` serves the bar and the focus surface.

- **A card is a minute.** `CARD_MS = 60_000`. The index is `floor(elapsedRest / CARD_MS)` clamped to the deck, so it is `(now - startedAt)` arithmetic like everything else in D18's world — a throttled tick costs a stale frame, never a lost card, and a backgrounded rest comes back on the card it should be on.
- **The deck is as long as the interval affords**, `round(restMs / CARD_MS)`, floored at one and capped at the number of distinct cards available — so a 3 min max-hang rest reads three, §5A's 2 min reads two, and the abrahangs' 50s reads one. A card never repeats inside one deck.
- **`+30s` may lengthen the deck; it can never reorder it.** Two things are needed for that, not one. The index is computed from elapsed time rather than from the deck, so a longer deck cannot move the card on screen; *and* the offset into the pool is strided by what the **prescribed** rest affords rather than by what the running one does, so a longer deck cannot change which cards are in it. Extending a rest therefore appends, and nothing shifts under the reader.
- **The report leads, the protocol follows.** Card one is the session report where there is anything to report; the rest are drawn from the exercise's own `howTo`, then `cues`, then `safetyNotes`, in that fixed order.
- **Consecutive rests teach different things.** The protocol cards start at an offset of `rotation × slots` into the pool and wrap, where `rotation` is the count of sets already logged for that exercise. Five rests therefore walk the whole protocol instead of showing cue #1 five times. It is keyed on the logged count and not on a stored cursor, for T19's reason: delete a set and the position moves back with it.
- **Nothing random.** Not a taste call — the surface re-renders every 100ms, so a `Math.random()` selection would resample on every tick and the card would strobe.

#### Acceptance criteria
1. WHEN a rest is running THE surface SHALL show one card at a time drawn from the exercise's own catalog content and this session's logged sets, and SHALL advance approximately once a minute without any tap. [x]
2. WHEN the deck advances THE card shown SHALL be a function of elapsed rest time only — re-rendering, backgrounding and returning, or extending the rest SHALL NOT move it backwards or reorder what has already been read. [x]
3. WHEN a rest is extended by `+30s` THE deck MAY gain a card at the end and SHALL NOT change the card currently on screen. [x]
4. WHEN the interval is too short to afford a second card THE deck SHALL be one card long rather than flashing several. [x]
5. WHEN consecutive rests of the same exercise run THE protocol cards SHALL differ, walking the pool in order and wrapping, until every `howTo` step, cue and safety note has been shown. [x]
6. WHEN the session report card is shown THE sets logged for that exercise this session AND last time's summary SHALL be readable together, with no target, no delta, no percentage and no verdict of any kind (D23). [x]
7. WHEN a rest completes THE reading SHALL end and the surface SHALL return to what T19/T21 already do — the next set, in one tap, started by the owner and never by itself. [x]
8. WHEN the surface is rendered THE whole of it SHALL be inert: no card, dot, label or body text SHALL be a control, and nothing on it SHALL end the rest, start a set, or write to a log (D37). [x]
9. WHEN focus mode is open during a running rest THE deck SHALL occupy the reading area at a size legible from the board, and the primary-control slot SHALL keep the non-interactive panel T21 gave it. [x]
10. WHEN the timer bar is the only view THE same card SHALL appear in a compact form that adds no more than two lines and covers nothing on the card beneath it — the owner is entering that set's load while it runs. [x]
11. WHEN an exercise has no catalog content and no history THE surface SHALL fall back to exactly what T21 renders today rather than showing an empty frame. [x]
12. WHEN the deck is built THE state SHALL be view state only — nothing persisted, nothing in the backup, no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement, and no new field on any stored type (D18). [x]

#### Edge cases
- A rest started from the bare "Start rest" control (an exercise with a rest but no hold) has no hold to report; the deck is protocol-only and shows no empty report card. [x]
- A rest running on one exercise while focus is open on another keeps reporting the *timer's* exercise, exactly as the cues do (T21 AC9) — the deck follows the clock, not the view. [x]
- The first rest of a first-ever session has nothing under "Last"; the report card shows this session's sets alone rather than an empty line. [x]
- A hold stopped and not yet logged leaves the report showing the sets that exist; the unlogged one is absent, because the app must not believe in a set no record contains (D16). [x]
- An exercise whose `safetyNotes` are empty simply has a shorter pool — the deck shortens, and nothing is invented to fill it (D6). [x]
- A rest extended repeatedly past the pool's length stops adding cards rather than repeating one. [x]
- Deleting a set mid-rest moves `rotation` back, which is allowed to change the *next* rest's cards and must not change the one on screen. [x]

#### Non-goals & do-not-touch
- MUST NOT make any part of the surface tappable, or add a second way to end, skip, or extend a rest (D37). `+30s` and `Skip` stay exactly where and exactly as small as T19 left them.
- MUST NOT read, bundle, parse, or quote `docs/training-plan.md` — the catalog is the source, and the plan file is T25's (D38, D6).
- MUST NOT author new training copy, reword a cue, or add a catalog field.
- MUST NOT compute a delta, a percentage, a target, a projection, or a "you're up 3lb" of any kind on the report card (D23, D19) — it shows the numbers and stops.
- MUST NOT auto-start the next set when the last card is reached, or shorten a rest because the reading finished (T19 AC5).
- MUST NOT use `Math.random`, a `setTimeout`, an animation library, or a transition that costs a frame budget on a 100ms render loop.
- MUST NOT persist which card was reached, or restore it on reload.

#### Verify
`npm run test && npm run build && npm run lint`, plus an in-browser pass at 390px: run a real 3 minute rest and confirm three distinct cards, each for about a minute, the first being the session report; press `+30s` at 2:30 and confirm the card on screen does not change; background the app for 90s mid-rest and confirm it returns on the card the clock says, not on the one it left; run the second and third rests of the same exercise and confirm the protocol cards differ from the first's; confirm the bar version adds no more than two lines and the card beneath stays reachable; tap every part of the surface during a rest and confirm nothing happens.

#### Amendments

**2026-07-25 — T22 built. Build + lint clean, 391 tests green (27 new: 26 in `rest`, 1 in `timer`). All twelve ACs verified in a running browser at 375×812 against a real Day 1 session, driving the rest clock rather than waiting out four three-minute intervals.** Files: `src/lib/rest.ts` (+ `rest.test.ts`), `src/components/RestCard.tsx`; modified `src/lib/timer.ts` (+ `timer.test.ts`), `src/components/SessionTimer.tsx`, `src/components/FocusHold.tsx`, `src/screens/ActiveSession.tsx`. **No new dependencies, no new field on any stored type, and the live database unchanged at version 2 with four stores** — read off the running app after four logged sets.

**The clock was driven, not waited out.** Verifying a paced surface honestly means seeing it at 0:30, 1:30 and 2:30 of four separate three-minute rests, so the pass shimmed `Date.now` with an offset and read the DOM back — which is legitimate here precisely because D18 means every reading is `(now - startedAt)`, so a shifted clock exercises the real code path rather than a stub. A full max-hang rest read, in order: **`THIS SESSION · 20mm · +35lb · 10.0s ×4`, then `HOW TO · STEP 1 OF 4`, then `HOW TO · STEP 2 OF 4`**, at 18px body against a 12px label, with the dot row moving 1/3 → 2/3 → 3/3 (AC1, AC6). Across the session's four rests the protocol cards were `h3,h4` → `c1,c2` → `s1,s2` → `h1,h2`: **the exercise's whole eight-card pool, no card twice, wrapping exactly where the arithmetic says** (AC5). Also verified: the deck vanished the instant the rest completed and T21's wall card came back with `▶ Start set 4 of 5` (AC7); the card block contained **zero interactive elements and only `DIV`, `P` and `SPAN` tags**, and the primary slot was still a non-interactive `DIV` at 179px, 0.22 of the viewport (AC8, AC9); the compact form measured **44px — a label and one line** — with the just-logged set's inputs at y=608 still clear of the bar top at y=659 (AC10); and a rest backgrounded from 0:40 to 2:10 came back on `SAFETY 2 OF 2`, the card the clock says rather than the one it left (AC2).

**The one thing the spec got wrong, and the browser is what caught it.** AC3 failed on the first pass: pressing `+30s` at 1:05 changed the card *on screen* from `CUE 1 OF 2` to `SAFETY 1 OF 2`. The spec had asserted the guarantee and only built half of it — the index was correctly a function of elapsed time, but the **offset into the pool was strided by the deck's own length**, so a longer deck meant a longer stride meant a different slice of the pool. The stride now comes from the rest the *plan* prescribes rather than the one the owner is running, which is the honest split: extending an interval is the owner's business, and where the reading picks up is the exercise's. Re-verified at the same moment — the card held, the dot row went 2/3 → 2/4, and the appended card appeared at 3:05. Both halves of the guarantee are now tests, across every rotation rather than the one that happened to be on screen.

Design calls:
- **Two numbers, not one, and the second exists only because of that bug.** `restMs` sets how long the deck is; `prescribedRestMs` sets where it starts. Collapsing them reads cleaner and is wrong, which is the sort of thing a unit test written from the same assumption as the code will happily confirm.
- **Logging a set mid-rest does change the deck, and that is correct.** The report card cannot exist before there is something to report (D16), so tapping Log adds it and advances the rotation. In practice the window is the two seconds between STOP and Log; recorded here rather than engineered away, because the alternative — pre-empting a set no record contains — is the thing D16 exists to forbid.
- **The report is the exercise's own rows, not a comparison of them.** `20mm · +35lb · 10.0s ×4` and last time's line, and nowhere for a delta to live — the returned object has exactly four fields, which is now a test. §4F's 1–3% is a judgment about how the last set *felt*, and this surface is three minutes of the owner's attention at exactly the moment that judgment is made, which is precisely when an arrow would do the deciding for them.
- **The citations came free.** `SAFETY 1 OF 2` rendered "One max-intensity finger session per week is enough; keep the second submaximal (plan §7)" — D23's *cite* satisfied by content that was cited when it was transcribed at T2, which is the whole argument for D38 in one line of output.
- **The deck follows the clock, not the view.** Resolved once in `ActiveSession` for the timer's exercise and handed to whichever view is mounted — the same rule the cues follow, and the reason a rest on the half-crimp hang keeps reporting the half-crimp while focus sits on the open-hand one.

**2026-07-25 — T21 AC6 amended by this task.** T21 required that with focus open and no hold running, "the exercise's prescription, cues, position, and last time's numbers SHALL be shown". That block is now replaced *for the duration of a running rest only* by the paced deck, which carries the same content plus `howTo` and `safetyNotes`, one piece at a time instead of all at once. Before the first set, after a rest completes, and any other time no hold is running, T21 AC6 is unchanged and the static wall card renders exactly as it did. Recorded here rather than assumed: showing both would put the same cue on screen twice, and the deck is a superset of what it replaces.

---

### [T23] Outcome: The 10–15 minutes §7 calls the difference between a plateau and a torn pulley are run from one surface — staged where the plan stages, cadenced where the plan cadences, and inventing neither.
Spec: this file | Status: [x] | Depends on: T19 | Wave 2

#### Context manifest
Create: `src/lib/warmup.ts` (+ `warmup.test.ts`), `src/components/WarmupRunner.tsx` | Modify: `src/screens/ActiveSession.tsx` | Conform to: D6, D16, D17, D18, D19, D23, D33, D35, D36, D37, D39, D40 | Delete: nothing

**What the warm-up gets today, stated precisely.** §7 names cold pulleys "the #1 cause of finger injuries in exactly your grade range" and §4A gives the warm-up 10–15 minutes and four ordered stages. In the app, `finger-warmup-progression` declares no `holdSeconds`, no `restSeconds` and no `prescribedSets`, so it renders as a card with "+ Add set", a notes field and "Mark done" — the four stages are `howTo` prose, reachable only through Info or the detail view. The other warm-up, `abrahangs-no-hang`, is `10s on / 50s off` for about ten minutes: roughly ten rounds, and therefore roughly ten taps on a control that scrolls away under the timer bar. T10 looked at that shape and explicitly declined to build a cadence runner for it. This task builds it, for the warm-up only.

**Two shapes, one gate, and the gate is the catalog.** A runner is offered where `category === 'warmup'` and nowhere else. That is deliberately a property of the exercise rather than a flag on a surface: it is what makes it impossible for a max hang or a PIMA pull to ever reach the auto-repeating path, no matter what is built on top of this later. Within the gate the form follows what the entry declares — a hold and a rest means a **cycle**, anything else with `howTo` steps means a **staged** run.

**The runner paces what the plan paces and reports what it does not (D40).** §4A states "10–15 min" for the whole warm-up and never says how long the jugs take. So the staged form advances on a deliberate tap and shows elapsed against the prescription; it does not count down a stage duration, because inventing one would be authoring training content the plan withheld (D6), and a countdown is read as a prescription no matter how it is captioned. The cycle form is the opposite case — §4A's abrahangs *do* state both intervals, so the app runs exactly those two numbers and counts the rounds rather than capping them at a total it would have to infer from prose.

**And a warm-up round may start itself, where a working set never may (D39).** T19 AC5 exists because a max-effort finger hold must not begin with the owner off the board — the hold *authors a number* that enters the series §7 asks them to read. An abrahang authors nothing: the entry declares no `metrics`, the runner writes no set, and a round nobody performed leaves the log byte-identical. That is the same asymmetry D37 used for the rest surface, applied to starting instead of reading. It is fenced twice: by the catalog gate above, and by a visibility rule — a transition the app slept through **ends** the cycle rather than starting a round nobody heard begin, exactly as T20 AC9 drops a count-in it slept through.

#### Acceptance criteria
1. WHEN an exercise is catalogued as a warm-up THE session SHALL offer a runner for it; every other exercise SHALL be unchanged — no control, no surface, and no path by which anything can start itself. [x]
2. WHEN the warm-up declares no cadence THE runner SHALL show its stages one at a time in the plan's order, advanced only by a deliberate tap, with total elapsed shown against the prescription and no stage counting down. [x]
3. WHEN the warm-up declares a hold and a rest THE runner SHALL run rounds of exactly those two intervals and SHALL report how many rounds have run, without capping them at a number the plan states only in prose. [x]
4. WHEN a round's rest completes with the runner on screen THE next round SHALL begin without a tap; WHEN the app was suspended past that moment THE cycle SHALL end instead (T20 AC9's rule, restated for starting a round). [x]
5. WHEN a cycle runs THE cues SHALL be exactly the ones T13/T20 already fire, through the one existing path — no new audio, no doubled tone, no doubled utterance. [x]
6. WHEN a round ends THE app SHALL write nothing: no set, no measurement, no end reason, and no completion (D16, D19). [x]
7. WHEN the runner is open THE loop SHALL be driven by one primary control at a time, filling the width and at least a fifth of the viewport height, at the bottom of the screen and reachable without scrolling (T21's rule, restated). [x]
8. WHEN a run is finished THE owner SHALL be able to mark the warm-up complete in one tap from here, and it SHALL NOT be marked by anything else (D16) — this is the condition §4E reads back as "after a thorough warm-up". [x]
9. WHEN the owner leaves the runner THE auto-repeat SHALL stop rather than continue unattended; an interval already running SHALL keep running on the bar, and every logged set SHALL be intact (T21 AC7). [x]
10. WHEN the runner is open THE state SHALL be view state only — nothing persisted, nothing restored on reload, nothing in the backup, no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement, and no new catalog or stored field. [x]

#### Edge cases
- §4E's battery opens with the same warm-up entry, so the runner is offered there identically — which is the point, since "after a thorough warm-up" is a recorded condition of that test (D29). [x]
- A cycle round starts the hold directly, with **no count-in**: D33's count exists so `holdSec` measures the effort rather than the tap offset, and a warm-up round records no `holdSec` — so the count would buy nothing and spend three seconds of a prescribed sixty-second cadence. [x]
- A warm-up declaring an open hold (`'open'`) has no maximum to auto-stop at, so it is not a cycle and falls to the staged form rather than repeating forever. [x]
- A warm-up declaring a hold but no rest has no cadence to repeat and likewise runs staged. [x]
- The last stage of a staged run offers finishing rather than a fifth stage that does not exist. [x]
- Re-entering the runner starts a fresh run: the elapsed clock is view state and does not survive leaving (D18). [x]

#### Non-goals & do-not-touch
- MUST NOT offer a runner, or any auto-start, for an exercise outside `category === 'warmup'` (D39). §4B's rep-structured PIMA variant (5 × 4 × 3s, ~10s between reps) is a cadence too, and it is a **max-effort protocol** — it stays exactly as T10 left it, and re-proposing it needs its own decision.
- MUST NOT invent a per-stage duration, reword a stage, or add a catalog field to hold one (D6, D40).
- MUST NOT log a set, write a measurement, or mark anything completed without an explicit tap (D16, D19).
- MUST NOT introduce a second timer, a second cue path, or a second definition of a hold. The cycle drives the session's one timer, and exactly one view is mounted.
- MUST NOT keep repeating while the surface is closed or the app is suspended (D39's fence — an unattended cycle beeping into an empty room is the failure mode the carve-out has to exclude).
- MUST NOT persist which stage or round was reached, or restore a run on reload (D18).
- MUST NOT grade the warm-up, score it against 10–15 min, or say it was too short (D23) — §4A's range is a range, and §4F's lighter week makes a shorter one correct as often as not.

#### Verify
`npm run test && npm run build && npm run lint`, plus an in-browser pass at 390px: open the runner on the finger warm-up and confirm four stages advancing only on a tap with elapsed climbing and nothing counting down; open it on the abrahangs and confirm rounds of 10s and 50s repeating with no tap, the round counter advancing, and the tone log showing each cue exactly once per round; leave mid-cycle and confirm the repeat stops while the running interval survives on the bar; suspend the app across a rest boundary and confirm the cycle ended rather than started a round; confirm the log is byte-identical after a full cycle; confirm no non-warm-up exercise offers the control.

#### Amendments

**2026-07-25 — T21 AC1 amended by this task.** T21 required a focus surface wherever an exercise declares a hold, which included `abrahangs-no-hang`. A warm-up's full-screen surface is now the **runner** instead: it starts the same holds, adds §4A's cadence, and paces the stages an untimed warm-up has in place of a clock. Two full-screen surfaces for one exercise would be two answers to the same question, so the runner takes the place of both the hold control and ⤢ Focus on the two warm-up cards. Every other exercise's controls are untouched, and T21 AC1 is unchanged for them.

**2026-07-25 — T23 built. Build + lint clean, 408 tests green (17 new, all in `warmup`). All ten ACs verified in a running browser at 375×812, including three consecutive auto-started rounds of the real 10s/50s cadence.** Files: `src/lib/warmup.ts` (+ `warmup.test.ts`), `src/components/WarmupRunner.tsx`; modified `src/screens/ActiveSession.tsx`. **No new dependencies, no catalog field, no stored field, and the live database unchanged** — the runner's only reachable effect on the log is D16's completion mark, and only on a tap.

**The fence was verified by hitting it, twice, by accident.** The pass drove `Date.now` with an offset, as T22's did. The first two attempts at the cycle stopped dead after round one — and both times the cause was the harness advancing simulated time faster than the 100ms render loop samples it, so every rest boundary arrived more than `CYCLE_GRACE_MS` late and **the cycle correctly ended rather than starting a round nobody heard begin** (AC4). A third stop had a different cause and the same character: the preview pane reports `document.visibilityState === 'hidden'`, which is exactly what D39's second fence blocks on. Three independent ways of not being watched, three refusals to auto-start. Crawling the clock across each boundary at under a render tick, with visibility simulated as on-screen, produced what the plan asks for: **rounds 1, 2 and 3 with one tap total**, each firing 520Hz at the hang's end and 880Hz/1170Hz at the rest's, with "Rest done." spoken once per round — T13 and T20's existing cues through the existing path, nothing new (AC5).

Also verified on the running app: the runner is offered on exactly `finger-warmup-progression` and `abrahangs-no-hang` and on nothing else, with the PIMA pulls and max hangs still showing Start + ⤢ Focus unchanged (AC1); the staged run walked §4A's four stages in order, advancing only on a tap, with the dots filling and **nothing counting down** (AC2); the primary control measured **179px — 0.22 of an 812px viewport, bottom edge at 796px** — at every step of both forms (AC7); exiting mid-cycle left the running rest on the bar and pushing 120s past its end started nothing (AC9); and **the log was byte-identical before and after three full rounds** — four max-hang sets, no abrahangs entry at all (AC6). Completion was recorded by the "✓ Warmed up" tap and by nothing else: opening the runner marked nothing, reaching the last stage marked nothing (AC8).

Design calls:
- **The gate is `category === 'warmup'`, in the catalog.** Not a prop, not a flag on the surface, not a list in the component. It is the whole safety argument for D39, so it is the first line of `warmupPlanOf` and it has a test that enumerates every catalog entry and asserts exactly two of them can reach the path.
- **The run clock ticks unconditionally, unlike the other two surfaces.** `SessionTimer` and `FocusHold` pass `state.phase !== 'idle'` to `useNow` because they have nothing to show when the timer is idle. A *staged* warm-up leaves the session timer idle from beginning to end while its own elapsed clock runs, so this surface ticks on its own. Found the way these things are found: the clock read 0:00 for four stages.
- **Finishing records; nothing else does.** The last stage's primary is `✓ Warmed up` and it marks the exercise done on the way out — still one deliberate tap, which is all D16 asks. What D16 forbids is the *app* deciding, not the owner saying so with the button already under their thumb. The small toggle stays for the cycle form and for taking it back.
- **A stopped cadence resumes from a small control.** `▶ More rounds` sits above the primary at secondary size, T21's rule restated: the button that resumes a warm-up must not be the size of the one that ends it.

**Two observations, neither introduced here and neither in scope:** re-entering any full-screen surface while a *completed* rest sits on the timer re-fires its rest-end cue, because `useTimerCues` keys on the phase's start instant through a ref that is fresh on mount — T21 behaviour, now easier to trigger. And exiting a cycle mid-round leaves an unlogged `✓ Held 10.0s` on the bar offering to log a warm-up round as a set; it is honest (the hold did happen) and D16 means nothing is written unless tapped, but it is an invitation the plan has no use for.

---

### [T24] Outcome: The app knows where in the 8-week block the owner is — counted from their own log rather than from a calendar — and uses it to put the variant §4B prescribes *this* week in front of them, without ever saying they are behind.
Spec: this file | Status: [x] | Depends on: — | Wave 2

#### Context manifest
Create: `src/lib/block.ts` (+ `block.test.ts`), `src/data/blockPhases.ts`, `src/components/PrescriptionVariants.tsx` | Modify: `src/types.ts`, `src/data/exercises.ts`, `src/screens/Home.tsx`, `src/screens/ActiveSession.tsx`, `src/screens/ExerciseDetail.tsx`, `src/screens/Settings.tsx`, `src/components/FocusHold.tsx` | Conform to: D2a, D6, D10, D15, D19, D23, D25, D29, D41 | Delete: nothing

**What the app knows about the block today, stated precisely.** Nothing. `docs/training-plan.md` is an 8-week block: §4F assigns each week a focus, §4B carries two protocols for the *same* exercise and splits them at week 4, and §4E's retest is a week-8 event. The app has 20 catalog entries, two rotating routines and a history list, and no notion whatever of where in those eight weeks the owner is standing. v1.4 deferred this deliberately — "tracking them needs a block start date and a post-week-8 policy that no decision covers yet" — and D25 is that decision, taken in v1.8 and un-deferring it by the method D15 already established: **derive, don't store.**

**One number is stored, and only when the owner says so.** Block position comes from the earliest *completed rotating* log: the first session is week 1, and the week is Monday-anchored (D10) so that "week 6" and the "Routines this week" line directly above it on Home cannot disagree about where a week starts. `Settings.blockStartedAt` exists for exactly one event — the owner deliberately beginning a new block — and when it is absent the app says the position is derived and renders the week as approximate (`~week 6 of 8`). That tilde is doing real work: the *count* is arithmetic, but the *anchor* is an inference from a log, and a bare "week 6" would present an inference as a fact.

**Past week 8 is a state, not a failure (D25).** `week 8+`, with no "overdue", no "you're behind", nothing blocked and nothing flagged — the state D15 already refuses for routines, refused again here for weeks. §4F's own "take a lighter week regardless of the schedule above if fingers feel beat up… non-negotiable at your training age" is why: a block that runs long is what the plan asks for as often as not, and a ninth week is a training decision, not a lapse.

**What the week buys, and it is the whole point of the task.** A week number on its own is trivia. Two things make it worth deriving. The first is §4B: one `prescription` string holds a rep-structured ~90% variant *and* a single-max-effort variant, with "use this variant for weeks 1–4, then the single-max-effort version above for weeks 5–8" sitting in the plan and nowhere in the app — so the owner reads both mid-session and picks by memory. Knowing the week lets the app put the live one first while the other stays fully readable (D25's "narrows emphasis, never hides the plan"). The second is §4F's table, which assigns the week a focus and is currently unreachable from the app at all; quoted with its `§` reference it is D23's *report and cite* exactly, and it is transcribed into a code-seeded constant rather than read out of the plan file, because the plan file is T25's (D38, D6).

**And the emphasis is text, never a timer.** T23 fenced this off in advance: §4B's rep-structured variant is a cadence *and* a max-effort protocol, and re-proposing a runner for it "needs its own decision". So no clock, hold target, set count, auto-stop or cue changes with the week. The typed `holdSeconds` and `prescribedSets` describe the peak variant, which means that during weeks 1–4 the emphasised variant is not the one the timer runs — a mismatch the app must **state** rather than let the owner discover. D41's `timed` flag is that statement, typed on the declaration instead of written into a component.

#### Acceptance criteria
1. WHEN at least one rotating session has been completed THE app SHALL state the block position — sessions counted and week reached — derived from the log, with no stored schedule of any kind (D25, D15). [x]
2. WHEN the position is derived rather than anchored to an explicit marker THE week SHALL be rendered as approximate and the surface SHALL say what it was derived from. [x]
3. WHEN the derived week is past 8 THE label SHALL read `week 8+`; the app SHALL NOT say overdue, behind, late or missed, SHALL NOT count down to a retest, and SHALL NOT block or flag anything (D25, D23, D2a). [x]
4. WHEN the owner deliberately starts a new block THE app SHALL store one date key and count both weeks and sessions from it; clearing it SHALL return to the derived position exactly (D25). [x]
5. WHEN only a §4E battery has been logged THE block SHALL read as not started, and a battery log SHALL never count as a session in the block (D29). [x]
6. WHEN a session is in progress THE session screen SHALL show that session's ordinal and its week; a *battery* in progress SHALL show the week alone, with no ordinal (D29). [x]
7. WHEN a week is known THE §4F focus for that week SHALL be quoted with its `§` reference alongside §4F's own lighter-week caveat, and the app SHALL NOT state whether the owner is following it (D23). [x]
8. WHEN an exercise declares week-scoped variants THE session SHALL put the live one first, and every other variant SHALL stay readable on the detail screen — nothing hidden, nothing reworded (D25, D6). [x]
9. WHEN no week is known THE variants SHALL all render in declared order with none emphasised, rather than a guessed one (D6, D19). [x]
10. WHEN the live variant is not the one the typed `holdSeconds` / `prescribedSets` describe THE surface SHALL say which variant the timer and set count follow, and no timer, target, cadence, cue or auto-stop SHALL change with the week (T23's fence, D17). [x]
11. WHEN nothing is logged and no marker is set THE surfaces SHALL say the block starts at the first session rather than showing week 1 of a block that has not begun (D23). [x]
12. WHEN block position is computed THE only stored state SHALL be the optional `Settings.blockStartedAt` — no new store, no field on any logged record, and no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement. [x]

#### Edge cases
- A marker dated in the future reads as week 1 with no sessions counted — never week 0, never a negative week. [x]
- Logs that predate the marker (an imported backup, a previous block) are outside the block and are not counted, which is the point of setting one. [x]
- A first-ever session that is still in progress numbers itself `Session 1` and week 1 while Home still reads not-started: the ordinal describes the session on screen, and nothing is written until it is finished. [x]
- Deleting the earliest session moves the derived start forward and every label with it — derive-don't-store, exactly as rotation does (D15). [x]
- A completed rotating log with nothing in it still counts as a session; the app reports that a session happened and does not grade what was in it (D23, D16). [x]
- Past week 8 the last declared variant stays live rather than falling back to none — the block ran long, the protocol did not expire. [x]
- A daylight-saving transition inside the block cannot move a week: the arithmetic is date-key based, through the same helper rotation uses (D10). [x]
- The two PIMA entries are the only ones declaring variants; every other exercise renders its `prescription` exactly as it does today. [x]

#### Non-goals & do-not-touch
- MUST NOT schedule, remind, prompt or nag (D2a): no "next session due", no countdown to week 8, no retest reminder — T16 already fenced that and this task gains the week number that would make it tempting.
- MUST NOT change a timer, hold target, set count, cadence, cue or auto-stop based on the week (T23's fence, D17). The emphasis is text.
- MUST NOT hide a variant, reword one, invent a per-week prescription, or edit `prescription` itself (D6, D25).
- MUST NOT read, bundle, parse or quote `docs/training-plan.md` at runtime — §4F is transcribed into a code-seeded constant, and the plan file stays T25's (D38, D6).
- MUST NOT compute adherence, a completion percentage, "sessions behind", a projected finish date, or grade a deload week (D23).
- MUST NOT store a week, a session number, or a phase on any log, or add any block state beyond the one optional settings field (D25, D15).
- MUST NOT let the §4E battery advance the block's session count, or let a block marker change what `routineRotation` answers (D29, D15).

#### Verify
`npm run test && npm run build && npm run lint`, plus an in-browser pass at 390px: with an empty log confirm Home says the block starts at the first session and the PIMA variants render unemphasised; log sessions across simulated weeks and confirm the week label tracks them, reads `~week N of 8` while derived, and reads `week 8+` past eight with no "overdue" anywhere; confirm the §4F focus line quotes the right row for the week and carries the lighter-week caveat; open a session in weeks 1–4 and confirm the tendon variant leads with the peak variant still readable and the timer/set-count note present, then past week 4 confirm the order flips; confirm the battery neither counts as a session nor shows an ordinal; set a new block in Settings and confirm week and session count restart from it, then clear it and confirm the derived position returns unchanged; confirm the running app's database is still at version 2 with four stores.

#### Amendments (T24)

**2026-07-25 — T24 built. Build + lint clean, 447 tests green (39 new, all in `block`). All twelve ACs verified in a running browser at 375×812, against a seeded log driven across weeks 3, 6 and 12 of a block.** Files: `src/lib/block.ts` (+ `block.test.ts`), `src/lib/useBlockWeek.ts`, `src/data/blockPhases.ts`, `src/components/PrescriptionVariants.tsx`; modified `src/types.ts`, `src/data/exercises.ts`, `src/screens/Home.tsx`, `src/screens/ActiveSession.tsx`, `src/screens/ExerciseDetail.tsx`, `src/screens/Settings.tsx`, `src/components/FocusHold.tsx`. **No new dependencies, and the live database read back at version 2 with the same four stores after a marker was set and cleared** — the only stored change anywhere was `blockStartedAt` appearing in `settings` and disappearing again.

**The week was moved rather than waited for.** Verifying an 8-week derivation honestly means seeing weeks 3, 6 and 9+ — so the pass seeded completed logs at chosen dates and read the labels back, which exercises the real path because the position is arithmetic over date keys and nothing else. In order: a log starting 6 Jul read **`5 sessions · ~week 3 of 8`** with `WEEKS 3–4 Increase to 90–95% effort — Add small load increments (1–3%) (plan §4F)`; adding an earlier session on 15 Jun moved the anchor and the label to **`6 sessions · ~week 6 of 8`** with §4F's weeks-5–6 row; adding one on 4 May produced **`7 sessions · ~week 8+`** with §4F clamped to its week-8 row and **no occurrence of "overdue", "behind", "late" or "missed" anywhere in the document** (AC1, AC2, AC3, AC7). A battery logged on 1 Jul — a week *before* the first training session — neither anchored the block nor was counted, which is D29 holding at the point it is easiest to lose (AC5).

**The variants flipped where §4B says they flip.** In week 3 the half-crimp PIMA card read `THIS WEEK · WEEKS 1–4 · TENDON VARIANT` above the peak variant, with **`The timer and set count follow Weeks 5–8 · peak (§4B)`** underneath and the control still reading `▶ Start set 1 of 4–6 · 3–5s`. In week 6 the order reversed, the `THIS WEEK` tag moved to the peak variant, **and the timer note disappeared on its own** — because the live variant was then the `timed` one (AC8, AC10). The focus surface showed the live variant alone at board size; the detail screen showed both, and the eighteen exercises that declare no variants rendered their untouched `prescription` string exactly as before (AC9, and the edge case that matters most).

Also verified on the running app: an empty log read `Not started — the block begins at your first logged session` on both Home and Settings (AC11); a live Day 1 session read **`Session 6 · ~week 3 of 8`** while Home, which passes no live log, still counted five (AC6); a live **battery** read `7 sessions · ~week 8+` with **no ordinal at all** (AC6, D29); `Start a new block today` confirmed first, then read `No sessions yet · week 1 of 8 · started 7/25/2026` — **no tilde, because the anchor was no longer an inference** — and `Use my first session instead` restored `7 sessions · ~week 8+ · counted from your first session, 5/4/2026` exactly, with the settings object back to a single key (AC4, AC12). The Home card contains **zero interactive elements and only `H2`, `P` and `SPAN` tags**, and both routine Start buttons stayed above the fold at 325px and 401px of an 812px viewport.

Design calls:
- **Monday-anchored, not seven days from the first session.** "~week 3 of 8" renders three lines above "Routines this week", and two definitions of a week on one screen is a bug waiting for a Sunday session to expose it. It also makes the week fall out of `daysBetween`, which is already the DST-proof path (D10).
- **The tilde is the whole honesty of the feature.** The count is arithmetic; the anchor is an inference from a log. `~week 6 of 8` while derived and `week 6 of 8` once the owner has said where the block starts — one character carrying the difference between what the app measured and what it guessed. It is a tested string, not a styling choice.
- **The block card is inert, and that took no effort to arrange, which is the point.** There is nothing to tap because there is nothing to do: the week is not a task, the §4F row is a quote, and the only control the feature needs (start a new block) lives in Settings where a deliberate act belongs.
- **§4F's caveat is rendered every time, in full.** It is the sentence that makes the app's silence about adherence the *plan's* position rather than a design preference — "take a lighter week regardless of the schedule above… non-negotiable at your training age". Costing three lines of Home to avoid ever having to argue D23 again is a good trade.
- **The timer note is generated from the declaration, not written into the component.** `timedElsewhere` is null exactly when the live variant is the timed one, so the note appears in weeks 1–4 and vanishes in weeks 5–8 with no condition in any view. That is D41's reason for putting the flag in the catalog: the mismatch is a property of the data, and the app should not be able to forget to mention it.
- **`ExerciseDetail` learned the week through a hook rather than a prop.** It is rendered from three places and `ExerciseProgress` already established that a screen with three callers loads what it needs itself. `ActiveSession` deliberately does not use the hook: its label has to count the session in progress, which needs the log the hook does not have.

**2026-07-26 — amended by T28.** `groupByStory` floored block membership at `startKey`, so a §4E baseline logged the day before the block's first session grouped under **Before this block** — separating it from the block it is the baseline *of*. It now floors at `block.blockFloorKey` (the Monday of week 1), and such a baseline groups under Week 1. Only batteries can fall in that window, so no training session moved and no other group changed.

**One thing worth recording for T28, which depends on this.** The block position is derived from *completed rotating* logs and stops there — it does not know what was in them. A week-8 poster wanting "sessions per week across the block" can get it from the same anchor with one more pass over the same array; nothing about that needs a stored week, and nothing here should acquire one.

---

### [T25] Outcome: The document the whole app is a tool for is inside the app — searchable in the three minutes between sets, and one tap from the exercise whose safety note cites it.
Spec: this file | Status: [x] | Depends on: — | Wave 2

#### Context manifest
Create: `src/lib/plan.ts` (+ `plan.test.ts`), `src/screens/Plan.tsx`, `src/components/PlanSection.tsx` | Modify: `src/types.ts`, `src/data/exercises.ts`, `src/lib/routes.ts` (+ `routes.test.ts` if present), `src/App.tsx`, `src/components/TabBar.tsx`, `src/screens/ExerciseDetail.tsx`, `src/screens/ActiveSession.tsx`, `src/vite-env.d.ts` if the raw import needs a declaration | Conform to: D2a, D6, D18, D23, D37, D38, D42 | Delete: nothing

**What the plan gets today, stated precisely.** Nothing. `docs/training-plan.md` is 17KB of the owner's own training document — nine sections, four tables, the §4E retest protocol, §7's five safety rules, §8's stop conditions — and it is not in the app in any form. T2 transcribed *fragments* of it into the catalog (a prescription here, a safety note there) and every one of those fragments carries a citation the owner cannot follow: `(plan §7)`, `(plan §8)`, `(§4B)`. T22 had to write a non-goal fencing itself off from the file, and D38 recorded the reason — the question of what "the plan, in the app" means belongs to one task, and this is it.

**The problem it solves is the PRD's problem #2, unchanged since v1.0.** "Reopening a long markdown doc on a phone mid-session and scrolling for one number is slow enough that he guesses instead." Six built tasks have chipped at that by moving *specific* numbers to the point of use — prescriptions on the card, cues in the rest deck, conditions on the retest screen. What none of them can do is answer a question the catalog does not contain: *what did the plan say about elbow soreness?* — §8's stop conditions, which no exercise entry carries. Search is the general form of the answer, and the plan's own `§` numbering is the address space it returns.

**It is bundled, not fetched (D42).** A build-time `?raw` import: no network, no service-worker question, no IndexedDB, nothing to sync, nothing that can be stale relative to the app. That costs ~17KB of bundle — the honest price of the document being *in* the tool — and it inherits the catalog's D6 workflow exactly: edit the file, redeploy, the app has it.

**And the fence is the whole reason this needed a decision.** A bundled plan is 17KB of prose that a later task could be tempted to parse a duration or a set count out of — D17's silent-wrong-number machine, given a much larger surface. So D42 states the rule once and absolutely: the plan is **displayed, searched and quoted; never parsed for meaning**. The single structural fact extracted is a `§` reference, which is a heading and not a training variable. And the link *into* it from an exercise is a typed `planRefs` list, not a regex over the entry's own prose — a citation that resolves to the wrong section is worse than one that does not resolve.

**Dead time is a reading surface, and this is reading (D37).** The plan is reachable during a rest and never pushed into one: T22's deck still owns the interval, nothing auto-opens, and opening the plan mid-session cannot touch the timer, the log, or a set. That is the same asymmetry D37 already drew — content that cannot author a number is safe to read at any time, and content that can is untouched by it.

#### Acceptance criteria
1. WHEN the app is installed and offline THE full training plan SHALL be readable inside it, from the build rather than from the network, with no request, no stored copy, and no way to edit it (D42, D6). [x]
2. WHEN a query of at least two characters is entered THE app SHALL list every section containing all of its terms, in the plan's own order, each labelled with its `§` reference and heading — no relevance score, no ranking, no "did you mean" (D23). [x]
3. WHEN a query is matched THE matching text SHALL be highlighted in the results and in the section that opens from them, and matching SHALL be case-insensitive and insensitive to the plan's typographic apostrophes and dashes. [x]
4. WHEN a section is opened THE whole of it SHALL render with its structure intact — headings, ordered and unordered lists, block quotes, emphasis, and tables — from the plan's own markdown, with no content added, reworded, or omitted (D6). [x]
5. WHEN no query is entered THE app SHALL list every section as a one-tap entry in the plan's order, so the document is browsable without typing — the mid-session case, where the hands are chalked (PRD problem #2). [x]
6. WHEN a table renders at 390px THE page SHALL NOT scroll horizontally; the table SHALL scroll inside its own container. [x]
7. WHEN the plan is opened during a session THE session SHALL be intact on return: the timer keeps running and stays visible, every logged set survives, and nothing about the log changes (D18, D37). [x]
8. WHEN an exercise declares plan references THE app SHALL open the cited section in one tap from that exercise, and those references SHALL be typed on the catalog entry rather than parsed out of any prose (D42, D17). [x]
9. WHEN any part of the app needs a prescription, a duration, a set count, a rest interval, or any other training value THE source SHALL remain the typed catalog — no value anywhere SHALL be read out of the plan text (D6, D42). [x]
10. WHEN a query matches text inside a table cell or a list item THE section SHALL be found — search covers the document, not just its paragraphs. [x]
11. WHEN a query matches nothing THE app SHALL say so plainly and leave the section list one tap away, with no suggestion, correction, or empty-state advice. [x]
12. WHEN the plan is used THE state SHALL be view state only: no query, scroll position, "recently read", or bookmark persisted, nothing in the backup, and no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement (D18). [x]

#### Edge cases
- A subsection the plan does not letter (§8's "What it is", "Why it isn't a competing philosophy") takes its parent's `§` and keeps its own heading, rather than being given a letter the plan never assigned (D6). [x]
- The document title and its italic subtitle are not a section and do not appear as one. [x]
- A one-character query, or one of only punctuation, searches nothing rather than matching every section. [x]
- A term appearing in a heading finds the section even when the body does not contain it. [x]
- The plan's own internal references ("see §4B") render as text; nothing is auto-linked by pattern-matching prose (D42). [x]
- An exercise with no `planRefs` shows no link at all rather than a dead control — the catalog is not required to cite. [x]
- Opening the plan from a session and leaving it returns to the session, not to Home. [x]

#### Non-goals & do-not-touch
- MUST NOT derive a prescription, duration, set count, rest interval, week assignment, or any other value from the plan text — for this task or any later one (D42, D6, D17).
- MUST NOT add a markdown library, a search library, or any dependency: the parser and the search are small pure functions, tested like every other derivation in `lib/`.
- MUST NOT fetch the plan at runtime, store it in IndexedDB, include it in a backup, or make it editable (D42, D5).
- MUST NOT persist a query, a scroll position, a bookmark, or a "last read" (D18).
- MUST NOT auto-open the plan, push a section during a rest, or replace T22's deck — dead time may be read, never interrupted (D37).
- MUST NOT rank, score, or personalise results, and MUST NOT record what the owner searched for (D23).
- MUST NOT edit `docs/training-plan.md` itself. It is the owner's document; this task reads it.

#### Verify
`npm run test && npm run build && npm run lint`, plus an in-browser pass at 390px: search "elbow" and confirm the §8 sections that discuss it come back in the plan's order with the term highlighted; open one and confirm the section renders with its lists and tables intact; confirm §4E's and §4F's tables scroll inside themselves with the page not moving sideways; search "don't" and confirm the plan's curly apostrophe still matches; search a nonsense string and confirm a plain no-match message with the section list still reachable; start a session, open the plan from a PIMA card's citation mid-rest, confirm the section opens with the timer still running and visible, then return and confirm every set is intact; confirm the built bundle contains the plan text and the running app makes no request for it.

#### Amendments (T25)

**2026-07-25 — T8 AC2 amended by this task.** T8 fixed the tab bar at four primary destinations: Home, Exercises, History, Settings. There are now five, and Plan is the addition. It is a destination rather than a link from another screen for the same reason Exercises is one: it is a place the owner goes with a question, not a step in a flow. The other four are unchanged, in the same order, and the bar is still hidden on the same immersive screens.

**2026-07-25 — T25 built. Build + lint clean, 475 tests green (28 new, all in `plan`). All twelve ACs verified in a running browser at 375×812 — including the production bundle served from `dist`, where the whole app loads in four requests and none of them is the markdown.** Files: `src/lib/plan.ts` (+ `plan.test.ts`), `src/screens/Plan.tsx`, `src/components/PlanSection.tsx`, `src/components/PlanRefLinks.tsx`; modified `src/types.ts`, `src/data/exercises.ts`, `src/lib/routes.ts`, `src/App.tsx`, `src/components/TabBar.tsx`, `src/screens/ExerciseDetail.tsx`, `src/screens/ActiveSession.tsx`. **No new dependencies, no new store, no stored field, and the live database read back at version 2 with the same four stores.** Bundle 296KB → 324KB (gzip 86KB → 97KB), which is the plan text plus the screen that reads it.

**The offline claim was verified rather than asserted, and that took building `dist`.** In dev, Vite serves a `?raw` import as a module over HTTP, so the dev network log shows `GET /docs/training-plan.md?import&raw` — which proves nothing about the shipped app. So the pass built the bundle and served it: loading `#/plan/4E` from `dist` produced **exactly four requests — the HTML, one JS bundle, the CSS, and `registerSW.js`** — and §4E rendered with its four-row retest table anyway. The plan is *in* the bundle, which is what AC1 actually asks (also confirmed by grepping the built JS for the plan's own sentences).

**The § numbering came out of the document, and it matches what the app has been citing for nine tasks.** The section list reads §1, §2, §3, §4, §4A, §4B, §4C, §4E, §4F, §5, §5A–§5D, §6, §7, §8 ×9, §9 — **26 sections, including the plan's own jump from §4C to §4E**, reproduced rather than corrected (D6). Every reference the catalog cites resolves, which is a test that enumerates all 25 entries' `planRefs` and asserts each names a section that exists.

Also verified on the running app: searching **"elbow" returned six sections in the plan's order** with seven highlighted matches, one of them from inside §8's GtG table — search covers tables and list items, not just paragraphs (AC2, AC10); **typing "10-15 min" with a hyphen matched the plan's en-dashed "10–15"** and highlighted the plan's own characters (AC3); §8's three-column comparison table **scrolled inside its own container while `document.scrollWidth` stayed at 375px** (AC6); §8's allocation rule rendered as a block quote and `**bold**` runs rendered bold (AC4); a nonsense query produced "No section of the plan contains that. Clear the search to browse all 26 sections." with nothing suggested (AC11); and `localStorage` and `sessionStorage` were both **empty** after a session of searching and reading (AC12).

**The mid-session path is the one that had to be proved, and it was proved against a running rest.** With a 3-minute rest counting down on the PIMA half-crimp and one set logged on the max hang, tapping **§4B** in the card's Info block opened the section over the session: the hash stayed at `#/session`, the timer bar kept counting (2:53 → 2:21 → 1:46 across the visit) with T22's deck still on it, and "Back to session" returned to the session with the logged set and the unlogged `✓ Held 5.0s` both intact (AC7, AC8).

Design calls:
- **The plan is rendered over the session, not routed to.** A route change unmounts `ActiveSession`, and the timer lives in its React state by D18 — so routing to `#/plan` mid-rest would silently kill the interval. Same solution the exercise detail view already uses, and the reason `PlanRefLinks` takes an `onOpen` callback rather than always calling `go`.
- **A `§` may address several sections, and that is the honest reading of the citation.** §8's subsections carry no letter in the plan, so `(plan §8)` points at the whole of §8 — nine headings. Opening it by reference shows all nine in order; opening it from the list shows the one that was tapped. Two behaviours from one function, because the reference genuinely is ambiguous and the app should not invent a letter to disambiguate it (D6).
- **Emphasis and highlighting are resolved in one pass.** A search term can fall inside a `**bold**` run, so `inlineSpans` parses emphasis first and then splits each run on the terms — `**Track everything.**` searched for "track" renders bold *and* highlighted. The property test that matters is the boring one: for any terms, re-joining the spans reproduces the line exactly, minus the markers.
- **Unranked, deliberately.** Results come back in document order and the match count is reported beside them without being used to sort. The plan's order is a fact about the plan; a relevance score would be the app's opinion about the owner's question (D23).
- **The typography folding is defensive, and honestly so.** The plan file currently contains no curly apostrophes, so the dash half of AC3 is what the browser could demonstrate; the apostrophe half is unit-tested against a sample that has them, because the app's own copy is written with them and the plan may gain them the next time the owner edits it in a word processor.
- **`planRefs` went on all 25 entries.** It was tempting to cite only where a safety note already names a section, but the useful behaviour is "this exercise came from *there*", which is true of every entry in a catalog transcribed from one document. The spec's "an entry may cite nothing" edge case is therefore now a test of the code path rather than an observation about the data.

**One thing this makes possible that no task has claimed yet.** The catalog's prose citations — "(plan §7)", "(plan §8)" — are still just text inside `safetyNotes`, and now that a `§` resolves, they read like links that do not work. Making them tappable means pattern-matching authored copy, which D42's second half deliberately refused, so the honest fix is more typed refs (per note, not per entry) rather than a regex. Recorded, not built.

---

### [T26] Outcome: The owner can see the shape of the block — which edges were worked in which weeks, and how many seconds were actually spent under tension — as arithmetic over what was logged, with nothing ranked and nothing graded.
Spec: this file | Status: [x] | Depends on: T15, T24 | Wave 3

#### Context manifest
Create: `src/lib/tension.ts` (+ `tension.test.ts`), `src/screens/Block.tsx`, `src/components/EdgeWeekGrid.tsx` | Modify: `src/lib/routes.ts`, `src/App.tsx`, `src/screens/Home.tsx` | Conform to: D6, D10, D15, D17, D20, D21, D22, D23, D25, D27, D29, D42, D43 | Delete: nothing

**What the app can say about a block today, stated precisely.** Where it is (T24) and what one exercise's best set did over time (T12). Nothing in between. The per-exercise line is deliberately cut at every edge change (D22), which is correct and which also means the app can never show the thing D22's own rationale describes — "drop to a smaller edge, rebuild hold time on it, then add weight or drop again" is a pattern *across* segments, and a chart made of disconnected segments is the one view that cannot render it. §4E's retest compares two occasions eight weeks apart. Neither answers the question a block ends on: **where did the work go?**

**A grid answers it, because the two axes are the two things the plan already treats as structural.** Edge is the condition every finger number is measured under (D22, §4E). The block week is the unit §4F assigns a focus to. Crossing them gives a table whose cells are counts of holds — and reading down a column shows a week's distribution across edges, reading across a row shows when an edge entered and left the block. §4F prescribes a deload in week 7 at "half the volume, same intensity", and a volume grid is the only surface in the app where that is *visible* rather than remembered. The app renders the numbers. It does not say whether week 7 was a deload, and must not (D23).

**Time under tension is the second axis of the same fact, and it is a stricter number than it looks.** A "hold" is not a rep: §4B is 3–5 seconds at max effort, §4C is 7–10, §5B is 8–10, §4E's lock-off is open-ended. Twelve holds in a week is not twelve of anything comparable, so the count alone under-describes the week — which is exactly what D23's own corollary illustrates when it writes an aggregate as `41 hangs · 6m22s under tension`. Two numbers, both facts, neither a verdict. **The seconds are measured, never prescribed** (D43): a set logged without a `holdSec` contributes zero and is counted as untimed, and the untimed count is rendered wherever the total is — because a total quietly missing a third of its sets is a number that misleads, which is the same reason `droppedForNoBodyweight` exists.

**What the aggregate is allowed to be, and where the line falls.** Every value here is a sum or a count of things that were recorded, which D23 permits in as many words. What it forbids is one step away and worth naming so no later task takes it: **no heaviest load, no best week, no "biggest edge drop"**. A heaviest-ever number is a PR, and the narrowed non-goal keeps PRs permanently out — not because a maximum is uninteresting but because §7 asks the owner to watch for a *falling* number, and a surface that celebrates a maximum trains the eye to look the other way. There is no colour scale, no cell shaded by intensity, no total row that is compared to anything.

**Population, stated once because T27 and T28 both inherit it (D43).** Completed logs against *rotating* routines, from the block anchor onward — the same predicate `blockPosition` already counts sessions with, so the grid and the block label can never disagree about what a session is. §4E batteries are excluded and the surface says so with a link to the retest screen, for D29's reason: a maximum under a test protocol is not training volume, and adding week-1 and week-8 spikes to a volume grid is D22's invalid comparison in a third place. Warm-up holds are excluded for the reason `retest.ts` already excludes the warm-up from §4E's tests — §4A is a *condition* of the work, not the work.

#### Acceptance criteria
1. WHEN at least one hold has been logged inside the block THE app SHALL report the block's total holds and total time under tension as one line of plain facts, with no ranking, score, percentage, projection, or praise (D23). [x]
2. WHEN the totals are shown THE app SHALL also state how many of those holds had no duration recorded, so the total is never read as covering sets it does not (D43). [x]
3. WHEN holds have been logged THE app SHALL render a grid of block week × edge, one row per week from week 1 to the furthest week reached and one column per edge actually recorded, with cells reporting what was logged in that week on that edge. [x]
4. WHEN a set was logged with no edge THE grid SHALL carry it in an explicit unrecorded-edge column rather than dropping it, so every row's cells sum to that row's total. [x]
5. WHEN the grid is shown THE owner SHALL be able to read its cells as either a count of holds or as time under tension, both derived from the same sets. [x]
6. WHEN a week inside the block has no logged holds THE row SHALL still appear, reading as nothing recorded — a blank week is a fact about the block, and omitting it would compress the timeline (§4F's week 7). [x]
7. WHEN the derived week is past 8 THE grid SHALL extend to the furthest week reached, and SHALL NOT mark any week as extra, late, missed, or over (D25, D23). [x]
8. WHEN a hold is counted THE exercise SHALL be one that declares `holdSeconds` and is not a warm-up, and time SHALL be the sum of recorded `holdSec` values only — never a prescribed duration, never a set count multiplied by a target (D17, D43). [x]
9. WHEN a §4E battery falls inside the block THE grid SHALL exclude it, SHALL say that it does, and SHALL link to the retest screen where it is reported (D29). [x]
10. WHEN the block has not started THE surface SHALL say so in the same terms Home does, and no entry point to it SHALL be rendered anywhere as a dead control (D23, T24). [x]
11. WHEN the grid renders at 390px THE page SHALL NOT scroll horizontally; a grid wider than the screen SHALL scroll inside its own container (T25 AC6). [x]
12. WHEN this task is complete THE app SHALL have stored nothing new: no field on any record, no object store, no settings key, and no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement. [x]

#### Edge cases
- A block with holds on exactly one edge renders a one-edge grid rather than suppressing the axis — the answer "everything was on 20mm" is the useful one. [x]
- Sets recorded at 17.5mm and 18mm are two columns, not one. The app never rounds an edge into a neighbouring bucket (D31's "never silently snapped"). [x]
- A hold logged with `holdSec: 0` counts as a hold with zero seconds, not as untimed: zero is a measurement, absent is not. [x]
- A session completed on a Sunday evening lands in the week its *local* day falls in, through the same `localDayKey`/`mondayOf` path rotation uses (D10). [x]
- Deleting the earliest session moves the block anchor and re-numbers every row, exactly as it re-numbers T24's label — derive, don't store (D15). [x]
- A log dated ahead of today extends the grid to its week rather than being dropped or clamped; an imported backup is not corrected by inference. [x]
- Logs predating an explicit `blockStartedAt` marker are outside the block and absent from the grid, which is the point of setting one (T24 AC4). [x]
- Fractional `holdSec` values (the timer records 5.9s) sum exactly and are rounded only for display. [x]

#### Non-goals & do-not-touch
- MUST NOT report a heaviest load, longest hold, best week, smallest edge reached, or any other maximum — that is a PR, which the narrowed non-goal keeps permanently out (D23).
- MUST NOT colour, shade, rank, or sort cells by magnitude, and MUST NOT mark any week as a deload, a peak, light, heavy, or missed (D23).
- MUST NOT compute an adherence or completion percentage, a per-week average against a target, or a projected block total (D23).
- MUST NOT count a prescribed duration, a `holdSeconds` range, or a `prescribedSets` count as if it were performed (D17) — the app reports what the log holds.
- MUST NOT include §4E battery logs, warm-up holds, or in-progress sessions in any total (D29, D16).
- MUST NOT add a store, a field, a settings key, or a schema version; every number here is derived at read time (D15).
- MUST NOT read a value out of `docs/training-plan.md` (D42). A `§` may be cited and linked; nothing is parsed.
- MUST NOT change T24's Home block card, the rotation, or any timer, prescription, or logging behaviour. This task adds a reading surface and touches nothing that writes.

#### Verify
`npm run test && npm run build && npm run lint`, plus an in-browser pass at 390px: with an empty log confirm no entry point appears and the block surface says the block starts at the first session; seed logs across several weeks on two edges and confirm the grid's rows run week 1 to the furthest week reached with an empty row for a week that has none; confirm each row's cells sum to its total and that sets logged with no edge land in the unrecorded column; toggle cells between holds and time and confirm both derive from the same sets; confirm the headline reports untimed holds when some sets have no duration; add a §4E battery inside the block and confirm no total moves and the exclusion note links to the retest screen; drive the block past week 8 and confirm the grid extends with no "late" or "over" anywhere; add a fifth edge and confirm the table scrolls inside itself with `document.scrollWidth` unchanged; confirm the database is still at version 2 with four stores and the settings object is unchanged.

#### Amendments (T26)

**2026-07-25 — T26 built. Build + lint clean, 504 tests green (29 new, all in `tension`). All twelve ACs verified in a running browser at 375×812, against a seeded block driven across weeks 1–8, then past 8, then re-anchored.** Files: `src/lib/tension.ts` (+ `tension.test.ts`), `src/screens/Block.tsx`, `src/components/EdgeWeekGrid.tsx`; modified `src/lib/routes.ts`, `src/App.tsx`, `src/screens/Home.tsx`. **No new dependencies, no type change, no catalog change, and the live database read back at version 2 with the same four stores and a settings object still holding one key** (AC12). Bundle 324KB → 334KB.

**The one bug the tests caught is the bug this codebase has already documented once.** `weekOf` reads a date *key*, and `WorkoutLog.completedAt` is a UTC instant — handing it the raw timestamp puts a Sunday-evening session in next Monday's week west of UTC. It failed on the first run, in America/Phoenix (UTC−7), where a 19:00 hang becomes 02:00 UTC the next day. `rotation.localDayKey` exists for exactly this conversion and its doc comment names exactly this failure; the fix was to call it, and the test that caught it is now the one that pins AC-adjacent D10 behaviour. Worth recording because the same trap is waiting for T27 and T28, which will both bucket logs by day.

**The arithmetic was checked against a hand count rather than against itself.** The seeded block held 46 countable holds across seven completed sessions, and the app reported **`46 holds · 4m30s under tension`** on Home and on the block screen — with three abrahang warm-up sets, a §4E battery, a goblet-squat entry and an in-progress session all correctly outside it (AC1, AC8, AC9). Every row's cells summed to its `All` and every column total summed to the block total in the rendered DOM, including the `no edge` column carrying the PIMA pulls, bar pulls and lock-offs (AC4). `17.5mm` and `18mm` stayed two columns (D31), and weeks 2, 4 and 6 rendered as empty rows rather than being compressed away (AC6).

Also verified on the running app: the toggle read the same sets two ways — `5 / 4 / 2 / 3` holds became `40s / 16s +2 untimed / 15s / 19s` — with the untimed marker appearing **only** on the seconds reading, because that is the reading it is missing from (AC5, AC2, D43c); seeding a session at week 10 extended the grid to `W10` with `W9` empty and **no occurrence of "overdue", "behind", "late", "missed" or "extra" anywhere in the document** (AC7); with six edge columns the table's own container scrolled (`scrollWidth` 370 against `clientWidth` 317) while `document.scrollWidth` stayed at 375 (AC11); an empty log rendered **no entry point on Home at all** and the block screen said `Not started — the block begins at your first logged session` (AC10); the `§4C` citation opened §4C and the exclusion note opened `#/retest` (AC9); and adding a session dated two months before the anchor **re-numbered every row** — week 8's work became `W12` — which is derive-don't-store visible in a table (D15).

Design calls:
- **The grid counts holds and the cells can also read as seconds, rather than picking one.** §4B is 3–5s, §4C is 7–10s, §5B is 8–10s and §4E's lock-off is open, so a hold is not a unit and a count alone under-describes the week it came from. Both readings come from one derivation and one pass over the log; the toggle is view state and nothing about it is stored (D18's line).
- **The unrecorded-edge column is the reason the table is honest.** Dropping edgeless holds would have made a tidier grid whose rows did not sum to their totals — and most of the block's holds *are* edgeless, because the bar pulls and lock-offs have no edge to record. `no edge` is a fact about the movement, not a gap in the log, and the caption says which it is.
- **Rounding is per cell, and the caption says so on the reading where it shows.** `holdSec` is fractional (the timer records 5.9s), sums are kept exact, and each cell rounds once at display — so a total can read a second away from its parts. Found in the browser, not reasoned about: the block row's cells came to 269s against a total of 270s. Naming it costs one clause and is cheaper than a reader deciding the table is broken.
- **A sibling of T24's block card, not a control on it.** T24's card is inert because a week is not a task, and that is still true — so the entry point is a second card underneath it, in the shape the §4E button already established. T24's card is byte-identical, and both routine Start buttons still sit fully above the fold (bottoms at 539px and 615px of 812).
- **`W3`, not `3`.** The week cell carries the week and that week's session count, and two bare numbers side by side read as one number — which is exactly what the first browser pass showed (`12×` for "week 1, 2 sessions").
- **What is counted is a section of the screen, not a footnote.** Four sentences naming the population, with `§` links that resolve (T25). A total whose definition is invisible is a total the owner has to trust; this one can be checked.

**2026-07-26 — amended by T28.** `excludedBatteries` floored at `startKey`, the day of the first counted *session*, and therefore undercounted a §4E baseline logged the day before it — which is where §4E puts the baseline ("once in week 1, fully rested"). It now reads from `block.blockFloorKey`, the **Monday of week 1**, which is the boundary `weekOf` has always counted from. Only batteries can fall in that window, so **no volume number changed**; the Block screen's note went from "One battery falls inside this block" to "2 batteries", which is what the log held all along.

**One thing worth recording for T27 and T28, which both depend on this.** `buildEdgeWeekGrid` returns `position` alongside the aggregates, so a sigil or a poster can label a week without re-deriving the block — and D43's population is now a single tested predicate rather than a rule three surfaces each re-implement. What it deliberately does not return is any maximum: no heaviest load, no longest hold, no best week. A poster wanting one is asking for a PR, and that is the line the narrowed non-goal draws.

---

### [T27] Outcome: Every logged session carries a mark drawn from what was in it, and History reads as the block's story — grouped by the week it happened in, each session legible without being opened.
Spec: this file | Status: [x] | Depends on: T26 | Wave 3

#### Context manifest
Create: `src/lib/sigil.ts` (+ `sigil.test.ts`), `src/components/SessionSigil.tsx` | Modify: `src/screens/History.tsx`, `src/screens/LogDetail.tsx` | Conform to: D6, D10, D15, D16, D17, D23, D25, D27, D29, D43, D44 | Delete: nothing

**What History is today, stated precisely.** A flat reverse-chronological list of rows reading `Day 1 — Fingerboard · 6 exercises · 7/21/2026`. It has not changed since T5, when it was the app's only retrospective surface. Six tasks have since put real content behind each of those rows — measured sets (T12), set-end reasons (T14), a block week (T24), holds and seconds (T26) — and **none of it is visible in the list**. "6 exercises" is the one fact the row reports, and it is the least informative one available: it counts catalog entries touched, not work done, so a two-set deload session and a full Day 1 render identically.

**Two problems, and they are the same problem at two scales.** At the row scale, the owner cannot tell sessions apart without opening them. At the list scale, eight weeks of sessions are an undifferentiated column with no sense of *when in the block* any of it happened — §4F assigns each week a focus and T24 derives the week, but History knows neither. The fix at both scales is the same: render what is already in the log.

**The sigil is a picture of the data, and that is the whole of its defence (D44).** A generated mark on a training session is one design decision away from a badge, and a badge is exactly what D23 forbids. The line this task draws is **legibility**: every visual property of the mark maps to one stated fact about the session, the mapping is rendered as a legend where the mark is largest, and the mark is computed from the log by arithmetic — no hash, no seed, no randomness. A hash-derived glyph would be more distinctive and completely indefensible: you could not read it back, so it could only ever be decoration that *looks* like information. The properties are the ones the app already records: one spoke per hold, in session order; spoke length from the recorded seconds on a **fixed** scale, so two sessions' marks mean the same thing; a gap between exercises, so the session's structure is visible; and a tip mark on the two set-end reasons `summaryReason` already surfaces (D27).

**The fixed scale is the part that could quietly have gone wrong.** Normalising each session's spokes against its own longest hold would make a session of 3–5s PIMA pulls (§4B) draw identically to one of 7–10s max hangs (§4C) — a mark that looks the same for different work, which is worse than no mark. So the scale is a module constant, shared by every sigil in the app, and a hold past it is clamped rather than rescaling everything around it.

**A sigil is drawn for any session; the aggregates are still the block's (D43).** D43's population — completed, rotating, in-block — governs sums *across* the block, and it is why T26's grid excludes a §4E battery. It does not govern whether a session can be drawn: a battery has holds, an unfinished session has holds, and both are things the owner logged and will want to recognise in the list. What carries over unchanged is the *hold* rule itself — non-warm-up exercises declaring `holdSeconds`, `countsAsHold` — so a sigil and the grid can never disagree about what a hold is.

**"History as a story" is grouping, not narration.** The list gains week headings derived from T24's block position, newest week first, each quoting §4F's row for that week with its reference — which is the same quote Home already carries, in the place it describes. Sessions predating the block anchor group under a heading that says so rather than being renumbered into it. The app writes no sentences about what happened: a heading, a mark, and a line of facts per session is the whole of the story, and the reader supplies the meaning. Nothing here is ranked, and no session is described as full, light, strong, or missed — §4F's deload week is *supposed* to be the smallest marks on the screen, which is exactly why the app must not caption them.

#### Acceptance criteria
1. WHEN a session contains at least one hold THE app SHALL render a mark derived from that session's own sets, identical every time it is drawn for the same log and computed by arithmetic rather than by any hash, seed, or random value (D44). [x]
2. WHEN a mark is drawn THE number of its spokes SHALL equal the session's hold count, in the order the sets were logged, with the session's exercises visibly separated. [x]
3. WHEN a spoke's length is drawn THE scale SHALL be a shared constant rather than the session's own maximum, so the same duration is the same length in every mark in the app. [x]
4. WHEN a hold was recorded with no duration THE spoke SHALL be drawn distinctly from a short hold rather than as a zero-length one — absent is not the same as brief (D43a). [x]
5. WHEN a set ended for pain or a form breakdown THE spoke SHALL carry a distinct tip, using the same two reasons a set summary already surfaces and no others (D27). [x]
6. WHEN a mark is rendered at its largest THE app SHALL render a legend naming what each property means, so the mark can be read back rather than admired (D44). [x]
7. WHEN a session contains no holds THE app SHALL render no mark rather than an empty frame, and the row SHALL still report what the session did contain. [x]
8. WHEN History is opened THE completed sessions SHALL be grouped under the block week they happened in, newest week first, and sessions before the block anchor SHALL group under a heading that says so rather than being counted into week 1 (D25). [x]
9. WHEN a week heading is rendered THE §4F focus for that week SHALL be quoted with its `§` reference, and the app SHALL NOT state whether the owner followed it (D23). [x]
10. WHEN no block position can be derived THE list SHALL render ungrouped, exactly as it does today, rather than under an invented week (D25). [x]
11. WHEN a session row is rendered THE app SHALL report facts drawn from the log — its holds, its time under tension, the edges it used, and any safety signals — instead of, or alongside, the count of exercises touched. [x]
12. WHEN a §4E battery appears in the list THE row SHALL say that it is one and that it is not counted as a block session, while still appearing in the week it happened (D29). [x]
13. WHEN a session is in progress THE list SHALL keep it pinned and resumable exactly as it is today, outside the week grouping (T5 AC4, D16). [x]
14. WHEN this task is complete THE app SHALL have stored nothing new: no field, no store, no settings key, and no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement. [x]

#### Edge cases
- A session whose every hold is untimed draws a full set of spokes, all in the untimed form, and reports its holds with no seconds (D43c). [x]
- A session with one hold draws one spoke; the mark is not padded to look fuller. [x]
- A hold longer than the shared scale is clamped to it, and no other spoke in the app changes length as a result. [x]
- An exercise missing from the catalog contributes no holds and does not throw — the same fallback `LogDetail` already makes for its name. [x]
- Deleting the earliest session moves the block anchor, so a week heading can change and sessions can move into the before-the-block group; nothing is stored that could disagree (D15). [x]
- A week with no sessions is not rendered as a heading in History — an empty heading is noise in a list, where an empty *row* in T26's grid was a fact about the block. [x]
- A pre-T12 log with only free-text sets contributes holds with no seconds rather than being excluded (D21). [x]
- The mark is decorative to assistive technology only if its facts are also in text: the row's own line carries them, so the mark is `aria-hidden` rather than given an invented description. [x]

#### Non-goals & do-not-touch
- MUST NOT derive any part of the mark from a hash, a random seed, an id, or a timestamp — a property that cannot be read back is decoration, not a report (D44).
- MUST NOT rank sessions, mark one fuller, better, lighter, or stronger, or sort by anything other than time (D23).
- MUST NOT label a week as a deload, a peak, a miss, or a gap, and MUST NOT compute an adherence or completion figure across weeks (D23).
- MUST NOT report a maximum — heaviest load, longest hold, smallest edge — in a row or a mark. That is a PR (D23).
- MUST NOT make History editable, or write to any log from a reading surface (T5's standing non-goal).
- MUST NOT scale a mark against its own session, which would make different work look identical.
- MUST NOT store a mark, cache one, or add a field to make one cheaper to draw (D15).
- MUST NOT add a dependency: the mark is SVG computed by a pure function, tested like every other derivation in `lib/`.
- MUST NOT change what the §4E battery is or how it is counted (D29, D43).

#### Verify
`npm run test && npm run build && npm run lint`, plus an in-browser pass at 390px: seed a block spanning several weeks and confirm History groups newest week first with §4F's row quoted on each heading, and that sessions before the anchor group under their own heading; confirm each row reports holds, time and edges rather than an exercise count, and that a battery row says it is not counted as a block session; open a session and confirm the large mark renders with a legend naming every property; confirm two sessions with the same hold count but different durations draw visibly different marks, and that the same session drawn twice is identical; confirm a session with no holds renders no mark and still reports what it held; confirm an in-progress session stays pinned and resumable; confirm the database is still at version 2 with four stores and settings unchanged.

#### Amendments (T27)

**2026-07-26 — T27 built. Build + lint clean, 534 tests green (30 new, all in `sigil`). All fourteen ACs verified in a running browser at 375×812, against a seeded block spanning weeks 1–11 with a marker set and then cleared.** Files: `src/lib/sigil.ts` (+ `sigil.test.ts`), `src/components/SessionSigil.tsx`; modified `src/screens/History.tsx`, `src/screens/LogDetail.tsx`. **No new dependencies, no type change, no stored field, and the live database read back at version 2 with the same four stores.** Bundle 334KB → 340KB.

**The measurement that proves the mark is a report and not a badge.** Two sessions, both exactly two holds. The §4E battery (7.0s and a 38.2s open lock-off) drew spokes of **8 and 33** units; the week-7 deload (7.6s and 7.1s) drew **8 and 8**. Same spoke count, visibly different marks — and the 7.0s spoke in one session is the same length as the 7.6s spoke in the other, which is the whole of D44b. Under a per-session scale both marks would have been a short spoke and a full one, and the two sessions would have been indistinguishable. The battery's legend said `1 spoke reached the rim: the hold ran past 30s and is drawn at the scale's limit`, so the clamp is reported rather than hidden (AC3).

**Determinism was checked against the DOM, not asserted.** The nine-spoke week-1 mark was captured, the page fully reloaded, and the same session reopened: **byte-identical SVG, 2069 characters both times** (AC1). The unit tests pin the other half — the same sets under a different log id and a different date produce an equal sigil, which is what "no hash, no seed, nothing from the id" means in practice.

Also verified on the running app: every row's spoke count equalled its hold count (9 holds → 9 spokes, 6 → 6, 2 → 2, 1 → 1) with the session's exercise boundaries as gaps (AC2); the week-5 session with three holds drew **one spoke and two hollow hub ticks**, and its legend named them as holds logged with no duration (AC4); the two sessions carrying a `pain` and a `form-broke` set each drew exactly one amber tip and no others (AC5); the holdless Day 3 session drew **no mark at all** and its row still read `2 exercises` (AC7); History grouped newest week first with §4F's row quoted on each heading — `WEEK 7 · Week 7: Deload — half the volume, same intensity (plan §4F)` — and with a block marker set, the 4 May session moved into its own **`BEFORE THIS BLOCK`** group rather than into week 1 (AC8, AC9, D25); the §4E row read `§4E battery — not counted as a block session` in the week it happened (AC12); the in-progress session stayed pinned above the grouping (AC13); every mark carried `aria-hidden` with its facts in the text beside it; and a scan of the whole document found **no occurrence of "overdue", "behind", "late", "missed", "best", "PR", "streak", "great", "well done" or "nice"** (AC9, D23).

Design calls:
- **No hash, and that was the decision the whole task turned on.** A hash-derived glyph would have been more distinctive per session and impossible to defend: nothing about it could be checked against the log, so it could only be decoration wearing the costume of information. Every property here is arithmetic over the sets, and the test that matters is the boring one — the same sets under a different id draw the same mark.
- **The legend is not a nicety, it is the licence.** It renders on `LogDetail`, which is the one screen where the sets the mark was drawn from are also on display. A mark you can check against the log on the same screen is a report; the same mark alone in a list would be a badge, which is why the small one in the row is accompanied by its facts in text rather than standing on its own.
- **An untimed hold is a hollow tick on the hub, not a short spoke.** Drawing it at zero length would have been the easy thing and would have claimed a measurement that was never taken — the same distinction D43a draws for a total, drawn instead of stated.
- **`describeSessionFacts` replaced "N exercises", which was the least informative number available.** It counted catalog entries touched, so a two-set deload and a full Day 1 rendered identically. The line now reports holds, seconds, the untimed remainder, the edges used and the safety-signal count — and deliberately no maximum, because the heaviest load and the longest hold are both one line away and both PRs.
- **Empty weeks get no heading, where T26's empty weeks got a row.** The two are not inconsistent: in a *grid* an empty week is a fact about the block's shape, and in a *list* an empty heading is a heading with nothing under it.
- **The deload week is the smallest marks on the screen and is captioned by nothing.** §4F's own row is quoted above it, which says what the week was *for*; whether it happened that way is a training judgment the app has no standing to make.

**One thing worth recording for T28, which depends on this.** `sigilFor` is a function of (log, exercises) with no `today`, no settings and no block position, so a poster can draw any session's mark without re-deriving anything — and `groupByStory` already answers "which week did this session fall in" from a `BlockPosition` alone. What neither offers is a comparison between two marks, and nothing in T28 should add one: the marks are individually readable by construction, and ranking them is the one thing that would turn the whole mechanism back into a badge.

---

### [T28] Outcome: The whole block on one surface — its span, its volume, every session as a mark, and §4E's own before/after — assembled from what six earlier tasks already derive, and stating nothing about how it went.
Spec: this file | Status: [x] | Depends on: T24, T26, T27 | Wave 3

#### Context manifest
Create: `src/lib/poster.ts` (+ `poster.test.ts`), `src/screens/Poster.tsx` | Modify: `src/lib/routes.ts`, `src/App.tsx`, `src/screens/Block.tsx` | Conform to: D5, D6, D18, D23, D25, D29, D42, D43, D44, D45 | Delete: nothing

**What is already derived, and why this task is mostly assembly.** §4F's block ends and the app can currently answer, on four separate screens: where the block stands (T24), what its volume was and where it went (T26), what each session held (T27), and what §4E's two occasions measured (T16). None of them answers *what was this block* in one view, and the plan's own §4E — "Compare to week 1" — is the one question the whole eight weeks is built around. So this task adds one screen and almost no new derivation: the honest shape for the last task in a backlog is to spend its budget on composition, not on inventing a seventh aggregate.

**It is a screen, and that is settled rather than decided (D45).** "Poster" invites two things v1.8 already ruled on. A **printable** wall card was **rejected by the owner** in as many words — *"I'm just not going to print it"* — and **backend-free sharing** (a summary encoded in a URL fragment or a QR) was **deferred** as solving a problem the owner has not got, there being no coach and no second device. So there is no export, no image generation, no canvas, no print stylesheet and no dependency: the poster is rendered, read, and left where it is. Recording this as a decision rather than an omission matters because the word "poster" will invite the reversal again.

**It is not gated on week 8, and the title is a description rather than a lock (D45).** A surface that appears only in week 8 has to compute when week 8 is, which means telling the owner they are not there yet — a countdown, which D2a removed and D23 forbids, and which T24 refused for exactly this reason when it declined to say a retest was due. The poster therefore renders whenever the block has a session in it, and reads as *the block so far* without ever saying "so far" as a deficiency: no "N weeks remaining", no "incomplete", no progress bar toward eight. Past week 8 it reads the same way, because §4F's lighter week makes a block that runs long as correct as one that does not (D25).

**The constellation is the poster's one idea, and it is T27 reused rather than extended.** Every session in the block drawn as its mark, in chronological order, grouped under the week it happened in. That is the block's shape in one field of view: five dense marks in week 3, two small ones in week 7, a gap where a week has none. T27's note is the fence here — the marks are individually readable by construction, and **nothing compares two of them**. No mark is sized, sorted, highlighted, or captioned relative to another; the poster lays them out in time and stops. A "biggest session" or a "best week" would undo the whole mechanism (D44, D23).

**Chronological, where History is reverse-chronological, and the difference is deliberate.** History answers "what did I just do", so it reads newest first. A poster is read forward: week 1 at the top, the most recent week at the bottom, the way §4F's own table runs. Same grouping function, opposite direction, and the direction is the only thing this task adds to it.

**The one comparison on the screen is the plan's own, quoted and not applied.** §4E asks for a baseline and a retest under identical conditions and supplies its own three-line rubric for reading them. T16 built that comparison and `RetestComparison` already renders it with the rubric quoted verbatim, the delta uncoloured, and the comparison **withheld** when the edge changed. The poster embeds that component unchanged. It does not restate the rubric in its own words, does not pick which line applies, and does not summarise the block in a sentence — which is the single most tempting thing on this screen and the thing D23 exists to prevent.

#### Acceptance criteria
1. WHEN the block contains at least one completed session THE app SHALL render a single surface carrying the block's span, its volume, every session as a mark, and §4E's comparison where one exists. [x]
2. WHEN the poster reports the block's span THE dates SHALL be the first and last counted sessions and the label SHALL be T24's, so no surface can disagree about where the block starts (D25). [x]
3. WHEN the poster reports volume THE numbers SHALL be T26's — holds, time under tension, and the untimed remainder — over D43's population, with no figure recomputed by this task (D43). [x]
4. WHEN the sessions are laid out THE order SHALL be chronological, grouped by the week each fell in, with each week's §4F row quoted with its reference (D23). [x]
5. WHEN a session is drawn THE mark SHALL be T27's, unmodified, and no mark SHALL be sized, ordered, highlighted, or captioned by comparison with another (D44). [x]
6. WHEN a week inside the block has no sessions THE poster SHALL show the week with nothing in it rather than omitting it — a gap is part of the block's shape (T26 AC6). [x]
7. WHEN two §4E occasions exist THE poster SHALL render T16's comparison unchanged, including §4E's quoted rubric and its withheld-on-edge-change rule (D29, D22). [x]
8. WHEN fewer than two §4E occasions exist THE poster SHALL say what is recorded and nothing else — no "due", no "missing", no countdown to week 8 (D2a, D23). [x]
9. WHEN the derived week is past 8 THE poster SHALL read exactly as it does inside the block, with no week marked extra, late, or over (D25). [x]
10. WHEN the poster is rendered THE app SHALL NOT state or imply how the block went: no summary sentence, no grade, no adherence figure, no "complete", and no congratulation (D23). [x]
11. WHEN the poster is rendered THE app SHALL NOT report a maximum of any kind — heaviest load, longest hold, smallest edge, biggest session, or best week (D23). [x]
12. WHEN the poster is offered THE entry point SHALL exist only where there is a block behind it, and SHALL NOT be gated on, or count toward, week 8 (D45, D2a). [x]
13. WHEN the poster is used THE app SHALL export, download, print, or encode nothing: it is rendered and read in place (D45, D5). [x]
14. WHEN this task is complete THE app SHALL have stored nothing new: no field, no store, no settings key, and no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement. [x]

#### Edge cases
- A block with one session renders the whole poster with one mark, rather than a "not enough data" state — one session is a real block position (T24). [x]
- A block whose sessions hold no timed sets reports its holds with no duration, exactly as T26's total does (D43c). [x]
- Sessions logged before an explicit block marker are outside the poster entirely, matching T26's grid and T27's grouping (T24 AC4). [x]
- A §4E battery inside the block appears in the constellation, marked as a battery, while contributing nothing to the volume numbers (D29, D43). [x]
- An in-progress session is absent from the poster: it has not happened yet, the same rule every other aggregate applies (D16). [x]
- A block running past week 8 extends the constellation to its furthest week with no extra styling on the weeks past eight. [x]
- Deleting the earliest session re-anchors the block and redraws the whole poster, storing nothing that could disagree (D15). [x]
- Two §4E occasions recorded on different edges render the comparison withheld with §4E's own reason, rather than a delta the poster invented (D22, D30). [x]
- A §4E baseline logged *before* the block's first training session is inside the block: §4E puts the baseline in week 1 "fully rested", which normally means before any session, so batteries are admitted from the Monday of week 1 rather than from the session anchor (D10, D29). [x]

#### Non-goals & do-not-touch
- MUST NOT export, download, print, screenshot, encode to a URL or QR, or generate an image — both mechanisms were already ruled on in v1.8 (D45).
- MUST NOT add a dependency for layout, canvas, or image generation.
- MUST NOT gate the surface on week 8, count down to it, or describe the block as incomplete, in progress toward, or finished (D2a, D23, D45).
- MUST NOT write a sentence summarising the block, pick which of §4E's three rubric lines applies, or grade any part of it (D23).
- MUST NOT report a maximum, a rank, a best week, a biggest session, or an adherence or completion figure (D23).
- MUST NOT compare two session marks, or scale one against another (D44, T27's note).
- MUST NOT recompute a number another module owns — the span comes from `blockPosition`, the volume from `buildEdgeWeekGrid`, the marks from `sigilFor`, the comparison from `compareOccasions` (D43).
- MUST NOT store or cache anything, including a rendered poster (D15, D18).
- MUST NOT read a value out of `docs/training-plan.md`; §4F is the code-seeded constant and a `§` may be cited (D42, D6).

#### Verify
`npm run test && npm run build && npm run lint`, plus an in-browser pass at 390px: seed a block spanning weeks 1–8 including an empty week, a §4E baseline and retest, and a deload week; confirm the poster runs week 1 at the top to the last week at the bottom with §4F's row quoted per week and the empty week present but empty; confirm the volume figures are identical to the ones the Block screen reports; confirm every session draws its T27 mark with the battery marked as one and contributing nothing to the volume; confirm §4E's comparison renders with its rubric quoted and, after changing one occasion's edge, that the delta is withheld with §4E's reason; drive the block past week 8 and confirm nothing is marked late or over; confirm no entry point exists with an empty log; scan the rendered page for a summary sentence, a maximum, a percentage, or any congratulation and find none; confirm the database is still at version 2 with four stores.

#### Amendments (T28)

**2026-07-26 — T28 built. Build + lint clean, 556 tests green (21 new: 19 in `poster`, 1 in `tension`, 1 in `sigil`, plus one moved). All fourteen ACs verified in a running browser at 375×812, against a seeded eight-week block with an empty week, a deload week, a baseline and a retest.** Files: `src/lib/poster.ts` (+ `poster.test.ts`), `src/screens/Poster.tsx`; modified `src/lib/routes.ts`, `src/App.tsx`, `src/screens/Block.tsx`, and — for the defect below — `src/lib/block.ts`, `src/lib/tension.ts`, `src/lib/sigil.ts`. **No new dependencies, no type change, no stored field, and the live database read back at version 2 with the same four stores with `localStorage` and `sessionStorage` both empty.** Bundle 340KB → 346KB.

**The defect this task found is the one it was most likely to find, and it had been shipped twice.** §4E says the baseline is done "once in week 1 (fully rested, after a thorough warm-up)" — which in practice means **before** the block's first training session. But block membership everywhere floored at `startKey`, the day of the first counted *session*. So a baseline logged on the Tuesday and a first session logged on the Wednesday put the baseline *outside* the block, and the poster rendered **"One §4E battery recorded in this block — the comparison needs two"** with two on record. The same floor had been quietly undercounting T26's `excludedBatteries` and putting the baseline under T27's "Before this block" heading since each shipped.

The fix is one exported helper, `block.blockFloorKey`, and the argument for it is that it makes membership agree with arithmetic the app already does: `weekOf` has always counted from `mondayOf(startKey)`, so the **Monday of week 1** is the boundary the block was already numbered against. Lowering the floor to it admits *only* batteries — every counted rotating session is at or after `startKey` by construction — so no volume number anywhere moved, which the tests assert directly. **T26 and T27 are amended by this**, and both now read from the same helper: three surfaces that were each entitled to their own answer about what is in the block now cannot disagree, which is D43(b)'s whole point.

**Everything else was assembly, and it held.** The poster reported `58 holds · 6m18s under tension` and `9 sessions · ~week 8 of 8`, identical to the Block screen because both read the same `buildEdgeWeekGrid` (AC3); the constellation ran week 1 at the top to week 8 at the bottom with §4F's row quoted on each, **week 2 present and reading "No sessions logged this week"** (AC4, AC6); every session's spoke count equalled its hold count across all eleven rows — 9→9, 6→6, 10→10, 5→5, 8→8, 6→6, 9→9, 2→2, 3→3, 2→2, 1→1 — at one size, with nothing sized or ordered by comparison (AC5); the two batteries appeared in their weeks marked `§4E battery — not counted as a block session` while the volume counted neither (AC7); §4E's comparison rendered `+50lb → +58lb` with `28.6%BW → 33%BW` and the rubric quoted verbatim, and after changing the retest's edge to 18mm the delta became **`edge changed`** with §4E's own sentence (AC7, D22); seeding a session into week 11 extended the constellation with **no occurrence of "overdue", "behind", "late", "missed", "extra" or "over"** (AC9).

The D23 scan is worth stating as a result rather than an intention: a search of the rendered poster for `overdue, behind, late, missed, best, PR, streak, congrat, well done, nice work, complete, completed, incomplete, remaining, to go, on track, adherence, great block, good job, biggest, longest, heaviest, smallest` returned **zero hits** (AC10, AC11). AC13 was checked structurally rather than by reading the code: the page contains **no `<a download>`, no `data:` or `blob:` href, and no anchors at all**, and its only controls are Done, the grid's two toggles, two `§` links and the tab bar.

Design calls:
- **The screen computes nothing.** The span and label are T24's, the volume T26's, the marks T27's, §4E's comparison T16's component embedded unchanged. A seventh place that decided what a session is would be a seventh place that could disagree — which is exactly the bug above, found because two surfaces finally sat next to each other.
- **Chronological, where History is reverse-chronological.** Same grouping function, opposite direction. A poster is read forward, the way §4F's own table runs; History answers "what did I just do". The direction is the only thing this task added to `groupByStory`.
- **Not gated on week 8, and the title is a description (D45b).** A surface that unlocks in week 8 has to compute when week 8 is and therefore tell the owner when they have not got there — a countdown, which D2a removed. The poster reads identically at week 3 and week 12.
- **No artifact, and that was settled rather than decided.** v1.8 already rejected a printable card in the owner's own words and deferred URL/QR sharing. Writing it down as D45a matters because "poster" will invite the reversal again — and there is no dependency, no canvas and no export path to remove later.
- **`formatSpan` is tested by structure, not by string.** The app formats every date through `toLocaleDateString`, so asserting "3 Jun 2026" would pin the test machine's locale instead of the rule. The test asserts two dates and a separator for a range, one date and none for a single day.
- **§4F's lighter-week caveat is rendered at the bottom, in full.** On the one screen most likely to be read as a verdict, it is the sentence that makes the app's silence the plan's position rather than a design preference.

**The backlog's last task, and what it deliberately leaves undone.** T17 (symptom check + plan-cited stop-signal card) is still available in Wave 1, deferred on the owner's own "I don't care about T17 that much". Nothing in Wave 3 created a reason to revisit it. What T28 explicitly does not leave behind is a comparison mechanism: no two marks, sessions, or weeks are ranked anywhere in the app, and the four decisions that hold that line — D23, D43, D44, D45 — now each have a surface enforcing them.

---

### [T33] Outcome: "Today's GtG" is the plan's committed list — every movement, its dose and the trigger that fires it — checked off one movement at a time, instead of two tiles that named none of them.
Spec: this file | Status: [x] | Depends on: T5b | Owner request, 2026-07-28

#### Context manifest
Create: `src/lib/gtg.ts` (+ `gtg.test.ts`), `src/screens/GtgToday.tsx` | Modify: `src/types.ts`, `src/data/exercises.ts`, `docs/training-plan.md` (§10C), `src/components/CheckOffs.tsx`, `src/lib/routes.ts`, `src/App.tsx`, `src/lib/storage.test.ts` | Conform to: D6, D9, D11a, D13, D14, D17, D23, D42 | Delete: nothing

**What was actually missing, stated precisely.** The owner's report — *"just 'Did you do the thing or not?' instead of an actual daily routine with exercises, sets and reps"* — reads at first as a request for set logging, which D11 refused with a good argument. It is not. Training plan §8 prescribes GtG as a **table**: movement, dose, trigger, risk class, seven rows. The app rendered two tiles, `General` and `Pull`, and the tiles carried the risk-class split (D13) and nothing else. Every dose in that table already existed in the catalog, buried mid-sentence in a `prescription` string written for a session (`"Session: 3 x 10. GtG: 10–15 reps, morning and evening"`), and **no surface in the app displayed it**. So the missing thing is prescription, not logging: the owner had to remember what "General" meant and how much of it, which is problem #2 of the PRD in the one place the app had never applied it. D11a keeps the logging rule and drops the unstated half.

**The dose is a typed catalog field, for D17's reason rather than by analogy to it.** Splitting `"Session: 3 x 10. GtG: 10–15 reps, morning and evening"` on `"GtG:"` works on all six entries today and hands a **session** number to a daily habit the first time an entry is worded differently — and the catalog is hand-authored (D6), so "worded differently" is one edit away. `Exercise.gtg` therefore carries `{dose, trigger, riskClass}`, transcribed cell-for-cell from §8's table, beside the `gtgEligible` flag that has been there since T2. Two declarations that could disagree are asserted to agree rather than trusted to.

**The catalog was missing the movement §8 tells the owner to prefer.** §8's committed list has seven rows; T2 marked six exercises eligible, and the seventh — *scapular pull-ups / dead hangs on jugs* — was not in the catalog at all. That is not a rounding error: §8's pull-up caveat says in as many words that if you want a GtG pulling stimulus you should **prefer** scapular pull-ups and dead hangs, and that full pull-ups are the first thing to drop at any elbow soreness. So the app's entire GtG pulling offer was the movement the plan warns about, and the recommended alternative did not exist. §8 gives its dose, its trigger and its risk class but never describes how to perform it, so the execution goes into `docs/training-plan.md` **first**, as §10C, stating its source and that it adds no prescription — the mechanism D6 requires and §10A/§10B already established. Only then into the catalog.

**One movement, one day, one tap — and nothing counted beyond that.** No set entry, no rep field, no load, no RPE, and specifically **no count of how many times a movement was done today**. A count is the shape this screen would grow a quota in: §8's doses are triggers, its last paragraph calls the pulling items optional, and the cap it *does* state (`max 3–4x/day`) is a ceiling the app has no business policing — so it is rendered as part of that movement's trigger text, in §8's words, and enforced by nobody. This is D11a(b) and D23 pointing the same direction.

**The home card loses its GtG tick rather than keeping two ways to record a day.** T5b's two tiles become two rows that report and open the routine. A category tick left in place would be a second write path recording the same day while naming none of the movements — the disagreement D43(b) is about, one screen earlier. The climbing half of the card is untouched: a climbing day is a day, not a list (D9).

#### Acceptance criteria
1. WHEN the GtG routine is opened THE app SHALL render every movement of §8's committed list, grouped as the two kinds D13 tracks, each with its dose and its trigger. [x]
2. WHEN a movement is tapped THE app SHALL record a check for today carrying that movement's id and its kind, and tapping it again SHALL remove it. [x]
3. WHEN a day is read THE per-movement status SHALL count movements rather than checks, so a movement ticked more than once reads as done once. [x]
4. WHEN a check written before this task — or by the check-log's backfill form — is read THE kind SHALL still read as done for that day, with no migration, no `DB_VERSION` bump and no `BACKUP_SCHEMA_VERSION` bump. [x]
5. WHEN such a check falls on today THE routine SHALL say the kind is recorded with no movement named, and offer to remove it, rather than showing an empty day beside a home card that reads done. [x]
6. WHEN the home card reports GtG THE two rows SHALL state what today holds and the 7-day day-count, and SHALL open the routine rather than record anything. [x]
7. WHEN any dose, trigger or risk class is displayed THE text SHALL be §8's, carried as a typed catalog field and never parsed out of a `prescription` string (D6, D17). [x]
8. WHEN the catalog is read THE seven movements of §8's list SHALL be exactly the entries flagged `gtgEligible`, and no Day 1 max protocol SHALL be among them (plan §8, D13). [x]
9. WHEN scapular pull-ups / dead hangs are shown THE entry SHALL exist in the catalog with §10C's execution and §8's dose, above full pull-ups in the pull section. [x]
10. WHEN the routine reports what a day holds THE app SHALL NOT divide it by the list, score it, or describe a movement as missed, due, or owed (D23). [x]
11. WHEN a movement is recorded THE app SHALL NOT ask for or store a set, a rep count, a load, or a number of times done (D11a). [x]

#### Edge cases
- A day holding both a movement check and a whole-kind check → both are reported, and removing one leaves the other (AC5). [x]
- A movement id recorded under the other kind's `CheckKind` → counted under the kind its catalog entry declares, so a stray record cannot inflate the wrong section. [x]
- The app left open across midnight → the routine rolls over on refocus, T5b's rule, unchanged. [x]
- A kind whose section has no movements → the section renders nothing rather than a heading over an empty list; `gtgSections` still returns the kind so no surface silently drops one. [x]
- Un-ticking is silent where the home card's climbing tiles confirm: a movement on one day costs one tap to restore, and a dialog would cost more attention than the record is worth. The whole-kind check keeps its confirm — that one is not this screen's to lose. [x]
- A backup exported before this task → imports unchanged; `exerciseId` is optional and `checks` travel through `replaceAll` whole (D28). [x]

#### Non-goals & do-not-touch
- MUST NOT add a set, rep, load, RPE, or times-done field to a GtG check, or a timer to this screen (D11a, D18).
- MUST NOT render a completion fraction, percentage, streak, or "N of 7" against §8's list (D23).
- MUST NOT block, warn about, or grey out a movement at its stated daily cap — §8's `max 3–4x/day` is displayed as §8 writes it and enforced by nobody (D23, D31's spirit).
- MUST NOT mark fingers, abrahangs, or any Day 1 max protocol GtG-eligible (D13, plan §8).
- MUST NOT claim GtG strengthens tendons in any copy on the new surface (D14).
- MUST NOT parse a dose out of `prescription`, or read one out of `docs/training-plan.md` at runtime (D17, D42).
- MUST NOT write catalog content for the seventh movement without putting it in the plan document first (D6).
- MUST NOT change the climbing half of the check-off card, or `CheckKind` (D9, D13).

#### Verify
`npm run test && npm run build && npm run lint`, plus an in-browser pass at 375px: open the routine and confirm all seven movements render with §8's dose and trigger, general above pull; tick one of each and read the two records back out of IndexedDB confirming `kind` + `exerciseId`; un-tick one and confirm only that record is removed; write a pre-T33 check (kind only, no `exerciseId`) directly into the store and confirm the routine reports it as an unnamed check for the kind, the home card reads it as done, and removing it leaves every other record; confirm the home rows navigate and record nothing; scan the surface for a fraction, a percentage or a quota word and find none.

#### Amendments (T33)

**2026-07-28 — T33 built. Build + lint clean, 624 tests green (11 new in `gtg`), zero console errors.** Files: `src/lib/gtg.ts` (+ `gtg.test.ts`), `src/screens/GtgToday.tsx`; modified `src/types.ts`, `src/data/exercises.ts`, `docs/training-plan.md` (§10C), `src/components/CheckOffs.tsx`, `src/lib/routes.ts`, `src/App.tsx`, `src/lib/storage.test.ts`. **One new optional field on `Check`, one new optional field on `Exercise`, one new catalog entry — no new dependency, no new store, no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement.**

| Choice | Why |
|---|---|
| The complaint is about prescription, not logging | D11's argument against logging scattered sets is still right, and re-reading it was the whole design step: it answered a *logging* question and silently also answered a *display* one. Keeping the first and reversing the second is D11a, and it is why this task ships a dose on screen and no rep field. |
| The seventh movement, and the plan edited before the catalog | §8 says to *prefer* scapular pull-ups and dead hangs and names full pull-ups as first-to-drop — and the catalog had only the second. §8 never describes the movement, so §10C writes the execution down, cites §8 for every number it does not add, and says it supersedes nothing. The catalog entry followed (D6). |
| `gtg` is typed, not split off `prescription` | `"Session: 3 x 10. GtG: 10–15 reps…"` splits cleanly on all six existing entries and is one hand-edit from handing a session prescription to a daily habit. D17's argument, and a test asserts `gtg` and `gtgEligible` agree entry by entry. |
| Movements counted, checks not | A movement ticked twice is one movement, exactly as `last7DayGtgCounts` counts a day once however many checks land on it. Two readings of "how much" is one more than this surface should have. |
| No times-done counter, and the cap is §8's words | The one number §8 states is a **ceiling** (`max 3–4x/day`), and a counter would turn the screen's other six rows into targets. It is rendered inside that movement's trigger and enforced by nobody (D23). |
| The kind roll-up stays `dailyGtgStatus` | The home row's filled mark reads the same function every week summary is built on, rather than a second definition of "the kind happened today" living in the new module. |
| The whole-kind check is surfaced, not hidden | Pre-T33 checks and the check-log's backfill form both write one. Left invisible, the routine would show an empty day beside a home card reading done — so the routine names it and offers to remove it, with the confirm the movement rows deliberately do not have. |

**Verified in a browser at 375×812** against a seeded store: all seven movements rendered with §8's doses (`10–15`, `8–12 (about half your max)`, `5s x 1–2`, `10–12/side`, `10–15 reps`, `5–8`, `3–5 (well under half your max)`) and their triggers, scapular above full pull-ups; ticking push-ups and the scapular work wrote `{kind: 'gtg-general', exerciseId: 'pushups-or-dips'}` and `{kind: 'gtg-pull', exerciseId: 'scapular-pullups-dead-hangs'}` with today's date key; un-ticking the scapular row removed that record and left the other two; a hand-written pre-T33 check (`kind: 'gtg-general'`, no `exerciseId`) rendered as *"Also today: a check for this kind with no movement named — tap to remove"*, made the home row read **"1 movement today · plus a whole-kind check · 1 of last 7 days"**, and removing it left the movement check and a second legacy check on a past day intact — which is AC4 and AC5 together. The home rows navigated and wrote nothing. No fraction, percentage or quota word appears on either surface.

---

### [T34] Outcome: The finger warm-up and the abrahangs are a routine the owner runs every day — started in one tap, cadenced by §10A's grip sequence, and counted from the log rather than remembered.
Spec: this file | Status: [x] | Depends on: T23, T29 | Owner request, 2026-07-29

#### Context manifest
Create: `src/lib/daily.ts` (+ `daily.test.ts`) | Modify: `docs/training-plan.md` (§10D), `src/data/routines.ts`, `src/data/exercises.ts`, `src/screens/Home.tsx`, `src/screens/RoutineList.tsx`, `src/screens/History.tsx`, `src/lib/storage.test.ts` | Conform to: D2a, D6, D13a, D15, D23, D25, D29, D42 | Delete: nothing

**The request, and what it reverses.** The owner: *"The warm-up and abrahangs routine should be a daily exercise."* Three places in this repo said the opposite in as many words — plan §8 (*"Abrahangs are retained only as a warm-up before Day 1 and climbing days, not as a daily habit"*), §10A repeating it, and the catalog cue *"Use it as a warm-up before Day 1 and climbing days, not as a daily habit"* — all downstream of D13. So this is a reversal, not a feature, and it is handled the way this repo handles reversals: **the plan document moves first** (§10D, which states what it supersedes and leaves §8's text standing), then D13a records the narrowing, then the catalog, then the app. The argument for the reversal is in §10D and it is §8's own: every source §8 cites for Abrahangs describes a daily protocol.

**A routine, not a check — and the reason is D11a's, not a preference.** The obvious cheap build is a third `CheckKind` on the GtG screen. D11a exists because that shape was applied to something it did not fit and the owner said so; applying it here would be the same mistake with better precedent. §10A's abrahangs are a ten-minute cadence through six named grips in a stated order, and the app **already runs them** — `warmupPlanOf` returns a cycle, `gripAt` names the grip, `isSequenceComplete` stops arming at twenty hangs (T23, T29). A checkbox would discard all of that to record less.

**Outside the rotation, and that is the whole modelling decision.** `inRotation: false` is D29's flag, and its argument transfers exactly: completing a measurement must not change which training routine is up next. A *daily* routine that rotated would be worse than the battery ever was — it would win "least recently completed" every single day and Day 1 and Day 3 would never come up again. It also stays out of `blockPosition` (D25), `buildEdgeWeekGrid`, `poster` and the week's routine balance, all of which already filter on `rotates`, so **no aggregate changes**: a warm-up carries no `holdSec`, and ten minutes of 40%-of-max no-hangs is not block volume (D43(b)).

**One consequence of that flag had to be narrowed.** `History` read *any* non-rotating routine as a §4E battery. That was true while the battery was the only one, and it would have put a test badge on every daily. It now compares to `BATTERY_ROUTINE_ID`: non-rotating is why the block does not count a log, not what the log *is*.

**A completed Day 1 counts as one of the day's two.** §10D says it, and it is derivable rather than declarable: Day 1's `exerciseIds` open with exactly the daily's two entries, so `DAILY_ROUTINE_IDS` names both routines and a test asserts that membership against the seed rather than trusting it — remove the warm-up from Day 1 and the test fails instead of the app silently crediting a session that did not run it.

**The two numbers are quoted, never enforced.** §10D prescribes twice a day at least six hours apart. The app reports how many runs today (in words, never a fraction) and either the clock time the six hours will have elapsed or how long ago the last run was — and the Start button is live in every one of those states. A spacing that greyed out a control would be the app refusing a session the owner decided to run, and a "1 of 2" would be the quota D23 and T33's non-goals both refuse. Nothing is due, owed, missed, or counted as a streak (D2a).

#### Acceptance criteria
1. WHEN the seed catalog is read THE routines SHALL include a daily routine holding `finger-warmup-progression` then `abrahangs-no-hang`, with `inRotation: false` and no new exercise entry. [x]
2. WHEN the daily routine is started THE session SHALL run through the ordinary session surfaces, with the warm-up runner and §10A's grip sequence exactly as they behave inside Day 1. [x]
3. WHEN the daily routine is completed THE routine that is up next, the block position, the week's routine balance, and every block aggregate SHALL be unchanged (D15, D25, D29). [x]
4. WHEN the home screen is read THE daily SHALL appear as its own card stating how many qualifying runs today holds and what §10D's six-hour spacing says, with a one-tap start. [x]
5. WHEN a Day 1 session is completed THE day SHALL count it as one of §10D's two runs, derived from the log with nothing additional stored. [x]
6. WHEN a Day 3 session is completed THE day SHALL NOT count it — §5's routine contains neither entry. [x]
7. WHEN a session is in progress and not completed THE count SHALL NOT include it, the predicate every other count uses. [x]
8. WHEN the six hours since the last run have not elapsed THE app SHALL state when they will, and SHALL NOT disable, hide, warn about, or delay the start control. [x]
9. WHEN any daily status is rendered THE copy SHALL NOT contain a fraction, a target, a streak, or the words due, owed, missed, behind, or late (D23). [x]
10. WHEN history renders a daily session THE row SHALL NOT be marked as a §4E battery. [x]
11. WHEN the catalog cites the daily THE text SHALL come from `docs/training-plan.md` §10D, written there first (D6, D42). [x]
12. WHEN a database or backup written before this task is read THE app SHALL work unchanged, with no migration, no `DB_VERSION` bump and no `BACKUP_SCHEMA_VERSION` bump. [x]

#### Edge cases
- The app left open across midnight → the count recomputes from `new Date()` on refocus, T5b's rule, unchanged. [x]
- A future-dated completion (clock change, imported backup) → reads as zero elapsed rather than a negative interval, and the spacing reads as not clear. [x]
- Three or more runs in a day → reported as the count it is. §10D's two is a prescription, not a ceiling the app polices (D23, and T33's `max 3–4x/day` precedent). [x]
- A day whose only qualifying session is a Day 1 → one run, and the spacing is measured from that session's `completedAt`, which is the later of the two candidate instants and therefore never reports the window as clear early. [x]
- An abandoned daily log → invisible to the count, and D46's resume banner is what surfaces it. [x]
- The daily started from the Start tab while another session is open → T4's Resume/Discard modal, unchanged. [x]

#### Non-goals & do-not-touch
- MUST NOT add a `CheckKind`, a check, or a tick for the daily — it is a session, and two write paths for one day is D11a's disagreement (D13a).
- MUST NOT mark abrahangs or the warm-up `gtgEligible`; §8's committed list is unchanged and fingers stay off it (D13, D13a).
- MUST NOT let the daily rotate, anchor the block, count as block volume, or enter the week's routine balance (D15, D25, D29, D43).
- MUST NOT render a "1 of 2", a meter, a streak, a percentage, or a colour that reads as incomplete (D23).
- MUST NOT block, delay, or grey out the start control on the six-hour spacing (D23, D31's spirit).
- MUST NOT add a reminder, a notification, a scheduled time, or a day-of-week (D2a, D15).
- MUST NOT change §4B, §4C, or any max protocol's frequency — §10D moves a 40%-of-max protocol, nothing else (plan §8).
- MUST NOT write catalog content the plan does not carry (D6), or read a number out of the plan at runtime (D42).

#### Verify
`npm run test && npm run build && npm run lint`, plus an in-browser pass at 375px: confirm the home card reads *"Not run today · 6h apart · §10D"* on an empty store and that Start opens the two-exercise session; run the abrahangs and confirm the grip sequence and 10s/20s cadence are the ones Day 1 gives; finish it and confirm the card reads *"1 run today · 6h spacing clears HH:MM"*, that Up next is unchanged, that the block card is unchanged, and that History shows the session with no §4E badge; scan every daily surface for a fraction or a quota word and find none.

#### Amendments (T34)

**2026-07-29 — T34 built. Build + lint clean, 663 tests green (23 new in `daily`), zero console errors.** Files: `src/lib/daily.ts` (+ `daily.test.ts`); modified `docs/training-plan.md` (§10D), `src/data/routines.ts`, `src/data/exercises.ts`, `src/screens/Home.tsx`, `src/screens/RoutineList.tsx`, `src/screens/History.tsx`, `src/lib/storage.test.ts`. **One new pure module, one new seed routine, one new plan addendum — no new exercise, no new type, no new field, no new store, no new route, and no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement.**

| Choice | Why |
|---|---|
| The plan moved before the catalog | §8 said "not as a daily habit" in three places and the catalog quoted it. Editing the cue and leaving the plan standing would have made the app disagree with the document it is a tool for. §10D states what it supersedes, leaves §8's text in place, and gives §8's own sources as the argument — §10A/B/C's mechanism (D6). |
| A routine, not a third `CheckKind` | The cheap build is a checkbox, and D11a is the record of what a checkbox costs when the thing behind it is an actual protocol. The app already runs §10A's six grips at 10s/20s and stops at twenty hangs; a tick would have thrown that away to record less. |
| `inRotation: false` | D29's flag for D29's reason, and the failure it prevents is larger here than for the battery: a rotating daily would be "least recently completed" every day and Day 1 and Day 3 would never surface again. It also keeps the daily out of the block, the tension grid and the poster for free — every one of those already filters on `rotates`. |
| `isBattery` narrowed to an id | Non-rotating and "is a §4E test" were the same set until this task, and History was reading the first to mean the second. A daily warm-up badged as a test is the defect that would have shipped. |
| Day 1 counts, derived | §10D says a day that opens a session with the warm-up and abrahangs is not owed a third run. Day 1's `exerciseIds` already prove it, so nothing is stored and a test asserts the membership against the seed rather than trusting a hand-written list. |
| Spacing is stated, never enforced | The six hours are the one interval §10D calls non-negotiable, which is exactly why the temptation was to gate the button on it. Gating would make the app refuse a session the owner chose to run — D31's "gear offers, it never restricts", pointed at a clock. It names the time the window clears and leaves the decision where D23 leaves every other one. |
| No "1 of 2" | §10D prescribes two, and a fraction against two is a score out of two. The count is reported in words and nothing divides it — the same reading T33 reached about §8's seven rows. |

**Verified in a browser at 375×812** against an empty store: the home card read *"Not run today · 6h apart · §10D"*; Start opened a two-exercise session and the abrahangs' runner showed *"NOT STARTED · 20 HANGS"*, 4-finger open first, `10s on · 20s off`, and all six grips with §10A's counts — the same surface Day 1 gives; finishing it left the card reading *"1 run today · 6h spacing clears 6:22 AM"* with **Up next still Day 1 · Never done**, the block card still *"Not started"*, and the week's routine line still showing neither routine ticked. History listed the session with **no §4E badge** (the predicate this task narrowed). Completing a Day 1 afterwards made the card read **"2 runs today"** while the block card moved to *"1 session · ~week 1 of 8"* — the daily counted for §10D and not for the block, which is AC3 and AC5 together. The start list shows the daily beside the two training routines with the battery still on its own row, `#/plan/10D` resolves from the exercise's citation chips (`§4A §8 §10A §10D`), and no daily surface carries a fraction, a meter, or a quota word. Zero console errors, zero server errors.

### [T36] Outcome: The four tiers the README is organised around are the screen the owner opens — one lane each, in frequency order, every lane stating its own cadence and its own state, and nothing on the surface reading all four together.

Spec: this file | Status: [x] | Depends on: T5b, T33, T34 | D47, D49, D50 | Owner request, 2026-08-01

#### Context manifest

Create: `src/screens/Today.tsx`, `src/lib/lanes.ts` (+ `lanes.test.ts`) | Modify: `src/App.tsx`, `src/lib/routes.ts`, `src/components/TabBar.tsx` | Delete: `src/screens/Home.tsx` | Read-only: `src/lib/daily.ts`, `src/lib/pool.ts`, `src/lib/rotation.ts`, `src/lib/block.ts`, `src/lib/checks.ts`

**Nothing in `lib/` is rewritten, and that is the shape of the task.** Every lane's state already has an engine — `dailyStatus` (collagen), `dailyIsometricsToday` and `poolToday` (the two rotation tiers), `routineRotation` plus `blockPosition` (heavy), `checks.ts` (the climbing week). All five are pure, tested, and unchanged here. `lanes.ts` is a *composition* module: it calls those five and returns one array of lane descriptors, so the ordering rule and the four-things-per-lane rule live in one tested place rather than in JSX. If a lane's state looks wrong, the bug is in a module this task did not touch.

**Why a new file rather than a rewrite of `Home.tsx`.** Home accumulated seven cards in five shapes across T8, T9, T15, T16, T24, T26, T33 and T34, and each shape encodes its own task's argument. Editing it into lanes would preserve those arguments by accident. `Today.tsx` is written against `lanes.ts` and the D49 fence, and Home is deleted in the same commit so there is never a period where two surfaces answer "what now" differently — the disagreement D11a and `gtg.ts` both exist to prevent.

**Frequency is the ordering and it is a constant, not a computation.** Collagen (2×/day), daily isometrics (1×/day), pool (2–3×/wk), heavy (1–2×/wk). Declared in that order in `lanes.ts` and never sorted at runtime. A screen that reorders itself by what is stalest is a queue of debts, and the owner would learn a layout that moves — D49, and the reason `rotation.ts` has no missed-day concept.

**The cadence string is quoted, never composed.** `2×/day · ≥6h` comes from the tier's source the way every other number in this app does (D6, D53). A lane that computed its own cadence label from an interval constant would be the app authoring a prescription.

**Climbing is above the tiers and shaped unlike them.** A strip with two ticks and no start control. It is the only lane not run inside the app (D9), and a session-shaped card promises a session that never arrives. It sits above rather than in its frequency position because it is the sport the tiers serve.

**Elevation encodes cadence.** The two daily tiers are raised because they are always live; the two weekly ones are flat. This is the one visual property a lane varies, it is a function of the tier and not of the log, and it is asserted as such — which is what stops it drifting into a done-state (D49).

#### Acceptance criteria

1. WHEN the app opens at `#/` THE screen SHALL be Today, rendering a climbing strip followed by exactly four lanes in the order collagen, daily isometrics, pool, heavy.
2. WHEN any lane is rendered THE lane SHALL state its tier name, its quoted cadence, its current state from that tier's existing engine, and exactly one start control.
3. WHEN the collagen lane is rendered THE state SHALL be `daily.ts`'s runs-today and spacing, in the words T34 AC4 already established.
4. WHEN the daily-isometric lane is rendered THE state SHALL name today's slot and its movement from `dailyIsometricsToday`, unchanged from what `#/joints` renders today.
5. WHEN the pool lane is rendered THE state SHALL list the stalest targets from `poolToday` with their days-since, ordered as that module orders them.
6. WHEN the heavy lane is rendered THE state SHALL name the routine `routineRotation` puts up next and when each rotating routine was last completed.
7. WHEN the climbing strip is rendered THE two weekly checks SHALL be togglable in one tap, with no start control and no session.
8. WHEN a session is in progress THE resume affordance SHALL appear above the lanes, with D46's predicate unchanged.
9. WHEN any lane is rendered THE surface SHALL NOT compute, store or render any value derived from more than one lane.
10. WHEN a lane has been run today THE lane's colour, weight, elevation, icon and ordering SHALL be identical to a lane that has not.
11. WHEN the six hours since a collagen run have not elapsed THE lane SHALL state when they will and the start control SHALL remain live, enabled and unstyled (T34 AC8).
12. WHEN any lane's copy is rendered THE text SHALL NOT contain a fraction whose denominator is a prescription, nor the words due, owed, missed, behind, late, or streak (D23, D49).
13. WHEN `lanes.ts` is called twice with the same arguments THE result SHALL be identical — no `Date.now()` inside, today passed in, as every other derivation takes it.
14. WHEN a database or backup written before this task is read THE app SHALL work unchanged, with no migration, no `DB_VERSION` bump and no `BACKUP_SCHEMA_VERSION` bump.

#### Edge cases

- An empty store → every lane renders its own never-loaded state and a live start; no lane is hidden, and the screen is not replaced by an onboarding state.
- The app left open across midnight → all five states recompute from `new Date()` on refocus, T5b's rule, unchanged.
- No block started yet → the heavy lane states the rotation only; the block line is absent rather than reading week 1 (D25).
- A target never loaded → `poolToday` already orders never-loaded first; the lane renders its wording and adds nothing.
- Every pool target inside its interval → the lane states that and keeps its start control live. It does not render an all-clear, a rest-day, or a done state (D49).
- A tier whose catalog has no movement → the lane states it has nothing declared. It is not hidden, because a hidden lane is indistinguishable from a satisfied one.

#### Non-goals & do-not-touch

- MUST NOT modify `daily.ts`, `pool.ts`, `rotation.ts`, `block.ts` or `checks.ts`. If a lane needs a value they do not expose, escalate rather than widening them.
- MUST NOT render a focus line on any lane — the taxonomy is a separate stage, and a hand-written purpose string is what D48 exists to prevent.
- MUST NOT move the block, the §4E battery or the tension grid yet (D50, stage 4). The global week chip stays until that task removes it with its screen.
- MUST NOT collapse `#/joints`, `#/gtg` or `#/checks` yet (stage 3). Both routes render this cycle; the lane and the screen read the same engine, so they cannot disagree.
- MUST NOT add an aggregate, a completion state, a day summary, a streak, or a lane ordering that depends on the log (D49).
- MUST NOT add a reminder, a notification, a scheduled time or a day-of-week (D2a, D15).
- MUST NOT introduce a second accent hue, or use `#f6a06b` for any lane state — it is reserved for tissue.

#### Verify

`npm run test && npm run build && npm run lint`, plus an in-browser pass at 375×812 against both an empty store and a seeded one: confirm lane order is fixed across both, that a collagen run completed inside six hours changes only the stated words and not one visual property of the lane, and that no string on the surface contains a fraction against a prescribed count.

#### Amendments (T36)

| Change | Why |
|---|---|
| `CheckOffs.tsx` is **kept**, not deleted with Home | The manifest listed only `Home.tsx` for deletion, and deleting the component it renders looked like tidying dead code — but `#/checks` renders `CheckOffs` too, and that route stays this cycle by this task's own non-goal. Today therefore grows its own climbing strip and both surfaces read `weekClimbingStatus`, which is the arrangement the non-goal already anticipated: two renderings of one engine cannot disagree. Stage 3 collapses the route and the component together. |
| Today keeps a GtG row into `#/gtg` | Home reached §8's list through `CheckOffs`, and Today does not render that card. Without a row the list would have become unreachable from the main screen — a regression this task has no reason to cause, and GtG's movements are pool-tier work whose lane placement is stage 3's question. |
| Two empty-catalog branches in `lanes.ts` were removed as unreachable | `DAILY_ISOMETRIC_SLOTS` and `POOL_TARGETS` are constants, so those engines return their slots whatever the catalog holds, with a null `exercise` on any they cannot fill. The lanes therefore *name the uncovered tendon* rather than reporting the tier as empty, which is strictly more useful — a test asserted the wrong wording first and the code was right. |
| The heavy lane's secondary routine is short-named | Routine names carry an em-dash, so a second one as a separator read the state as part of the name: *"Day 3 — Pull / Antagonist — never done"*. The lead keeps the full name, where it has the line to itself. Home's `shortName` had solved this once already. |
| AC7 verified by a dispatched click, not a coordinate tap | The browser pane did not dispatch synthetic coordinate input — the same limitation recorded against the symptom seeding in `10fbd75`. The tick's handler was exercised directly and `aria-pressed` flipped; the render path is what the screenshot verified. |

### [T37] Outcome: Every surface is reached from the tier it belongs to or the tab that owns it — two tiers stop sharing one screen, the stop signals stop hiding inside a tier, and five tabs become four.

Spec: this file | Status: [x] | Depends on: T36 | D47, D49 | Owner request, 2026-08-01

#### Context manifest

Create: `src/screens/Library.tsx`, `src/screens/TierDetail.tsx`, `src/screens/Signals.tsx` | Modify: `src/lib/routes.ts` (+ `routes.test.ts`), `src/App.tsx`, `src/components/TabBar.tsx`, `src/screens/Today.tsx` | Delete: `src/screens/Joints.tsx`, `src/components/CheckOffs.tsx` | Read-only: every module in `lib/` except `routes.ts`

**`#/joints` was three subjects on one screen.** It rendered the daily isometric slots, the pool queue and the stop signals together, which is the arrangement D47 exists to undo: two tiers with different cadences and different rules do not share a surface, and the signals are not a tier at all. It becomes `#/tier/daily-isometric`, `#/tier/pool` — each the detail behind its own lane's control — and `#/signals`.

**One screen serves both tiers, parameterised by tier.** `TierDetail` takes a tier and renders that tier's slots from the engine that owns them; it does not branch into two layouts. The two tiers already differ in exactly the way the data differs — the daily slots are returned in slot order whatever their state, the pool is a ranking — and a component that reads `SlotStatus[]` needs to know nothing else.

**Stop signals get their own route, and that is D47 applied to itself.** A signal changes what the *plan* says to do across every tier — §8 drops full pull-ups first, §10D drops the day's second abrahang session — so filing it under the joint rotation made a cross-cutting rule reachable only from one tier's screen. It is reached from Today, beside the lanes rather than inside one.

**§8's list keeps its own screen (owner decision, 2026-08-01).** Every GtG movement is pool-tier, which makes merging it structurally tempting — and D11a exists because GtG was *under*-surfaced, so a list whose subject is its doses and triggers must not become a section below a queue. `#/gtg` is unchanged and is reached from the pool lane and Today's row.

**Four tabs: Today, Library, Log, Settings.** Exercises and the plan document are both things read rather than done, and they were two of five tabs; they become one. History and the check log are both the record of what happened, and they become one. Nothing is deleted — every screen that existed is still reachable, and `#/plan/4B` still resolves, because an exercise's citation is a deep link a tab reorganisation must not break.

**`#/checks` goes.** It was Home's check card on a route of its own, and both halves have owners now: Today renders the climbing week, `#/gtg` renders §8's list. `CheckOffs` goes with it — T36 kept it alive solely because this route rendered it.

#### Acceptance criteria

1. WHEN the tab bar is rendered THE tabs SHALL be Today, Library, Log, Settings, in that order.
2. WHEN `#/exercises`, `#/library` or any `#/plan` route is open THE Library tab SHALL read as active.
3. WHEN `#/history` or `#/checklog` is open THE Log tab SHALL read as active.
4. WHEN `#/plan/4B` is opened from an exercise citation THE plan SHALL open at §4B exactly as before (T25 AC8).
5. WHEN the daily-isometric lane's control is used THE app SHALL open `#/tier/daily-isometric`, showing that tier's six slots and nothing from another tier.
6. WHEN the pool lane's control is used THE app SHALL open `#/tier/pool`, showing the queue in `poolToday`'s order and nothing from another tier.
7. WHEN a slot is ticked on either tier screen THE check written SHALL be identical to the one `#/joints` wrote — same kind, same `exerciseId`, same day key, no migration.
8. WHEN `#/signals` is open THE four stop signals SHALL be recordable and clearable, with the plan's drop orders rendered exactly as `#/joints` rendered them.
9. WHEN a signal is active THE tier screens SHALL still mark the movements its drop order names, reading `symptoms.ts` as before.
10. WHEN Today is rendered THE stop signals SHALL be reachable in one tap, and the entry SHALL state how many are active without ranking or grading them.
11. WHEN `#/joints` or `#/checks` is opened from a bookmark THE app SHALL resolve it rather than showing not-found.
12. WHEN any tier screen renders THE copy SHALL NOT contain a fraction whose denominator is a prescription (D23, D49) — the counts `#/joints` rendered as "3 of 6 today" and "2 ready" are restated as facts.
13. WHEN a database or backup written before this task is read THE app SHALL work unchanged, with no migration and no version bump.

#### Edge cases

- A bookmarked `#/joints` → redirects to `#/tier/daily-isometric`, the tier it opened on. A dead link to a screen that existed yesterday is a worse answer than a redirect.
- A bookmarked `#/checks` → redirects to Today, which owns the half of it that was not GtG.
- An unknown tier in `#/tier/…` → not-found, not a silently-defaulted tier.
- No signal recorded → `#/signals` states that nothing is flagged, and Today's entry says so rather than being hidden. A hidden entry is indistinguishable from a clear one.
- Every slot loaded today → the tier screen says so and every tick stays live (D49).

#### Non-goals & do-not-touch

- MUST NOT change `pool.ts`, `symptoms.ts`, `checks.ts` or `gtg.ts`. The screens split; the engines do not.
- MUST NOT merge §8's list into the pool screen, or give GtG a lane (owner decision, 2026-08-01).
- MUST NOT restructure the exercise catalog's browse — Library is a shell this cycle, and tier → focus → target is stage 5.
- MUST NOT turn the plan into Sources — that is stage 6, and `#/plan` renders as it does today.
- MUST NOT move the block, the §4E battery or the tension grid — stage 4 (D50).
- MUST NOT add an aggregate across lanes or tiers, a completion state, or a day summary (D49).

#### Verify

`npm run test && npm run build && npm run lint`, plus an in-browser pass at 375×812: four tabs, each lane's control landing on its own tier screen, `#/plan/4B` still opening at §4B, and `#/joints` and `#/checks` both resolving rather than 404ing.

#### Amendments (T37)

| Change | Why |
|---|---|
| The `home` route is renamed `today` | Flagged at the end of T36 and done here because it costs nothing while the route table is already open. T36 had renamed only the tab's *label*, which left every `go({ name: 'home' })` pointing at a screen that no longer had that name. |
| Legacy paths resolve in `parseHash`, not in a redirect component | `#/joints` and `#/checks` map to their successors inside the parser, so there is one place that knows a path is historical and no route ever renders a component whose only job is to navigate away. The parser is already the single place that decides what a path means. |
| `tabFor` is a function in `routes.ts`, not a lookup in `TabBar` | Four tabs now own more than four routes — the catalog and the plan are both Library, history and the check log are both Log. Putting the mapping beside the route type makes it a unit test rather than a screenshot, and it is what keeps a deep-linked `#/plan/4B` lighting the right tab. |
| AC12's counts are removed rather than reworded | `#/joints` headed its two lists with "3 of 6 today" and "2 ready". Restating them as facts was the criterion, but the slot rows already say `describeSlot` on every line — the header was a summary of what was directly below it, and a fraction against a prescribed count is exactly what D49 keeps off a lane. The headings now name the tier's own source instead. |
| Verified by page text; no screenshot | The browser pane did not composite frames, the same limitation recorded against T36 and `10fbd75`. Every criterion above was read out of the rendered DOM — tab highlighting via `aria-current`, the drop marks via the rendered rows. |

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

---

**2026-07-25 — T20 specced, D33 and D34 added. Two owner decisions taken before writing it.**

Both were put to the owner because either answer produces a different build and the wrong one is expensive to unwind mid-block:

| Question | Answer | What follows |
|---|---|---|
| What does "3–2–1–pull" do to the clock? | **The count owns the clock** — the hold begins on "pull", not on the tap | D33. `holdSec` starts measuring when the owner is actually loaded, which is the tap-offset defect the deferred motion-sensor idea was going to fix, bought here for a countdown §4B wants anyway. The alternatives — a decorative count, or a per-exercise declaration of which efforts get counted in — either leave the defect in place or add a catalog field to express a judgment one tap already expresses. |
| Voice on or off by default? | **On**, with a Settings toggle | The owner asked for the feature and every cue is foreground-only. Off-by-default would cost a setup tap to reach the state that was requested. |

| Change | Why |
|---|---|
| D33 added: the count-in owns the clock — a counted hold is measured from "pull" | It changes what a recorded number means, so it is a decision rather than an implementation detail. It is also free exactly once: the block has not started (confirmed 2026-07-24), so no logged hold exists to be compared against a differently-measured one. Taken after week 1 this would be D22's invalid comparison on the very axis §7 asks the owner to watch. |
| D34 added: tones carry the event, speech carries the words — and nothing depends on speech | T13 paid for a beep that survives the iOS ringer switch, a suspended `AudioContext` and a backgrounded PWA. Web Speech has none of that history and can be unavailable, muted, or queued behind an utterance still speaking. So every cue fires as a tone regardless, speech is added on top, and an install where the voice never sounds behaves identically minus the words. |
| `Settings.voiceCues?` and `Settings.leadInSec?` | Two optional fields on an object the backup already carries whole — the third task running with no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement. |
| A `counting` phase in `timer.ts`, not a `setTimeout` in a component | D18: every reading is `(now - startedAt)` against an absolute instant, and the transition to `holding` back-dates itself to `countStart + leadInMs` exactly as `autoStopHold` back-dates a late auto-stop. A throttled tick costs a stale frame, never a drifted count. |
| Nothing is spoken during a hold; the band is reported in pitch | At 100% effort a voice reading numbers is noise the owner cannot act on. A pip per second rising across the 7–10s window answers "am I at 7 yet" and "how much is left" in one sound, and it says nothing at all where there is no window to report (fixed targets, and §4E's open holds). |

**Net effect on scope:** one task, two decisions, two optional `Settings` fields, one new timer phase, two new modules (one pure and tested, one fire-and-forget wrapper). No new dependencies, no new object store, no version bumps, and no reversal of D2a (this is foreground Web Speech, exactly as the v1.8 amendment already predicted), D18, D19, D22, D23, or D31.

**Built the same day; every prediction above held, including the version numbers.** See T20's amendment for the verification pass, which recorded the audio rather than trusting it. Two things the spec did not anticipate, both found by listening: a count started while the timer bar was *already* on screen said **"four"** for a three-second count, because the bar's 100ms clock renders the first frame against a `now` from before the count began — `leadInRemainingMs` now clamps to the count's own length; and a refused count-in left the junk visible in the field, because an unchanged stored value never triggers the value-keyed remount the other Settings fields rely on. **T21 (eyes-shut hold mode) is next in Wave 1**, and the audio it was waiting for now exists: a count that starts the clock when the owner is loaded, a pitch that reports the target window, and a voice that names the next set.

---

**2026-07-25 — T21 specced, D35 and D36 added. Two owner decisions again, and the second one is a safety rule.**

With T20's cues in place, what remains of the phone-on-the-floor problem is two *aim* problems, not reading problems: finding Start among six cards, and finding "Log 8.4s as a set" on a bar strip straight after a maximum effort.

| Question | Answer | What follows |
|---|---|---|
| Where does eyes-shut mode live? | **A full-screen focus surface for one exercise** | It fixes both taps rather than only the second one (the alternative — expanding the timer bar while it runs — never helps you *start*), and it is the surface the rejected printable wall card was for: protocol, cues, position and last time's numbers, legible from the board. |
| How does a hold end in it? | **One giant Stop button, not tap-anywhere** | D36. Blind-operable must mean findable by feel, not triggerable by accident. |

| Change | Why |
|---|---|
| D35 added: focus is a rendering of the session, never a second source of truth | It calls the same handlers, writes through the same `addSet`, and stores nothing. The obvious next request — "let me fix the load from in here" — is what would fork carry-forward, completion and end-reason behaviour into two sets of rules. Values are entered on the card, where T18's pickers already live and the eyes are already open. |
| D36 added: a hold ends on a deliberate control or its prescribed maximum, never on ambient contact | Ending a hold *writes a number*, and that number enters the series §7 asks the owner to read. A knee or a brushed screen must not be able to author one. This also settles the same question for anything later (shake-to-stop, proximity, motion) without re-litigating it. |
| `useTimerCues` extracted from `SessionTimer` | Two views of one timer would otherwise double every tone and utterance, or silence half of them. The cues belong to the timer state, not to a rendering of it — the same reasoning that put the interval math in `timer.ts` rather than in a component. Exactly one view is mounted at a time. |

**Net effect on scope:** one task, two decisions, one new pure module, one extracted hook, one new component. No new dependencies, no storage or backup change, no new state that outlives a render, and no reversal of D16, D18, D19, D23 or anything in Wave 1.

**Built the same day; every prediction above held.** See T21's amendment for the verification pass, which measured the controls rather than eyeballing them. Nothing in the spec turned out to be wrong, which is the first time that has happened in Wave 1 — the two things it did not say were both consequences of D36 rather than gaps in it: the exit control had to be deliberately *hard* to hit by feel, and a running rest reads better as a non-interactive panel of the same height than as a missing button. **Wave 1's stated chain (T18 → T19 → T20 → T21) is complete.** What remains in the wave is T17, deferred on 2026-07-25 against the owner's stated indifference and still available in full or in its cheap half; the next unstarted wave is 2 — T22 (rest screen as the teaching surface), which now has a rest surface worth teaching on, T23, T24 and T25.

---

**2026-07-25 — Wave 2 opens. T22 specced, D37 and D38 added. Three owner decisions, and the third one is why there is a module rather than a component.**

Wave 2's premise is arithmetic: a Day 1 session is five 3 minute rests on the max hangs (§4C) and four to six more on the PIMA pulls (§4B), so the app spends roughly fifteen minutes of every session — eight weeks of them — rendering a countdown and two small buttons. T21 made the waste legible rather than creating it: with focus open, a running rest renders a dashed box that says *"Rest — the app will tell you"*. Three questions were put to the owner before writing anything, because each produces a different build:

| Question | Answer | What follows |
|---|---|---|
| What should the three minutes put on screen? | **The session report *and* one piece of the protocol** | The report is the §4F decision — this session's sets against last time's — made where it is actually made instead of a scroll away. The protocol is `howTo` and `safetyNotes`, which have existed since T2 and have never once been on screen during a session. |
| Does it change by itself while the rest runs? | **Yes — paced, roughly a card a minute** | The task exists to use dead time, and a single static line uses about ten seconds of it. Safe to pace *because* nothing on the surface is actionable — see D37. |
| Where does it render? | **Both views, at two sizes, from one module** | `chain.ts`'s precedent exactly: the bar and the focus surface disagree about size and agree about content, so the content is a pure function and the disagreement is CSS. |

| Change | Why |
|---|---|
| D37 added: dead time is a reading surface, never a control surface | The rule that makes pacing safe rather than a loosening of D36. D36 forbids ambient contact ending a hold because ending a hold *writes a number* into the series §7 asks the owner to read; a card that cannot be tapped and writes nothing has no equivalent failure. So the asymmetry is stated once: content that cannot be acted on may advance on its own, content that can, never does. It also fences the obvious next request — a "log it from here" button on the report card — which would be a second write path (D35) on the one surface designed to be read rather than operated. |
| D38 added: the app teaches from the catalog, never from the plan file | `docs/training-plan.md` is not bundled and does not become so here. T25 owns in-app plan text, and answering "what is the plan doing in the app" twice, in two tasks, with two mechanisms, is how a codebase grows a second source of truth. The catalog already *is* the plan — transcribed once at T2 under D6's no-invention rule — and its `safetyNotes` already carry their citations inline ("…plan §7"), so D23's *report and cite* is satisfied by content that was cited when it was written. This task authors no training copy at all. |
| The index is elapsed time, not a stored cursor | D18 applied to a reading position: `floor(elapsedRest / 60s)` clamped to the deck. A backgrounded rest returns on the card the clock says rather than the one it left, `+30s` appends a card instead of reordering the deck, and nothing has to be cleaned up when the rest ends. |
| Rotation is keyed on the logged set count | T19's rule reused: the protocol pool is walked from an offset of (sets logged × cards per rest), so five rests cover the whole protocol instead of five copies of cue #1 — and deleting a set moves the *next* rest back with it, because there is no cursor to fall out of sync. |
| T21 AC6 amended, not quietly overridden | The static wall card yields to the deck **for the duration of a running rest only**. The deck is a superset of what it replaces, and rendering both would put the same cue on screen twice. Recorded in T22's Amendments section. |

**Net effect on scope:** one task, two decisions, one new pure module, one new component, one new reading on `timer.ts`. No new dependencies, no new object store, no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement, no new field on any stored type, and no reversal of D6, D16, D18, D19, D22, D23, D35 or D36.

**Built the same day; every prediction above held, including the version numbers.** See T22's amendment for the verification pass, which drove the rest clock rather than waiting out four three-minute intervals.

---

**2026-07-25 — T23 specced, D39 and D40 added. Three owner decisions, and the second one is the first deliberate exception to a safety rule this spec has made.**

The warm-up is the largest gap between what the plan asks for and what the app provides. §7 names cold pulleys "the #1 cause of finger injuries in exactly your grade range"; §4A gives the warm-up 10–15 minutes and four ordered stages; the app gives `finger-warmup-progression` a "+ Add set" button and a checkbox, with the four stages buried in `howTo` prose. The other warm-up is worse in a different way: `abrahangs-no-hang` is `10s on / 50s off` for ~10 minutes, which is ten rounds and ten taps on a control that scrolls under the timer bar — the exact shape T10 looked at and declined to build a cadence runner for.

| Question | Answer | What follows |
|---|---|---|
| The plan gives four stages but one duration. How is a stage timed? | **It isn't — tap to advance, elapsed against the 10–15 min** | D40. §4A withheld per-stage durations, and a countdown reads as a prescription no matter how it is captioned. |
| Ten rounds of 10s/50s — does the runner repeat without a tap? | **Yes, for the warm-up only** | D39. The ergonomic problem *is* the ten taps, and this is the one protocol in the app where an unattended round costs nothing. |
| Where does it live? | **A full-screen surface, opened from the card** | T21's shape reused wholesale: one big control, board-legible text, the exit small and cornered. It serves Day 1 and §4E's battery from the same code. |

| Change | Why |
|---|---|
| D39 added: a warm-up round may start itself; a working set never may | The first carve-out from T19 AC5, and it is written as a rule so it cannot be widened by analogy later. The justification is not "a warm-up is easy" — it is that an abrahang **authors nothing**: the entry declares no `metrics`, the runner writes no set, and a round nobody performed leaves the log byte-identical. That is D37's asymmetry (content that cannot author a number may act on its own) applied to starting instead of reading. Fenced twice: the runner is gated on `category === 'warmup'` in the catalog, so no max protocol can reach the path whatever is built on top of this; and a transition the app slept through **ends** the cycle rather than starting a round, exactly as T20 AC9 drops a count-in it slept through. §4B's rep-structured PIMA cadence is explicitly *not* covered — it is a max-effort protocol, and re-proposing it needs its own decision. |
| D40 added: the runner paces what the plan paces and reports what it does not | The general form of the answer to question one, and the rule that stops a later task quietly adding "stage 1: 3 minutes". Where the plan states an interval (10s, 50s) the app runs it; where it states only a total (10–15 min) the app reports elapsed and lets the owner advance. D6's no-invention rule applied to *time* rather than to copy. |
| No count-in on a cycle round | D33's count exists so `holdSec` measures the effort rather than the tap offset. A warm-up round records no `holdSec`, so the count buys nothing and spends three seconds of a prescribed sixty-second cadence. |
| The cycle drives the session's one timer | Which means the hold-end and rest-end cues are the ones T13 and T20 already paid for, through `useTimerCues`, with exactly one view mounted. No new audio path is the point: the beep that survives the iOS ringer switch took a whole task to get right. |

**Net effect on scope:** one task, two decisions, one new pure module, one new component. No new dependencies, no new object store, no catalog field, no stored field, no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement, and no reversal of D6, D16, D18, D19, D23, D35, D36 or D37. **T19 AC5 is narrowed rather than reversed** — it continues to govern every exercise the plan progresses, which is every exercise except the two warm-ups.

**Built the same day; every prediction above held, including the version numbers.** See T23's amendment for the verification pass, in which **the D39 fence was hit three times before the cycle could be demonstrated at all** — twice by a harness stepping the clock faster than the render loop samples it, once by a preview pane that honestly reports itself hidden. Three ways of not being watched, three refusals to auto-start, which is a better argument for the carve-out's safety than the spec made for it. One thing the spec did not anticipate, found by watching a clock sit at 0:00 through four stages: this surface has an elapsed clock of its own and a staged warm-up leaves the session timer idle from beginning to end, so it ticks unconditionally where the other two views tick only while the timer runs. **T21 AC1 is amended** — a warm-up's full-screen surface is the runner rather than focus, because two of them would be two answers to one question. **Wave 2 continues**: T24 (block position derived from the first session) and T25 (in-app training-plan search) remain, and T17 is still available in Wave 1. One prediction did **not** hold, and it was in an acceptance criterion rather than a decision: the spec promised that `+30s` could never reorder the deck and the build implemented only half of the mechanism, so extending a rest swapped the card already on screen. Found in a browser, fixed by striding the pool on the *prescribed* rest instead of the running one, and now tested across every rotation rather than the one that happened to be visible. **Wave 2 is open**; T23 (warm-up runner), T24 (block position derived from the first session) and T25 (in-app training-plan search) remain in it, and T17 is still available in Wave 1 in full or in its cheap half.


---

**2026-07-25 — T24 specced, D41 added. Wave 2's third task, and the first one whose whole subject is a number the app has never had.**

The 8-week block is the shape of the entire training document — §4F gives each week a focus, §4B splits one exercise's protocol at week 4, §4E's retest is a week-8 event — and the app has never known which week it is. v1.4 deferred it explicitly ("tracking them needs a block start date and a post-week-8 policy that no decision covers yet"); D25 took that decision in v1.8 by D15's method, and this task builds it.

| Question | Answer | What follows |
|---|---|---|
| Where does week 1 start? | **The first completed rotating session, Monday-anchored (D10)** | The battery is excluded (D29) — §4E is run *before* week 1 and trains nothing, so it cannot be session 1 of the block. The Monday anchor is not a taste call: "week 6" sits directly above the "Routines this week" line on Home, and two definitions of a week on one screen is a bug. |
| What is stored? | **One optional date key, written only when the owner starts a new block** | D25's "derive, don't store" with the single exception it names. Absent → derived, and the label says so by rendering the week as approximate (`~week 6 of 8`). The count is arithmetic; the anchor is an inference, and the tilde is what stops an inference being presented as a fact. |
| What does the week actually buy? | **§4B's live variant first, and §4F's focus quoted** | A week number alone is trivia. These two are the reasons to derive it, and the second one is D23's *report and cite* in its purest form — the plan's own row for the week, with its `§` reference, and no statement about whether the owner followed it. |

| Change | Why |
|---|---|
| D41 added: week-scoped prescription variants are a typed catalog field, and the declaration flags which one the typed timing describes | D17's argument applied to a second axis. The `text` is the substring already in `prescription`, split rather than authored, so no training copy is written and `prescription` is untouched (D6). The `timed` flag exists because `holdSeconds`/`prescribedSets` describe the peak variant only: during weeks 1–4 the emphasised protocol is not the one the clock runs, T23 fenced a runner for that cadence off as needing its own decision, and the honest resolution is to *say which variant the timer follows* rather than to switch timings silently. |
| §4F's table transcribed into a code-seeded constant, not read from the plan file | D38: `docs/training-plan.md` is T25's, and pulling it in early would fork "what is the in-app plan" across two tasks. The catalog was transcribed the same way at T2 under D6. |
| Past week 8 reads `week 8+`, and that is the whole post-week-8 policy | The state D15 already refuses for routines, refused again for weeks. §4F's own "take a lighter week regardless of the schedule above… non-negotiable at your training age" makes a block that runs long a training decision rather than a lapse, so there is nothing for the app to flag. |
| Emphasis is text only — no timer, target, set count, cadence or cue moves with the week | T23's fence, restated where it would be easiest to cross. §4B's rep-structured variant is a max-effort protocol, and re-proposing a cadence for it still needs its own decision. |

**Net effect on scope:** one task, one decision, one new pure module, one transcribed constant, one new component, one optional `Settings` field and one optional `Exercise` field. No new dependencies, no new object store, no field on any logged record, no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement, and no reversal of D2a, D6, D15, D17, D19, D23 or D29.

**Built the same day; every prediction above held, including the version numbers.** See T24's amendment for the verification pass, which seeded logs at chosen dates and read weeks 3, 6 and 8+ back out of a running browser rather than waiting eight weeks for them. The spec's own predictions held with one small surprise in the *other* direction: the `timed` flag turned out to remove a whole class of view logic rather than add one — the "which variant does the timer follow" note appears and disappears with no condition written in any component, because `timedElsewhere` is null exactly when the live variant is the timed one. **Wave 2 continues**: T25 (in-app training-plan search) remains, T17 is still available in Wave 1, and Wave 3 (T26–T28) is now unblocked on the T24 half of its dependencies.

---

**2026-07-25 — T25 specced, D42 added. The last task in Wave 2, and the one that resolves a promise D38 made.**

`docs/training-plan.md` is the document the app exists to serve, and it has never been inside the app. T2 transcribed fragments of it into the catalog and every fragment carries a citation — `(plan §7)`, `(plan §8)`, `(§4B)` — that the owner cannot follow. T22 wrote a non-goal fencing itself off from the file and recorded why: what "the plan, in the app" means is one question and belongs to one task.

| Question | Answer | What follows |
|---|---|---|
| Bundled or fetched? | **Bundled at build time, `?raw`** | Offline by construction, versioned with the deploy, outside IndexedDB, nothing to sync and nothing that can go stale against the app. It inherits D6's redeploy workflow exactly, which is the same workflow the catalog beside it already uses. ~17KB of bundle is the honest price of the document being *in* the tool. |
| What stops a later task parsing it? | **D42, stated absolutely** | A bundled plan is 17KB of prose that a future task could mine for a duration or a set count — D17's silent-wrong-number machine with a much larger surface. So: displayed, searched and quoted; never parsed for meaning. The one structural fact extracted is a `§` reference, which is a heading, not a training variable. |
| How does an exercise link into it? | **A typed `planRefs` list on the catalog entry** | Not a regex over the entry's own prose. A citation that resolves to the *wrong* section is worse than one that does not resolve at all, and the same argument put `holdSeconds` in the catalog rather than in a parser. |

| Change | Why |
|---|---|
| D42 added: the plan ships as read-only reference text, and citations become typed references | The boundary D38 promised. It settles both halves at once — what the app may do with the file (display, search, quote) and what it may never do (derive a number, a prescription, or a behaviour), plus the shape of the link from catalog to document. |
| The plan is reachable during a rest, and never pushed into one | D37's asymmetry restated: dead time is a reading surface, so reading may be *offered* at any time — but T22's deck still owns the interval, nothing auto-opens, and opening the plan cannot touch the timer, the log, or a set. |
| No markdown or search dependency | The parser and the search are small pure functions in `lib/`, tested like every other derivation. Nine tasks have shipped with no runtime dependency beyond `idb` and React; a document viewer is not the reason to change that. |

**Net effect on scope:** one task, one decision, one new pure module, one new screen, one new component, one optional `Exercise` field, one new route, and a fifth tab. No new dependencies, no new object store, no stored field, no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement, and no reversal of D2a, D6, D17, D18, D23 or D37.

**Built the same day; every prediction above held, including the bundle being the only thing that grew.** See T25's amendment for the verification pass, which built `dist` and served it rather than trusting the dev server — in dev a `?raw` import is fetched as a module, so only the production bundle can actually demonstrate AC1, and it did: **four requests, none of them the markdown, and §4E rendering anyway.** **T8 AC2 is amended** — the tab bar is five destinations now, Plan being the fifth. **Wave 2 is complete** (T22 rest surface, T23 warm-up runner, T24 block position, T25 plan search). What remains in the backlog: **T17** in Wave 1 (symptom check + plan-cited stop-signal card, deferred within its wave) and **Wave 3** — T26 (edge × week grid + time under tension), T27 (session sigil + history as a story), T28 (week-8 block poster) — all three of which need a block's worth of data to show anything, and the block has still not started. One thing T25 leaves behind for whoever takes T17: the stop-signal card it wants to cite §8 for can now *open* §8, because a `§` resolves.

---

**2026-07-25 — T26 specced, D43 added. Wave 3 opens; the declared dependency on T15 turned out to be the interesting part.**

The backlog listed T26 as depending on T15 (bodyweight). Reading the code says the grid does not need a denominator: an edge × week distribution and a sum of seconds have no bodyweight in them anywhere. The only place T15 could enter is a "heaviest load this block" cell — and that is a **PR**, which the v1.8 narrowing keeps permanently out. So the dependency is honoured by being declined, and the reason is written into the task's non-goals rather than left as an omission a later task reads as an oversight. The real dependency is **T24**, which is what makes a "block week" a thing the app can put on an axis; the row is amended to say so.

| Decision | Why it was made now |
|---|---|
| D43: an aggregate counts only measured values, over one named population, and reports what it could not count | T27 and T28 both aggregate the same log. Deciding once what a "hold" is, which sessions are in, and that the untimed remainder is rendered beside the total costs one row here and prevents three surfaces from quietly disagreeing about how many hangs an 8-week block contained. |
| The grid counts holds, and the cells can also read as seconds | §4B is 3–5s, §4C is 7–10s, §5B is 8–10s, §4E's lock-off is open. Twelve holds is not twelve of anything comparable, which is precisely why D23's own corollary writes the aggregate as two numbers. One toggle over one derivation, rather than two surfaces. |
| Excluded: warm-ups, §4E batteries, in-progress logs | Each has a precedent rather than a preference — `retest.ts` already treats the warm-up as a *condition*, D29 already keeps the battery out of the trained series, and D16 already keeps an unfinished log out of every count. |

**The one thing worth flagging rather than burying:** a volume grid makes §4F's week-7 deload visible for the first time, and that is exactly the cell a fitness app would shade green. It is not shaded, sorted, or labelled. The app renders counts; whether week 7 was a deload is a training judgment, and §4F's own "regardless of the schedule above" is why the app has no standing to make it (D23).

**Net effect on scope:** one task, one decision, one new pure module, one new screen, one new component, one new route, one new entry point on Home. No new dependencies, no type change, no catalog change, no stored field, no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement, and no reversal of D2a, D6, D15, D17, D20–D23, D25, D29 or D42.

**Built the same day; every prediction above held — with one correction the spec had backwards.** The task predicted a new pure module, a screen, a component, a route and a Home entry point, and that is exactly what landed. What it did not predict is that the *tests* would find the D10 timestamp bug rather than the browser: `weekOf` reads a date key and `completedAt` is a UTC instant, which west of UTC moves a Sunday-evening session into the next week — the failure `rotation.localDayKey`'s own doc comment describes. See T26's amendment for the verification pass, which hand-counted 46 holds against a seeded block and then re-anchored it to watch every row re-number. **Wave 3 continues**: T27 (session sigil + history as a story) is now unblocked, T28 needs T27, and T17 is still available in Wave 1.

---

**2026-07-26 — T27 specced and built, D44 added. The list becomes the block's story, and a glyph is made to earn its place.**

The backlog gave a title — "session sigil + history as a story" — and a sigil is the single most badge-shaped thing in the whole v1.8 set: small, pretty, accumulating down a list, and meant as a reward by every fitness app that ships one. So the task's first job was to decide what would make it a *report*, which is **D44**: every visual property maps to one recorded fact, the mapping is rendered where the mark is largest, and nothing comes from a hash, a seed, or an id.

| Decision | Why it was made now |
|---|---|
| D44: a generated mark is readable or it is a badge | The rule had to exist before the first line of SVG, because the tempting implementation — hash the log id into a pretty glyph — is both easier and indefensible, and it would have been very hard to argue back out of once it looked good on screen. |
| A shared spoke scale, never the session's own | The failure it prevents is specific and was measured: under per-session scaling, a §4E battery of 7.0s + 38.2s and a deload of 7.6s + 7.1s draw the *same picture*. Different work, one mark. |
| The row reports holds, seconds and edges instead of "N exercises" | T5's row counted catalog entries touched. Six tasks have since put measured sets, set-end reasons, a block week and a tension total behind that row, and none of it was visible in the list. |

**Net effect on scope:** one task, one decision, one new pure module, one new component, two screens modified. No new dependencies, no type change, no catalog change, no stored field, no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement, and no reversal of D2a, D6, D15–D17, D21, D23, D25, D27, D29 or D43.

**Built the same day; every prediction above held.** See T27's amendment for the verification pass, which measured two two-hold sessions drawing spokes of `[8, 33]` and `[8, 8]` — the shared-scale claim proved rather than asserted — and captured a mark's SVG across a full reload to confirm it came back byte-identical. **Wave 3 has one task left**: T28 (week-8 block poster), which now has all three of its dependencies. T17 is still available in Wave 1.

---

**2026-07-26 — T28 specced and built, D45 added. Wave 3 closes, and the last task finds a defect two earlier ones shipped.**

The final task in the v1.8 backlog, and the one with the least new derivation in it by design: six earlier tasks already compute the block's span, its volume, each session's mark and §4E's comparison, so a poster that recomputed any of them would only be adding a seventh place that could disagree. It spends its budget on composition instead.

| Decision | Why it was made now |
|---|---|
| D45a: the poster is a screen, not an artifact | "Poster" invites export, print and sharing — and v1.8 already **rejected** a printable card in the owner's own words ("I'm just not going to print it") and **deferred** URL/QR sharing for want of a coach or second device. Writing it down stops the reversal being re-proposed as if it were new. |
| D45b: never gated on reaching week 8 | A surface that unlocks in week 8 must compute when week 8 is and therefore must tell the owner when they have not got there — a countdown, which D2a removed and T24 already refused for the retest. §4F's lighter week means there is no moment the app is entitled to call the end. |

**The defect, because it is the more useful half of this entry.** §4E puts the baseline in week 1 "fully rested, after a thorough warm-up" — in practice the day *before* the block's first training session. Every surface floored block membership at `startKey`, the first counted **session**, so that baseline fell outside the block: T26 undercounted its excluded batteries, T27 grouped it under "Before this block", and T28 rendered "the comparison needs two" with two on record. One helper (`block.blockFloorKey`, the Monday of week 1 — the boundary `weekOf` already counts from) fixes all three, and it admits **only** batteries, so no volume number moved. It surfaced the moment two surfaces sat on the same screen, which is a fair argument for building the composite view last rather than never.

**Net effect on scope:** one task, one decision, one new pure module, one new screen, one new route, one new entry point, and one shared floor helper amending T26 and T27. No new dependencies, no type change, no catalog change, no stored field, no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement, and no reversal of D2a, D5, D6, D15, D18, D22, D23, D25, D29, D42, D43 or D44.

**Wave 3 is complete, and with it the v1.8 backlog apart from T17.** T14–T16 (capture), T18–T21 (ergonomics), T22–T25 (dead time) and T26–T28 (insight) are all built. **T17** — symptom check and plan-cited stop-signal card — remains deferred within Wave 1 on the owner's own "I don't care about T17 that much", and nothing in Wave 3 produced a reason to revisit that. The app now holds four decisions whose entire job is to keep it from grading its owner — D23, D43, D44, D45 — and each of them has a shipped surface enforcing it.

---

**2026-07-27 — T30 built: the rest ends with a countdown. Owner's request, no new decision, and the whole build is one pure function plus a tone.**

The rest cue fires at the instant the owner is meant to already be *on* the board — chalked, hands on the edge — which is a second too late to start walking back to it. T30 gives back the last five seconds: `restCountdownSecondsLeft(state, now)` returns 5, 4, 3, 2, 1 and 0 everywhere else, each second gets `beepRestCountTick`, and the three surfaces that render a rest read it.

| Choice | Why |
|---|---|
| A derived reading, not an armed timer | D18, unchanged: `ceil(restRemainingMs / 1000)` inside the window and 0 outside it, so a rest backgrounded through its own countdown comes back on the second the clock says and there is nothing to cancel. The `+30s` case is the one that would have bitten — extending moves `restMs` and not `startedAt`, so the cue keys carry the length as well as the start, and an extend re-arms the whole window. Exactly the bug T22 shipped in the deck, guarded by a test this time rather than by a browser. |
| The tick is lower than the count-in's | D34's channel split applied to two sounds that are both ticks. 350 Hz against `beepCountTick`'s 440: from the floor, with the phone face down, pitch is the only thing separating "the hold clock is about to start" from "the rest is about to end". |
| The digits are not spoken; one heads-up is | `say` cancels whatever is still in the mouth, so a spoken "one" would be cut off mid-word by `restDonePhrase` a second later — and that phrase carries the set number, which is the part worth hearing. So: `restReadyPhrase` once at the top of the window ("5 seconds. Get ready."), ticks for the rest, and the seconds belong to the tone. |
| Zero belongs to the rest cue | The countdown means *walk back*; `beepRestEnd` means *pull*. Neither fires on the other's second, which is asserted rather than assumed. |
| A rest no longer than the countdown gets none | It would be countdown end to end, which reports nothing. This is what keeps a short warm-up cycle rest quiet — and §10A's 20s cadence, landing in the same working tree as this task, is the reason that guard is written rather than argued. |
| The bar keeps its card; focus mode drops its mm:ss | Five seconds is not long enough to be worth moving the buttons under a reaching hand, so the timer bar changes colour and its header only. Focus mode has room and takes the count-in's shape instead: a bare digit under the word *get ready*, because "0:04" and "0:44" are one glance apart from the board and a lone 4 is not. The warm-up runner gets it too, where it matters most — a cycle starts its own next round (D39), so these are the seconds in which hands go back on the device. |

**Net effect on scope:** no new decision, no new module, no new screen, no new route, no type change, no catalog change, no stored field, and no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement. One constant, one reading, one tone, one phrase, three views.

**Verified in a browser** on a driven clock rather than by waiting out a 3 minute rest: the timer bar reads *next · set 1 of 5* at 0:06 and *get ready · set 1 of 5* in accent-300 from 0:05, and focus mode steps 0:06 → 5 → 4 → 1 → *rest complete — go*. The boundary is the assertion — nothing at six, everything at five.

---

**2026-07-27 — T32 built: the prescribed sets end, and the app finally lets you leave. Owner's request, no new decision, one new pure module.**

Logging the fifth of §4C's five max hangs left every surface offering *"Start set 6 (5 prescribed)"* and no way to say the obvious thing. Finishing an exercise meant leaving focus (or scrolling past the bar that covers the card), tapping Mark done, and hunting for the next card — three steps the app created and one it did not. The owner named it exactly: *"the entire exercise itself is not marked complete."*

| Choice | Why |
|---|---|
| Offered from the prescription's *floor*, emphasised at its top | Two readings of one chain. `chainSatisfied` turns on at `min` — four of §4B's "4–6 sets" is a finished exercise, because §4F asks for a lighter week "regardless of the schedule" — and that is where the control *appears*, small, beside the start. `beyond` (already there since T19) is where the two swap: past the top the app has no further set to offer, so `focusStep` hands the primary to the move-on and the sixth set becomes the small control. An emphasis, never a block (D23) — nothing is removed, and a sixth set stays one tap away on every surface. |
| It marks done with the card's own call, in the card's own words | D16/D19: completion is a tap and never an inference, so reaching five marks nothing by itself. The control is that tap, it writes through the same `setExerciseCompleted` the card's Mark done writes through (D35), and it says "Mark done" because that is what the card says. It names its destination too — a button reading only *Next* would hide the write, and one reading only *Mark done* would hide the jump. |
| Never around an unrecorded hold | `focusStep`'s "an unlogged result outranks everything" now outranks a finished chain as well, and the bar suppresses the control while `heldMs` is pending. Completing an exercise around a measurement nobody wrote down is how a hang disappears (D16), and the Log button is already on screen. |
| Never large while a rest runs | T19's rule, restated where it would have been easiest to cross: on the focus surface a full-width "move on" ends §4C's 3 minutes exactly as effectively as a Skip twice its size, so a running rest still offers nothing large. The timer bar carries it small throughout, next to the Skip that already does the same job. |
| Forward, then wrapping — and it names where it is going | An exercise skipped earlier is still work the routine declares, so "next" pointing past the unmarked warm-up would quietly write it off. It wraps instead, and because the destination is named the owner reads it and can disagree. Nothing left unmarked → the label becomes *finish session*, which answers the second half of the request. |
| Where it lands depends on where it was tapped | D35, applied to navigation rather than to writes: focus stays in focus on the next exercise (except a warm-up, which T23 gave a runner instead of a focus screen), and the session list scrolls the next card up to meet the eye. The timer goes with the tap when it is that exercise's, because the clock it would leave running belongs to a set chain that just closed. |

**Net effect on scope:** no new decision, no new screen, no new route, no type change, no catalog change, no stored field, and no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement. One new pure module (`advance.ts`), one new reading in `chain.ts`, one new action in `focus.ts`, and one control rendered twice.

**Verified in a browser** across all four paths: the bar offering *"Mark done · next: Max Hang — Open-Hand"* on a running rest and refusing to offer anything while a 10.0s hold sat unlogged above it; focus swapping its 22vh primary for the move-on with *"Start set 6 (5 prescribed)"* demoted to the row above; the wrap naming the unmarked warm-up from the last exercise in the routine, exiting focus and calling the scroll on the right card; and *"Mark done · finish session"* closing the session out to Home. The one thing a hidden preview pane cannot show is the smooth scroll animating — the call, its target and its options were asserted instead.

---

**2026-07-27 — T31 specced and built: §4B's rep-structured variant runs. D39 is narrowed, which T23 said would need its own decision.**

The owner reported the PIMA timer "only triggers the first rep in each set and then goes straight to rest". It was not a defect: `holdSeconds: [3, 5]` and `restSeconds: 180` describe §4B's *peak* protocol, and the app ran that protocol correctly. But the block was in week 1, where the live variant is `5 sets x 4 reps x 3s @ ~90%, ~10s between reps` — so the card showed a four-rep prescription above a control that ran one, and D41's honesty note ("the timer and set count follow Weeks 5–8 · peak") was one tap away inside Info rather than on the card face. The app was telling the truth in a place nobody reads while under load.

T10 declined to build the cadence. T23 declined again and wrote down what re-proposing it would cost: *"§4B's rep-structured PIMA variant is a cadence too, and it is a **max-effort protocol** — it stays exactly as T10 left it, and re-proposing it needs its own decision."* This is that decision.

| Question | Answer | Why |
|---|---|---|
| May a rep inside a set start itself? | **Yes — the reps, never the set** | D39 said a working set may never start itself, and that stands: rep 1 still follows a tap and still gets D33's count-in. What auto-advances is an interval *inside a set already under way*, which is a narrowing rather than a reversal. |
| What changed, given the argument held twice before? | **T30** | D39's actual objection was an effort beginning unheard. The rest countdown, built the same day by the owner's own request, calls the last five seconds of the ten-second gap out loud. A rep that announces itself before it starts is not the failure mode the rule was written against. The two fences are unchanged and shared: `shouldAutoAdvance` is one grace window and one visibility rule for both cadences, and permission stays with each caller. |
| Is a rep a set? | **No — four reps, one record** | §4B counts five sets, not twenty. A mid-chain rep withholds its `heldMs` so the Log control appears once; the set writes `4 x 3.0s`. Four rows would put "set 3 of 5" in disagreement with the plan and double every session's record. |
| What does a set stopped early write? | **What it did** | `2 of 4 x 3.0s`, and `last 1.8s` only when the clock did not end the final rep. Reps 1–3 always end at exactly three seconds because the timer ends them, so reporting a manually-stopped measurement as *every* rep's length would invent three measurements the app never took. §4F makes a short set as often correct as a full one (D23). |
| Which set count is "set 3 of …"? | **The live variant's** | §4B states five sets for this protocol and 4–6 for the peak one, and `prescribedSets` describes the latter. `setSpecOf` takes the week; a variant may declare its own `sets`. This is the same wrong-number-by-luck D17 refuses regexes over prose to avoid. |
| Does D41's note survive? | **Not for §4B** | A variant carrying a `repChain` counts as timed, so `timedElsewhere` is null in weeks 1–4. The note exists to stop the app implying the clock follows the emphasised protocol when it does not; leaving it up now would have it contradicting a clock that agrees. It still fires for any variant with no timings of its own — tested. |

**Net effect on scope:** one new module (`reps.ts` + tests), one new optional field pair on `PrescriptionVariant` (`repChain`, `sets`), two shared helpers moved into `timer.ts` so the warm-up cycle and the rep chain cannot drift apart, one optional `heldLabel` prop on the two timer surfaces. No new screen, no new route, no stored field, no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement. `warmupPlanOf`'s catalog gate is untouched.

**Verified in a browser**, and the fence was hit before the chain could be shown at all — the preview pane honestly reports `visibilityState === 'hidden'`, so the first run stopped after rep 1 and went stale exactly as designed. That refusal exposed a real gap and fixed it: a chain that dies mid-set used to take its reps with it, because the mid-chain `heldMs` had already been withheld. It now hands a measurement back, so a set the app watched happen is never lost (D16). With visibility simulated as on-screen: *set 1 of 5 · rep 1 of 4* → 3.0s → **0:09** → *get ready · rep 2 of 4* → rep 2 → rep 3 → rep 4 → **2:59** → *Log 4 x 3.0s as a set*, and the record reads `{ reps: "4 x 3.0s", endReason: "target" }`.

---

**2026-07-28 — T33 specced and built: GtG becomes the plan's list. D11 is narrowed to D11a, and the catalog gains the movement §8 recommends.**

The owner's report was one sentence — *"The GTG general and pull daily exercises are just 'Did you do the thing or not?' instead of an actual daily routine with exercises, sets and reps"* — and the design work was entirely in reading it correctly. It sounds like a request for set logging, which D11 refused with an argument that still holds: GtG's sets are scattered through the day and deliberately unmemorable, so a rep counter costs more attention than the exercise. But D11 also decided, without ever saying so, that the app would never *show* the routine. §8 prescribes GtG as a table of movement, dose, trigger and risk class; the app rendered two tiles carrying the risk-class split and nothing else, and every dose sat unread in the middle of a `prescription` string written for a session. **D11a keeps the tracking rule and drops the unstated half**: the dose is on screen at the moment of the tap, and the tap names a movement instead of a category.

| Decision point | Resolution |
|---|---|
| Is this a reversal of D11? | **No — a narrowing, and the rationale is the reason.** D11's own justification is about logging cost, which is untouched: no set, no rep, no load, and specifically no count of times done. What changes is which question the tap answers. |
| Where does a dose live? | **A typed catalog field.** `Exercise.gtg` = §8's `{dose, trigger, riskClass}`, transcribed. Splitting `"Session: 3 x 10. GtG: 10–15 reps…"` on `"GtG:"` works on all six entries today and is one hand-edit from handing a session number to a daily habit — D17's argument, and a test asserts `gtg` and `gtgEligible` agree entry by entry. |
| Why did the catalog have six movements against §8's seven? | **Because nothing described the seventh.** §8 names scapular pull-ups / dead hangs, gives its dose, and calls it the pulling stimulus to *prefer* over full pull-ups — which are named as first-to-drop. The app offered only the movement the plan warns about. §10C writes the execution down, cites §8 for every number it does not add, and states it supersedes nothing; the catalog entry followed (D6). |
| Does the home card keep its GtG tick? | **No.** Two write paths for one day, one of which names nothing, is how a surface starts disagreeing with itself. The tiles became rows that report and open the routine. Pre-T33 checks and the check-log's backfill form still write category-level ones, so `Check.exerciseId` is optional and every old record — and every exported backup — reads unchanged. |
| Is a "5 of 7 movements" reading allowed? | **No.** §8's doses are triggers, not a quota, and §8's last paragraph calls the pulling half optional. The app reports which movements a day holds and never divides that by seven (D23). The one number §8 states, `max 3–4x/day`, is a ceiling rendered in §8's words and enforced by nobody. |

**Net effect on scope:** one new pure module, one new screen, one new route, one new catalog entry, one plan addendum, one optional field on `Check` and one on `Exercise`. No new dependency, no new store, no migration, and no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement. No reversal of D6, D9, D13, D14, D17, D23, D28 or D42. T17 remains the one item of the v1.8 backlog still unbuilt.

---

**2026-07-28 — D46 added: a log is not a session. Owner-reported defect, no new screen, one new module.**

The report: *"Once you tap a finger routine like Day 1 or Day 3, even if just to look at the routine it shows as in progress and asks you to resume or discard but you cannot discard the active routine."* Both halves were true, and the second half was the app's own words — `RoutineDetail` said *"Finish or discard it before starting another"* under a card carrying exactly one button, Resume. The one deliberate discard in the app lives in `RoutineList`, which no tab reaches.

The cause was that Start writes a log before anything has happened, because `ActiveSession` needs somewhere to write. So the log created by a look-and-back-out was byte-indistinguishable from a session in the middle of §4C's max hangs: `completedAt === null`, and every surface asking "is a session open" asked exactly that. It was also unfinishable in the honest sense — tapping Finish on it would have written a blank session into History, marked the routine done for the week, and been eligible to anchor the 8-week block (D25).

**D46: an in-progress session is one that has recorded something.** `isStarted` — any surviving entry, or session notes — and `entries` is already pruned to entries carrying signal (T4 AC6, T9/D16), so the predicate is exact rather than a heuristic: a set added and deleted leaves nothing, and a lone Mark done counts because D16 makes that tap a thing that happened.

| Question | Answer | Why |
|---|---|---|
| Create the log later instead? | **No** | Lazy creation moves the write into every one of `ActiveSession`'s ~dozen mutation paths and makes the first one of them fallible. The log is a write target; what was wrong was reading it as a claim. |
| So who cleans up? | **The three moments, not a sweeper** | `startSession` / `leaveSession` / `finishSession` in `openSession.ts`. Leaving takes an empty log with you, finishing discards it rather than completing it, and starting sweeps whatever a force-close left behind. A boot-time or on-focus sweep was the obvious alternative and is rejected: it can race the tap that just created a log, and deleting the session someone is standing in is a worse defect than the one being fixed. |
| Does the owner get a discard button? | **No — the owner's own reading** | *"I don't think you should be able to discard once it's actually started."* Under D46 the sessions that made one feel necessary are exactly the ones that no longer exist. `RoutineDetail` now says only what it can do, and `RoutineList`'s Resume/Discard/Cancel modal (T4's edge case) survives untouched for the session that is genuinely in the way. |
| Does `#/session` filter too? | **No, deliberately** | The log a Start tap just created is unstarted by definition. D46 governs the screens that *ask* whether a session is open; the route that *opens* one still resolves any `completedAt === null` log, or it would refuse to open the session the tap opened. |

**Net effect on scope:** one decision, one new storage-facing module (`openSession.ts`), three new pure predicates in `session.ts`, one line of copy. No new screen, no new route, no type change, no catalog change, no stored field, no migration, and no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement. Four start paths lost their duplicated `createLog`/`saveLog` pair.

**Verified in a browser** on an empty store, asserting the log store rather than the banner alone: Start → back leaves `logCount: 0` and no card on Home; Start → Mark done → back leaves one open log and *"In progress · tap to resume"* on Home and in History; un-marking that same completion and leaving discards it, because the log is empty again by the same rule that filled it; and Start → Finish leaves History reading *"No sessions yet"* with the block card still *"Not started"* — where before it would have counted a session nobody had.

---

**2026-07-29 — D13a added: the abrahangs become daily. Owner decision, one clause of D13 reversed, one new routine.**

The request: *"The warm-up and abrahangs routine should be a daily exercise."* Three places said the opposite — plan §8, §10A repeating it, and the catalog cue quoting both — and all three were downstream of D13's *"Abrahangs remain a warm-up, not a tracked habit."* That clause is reversed and the rest of D13 stands: fingers are still off §8's committed GtG list, and the general/pull split is untouched.

The reversal's argument is §8's own and it lives in the plan, not here. Every source §8 cites for Abrahangs describes a daily protocol: the 10s/50s figure is Abrahamsson's thirty consecutive days run twice daily, Baar's ~6h responsiveness cycle is an argument for frequency, and the Crimpd routine §10A adopts was measured by Gilmore et al. as a daily intervention. The warm-up-only restriction was an allocation choice under §8's "GtG the things you're not maxing" — a rule §8 names fingers as the exception to in the same paragraph.

| Change | Why |
|---|---|
| `docs/training-plan.md` gains §10D, and §8's text is left standing | The mechanism §10A, §10B and §10C established: an addendum states what it supersedes rather than quietly editing the earlier section, so the disagreement stays visible. D6 requires the plan to move before the catalog. |
| D13a added; D13 marked narrowed rather than struck | One clause changed. D11 → D11a is the precedent for a decision that is right about the thing it was asked and wrong about a thing it also silently decided. |
| A `daily-fingers` routine, not a `CheckKind` | The app already runs §10A — six grips, 10s/20s, stops arming at twenty hangs (T23, T29). A checkbox would have discarded a working runner to record strictly less, which is the complaint that produced D11a. |
| `inRotation: false` | D29's flag, with a sharper failure behind it: a rotating daily is "least recently completed" every day, so Day 1 and Day 3 would never be up next again. It also keeps the daily out of `blockPosition`, `buildEdgeWeekGrid` and `poster`, which all filter on `rotates` already. |
| `History.isBattery` narrowed from `!rotates(routine)` to the battery's id | The two readings named the same set until today. Left alone, every daily warm-up would have carried a §4E test badge. |
| A completed Day 1 counts as one of the day's two runs | §10D says a session that opens with the warm-up and abrahangs is not owed a third. Day 1's `exerciseIds` already contain both, so the count is derived (D15) and a test asserts that membership rather than trusting it. |
| §10D's two numbers are reported, never enforced | Twice daily and ≥6h are quoted; the start control is live in every state and nothing is due, owed, or scored (D2a, D23). Gating the button on the spacing would be the app refusing a session the owner chose to run — D31's rule pointed at a clock. |

**Net effect on scope:** one decision, one plan addendum, one new pure module (`daily.ts`), one new seed routine, one home card, one narrowed predicate. No new exercise, no new type, no new field, no new check kind, no new route, no new dependency, no migration, and no `DB_VERSION` or `BACKUP_SCHEMA_VERSION` movement. No reversal of D6, D9, D11a, D14, D15, D17, D23, D25, D29 or D42. T17 remains the one item of the v1.8 backlog still unbuilt.

---

**2026-08-01 — v1.8 → v2.0 — D47–D53 added: the tier becomes the app's structure. Owner request to rethink rather than extend.**

The owner asked whether the app should be restructured from the ground up rather than
grown a feature at a time. The finding that decided it is that the structure already
existed and had never been carried into the interface: the README's first structural
section is the four-tier table, the app implements all four of its cadence rules in
`lib/`, and the word "tier" appears in the navigation nowhere. The long form is
`docs/tier-architecture.md`; these rows are the register.

| Change | Why |
|---|---|
| D47 added: the tier is the app's top-level structure | Four engines — `daily.ts`, `pool.ts` twice, `rotation.ts` + `block.ts` — implement the README's four tiers, written months apart and surfaced on five different screens, none of them named. Home becomes Today: one lane per tier in frequency order. |
| D48 added: `tier` → `focus` → `target` nests; `Category` is deleted | `types.ts:26` documents `Category` as incoherent and the defect was never fixed. The three classifications are levels, not peers. `Category` is deleted rather than split, because `target` already owns "where" and a second region field is two taxonomies disagreeing about one movement. |
| `focus` declares values with no members; `block-max` renamed `heavy` | An empty focus is the finding, not a defect — it states accurately that this catalog trains max strength and conditions tissue and does nothing else. This inverts the `target` rule, where an unfillable slot fails the build; both are asserted separately so neither is copied onto the other. The rename admits progression work that is heavy but not maximal, and costs nothing — `Tier` is code-seeded. |
| D49 added: a lane reports itself; nothing reads all lanes together | D23 was written against cards and charts. A five-lane surface with per-lane state is one slip from a list of five things the day owes, and every violation available there is new. Recorded before the surface is built rather than after. |
| D50 added: the block is the heavy lane's state, not the app's | "Week 3 of 8" in the app header frames the whole app as an eight-week program. Three of four tiers are permanent and unperiodised; only `heavy` has phases, a deload and a retest. `block.ts` is untouched — only what the week is allowed to frame. |
| D51 added: `target` is the rotation slot, `alsoLoads` is the load path | `pool.ts`'s staleness counts one movement as one tissue, so `target` cannot become an array without silently changing every interval. Rehab asks a different question — a front lever puts real load through the elbow — and needs a second field. Corollary: rehab and targeted prevention are one feature, a temporary interval override plus a mark. |
| D52 added: a progression's rung is derived; advancing is a tap | Calisthenics ladders (front lever, muscle-up) have no expression in the catalog. The obvious build breaks D23 (the app deciding you succeeded) and D15/D25 (storing derivable state) at once. Settled now so no implementation reaches for a stored `currentRung`. |
| D53 added: D42's rule applies to a set of sources | D42 renders one document because there was one. There are two, and `TierPrescription.source` already points at papers and coaches. The rule survives verbatim; a dose sourced from a paper stops having to pretend it came from the plan. |
| T36 added: Today — five lanes | Stage 2 of six, and the one that carries the idea. Composition only: `lanes.ts` calls five existing engines and no module in `lib/` is modified. |

**Net effect on scope:** seven decisions, one new document, one new task. No `DB_VERSION`
or `BACKUP_SCHEMA_VERSION` movement, no migration, and every log ever written still reads.
No reversal of D6 — the catalog stays a typed constant in source — and none of D9, D15,
D23, D25, D31 or D42, each of which this restructure restates rather than relaxes. The
`lib/` layer is re-surfaced, not rewritten, which is the only reason a ground-up
restructure is affordable at all.
