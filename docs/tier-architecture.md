# Tier architecture

The app's top-level structure, and the reasoning behind it. Registered in
`climbing-app-spec.md` as D47–D53; this file is the long form those rows point
at, the same relationship `docs/training-plan.md` has to D42.

Written 2026-08-01, from an owner request to rethink the app's structure rather
than extend it.

---

## 1. The finding

The README's first structural section is a table of four training tiers, above
this sentence:

> Training is organised by *loading mechanism*, because the mechanisms have
> incompatible frequency requirements — one schedule cannot serve all of them.

That is a complete information architecture. Four lanes, each with its own
cadence, each with its own rule for what comes next.

The app implements all four rules:

| Tier | Cadence | Engine | Surfaced on |
|---|---|---|---|
| Collagen | 2×/day, ≥6h apart | `daily.ts` | a Home card |
| Daily isometrics | 1×/day | `pool.ts` — `dailyIsometricsToday` | `#/joints` |
| Rotating pool | 2–3×/wk per target | `pool.ts` — `poolToday` | `#/joints` |
| Block max | 1–2×/wk per pattern | `rotation.ts` + `block.ts` | Home + `#/block` |

Four engines, written separately across five months, each landing on a different
screen, none named as what it is. The word "tier" appears in the navigation
nowhere. `Tier` is a field on `TierPrescription` and nothing renders it.

So the structure was never missing. It was written down in the README, built in
`lib/`, and then not carried into the interface. This document carries it.

---

## 2. The model: three levels, nested

Before this document the catalog carried three classifications that were peers,
one of which the type system documents as incoherent:

```
category   region and role, mixed — types.ts:26 says so in as many words
target     which tissue
tiers[]    loading mechanism
```

They are not peers. Each answers a different question, and each one narrows the
last:

```
tier      why and how often it is loaded    collagen · daily-isometric · pool · heavy
  focus   what it develops                  max-strength · tendon-conditioning ·
          prehab-stability · proprioception · general-strength · warm-up ·
          climbing · core
    target  which tissue                    fingers · extensors · wrist · elbow ·
            shoulder · hip · knee · ankle · trunk
```

A movement is addressable as **pool → prehab-stability → shoulder**, or
**heavy → max-strength → fingers**. `Category` is deleted rather than split:
`target` already owns "where" on 38 of the 56 entries, and a second region field is
how two taxonomies start disagreeing about one movement.

### 2.1 `focus` declares values it has no members for

Eight focus values have members. Three do not: `endurance`, `power-endurance`,
`power`. They are declared anyway, and they render.

This inverts the rule that governs `target`. A joint target with no movement
**fails the build** — `pool.ts` will offer a slot it cannot fill, so the coverage
test exists to catch exactly that. A focus with no movement is not a defect: it
is the most useful thing this axis produces, which is an accurate statement that
the catalog trains strength, conditions tissue and loads the trunk, and touches
no energy system at all. A coverage test copied across from the tendon one would
delete the finding.

**The three are empty for two different reasons, and the card that renders them
says neither.** `endurance` and `power-endurance` are trained — on the wall, on
plan §3's Day 2 and Day 4 — and the app deliberately prescribes nothing for
climbing (D9), so they are absent from the *catalog* rather than from the
training. `power` is declined outright: plan §2 refuses a campus board because it
"adds power but also adds real injury risk", and holds that overcoming isometrics
buy most of the explosive-catch adaptation with far less shock loading on
pulleys — so the PIMA pulls carry that intent under `max-strength`. "No movement
declared" flattens a delegation and a refusal into one sentence.

The two rules therefore differ on purpose, and each is asserted in its own test.

### 2.2 `block-max` is renamed `heavy`

The tier's definition — "max protocols: the two weekly finger routines, Day 3,
§4E" — describes its members, not its mechanism. What the tier *means* is: loaded
heavy, run fresh, 1–2×/week, held fixed within a block so retests compare.

That description already admits work the current name excludes. A front-lever or
muscle-up progression is loaded heavy, run fresh, once or twice a week, and
progressed — it belongs in this tier and is not a max. Renaming costs nothing:
`Tier` is a code-seeded catalog field, so there is no stored value anywhere and
no migration.

---

## 3. Today: five lanes

Home becomes Today: a strip for climbing, then one lane per tier in **frequency
order** — collagen, daily isometrics, pool, heavy.

Every lane states the same four things, in the same order:

1. **Name** — the tier
2. **Cadence** — quoted from its source, rendered permanently (`2×/day · ≥6h`)
3. **State** — what this tier's own engine returns
4. **One action** — a start

That regularity is the point. Today's Home carries seven cards in five different
shapes because each was added by a different task; a lane you learn once and
which holds for all four is worth more than any individual card's cleverness.

### 3.1 Frequency is the only ordering

Not urgency, not what is undone. Frequency is a fixed property of the tier, so
the screen never rearranges itself and the thing reached for yesterday is where
it was left. Ordering by staleness would make the screen a queue of debts, which
is §4 below.

### 3.2 Elevation carries *live*, never *done*

The two raised lanes are the two whose cadence is daily — they are always live.
The weekly ones sit flat. Elevation tracks the prescription and never the log,
so no lane can ever be styled to look satisfied or unsatisfied.

### 3.3 Climbing is a strip, not a lane

Two ticks, no start control, above the tiers. Climbing is the only lane not run
inside the app (D9), and a session-shaped card would promise a session that never
arrives. It sits above rather than in frequency position because it is the sport
the tiers serve, not a fifth loading mechanism.

---

## 4. The fence (D49)

**A five-lane screen with per-lane state is one design slip from a to-do list of
five things you owe.** D23 was written against cards, streaks and charts; it has
to be restated for this structure before the structure is built, because every
violation available here is one nobody has had the chance to make yet.

On Today, and on anything that renders a lane:

- **No aggregation across lanes.** No count of lanes touched, no "3 of 5", no
  day-complete condition, no all-clear state. Each lane reports itself and
  nothing reads all four together.
- **No done-state styling.** No lane changes colour, weight, elevation or icon
  because it has been run today. Elevation is cadence (§3.2); nothing else may
  encode completion.
- **No ordering by staleness.** §3.1. The pool orders its *targets* by staleness
  because a due tendon is actionable inside one lane; the lanes themselves never
  reorder.
- **No lane is ever disabled, greyed, delayed or warned about.** The six-hour
  spacing is stated and the start stays live — T34 AC8, restated because the lane
  is a new place to get it wrong.
- **The words stay out.** No due, owed, missed, behind, late, streak, or any
  fraction whose denominator is a prescription.

The reason is unchanged and is the plan's, not a preference: §4F prescribes a
lighter week "regardless of the schedule", and §7 reads a falling number as the
signal to deload. A surface that rewarded consistency would argue against the
owner's own safety rules.

---

## 5. The block is one lane's state (D50)

"Week 3 of 8" currently rides in the app header beside the wordmark, which frames
the whole app as an eight-week program. It is not one, and it is not meant to be:
three of the four tiers are permanent and unperiodised. Only `heavy` has phases,
a deload week, and a retest at each end.

So the block, `BLOCK_PHASES`, the §4E battery and the edge×week tension grid all
move inside the heavy lane, and the global week chip is removed. Nothing about
`block.ts` changes — D25's derive-don't-store is untouched — only what the week
is allowed to frame.

The three permanent tiers stop being visually enclosed by a countdown that has
nothing to do with them, which is the structural form of a thing already true:
this is ongoing training, and the block is one part of it.

---

## 6. Two fields for two questions (D51)

`target` is singular, and `pool.ts` depends on that: staleness arithmetic counts
one movement as loading one tissue, and an array would silently change every
interval in the rotation.

But "which rotation slot does this fill" and "what does this put load through"
are different questions, and rehab asks the second. A muscle-up loads shoulder,
elbow and wrist; a front lever puts real load through the biceps tendon at the
elbow. With one field, "what should I stop doing while this elbow settles" is
answerable only for the movements the plan happened to name.

So: `target` stays the primary and the rotation keeps reading only it, and
`alsoLoads: JointTarget[]` is added beside it as the load path. The rotation
never reads `alsoLoads`; symptom and emphasis surfaces read both.

This upgrades what already exists. `SymptomKind` plus the plan's drop orders are
purely reactive — record elbow pain, see the movements §8 names. With
`alsoLoads`, the same question is answerable across the whole catalog.

### 6.1 Rehab and targeted prevention are one feature

"Work this elbow back" and "bulletproof my shoulders for six weeks" are the same
operation: **temporarily raise one target's frequency, and mark everything that
loads it.** No new tier — an override on that target's pool interval, plus a mark
driven by `target ∪ alsoLoads`.

It reports and marks. It never hides a movement, never blocks a start, and never
scores adherence to the emphasis (D23, D31's offer-never-restrict).

---

## 7. Progressions (D52)

A front lever is not an exercise. It is an ordered ladder — tuck, advanced tuck,
straddle, full — and the owner stands on one rung. The catalog has `GripBlock`
for ordered grips and `PrescriptionVariant` for week-scoped protocols, and
nothing that expresses a rung.

The obvious implementation breaks two rules at once: advancing the rung when a
target is hit is the app deciding the owner succeeded (D23), and storing the
current rung is state derivable from the log (D15, D25).

So:

- **Rungs are declared in the catalog**, ordered, each with its own prescription.
- **The current rung is derived** from the most recent rung logged, exactly as
  block position is derived from the first completed session.
- **Advancing is a tap.** The app renders the ladder and where the owner is on
  it, offers the next rung as a position, and never promotes.
- **Nothing regresses on its own either.** A rung logged after a harder one is
  recorded as what it is; §4F makes stepping back as often correct as stepping up.

Not required by any stage below. Recorded now because it was decided now, and
because the derive-don't-store shape must be settled before the first
implementation reaches for a stored `currentRung`.

---

## 8. Sources, plural (D53)

D42 bundled `docs/training-plan.md` and set the rule: the plan is **displayed,
searched and quoted; never parsed for meaning.** It renders one document because
when it was written there was one.

There are already two, and `TierPrescription.source` is free text pointing at
papers and coaches — *"Crimpd–Gilmore et al. 2024 cadence, Baar spacing"*. That
is the newer and better shape, and it never propagated to the surface.

D42's rule survives verbatim and applies to a set. Every prescription resolves to
whichever source it cites, rather than to a `§` in a document that may not be
where the number came from. The citation discipline gets stronger: a dose sourced
from a paper stops having to pretend it came from the plan.

---

## 9. What this costs

The entire `lib/` layer is untouched. `rotation`, `pool`, `daily`, `block`,
`timer`, `warmup`, `reps`, `chain` and `autoset` are pure functions over
`(exercises, routines, logs, today)`; they are re-surfaced, not rewritten. That
is the only reason a ground-up restructure is affordable at all.

No `DB_VERSION` bump. No `BACKUP_SCHEMA_VERSION` bump. No reversal of D6 — the
catalog stays a typed constant in source. Every log ever written still reads.

| Stage | Work | Ships alone | Est. |
|---|---|---|---|
| 1 | `Category` → `Focus`; `alsoLoads`; retag 49 entries | yes | ~1.5 days |
| 2 | Today — five lanes replacing Home's seven cards (**T36**) | yes | ~3 days |
| 3 | Collapse `#/joints`, `#/gtg`, `#/checks` into lanes; 5 tabs → 4 | yes | ~2 days |
| 4 | Heavy-lane screen; de-globalise the block | yes | ~1 day |
| 5 | Library — tier → focus → target | yes | ~2 days |
| 6 | Sources, plural | yes | ~1.5 days |

Stage 2 carries the idea. If one stage is built, it is that one: it is where the
four-tier table stops being documentation and becomes the thing opened in the
morning.

### 9.1 On the catalog outgrowing D6

A 200-entry typed constant is still fine — version controlled, type checked, and
the redeploy workflow costs nothing for one owner. What degrades is *authoring*.

If it reaches that size the answer is not an in-app editor; D6 is right. It is to
move the catalog to data files validated against the types at build time — same
type safety, same no-editor rule, far less friction per entry. Recorded so the
growth is not mistaken for an argument against D6.
