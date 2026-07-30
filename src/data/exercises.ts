import type { Exercise } from '../types';

// The exercise catalog. Code-seeded per D6: edit this file and redeploy to change
// it — there is no in-app editor. Every field is sourced from docs/training-plan.md;
// do not invent content. That includes §10, the addenda: content the plan referred
// to but never wrote down goes *into the document first*, with its source and any
// section it supersedes stated there, and only then into this file. A grip, a
// cadence or a set count that exists only here is the failure mode D6 names. gtgEligible is true for exactly the seven
// movements of §8's committed list (D13, T33) — five general and two pulling,
// each carrying that row's dose and trigger in `gtg` — and no Day 1 max protocol
// is eligible (plan §8). Per D14, no summary/cue
// claims GtG strengthens tendons — that is the isometrics protocol's job (plan §4B).
export const EXERCISES: Exercise[] = [
  {
    id: 'finger-warmup-progression',
    name: 'Finger Warm-up Progression',
    category: 'warmup',
    isoType: 'none',
    equipment: ['hangboard'],
    summary: 'Progressive hang warm-up: jugs down to small edges before any max finger work.',
    howTo: [
      'Start with easy hangs on jugs.',
      'Progress to gradually smaller edges.',
      'Add light wrist and finger mobility.',
      'Finish with 2–3 sub-maximal hangs on your working edge before loading up.',
    ],
    prescription: '10–15 min, building to 2–3 sub-maximal hangs on your training edge',
    cues: [
      'Do not rush this — cold pulleys are the number-one finger-injury cause.',
      'Take the final sub-maximal hangs in the grips you are about to train — half-crimp and open-hand (§10B).',
      'Stop if a finger feels sharp rather than merely warming up.',
    ],
    safetyNotes: ['Warm fingers thoroughly before any hangboard work (plan §7).'],
    gtgEligible: false,
    planRefs: ['4A', '10B', '10D'], // T25/D42
  },
  {
    id: 'abrahangs-no-hang',
    name: 'Abrahangs (No-Hang)',
    category: 'warmup',
    target: 'fingers',
    tiers: [
      {
        tier: 'collagen',
        text: '10s on / 20s off, 20 hangs (~10 min) across six grips @ ~40% max; twice daily, ≥6h apart',
        holdSeconds: [10, 10],
        restSeconds: 20,
        source: 'Plan §10A / §10D (Crimpd–Gilmore et al. 2024 cadence, Baar spacing)',
      },
    ],
    isoType: 'yielding',
    equipment: ['hangboard'],
    summary: 'Light no-hangs with feet on the ground — a collagen-priming warm-up, not a max effort.',
    howTo: [
      'Set up a no-hang device with your feet on the ground taking most of your weight.',
      'Load the fingers lightly — a small strain in the forearms, roughly 40% of max.',
      'Hold for 10 seconds, then rest for 20 seconds.',
      'Work through the six grips in order — 20 hangs, about 10 minutes.',
    ],
    // T29: §10A's cadence, which supersedes §8's 10s/50s — see that addendum for
    // why the two disagree. The twice-daily / ≥6h spacing is still §8's, and T34
    // dropped the "optionally": §10D makes the two runs the prescription.
    prescription:
      '10s on / 20s off, 20 hangs (~10 min) across six grips @ ~40% max on an 18–22mm edge; twice daily, ≥6h apart',
    holdSeconds: [10, 10],
    restSeconds: 20,
    // T29: §10A's table, in its order. `rounds` sums to 20, which against the
    // 10s + 20s cadence above is the addendum's ten minutes — asserted in
    // warmup.test.ts rather than trusted.
    gripSequence: [
      { grip: '4-finger open', rounds: 6 },
      { grip: 'Front-3 open', digits: 'digits 2–4', rounds: 6 },
      { grip: 'Front-2 open', digits: 'digits 2–3', rounds: 2 },
      { grip: 'Middle-2 open', digits: 'digits 3–4', rounds: 2 },
      { grip: 'Front-2 half-crimp', digits: 'digits 2–3', rounds: 2 },
      { grip: 'Middle-2 half-crimp', digits: 'digits 3–4', rounds: 2 },
    ],
    cues: [
      'Keep it genuinely easy — this primes connective tissue, it is not a strength set.',
      'Feet stay on the floor the whole way through; load until you feel a small strain, no more.',
      'The two-finger grips come last and are the first to drop — highest strain per unit of load.',
      'Twice a day, at least six hours apart — the tissue is responsive again on roughly that spacing (§10D).',
      'A Day 1 or climbing-day session that opens with this has had one of that day’s two.',
    ],
    safetyNotes: [],
    // Still false, and §10D says why: a daily schedule is not §8's committed
    // list. That list is 40–70% work on tissue nothing else in the week loads,
    // and fingers are excluded from it by §8 and by D13 — neither of which this
    // reverses.
    gtgEligible: false,
    planRefs: ['4A', '8', '10A', '10D'], // T25/D42
  },
  {
    id: 'scapular-pullups-dead-hangs',
    name: 'Scapular Pull-ups / Dead Hangs',
    category: 'pulling',
    // The movement is the shoulder blade, not the arm — §10C's own first cue.
    target: 'shoulder',
    tiers: [
      {
        tier: 'pool',
        text: 'GtG: 5–8 reps, walking under the bar',
        source: 'Plan §8 committed list / §10C',
      },
    ],
    isoType: 'dynamic',
    equipment: ['pullup-bar'],
    summary: 'Shoulder-blade pull-ups and easy jug hangs — the GtG pulling stimulus §8 says to prefer over full pull-ups.',
    // §10C. §8 named this movement and gave its dose without describing it; the
    // addendum writes the execution down and states that it adds no prescription.
    howTo: [
      'Hang from a bar — or from jugs — with straight arms and shoulders relaxed into a passive hang, ears near the biceps.',
      'Without bending the elbows, pull the shoulder blades down and back. The body rises an inch or two; the arms do not work.',
      'Hold the top for a moment, then let the shoulders return to the passive hang under control.',
      '5–8 reps, never near failure.',
    ],
    prescription: 'GtG: 5–8 reps, walking under the bar',
    cues: [
      'Elbows stay straight — this is the shoulder blade moving, not the arm.',
      'A relaxed dead hang on jugs is the same item, easier: §8 gives it no duration, so come off well before the grip is the reason you did (§10C).',
    ],
    safetyNotes: [
      'Second out, after full pull-ups, if elbow or shoulder symptoms persist (plan §8).',
    ],
    gtgEligible: true,
    gtg: { dose: '5–8', trigger: 'Walking under the bar', riskClass: 'watch' }, // T33
    planRefs: ['8', '10C'], // T25/D42
  },
  {
    id: 'bodyweight-pullups',
    name: 'Bodyweight Pull-ups',
    category: 'pulling',
    // Targeted at the elbow because that is the tissue §8 tracks it by: its own
    // safety note names medial elbow tendinopathy as the risk and puts it first
    // in the drop order. The target is the thing to watch, not the prime mover.
    target: 'elbow',
    tiers: [
      {
        tier: 'pool',
        text: 'GtG: 3–5 reps, well under half your max, max 3–4x/day',
        source: 'Plan §8 committed list',
      },
    ],
    isoType: 'dynamic',
    equipment: ['pullup-bar'],
    summary: 'Standard full pull-ups — a greasing-the-groove pulling option kept deliberately easy.',
    howTo: [
      'Hang from the bar with a full grip.',
      'Pull up until your chin clears the bar.',
      'Lower under control to a full hang.',
      'Keep every set well short of failure.',
    ],
    prescription: 'GtG: 3–5 reps, well under half your max, a handful of times a day (max 3–4x/day)',
    cues: [
      'Never to failure — if you feel a pump, the set was too long.',
      'Drop these first at any sign of elbow soreness.',
    ],
    safetyNotes: [
      'Pull-ups load the same elbows, shoulders, and finger flexors as climbing and hangboarding. Daily pull-up volume on top of that is a known path into medial elbow tendinopathy — keep them trivial and be first to cut them (plan §8).',
    ],
    gtgEligible: true,
    gtg: {
      dose: '3–5 (well under half your max)',
      trigger: 'Walking under the bar, max 3–4x/day',
      riskClass: 'watch',
    }, // T33
    planRefs: ['8'], // T25/D42
  },
  {
    id: 'pima-finger-pull-half-crimp',
    name: 'PIMA Finger Pull — Half-Crimp',
    category: 'fingers',
    // §4B: "rotate in open-hand every other session". Half-crimp is declared
    // first, so it wins the never-run tie-break and is the pair's default.
    rotationGroup: 'pima-grip',
    isoType: 'overcoming',
    equipment: ['hangboard'],
    summary: "Overcoming isometric finger pull in a half-crimp — trains the 'catch' with feet down.",
    howTo: [
      'Stand under the board (or on a low box) so your arms are bent ~90°.',
      'Grab your working edge in a half-crimp.',
      "Pull down as hard as you can without lifting your feet — you're pulling the board into the wall, not pulling yourself up.",
      'Hold the effort for 3–5 seconds, then rest.',
    ],
    prescription:
      'Peak: 4–6 sets x 3–5s @ 100% effort, 3 min rest. Tendon variant (weeks 1–4): 5 sets x 4 reps x 3s @ ~90%, ~10s between reps, 3 min between sets.',
    // Both describe the *peak* variant. The weeks 1–4 protocol nests a second
    // interval inside the set and states five sets, so it declares its own
    // `repChain` and `sets` below rather than bending these (T31).
    prescribedSets: [4, 6], // T19
    holdSeconds: [3, 5],
    restSeconds: 180,
    // T24/D41: the two protocols the one string above carries, split at the week
    // the plan splits them ("use this variant for weeks 1–4, then the
    // single-max-effort version above for weeks 5–8", §4B). Each `text` is that
    // string's own wording; the prefixes become labels.
    //
    // T31 reverses T10's and T23's refusal to run the rep-structured variant.
    // The refusal rested on a working set never starting itself (D39); T30's
    // five-second rest countdown is what changed the argument, since a rep that
    // begins in ten seconds is now announced before it begins rather than
    // discovered once it has. `timed` still marks the peak variant, but a
    // variant carrying a `repChain` is timed too — see `variantsFor`.
    variants: [
      {
        weeks: [1, 4],
        label: 'Weeks 1–4 · tendon variant',
        text: '5 sets x 4 reps x 3s @ ~90%, ~10s between reps, 3 min between sets.',
        // Four numbers already in the sentence above, typed so the clock can run
        // them (D17). Nothing authored: 4 reps, 3s, ~10s and 5 sets are §4B's.
        repChain: { reps: 4, holdSec: 3, betweenSec: 10 },
        sets: [5, 5],
      },
      {
        weeks: [5, 8],
        label: 'Weeks 5–8 · peak',
        text: '4–6 sets x 3–5s @ 100% effort, 3 min rest.',
        timed: true,
      },
    ],
    // §4B: "Grip: half-crimp (rotate in open-hand every other session…)". The
    // rotation is the open-hand entry beside this one, in the same routine.
    grip: 'Half-crimp',
    cues: [
      'Progress by feel, not by adding weight — this is neural recruitment and rate of force.',
      'Keep your feet planted; nothing should actually move.',
      'Run the rep-structured ~90% variant weeks 1–4, then the single max-effort version weeks 5–8.',
    ],
    safetyNotes: [
      'A Day 1 max protocol — never grease-the-groove this (plan §8).',
      'This rep-structured isometric, not GtG, is the primary tendon-strengthening dose (D14, plan §4B).',
    ],
    gtgEligible: false,
    planRefs: ['4B'], // T25/D42
  },
  {
    id: 'pima-finger-pull-open-hand',
    name: 'PIMA Finger Pull — Open-Hand',
    category: 'fingers',
    rotationGroup: 'pima-grip', // §4B's other half
    isoType: 'overcoming',
    equipment: ['hangboard'],
    summary: 'Overcoming isometric finger pull in an open-hand grip — alternates with half-crimp to spare the A2 pulley.',
    howTo: [
      'Stand under the board so your arms are bent ~90°.',
      'Grab your working edge in an open-hand grip.',
      "Pull down as hard as you can without lifting your feet — pulling the board into the wall, not yourself up.",
      'Hold the effort for 3–5 seconds, then rest.',
    ],
    prescription:
      'Peak: 4–6 sets x 3–5s @ 100% effort, 3 min rest. Tendon variant (weeks 1–4): 5 sets x 4 reps x 3s @ ~90%, ~10s between reps, 3 min between sets.',
    prescribedSets: [4, 6], // T19
    holdSeconds: [3, 5],
    restSeconds: 180,
    // Same two protocols as the half-crimp entry — §4B states them once for both
    // grips, so both entries declare them (T24, D41), including the rep chain
    // (T31): a rotation to open-hand does not change the protocol's shape.
    variants: [
      {
        weeks: [1, 4],
        label: 'Weeks 1–4 · tendon variant',
        text: '5 sets x 4 reps x 3s @ ~90%, ~10s between reps, 3 min between sets.',
        repChain: { reps: 4, holdSec: 3, betweenSec: 10 },
        sets: [5, 5],
      },
      {
        weeks: [5, 8],
        label: 'Weeks 5–8 · peak',
        text: '4–6 sets x 3–5s @ 100% effort, 3 min rest.',
        timed: true,
      },
    ],
    grip: 'Open-hand', // §4B
    cues: [
      'Rotate to open-hand every other session to protect the A2 pulleys.',
      'Progress by feel, not by adding weight.',
    ],
    safetyNotes: ['A Day 1 max protocol — never grease-the-groove this (plan §8).'],
    gtgEligible: false,
    planRefs: ['4B'], // T25/D42
  },
  {
    id: 'max-hang-half-crimp',
    name: 'Max Hang — Half-Crimp',
    category: 'fingers',
    // §4C: "Grip: half-crimp, alternate open-hand". A separate group from the
    // PIMA pair on purpose — they are two protocols, and alternating them in
    // lockstep would mean a session never sees both grips at all.
    rotationGroup: 'max-hang-grip',
    isoType: 'yielding',
    equipment: ['hangboard', 'dip-belt'],
    summary: 'Weighted yielding hang at near-max load in a half-crimp — top-end finger strength.',
    howTo: [
      'Set your one standard edge and take a half-crimp grip.',
      'Add load (dip belt + kettlebell) to reach ~85–90% of your max for that edge.',
      'Hang 7–10 seconds — very hard by second 3, but not failing before then.',
      'Rest 3 minutes; repeat for 5 sets.',
    ],
    prescription: '5 sets x 7–10s hang @ ~85–90% of max for the edge, 3 min rest',
    prescribedSets: [5, 5], // T19
    holdSeconds: [7, 10],
    restSeconds: 180,
    // D20/D22: §4F progresses this by load. Edge is declared because it is the
    // condition the other two are measured under, not a peer metric.
    metrics: ['holdSec', 'addedLb', 'edgeMm'],
    grip: 'Half-crimp', // §4C: "Grip: half-crimp, alternate open-hand"
    cues: [
      'Should be hard by rep 3, not failing before then.',
      'Keep one standard edge (14–20mm) for the whole block so retests compare.',
    ],
    safetyNotes: [
      'One max-intensity finger session per week is enough; keep the second submaximal (plan §7).',
      'Never grease-the-groove weighted max hangs (plan §8).',
    ],
    gtgEligible: false,
    planRefs: ['4C', '4F', '7'], // T25/D42
  },
  {
    id: 'max-hang-open-hand',
    name: 'Max Hang — Open-Hand',
    category: 'fingers',
    rotationGroup: 'max-hang-grip', // §4C's other half
    isoType: 'yielding',
    equipment: ['hangboard', 'dip-belt'],
    summary: 'Weighted yielding hang at near-max load in an open-hand grip — top-end finger strength.',
    howTo: [
      'Set your standard edge and take an open-hand grip.',
      'Add load to reach ~85–90% of your max for that edge.',
      'Hang 7–10 seconds — very hard by second 3, not failing before then.',
      'Rest 3 minutes; repeat for 5 sets.',
    ],
    prescription: '5 sets x 7–10s hang @ ~85–90% of max for the edge, 3 min rest',
    prescribedSets: [5, 5], // T19
    holdSeconds: [7, 10],
    restSeconds: 180,
    metrics: ['holdSec', 'addedLb', 'edgeMm'],
    grip: 'Open-hand', // §4C
    cues: [
      'Alternate with the half-crimp version session to session.',
      'Keep the same standard edge all block for valid retests.',
    ],
    safetyNotes: ['Never grease-the-groove weighted max hangs (plan §8).'],
    gtgEligible: false,
    planRefs: ['4C', '4F'], // T25/D42
  },
  {
    id: 'oi-bar-pull-extended',
    name: 'Overcoming Bar Pull — Near Full Extension',
    category: 'pulling',
    isoType: 'overcoming',
    equipment: ['pullup-bar'],
    summary: 'Overcoming isometric bar pull near full extension — bottom-range pulling power.',
    howTo: [
      'Grab the bar with arms near full extension.',
      "Brace your feet against the ground or a fixed point so you can't lift off.",
      'Pull up into the bar as hard as possible — nothing moves.',
      'Hold 5 seconds, then rest 2 minutes.',
    ],
    prescription: '3 sets x 5s max effort, 2 min rest (one of 3 angles in the session)',
    prescribedSets: [3, 3], // T19
    holdSeconds: [5, 5],
    restSeconds: 120,
    cues: [
      'Rotate grip attachments across sessions (narrow, wide, neutral).',
      'If you always leave the ground, substitute a banded/KB-anchored row or a yielding lock-off (plan §5A).',
    ],
    safetyNotes: [],
    gtgEligible: false,
    planRefs: ['5A'], // T25/D42
  },
  {
    id: 'oi-bar-pull-90',
    name: 'Overcoming Bar Pull — 90° Lock-off',
    category: 'pulling',
    isoType: 'overcoming',
    equipment: ['pullup-bar'],
    summary: "Overcoming isometric bar pull at the 90° lock-off — usually a climber's weakest angle.",
    howTo: [
      'Pull up to a 90° elbow bend and hold that position on the bar.',
      "Brace your feet so your body can't rise.",
      'Pull into the bar at max effort for 5 seconds.',
      'Rest 2 minutes; 3 sets.',
    ],
    prescription: '3 sets x 5s max effort, 2 min rest',
    prescribedSets: [3, 3], // T19
    holdSeconds: [5, 5],
    restSeconds: 120,
    cues: ["Start at the angle you're weakest at — usually 90° for climbers."],
    safetyNotes: [],
    gtgEligible: false,
    planRefs: ['5A'], // T25/D42
  },
  {
    id: 'oi-bar-pull-top',
    name: 'Overcoming Bar Pull — Near Top Lock-off',
    category: 'pulling',
    isoType: 'overcoming',
    equipment: ['pullup-bar'],
    summary: 'Overcoming isometric bar pull near the top lock-off — finishing-strength angle.',
    howTo: [
      'Pull up near the top lock-off position and hold it on the bar.',
      "Brace your feet so you can't lift off.",
      'Pull into the bar at max effort for 5 seconds.',
      'Rest 2 minutes; 3 sets.',
    ],
    prescription: '3 sets x 5s max effort, 2 min rest',
    prescribedSets: [3, 3], // T19
    holdSeconds: [5, 5],
    restSeconds: 120,
    cues: ['Third of the three session angles: extended, 90°, near-top.'],
    safetyNotes: [],
    gtgEligible: false,
    planRefs: ['5A'], // T25/D42
  },
  {
    id: 'weighted-lockoff-hold',
    name: 'Weighted Lock-off Hold',
    category: 'pulling',
    isoType: 'yielding',
    equipment: ['pullup-bar', 'dip-belt'],
    summary: 'Yielding lock-off hold at your weakest angle, load added as it gets easy.',
    howTo: [
      'Pull up to your weakest lock-off angle.',
      'Hold static for 8–10 seconds.',
      'Start at bodyweight; add kettlebell via dip belt as this gets easy.',
      'Rest 2 minutes; 3 holds.',
    ],
    prescription: '3 holds x 8–10s, 2 min rest; add kettlebell via dip belt as it gets easy (start bodyweight)',
    prescribedSets: [3, 3], // T19
    holdSeconds: [8, 10],
    restSeconds: 120,
    // No edgeMm: this hangs from a bar via a dip belt, so there is no edge to
    // record and its series is unsegmented (D22).
    metrics: ['holdSec', 'addedLb'],
    cues: ['Complements the overcoming bar pulls — same angle, yielding instead of overcoming.'],
    safetyNotes: ['Never grease-the-groove weighted lock-offs (plan §8).'],
    gtgEligible: false,
    planRefs: ['5B'], // T25/D42
  },
  {
    id: 'kb-single-arm-row',
    name: 'Single-Arm Kettlebell Row',
    category: 'pulling',
    isoType: 'dynamic',
    equipment: ['kettlebell'],
    summary: 'Single-arm kettlebell row — pulling strength and scapular control.',
    howTo: [
      'Hinge at the hips with a flat back, kettlebell in one hand.',
      'Row the bell to your ribs, leading with the elbow.',
      'Lower under control, letting the shoulder blade move.',
      '8 reps per side, 3 sets.',
    ],
    prescription: '3 x 8 per side',
    prescribedSets: [3, 3], // T19
    cues: ['Focus on scapular control, not just moving the weight.'],
    safetyNotes: [],
    gtgEligible: false,
    planRefs: ['5C'], // T25/D42
  },
  {
    id: 'kb-goblet-squat',
    name: 'Kettlebell Goblet Squat',
    category: 'lower-body',
    target: 'hip',
    tiers: [
      { tier: 'pool', text: 'GtG: 10–15 reps, morning and evening', source: 'Plan §8 / §5C' },
    ],
    isoType: 'dynamic',
    equipment: ['kettlebell'],
    summary: 'Goblet squat for leg drive — it matters more for hard bouldering than people think.',
    howTo: [
      'Hold the kettlebell at your chest.',
      'Squat to depth with an upright torso.',
      'Drive up through mid-foot.',
      '10 reps (session) or 10–15 for a GtG set.',
    ],
    prescription: 'Session: 3 x 10. GtG: 10–15 reps, morning and evening',
    prescribedSets: [3, 3], // T19
    cues: [
      "Leg drive matters for hard bouldering — don't skip lower body.",
      'GtG version: bodyweight or the 35lb bell, kept easy.',
    ],
    safetyNotes: [],
    gtgEligible: true,
    gtg: { dose: '10–15', trigger: 'Morning, evening', riskClass: 'free' }, // T33
    planRefs: ['5C', '8'], // T25/D42
  },
  {
    id: 'kb-turkish-getup',
    name: 'Turkish Get-up (Light)',
    category: 'antagonist',
    isoType: 'dynamic',
    equipment: ['kettlebell'],
    summary: 'Light Turkish get-up — full-body tension and shoulder stability, technique focus.',
    howTo: [
      'Start lying down, kettlebell pressed over one shoulder.',
      'Stand up through the get-up sequence, keeping the bell overhead.',
      'Reverse the sequence back to the floor.',
      '2–3 slow reps per side.',
    ],
    prescription: '2–3 per side, light, technique focus',
    cues: ['Keep it light — this is shoulder stability and control, not a strength max.'],
    safetyNotes: [],
    gtgEligible: false,
    planRefs: ['5C'], // T25/D42
  },
  {
    id: 'pushups-or-dips',
    name: 'Push-ups or Dips',
    category: 'antagonist',
    target: 'shoulder',
    tiers: [
      {
        tier: 'pool',
        text: 'GtG: 8–12 (about half your max) whenever you pass a clear floor',
        source: 'Plan §8 / §5D',
      },
    ],
    isoType: 'dynamic',
    equipment: ['bodyweight'],
    summary: 'Push-ups or dips — pushing strength to balance the pullers; a free GtG movement.',
    howTo: [
      'Set up for push-ups (or dips on bars).',
      'Lower under control to full range.',
      'Press back to lockout.',
      '10–15 reps (session) or about half your max for a GtG set.',
    ],
    prescription: 'Session: 3 x 10–15. GtG: 8–12 (about half your max) whenever you pass a clear floor',
    prescribedSets: [3, 3], // T19
    cues: [
      'Antagonist balance lets you safely train the pullers harder.',
      'GtG: never to failure — stop well before a pump.',
    ],
    safetyNotes: [],
    gtgEligible: true,
    gtg: {
      dose: '8–12 (about half your max)',
      trigger: 'Whenever you walk past a clear floor',
      riskClass: 'free',
    }, // T33
    planRefs: ['5D', '8'], // T25/D42
  },
  {
    id: 'oi-wall-press',
    name: 'Overcoming Isometric Wall Press',
    category: 'antagonist',
    target: 'shoulder',
    tiers: [{ tier: 'pool', text: 'GtG: 5s x 1–2 in any doorway', source: 'Plan §8 / §5D' }],
    isoType: 'overcoming',
    equipment: ['bodyweight'],
    summary: 'Push into a wall at max effort — shoulder and pushing strength with zero equipment; a free GtG movement.',
    howTo: [
      'Face a wall or doorframe, hands in a pressing position.',
      'Push into it as hard as possible — nothing moves.',
      'Hold 5 seconds.',
      '3 efforts (session) or 1–2 for a GtG dose.',
    ],
    prescription: 'Session: 5s x 3. GtG: 5s x 1–2 in any doorway',
    prescribedSets: [3, 3], // T19
    // No restSeconds: plan §5D prescribes no rest interval for the wall press, and
    // inventing one would be exactly the fabrication D17 exists to prevent. The
    // hold still times; it just ends without starting a countdown.
    holdSeconds: [5, 5],
    cues: [
      'Zero equipment — usable in any doorway.',
      'Max effort, short duration; stop well before strain.',
    ],
    safetyNotes: [],
    gtgEligible: true,
    gtg: { dose: '5s x 1–2', trigger: 'Any doorway', riskClass: 'free' }, // T33
    planRefs: ['5D', '8'], // T25/D42
  },
  {
    id: 'external-rotations',
    name: 'External Rotations',
    category: 'antagonist',
    target: 'shoulder',
    tiers: [
      { tier: 'pool', text: 'GtG: 10–12 per side, morning and evening', source: 'Plan §8 / §5D' },
    ],
    isoType: 'dynamic',
    equipment: ['band', 'kettlebell'],
    summary: 'Rotator-cuff external rotations — shoulder health and prehab; a free GtG movement.',
    howTo: [
      'Anchor a band (or hold a light kettlebell) at your side, elbow bent 90°.',
      'Rotate the forearm outward, keeping the elbow pinned to your ribs.',
      'Return under control.',
      '10–15 reps per side.',
    ],
    prescription: 'Session: 2 x 15 per side. GtG: 10–12 per side, morning and evening',
    prescribedSets: [2, 2], // T19
    cues: ['Light load, strict form — this is prehab, not a strength lift.'],
    safetyNotes: [],
    gtgEligible: true,
    gtg: { dose: '10–12/side', trigger: 'Morning and evening', riskClass: 'free' }, // T33
    planRefs: ['5D', '8'], // T25/D42
  },
  {
    id: 'wrist-extensor-work',
    name: 'Wrist Extensor Work',
    category: 'antagonist',
    target: 'extensors',
    tiers: [
      {
        tier: 'pool',
        text: 'GtG: 10–15 reps, e.g. every time you make coffee',
        source: 'Plan §8 / §5D',
      },
    ],
    isoType: 'dynamic',
    equipment: ['kettlebell'],
    summary: 'Wrist extensor work — protects the elbow from finger-flexor-heavy training; a free GtG movement.',
    howTo: [
      'Hold a light kettlebell or bar with a pronated (palm-down) grip.',
      'Curl the wrist upward through full range.',
      'Lower under control.',
      '10–15 reps.',
    ],
    prescription: 'Session: 2 x 15. GtG: 10–15 reps, e.g. every time you make coffee',
    prescribedSets: [2, 2], // T19
    cues: ['Directly offsets the finger-flexor load from Day 1 — protects the elbow.'],
    safetyNotes: [],
    gtgEligible: true,
    gtg: { dose: '10–15 reps', trigger: 'Every time you make coffee', riskClass: 'free' }, // T33
    planRefs: ['5D', '8'], // T25/D42
  },
  {
    id: 'climbing-volume-technique',
    name: 'Climbing — Volume / Technique (Day 2)',
    category: 'climbing',
    isoType: 'none',
    equipment: ['climbing-wall'],
    summary: 'Day 2 volume/technique climbing below your limit — fix the technical leaks a plateau hides.',
    howTo: [
      'Climb well below your limit (around V3–V5).',
      'Prioritise precise footwork and efficient body positioning.',
      'Favour volume over intensity — stay fresh.',
      'This is where you fix the technique a plateau often hides.',
    ],
    prescription: 'Climb V3–V5, precision and footwork focus; below your limit',
    cues: ['Below your limit on purpose — a technique day, not a send day.'],
    safetyNotes: [],
    gtgEligible: false,
    planRefs: ['6'], // T25/D42
  },
  {
    id: 'climbing-limit-boulder',
    name: 'Climbing — Limit Bouldering (Day 4)',
    category: 'climbing',
    isoType: 'none',
    equipment: ['climbing-wall'],
    summary: 'Day 4 limit bouldering at or above your max — where new strength becomes sends.',
    howTo: [
      'Pick problems at or above your current max (V6+).',
      'Try hard in short bursts.',
      'Take full rest (3–5 min) between attempts.',
      'This expresses your new finger and pulling strength as actual sends.',
    ],
    prescription: 'V6+ hard moves, short bursts, full rest (3–5 min) between attempts',
    cues: ['Full recovery between attempts — quality of effort over quantity.'],
    safetyNotes: [
      'Stop at any sharp or pulley-specific pain (as opposed to normal fatigue) — that is the difference between a plateau and a torn A2 (plan §7).',
    ],
    gtgEligible: false,
    planRefs: ['6'], // T25/D42
  },

  // ─── §4E baseline / retest battery (T16) ───────────────────────────────────
  //
  // Five test-only entries, run twice a block and never in a training session
  // (D29a). They are separate from the trained movements on purpose: §4E is a
  // maximum under one fixed protocol while §4C training is 85–90% for five sets,
  // so logging both against `max-hang-half-crimp` would put a week-1 and a week-8
  // spike on the very series §7 asks the owner to read for a *downward* trend.
  // That is D22's refusal to draw an invalid comparison, applied to intensity
  // rather than edge size — these get their own two-point series instead.
  //
  // None is gtgEligible: §8 forbids greasing the groove on max protocols, and a
  // test to failure is the most maximal thing in the app.
  {
    id: 'test-max-hang-half-crimp',
    name: '§4E Test — Max Hang Load, Half-Crimp',
    category: 'fingers',
    isoType: 'yielding',
    equipment: ['hangboard', 'dip-belt'],
    summary: 'Baseline/retest: the most added weight you can hold 7s on your standard edge, half-crimp.',
    howTo: [
      'Fully rested, after a thorough warm-up — the same warm-up both times.',
      'Use your one standard edge (14–20mm) and a half-crimp grip.',
      'Work up in 3–5 sets with 3 minutes of rest, adding weight each set.',
      'Each attempt is a 7-second hang. Stop at the first failed attempt.',
      'Record the edge, the heaviest added weight held for 7s, and your bodyweight.',
    ],
    prescription: 'Work up in 3–5 sets x 7s, 3 min rest, to the max added weight held for 7s. Stop at the first failed attempt (§4E)',
    prescribedSets: [3, 5], // T19
    holdSeconds: [7, 7],
    restSeconds: 180,
    // No holdSec: the hold is fixed at 7s by the protocol, so the only things that
    // move between week 1 and week 8 are the load and the edge it was held on.
    metrics: ['addedLb', 'edgeMm'],
    // §4E: "same edge, same grip". The grip is a *condition* of the comparison
    // here, like the edge — which is why it is declared rather than left in the name.
    grip: 'Half-crimp',
    cues: [
      'Identical conditions both times — same edge, same grip, same time of day, same warm-up — or the comparison is meaningless (§4E).',
      'Record bodyweight the same day: added weight alone is half a measurement (§4E).',
    ],
    safetyNotes: [
      'A true max attempt on cold or fatigued fingers is how pulleys tear — test rested, never as a make-up session (plan §7).',
      'Stop at the first failed attempt rather than grinding out one more (plan §4E).',
    ],
    gtgEligible: false,
    planRefs: ['4E'], // T25/D42
  },
  {
    id: 'test-max-hang-open-hand',
    name: '§4E Test — Max Hang Load, Open-Hand',
    category: 'fingers',
    isoType: 'yielding',
    equipment: ['hangboard', 'dip-belt'],
    summary: 'Baseline/retest: the most added weight you can hold 7s on your standard edge, open-hand.',
    howTo: [
      'Same protocol as the half-crimp test, with an open-hand grip.',
      'Use the same standard edge you tested the half-crimp on.',
      'Work up in 3–5 sets with 3 minutes of rest; each attempt is a 7-second hang.',
      'Stop at the first failed attempt.',
      'Record the edge, the heaviest added weight held for 7s, and your bodyweight.',
    ],
    prescription: 'Same protocol as the half-crimp test, open-hand grip (§4E)',
    prescribedSets: [3, 5], // T19
    holdSeconds: [7, 7],
    restSeconds: 180,
    metrics: ['addedLb', 'edgeMm'],
    grip: 'Open-hand', // §4E
    cues: [
      'Same edge as the half-crimp test, and the same edge again at week 8 (§4E).',
    ],
    safetyNotes: [
      'A true max attempt on cold or fatigued fingers is how pulleys tear — test rested (plan §7).',
    ],
    gtgEligible: false,
    planRefs: ['4E'], // T25/D42
  },
  {
    id: 'test-max-pullup-load',
    name: '§4E Test — Max Pull-up Load',
    category: 'pulling',
    isoType: 'dynamic',
    equipment: ['pullup-bar', 'dip-belt', 'kettlebell'],
    summary: 'Baseline/retest: the heaviest single strict pull-up, kettlebell via dip belt.',
    howTo: [
      'Warm up, then load a kettlebell on the dip belt.',
      'Perform one strict pull-up — no kipping, full extension to chin over bar.',
      'Add weight and repeat until an attempt fails.',
      'Record the heaviest added weight completed.',
    ],
    prescription: 'Heaviest single strict pull-up (kettlebell via dip belt) — record added weight (§4E)',
    // No holdSeconds: a pull-up is a rep, not a hold, so there is no timer and no
    // end-reason question (D27's line falls exactly here).
    metrics: ['addedLb'],
    cues: ['Strict means strict — a kipped rep is not the same test at week 8.'],
    safetyNotes: [
      'Stop at any elbow or shoulder pain; §5D lists antagonist work as the reason this stays healthy, and a max single is not worth an injury (plan §7).',
    ],
    gtgEligible: false,
    planRefs: ['4E'], // T25/D42
  },
  {
    id: 'test-lockoff-90-left',
    name: '§4E Test — Lock-off Hold 90°, Left',
    category: 'pulling',
    isoType: 'yielding',
    equipment: ['pullup-bar'],
    summary: 'Baseline/retest: longest static 90° lock-off at bodyweight, left side, one attempt.',
    howTo: [
      'Pull up to a 90° lock-off on the left side at bodyweight.',
      'Hold as long as you can — this is a maximum, not a prescribed duration.',
      'One attempt per side; the timer runs until you stop it.',
      'Record the seconds held.',
    ],
    prescription: 'Longest static hold at bodyweight, one attempt per side — record seconds each side (§4E)',
    prescribedSets: [1, 1], // T19
    // 'open' (T16): the duration is the measurement, so there is no maximum to
    // auto-stop at. Left and right are separate entries because a session's chart
    // point is its *best* set, and a best-of-both-arms number is not a per-side
    // record — the same reason D22 refuses to join two edges.
    holdSeconds: 'open',
    metrics: ['holdSec'],
    cues: ['One attempt per side — a second try after a rest is a different test.'],
    safetyNotes: ['Come off before the elbow takes over from the back; §7 names pulling volume as the first thing to cut at any elbow symptom.'],
    gtgEligible: false,
    planRefs: ['4E'], // T25/D42
  },
  {
    id: 'test-lockoff-90-right',
    name: '§4E Test — Lock-off Hold 90°, Right',
    category: 'pulling',
    isoType: 'yielding',
    equipment: ['pullup-bar'],
    summary: 'Baseline/retest: longest static 90° lock-off at bodyweight, right side, one attempt.',
    howTo: [
      'Pull up to a 90° lock-off on the right side at bodyweight.',
      'Hold as long as you can — this is a maximum, not a prescribed duration.',
      'One attempt per side; the timer runs until you stop it.',
      'Record the seconds held.',
    ],
    prescription: 'Longest static hold at bodyweight, one attempt per side — record seconds each side (§4E)',
    prescribedSets: [1, 1], // T19
    holdSeconds: 'open',
    metrics: ['holdSec'],
    cues: ['One attempt per side — a second try after a rest is a different test.'],
    safetyNotes: ['Come off before the elbow takes over from the back; §7 names pulling volume as the first thing to cut at any elbow symptom.'],
    gtgEligible: false,
    planRefs: ['4E'], // T25/D42
  },

  // ─── Daily tendon isometrics (docs/joint-rotation-research.md §6, tier 2) ───
  //
  // One slot per major non-finger tendon, ~70% MVC, 30–45s, daily. Fingers are
  // deliberately absent: that tissue already carries the abrahangs twice daily
  // and two finger routines a week, and plan §7/§8 forbid adding frequency to it.
  //
  // No `planRefs`: these are sourced from the literature rather than from
  // docs/training-plan.md, and an address that does not resolve is worse than
  // none (D42). Each dose names its source on the tier prescription instead.
  //
  // Every entry holds at the *long* muscle length, which is a prescribed variable
  // and not a detail of execution — Oranchuk et al. (2019) found longer lengths
  // produce greater adaptation than equal volume at short lengths, and Baar
  // reports lengthened holds improving compliance by up to 50%.
  //
  // None declares `restSeconds`: the 70% MVC / 30–45s standard prescribes hold
  // and rep count but no rest interval, and inventing one is the fabrication D17
  // exists to prevent — the same reason `oi-wall-press` has none.
  {
    id: 'iso-extensor-hold',
    name: 'Finger Extensor Isometric Hold',
    category: 'antagonist',
    target: 'extensors',
    tiers: [
      {
        tier: 'daily-isometric',
        text: '2 x 30–45s @ ~70% effort',
        holdSeconds: [30, 45],
        prescribedSets: [2, 2],
        position: 'Fingers spread to full extension — the end of range, not mid-way',
        source: '70% MVC / 30–45s isometric standard; long-length per Oranchuk 2019',
      },
    ],
    isoType: 'overcoming',
    equipment: ['band', 'bodyweight'],
    summary: 'Sustained finger-extension hold — the daily counter-load to a flexor-heavy week.',
    howTo: [
      'Loop a band around the fingers and thumb, or press the fingertips into a flat surface.',
      'Open the hand to full extension against the resistance.',
      'Hold at roughly 70% of a hard effort — firm, not straining.',
      'Hold 30–45 seconds, twice.',
    ],
    prescription: 'Daily: 2 x 30–45s @ ~70% effort, fingers at full extension',
    cues: [
      'Extension is the position, not just the direction — finish with the fingers straight.',
      'Climbers get more flexor-dominant with experience, which is what this offsets.',
    ],
    safetyNotes: [],
    gtgEligible: false,
  },
  {
    id: 'iso-elbow-neutral-hold',
    name: 'Neutral-Grip Mid-Range Hold',
    category: 'pulling',
    target: 'elbow',
    tiers: [
      {
        tier: 'daily-isometric',
        text: '2 x 30–45s @ ~70% effort',
        holdSeconds: [30, 45],
        prescribedSets: [2, 2],
        position: 'Mid-range elbow bend — roughly 90°, the angle that loads the tendon most',
        source: "Hörst's climber's-elbow density hold, extended to the 30–45s standard",
      },
    ],
    isoType: 'yielding',
    equipment: ['pullup-bar'],
    summary: 'Mid-range neutral-grip hold — daily load for the elbow tendons climbing never rests.',
    howTo: [
      'Take a neutral (palms-facing) grip on a bar or rings.',
      'Pull to a mid-range elbow bend, around 90°, and hold there.',
      'Keep the effort around 70% — assist with the feet if a free hang is harder than that.',
      'Hold 30–45 seconds, twice.',
    ],
    prescription: 'Daily: 2 x 30–45s at ~90° elbow, neutral grip, ~70% effort',
    cues: [
      'Neutral grip, not pronated — this is the elbow, not a pull-up.',
      'Use the feet to keep it at 70%; a maximal version belongs in a session, not a daily slot.',
    ],
    safetyNotes: [
      'Stop at any sharp medial or lateral elbow pain. This is capacity work, not treatment for a symptom you already have.',
    ],
    gtgEligible: false,
  },
  {
    id: 'iso-shoulder-er-hold',
    name: 'External Rotation Isometric Hold',
    category: 'antagonist',
    target: 'shoulder',
    tiers: [
      {
        tier: 'daily-isometric',
        text: '2 x 30–45s per side @ ~70% effort',
        holdSeconds: [30, 45],
        prescribedSets: [2, 2],
        position: 'Elbow at the ribs, forearm rotated out to end range',
        source: '70% MVC / 30–45s isometric standard; rotator cuff per climbing-PT consensus',
      },
    ],
    isoType: 'overcoming',
    equipment: ['band'],
    summary: 'Held external rotation — daily rotator-cuff load for climbing’s second-worst overuse site.',
    howTo: [
      'Anchor a band at elbow height and stand side-on, elbow pinned to the ribs at 90°.',
      'Rotate the forearm outward to the end of its range.',
      'Hold there at roughly 70% effort.',
      'Hold 30–45 seconds per side, twice each.',
    ],
    prescription: 'Daily: 2 x 30–45s per side @ ~70% effort, forearm at end range',
    cues: [
      'The elbow stays pinned — if it drifts off the ribs the lats are doing this.',
      'Hold at the end of the range, not halfway: length is part of the prescription.',
    ],
    safetyNotes: [],
    gtgEligible: false,
  },
  {
    id: 'iso-copenhagen-hold',
    name: 'Copenhagen Adductor Hold',
    category: 'lower-body',
    target: 'hip',
    tiers: [
      {
        tier: 'daily-isometric',
        text: '2 x 30–45s per side, short lever',
        holdSeconds: [30, 45],
        prescribedSets: [2, 2],
        position: 'Top knee on the bench — short lever until the position is familiar',
        source: 'Copenhagen adduction (meta-analysis, groin injury), held rather than repped',
      },
    ],
    isoType: 'yielding',
    equipment: ['bodyweight'],
    summary: 'Side-plank adductor hold — the groin work that heel hooks load and nothing else trains.',
    howTo: [
      'Lie on your side with the top leg resting on a bench or chair, knee bent (short lever).',
      'Prop up on the bottom elbow and lift the hips until the body is in line.',
      'Drive the top knee down into the bench to hold the position.',
      'Hold 30–45 seconds per side, twice each.',
    ],
    prescription: 'Daily: 2 x 30–45s per side, top knee on the bench (short lever)',
    cues: [
      'Start short-lever and stay there for weeks — the straight-leg version is a large jump.',
      'Hips in line with the shoulders; a sagging hip makes this a different exercise.',
    ],
    safetyNotes: [
      'This produces real soreness if started long-lever or at volume. Short lever, two holds, no more.',
    ],
    gtgEligible: false,
  },
  {
    id: 'iso-knee-flexion-hold',
    name: 'Mid-Range Knee Flexion Hold',
    category: 'lower-body',
    target: 'knee',
    tiers: [
      {
        tier: 'daily-isometric',
        text: '2 x 30–45s per side @ ~70% effort',
        holdSeconds: [30, 45],
        prescribedSets: [2, 2],
        position: 'Knee near-extended — the long end of the hamstring range, as in a heel hook',
        source: '70% MVC / 30–45s isometric standard; heel-hook position per climbing-PT sources',
      },
    ],
    isoType: 'overcoming',
    equipment: ['bodyweight'],
    summary: 'Held hamstring contraction near full knee extension — the heel-hook position.',
    howTo: [
      'Sit or lie with the heel on the floor and the knee only slightly bent.',
      'Pull the heel back into the ground as if dragging it toward you — nothing moves.',
      'Hold at roughly 70% effort.',
      'Hold 30–45 seconds per side, twice each.',
    ],
    prescription: 'Daily: 2 x 30–45s per side, knee near-extended, ~70% effort',
    cues: [
      'Near-straight knee, not bent — that long position is where a heel hook actually loads.',
      'Actively engaging the hamstring is what makes a heel hook stable; passive hanging is not.',
    ],
    safetyNotes: [],
    gtgEligible: false,
  },
  {
    id: 'iso-calf-raise-hold',
    name: 'Isometric Calf Raise Hold',
    category: 'lower-body',
    target: 'ankle',
    tiers: [
      {
        tier: 'daily-isometric',
        text: '2 x 30–45s, straight and bent knee on alternate days',
        holdSeconds: [30, 45],
        prescribedSets: [2, 2],
        position: 'Heel below the step — the Achilles at length, not at the top of the raise',
        source: '70% MVC / 30–45s isometric standard; long-length per Oranchuk 2019 and Baar',
      },
    ],
    isoType: 'yielding',
    equipment: ['bodyweight'],
    summary: 'Held calf raise with the heel low — Achilles load for the joint boulderers land on.',
    howTo: [
      'Stand with the forefoot on a step, heel hanging below the level of the toes.',
      'Rise to a mid-range position and hold — or hold at the bottom for more length.',
      'Straight knee loads the gastrocnemius; a bent knee shifts it to the soleus.',
      'Hold 30–45 seconds, twice.',
    ],
    prescription: 'Daily: 2 x 30–45s, heel below the step; alternate straight and bent knee',
    cues: [
      'Heel below the toes — a hold at the top of the raise trains the short position instead.',
      'Alternate straight and bent knee day to day; they are different tissues.',
    ],
    safetyNotes: [],
    gtgEligible: false,
  },

  // ─── Pool additions (docs/joint-rotation-research.md §4, tier 4) ────────────
  //
  // One per target the existing catalog left uncovered — elbow, wrist, knee and
  // ankle. The remaining pool movements in §4 are variety on top of this; these
  // four are what make the coverage assertion in pool.test.ts hold.
  {
    id: 'pronator-eccentric',
    name: 'Pronator Lower (Eccentric)',
    category: 'antagonist',
    target: 'elbow',
    tiers: [
      {
        tier: 'pool',
        text: '2 x 15–20 per hand, 5s eccentric',
        prescribedSets: [2, 2],
        source: "Hörst, climber's-elbow rehab/prehab protocol",
      },
    ],
    isoType: 'dynamic',
    equipment: ['kettlebell'],
    summary: 'Slow-lowering pronation with an offset weight — the highest-yield elbow prehab there is.',
    howTo: [
      'Sit with the forearm supported, elbow at 90°, holding a hammer or kettlebell by the horn.',
      'Start with the weight vertical and rotate the palm downward (pronate).',
      'Lower slowly — a five-count on the way down.',
      'Use the free hand to return it to the top. 15–20 reps per hand, twice.',
    ],
    prescription: 'Pool: 2 x 15–20 per hand, 5s lowering; every other day',
    cues: [
      'The five-second lower is the exercise — returning it under load is not the point.',
      'Adjust the load by choking up or down the handle rather than changing weight.',
    ],
    safetyNotes: [],
    gtgEligible: false,
  },
  {
    id: 'wide-pinch-wrist-extension',
    name: 'Wide Pinch with Wrist Extension',
    category: 'antagonist',
    target: 'wrist',
    tiers: [
      {
        tier: 'pool',
        text: 'Strength: 10s x 3 per hand, 30s between, 3 min between sets. Endurance: 30s x 3 per hand, 1 min rest.',
        holdSeconds: [10, 30],
        prescribedSets: [3, 3],
        source: 'Hörst, wrist stabilizer training',
      },
    ],
    isoType: 'yielding',
    equipment: ['hangboard'],
    summary: 'Wide pinch held with the wrist extended — the most overlooked wrist exercise for climbers.',
    howTo: [
      'Take a wide pinch on a block or the edge of a bumper plate.',
      'Hold it with the wrist extended and the fingers straight rather than curled.',
      'Strength: 10-second holds, three per hand, 30 seconds between.',
      'Endurance: 30-second holds, three per hand, a minute between.',
    ],
    prescription:
      'Pool: strength 10s x 3/hand (30s between, 3 min between sets); or endurance 30s x 3/hand, 1 min rest',
    cues: [
      'Fingers extended, not crimped — this trains the extensors in the open-hand position.',
      'Wrist stability takes load off the fingers; this is the position climbing never trains.',
    ],
    safetyNotes: [
      'A genuine strength exercise rather than prehab — start at the low end of the range.',
    ],
    gtgEligible: false,
  },
  {
    id: 'nordic-hamstring-curl',
    name: 'Nordic Hamstring Curl',
    category: 'lower-body',
    target: 'knee',
    tiers: [
      {
        tier: 'pool',
        // Low volume is the *prescription*, not a concession: high vs low volume
        // showed no significant difference in eccentric strength or fascicle
        // adaptation, so there is no cost to starting and staying small.
        text: '2 x 5, assisted or partial range',
        prescribedSets: [2, 2],
        source: 'NHE injury-prevention meta-analysis (RR 0.49); volume per high-vs-low review',
      },
    ],
    isoType: 'dynamic',
    equipment: ['bodyweight'],
    summary: 'Eccentric hamstring lowering — halves hamstring injury rate, and heel hooks load exactly this.',
    howTo: [
      'Kneel with the ankles anchored under something solid.',
      'Keeping the hips extended and the body in one line, lower forward as slowly as you can.',
      'Catch yourself with the hands and push back to the start.',
      '5 reps, twice. Use a band or a partial range until the full lower is controllable.',
    ],
    prescription: 'Pool: 2 x 5, assisted or partial range; 2x/week',
    cues: [
      'Hips stay extended — folding at the hip turns this into a much easier exercise.',
      'Control the lower for as long as possible; the last third is where the adaptation is.',
    ],
    safetyNotes: [
      'Severe soreness if started at full range and volume. Begin assisted or partial — the evidence says low volume works as well as high, so there is nothing to gain by rushing.',
    ],
    gtgEligible: false,
  },
  {
    id: 'single-leg-balance',
    name: 'Single-Leg Balance',
    category: 'lower-body',
    target: 'ankle',
    tiers: [
      {
        tier: 'pool',
        text: '3 x 30s per side, eyes closed or on an unstable surface',
        holdSeconds: [30, 30],
        prescribedSets: [3, 3],
        source: 'Proprioceptive training meta-analysis, ankle sprain incidence RR 0.65 (NNT 17)',
      },
    ],
    isoType: 'none',
    equipment: ['bodyweight'],
    summary: 'Single-leg balance work — the cheapest injury reduction available for a boulderer’s ankles.',
    howTo: [
      'Stand on one leg with a soft knee.',
      'Close the eyes, or stand on a cushion or wobble board — progress by removing input, not by adding time.',
      'Hold 30 seconds per side, three times each.',
      'Add a task — passing a ball hand to hand — once it is easy.',
    ],
    prescription: 'Pool: 3 x 30s per side, eyes closed or unstable surface; 1–2x/week',
    cues: [
      'Program length matters more than session length here — a small weekly dose sustained beats a big one abandoned.',
      'Pair it with the calf work; balance plus strengthening beats either alone.',
    ],
    safetyNotes: [],
    gtgEligible: false,
  },

  // ─── Pool variety (docs/joint-rotation-research.md §4) ──────────────────────
  //
  // The rest of §4's movements. Coverage was already met by the four above; these
  // are what make the rotation a rotation — with one movement per target the
  // stalest-wins rule has nothing to choose between, and every day looks the same.
  //
  // `iso-scapular-retraction-hold` is the exception: it is a *second* daily
  // isometric for the shoulder slot, so that slot alternates the way §6 describes
  // rather than offering one movement forever.
  {
    id: 'iso-scapular-retraction-hold',
    name: 'Scapular Retraction Hold',
    category: 'antagonist',
    target: 'shoulder',
    tiers: [
      {
        tier: 'daily-isometric',
        text: '2 x 30–45s @ ~70% effort',
        holdSeconds: [30, 45],
        prescribedSets: [2, 2],
        position: 'Blades down and back, arms overhead — the lengthened lower-trap position',
        source: '70% MVC / 30–45s isometric standard; lower trap per climbing-PT consensus',
      },
    ],
    isoType: 'yielding',
    equipment: ['band'],
    summary: 'Held scapular retraction — the lower trap climbers are reliably weak in.',
    howTo: [
      'Anchor a band overhead and take it in both hands, arms up and slightly forward.',
      'Pull the shoulder blades down and back without shrugging.',
      'Hold there at roughly 70% effort.',
      'Hold 30–45 seconds, twice.',
    ],
    prescription: 'Daily: 2 x 30–45s @ ~70% effort, blades down and back, arms overhead',
    cues: [
      'Down and back, not up — an upper-trap shrug is the pattern this exists to displace.',
      'The scapula should rotate upward without elevating; that is what keeps the supraspinatus clear.',
    ],
    safetyNotes: [],
    gtgEligible: false,
  },
  {
    id: 'internal-rotations',
    name: 'Internal Rotations',
    category: 'antagonist',
    target: 'shoulder',
    tiers: [
      { tier: 'pool', text: '2 x 15 per side, light', prescribedSets: [2, 2], source: 'Rotator-cuff prehab consensus — the neglected half of the ER pair' },
    ],
    isoType: 'dynamic',
    equipment: ['band'],
    summary: 'Banded internal rotation — the half of the cuff pair climbers skip.',
    howTo: [
      'Anchor a band at elbow height, stand side-on with the working arm nearest the anchor.',
      'Elbow pinned to the ribs at 90°, rotate the forearm across the body.',
      'Return under control.',
      '15 reps per side, twice.',
    ],
    prescription: 'Pool: 2 x 15 per side, light load, strict form',
    cues: ['Elbow stays at the ribs.', 'Light — this is a cuff, not a lat.'],
    safetyNotes: [],
    gtgEligible: false,
  },
  {
    id: 'prone-y-raise',
    name: 'Prone Y Raise',
    category: 'antagonist',
    target: 'shoulder',
    tiers: [
      { tier: 'pool', text: '2 x 10–12, slow', prescribedSets: [2, 2], source: 'Lower-trapezius prehab consensus for climbers' },
    ],
    isoType: 'dynamic',
    equipment: ['bodyweight'],
    summary: 'Prone Y raise for the lower trap — upward rotation without the shrug.',
    howTo: [
      'Lie face down on the floor or an incline bench, arms overhead in a Y.',
      'Raise the arms by driving the shoulder blades down and back.',
      'Lower slowly.',
      '10–12 reps, twice. Add no load until it is clean.',
    ],
    prescription: 'Pool: 2 x 10–12, slow, bodyweight',
    cues: [
      'Thumbs up, arms at roughly 45° from the body.',
      'If the upper trap does the work, lower the range rather than the standard.',
    ],
    safetyNotes: [],
    gtgEligible: false,
  },
  {
    id: 'serratus-wall-slide',
    name: 'Serratus Wall Slide',
    category: 'antagonist',
    target: 'shoulder',
    tiers: [
      { tier: 'pool', text: '2 x 10–12', prescribedSets: [2, 2], source: 'Scapular stability prehab consensus for climbers' },
    ],
    isoType: 'dynamic',
    equipment: ['bodyweight'],
    summary: 'Wall slide for the serratus — the muscle that lets the scapula rotate up cleanly.',
    howTo: [
      'Stand facing a wall, forearms on it, elbows below shoulder height.',
      'Slide the forearms up the wall while pushing into it.',
      'At the top, reach slightly further to protract the blades.',
      '10–12 reps, twice.',
    ],
    prescription: 'Pool: 2 x 10–12, pushing into the wall throughout',
    cues: [
      'Keep pressing into the wall — losing the push loses the serratus.',
      'Stop the slide where the shrug starts.',
    ],
    safetyNotes: [],
    gtgEligible: false,
  },
  {
    id: 'supinator-eccentric',
    name: 'Supinator Lower (Eccentric)',
    category: 'antagonist',
    target: 'elbow',
    tiers: [
      { tier: 'pool', text: '2 x 15–20 per hand, 5s eccentric', prescribedSets: [2, 2], source: "Hörst's pronator protocol, run in the opposite direction" },
    ],
    isoType: 'dynamic',
    equipment: ['kettlebell'],
    summary: 'The pronator exercise reversed — the other half of forearm rotation.',
    howTo: [
      'Sit with the forearm supported, elbow at 90°, holding a hammer or kettlebell by the horn.',
      'Start vertical and rotate the palm upward (supinate).',
      'Lower slowly — a five-count down.',
      'Return with the free hand. 15–20 reps per hand, twice.',
    ],
    prescription: 'Pool: 2 x 15–20 per hand, 5s lowering; every other day',
    cues: ['Same five-second lower as the pronator work.', 'Choke up or down the handle to set the load.'],
    safetyNotes: [],
    gtgEligible: false,
  },
  {
    id: 'band-finger-extension',
    name: 'Band Finger Extension',
    category: 'antagonist',
    target: 'extensors',
    tiers: [
      { tier: 'pool', text: '15–25 reps, light resistance', source: 'Hörst — explicitly warm-up, beginner and rehab grade, not strength' },
    ],
    isoType: 'dynamic',
    equipment: ['band'],
    summary: 'Rubber-band finger extension — a warm-up and rehab dose, not a strength exercise.',
    howTo: [
      'Loop a band around the fingers and thumb.',
      'Open the hand against it through full range.',
      'Return under control.',
      '15–25 reps, light.',
    ],
    prescription: 'Pool: 15–25 reps light (warm-up grade); 2–3 heavier sets only if used for strength',
    cues: [
      'Hörst is explicit that a band alone is enough for warm-up, beginner training and rehab — not for building extensor strength.',
      'For strength, the wide pinch with wrist extension is the exercise.',
    ],
    safetyNotes: [],
    gtgEligible: false,
  },
  {
    id: 'radial-ulnar-deviation',
    name: 'Radial / Ulnar Deviation',
    category: 'antagonist',
    target: 'wrist',
    tiers: [
      { tier: 'pool', text: '2 x 15 per direction', prescribedSets: [2, 2], source: 'Wrist stabilizer training — standard practice, not separately cited' },
    ],
    isoType: 'dynamic',
    equipment: ['kettlebell'],
    summary: 'Side-to-side wrist loading — the plane neither curls nor hangs train.',
    howTo: [
      'Hold a hammer or light kettlebell with the forearm supported, wrist free.',
      'Tilt the hand toward the thumb side, then lower.',
      'Repeat toward the little-finger side.',
      '15 reps each direction, twice.',
    ],
    prescription: 'Pool: 2 x 15 per direction, light',
    cues: ['Forearm stays still — only the wrist moves.', 'Light load; this is a stabiliser.'],
    safetyNotes: [],
    gtgEligible: false,
  },
  {
    id: 'wrist-extension-extended',
    name: 'Wrist Extension — Extended Position',
    category: 'antagonist',
    target: 'wrist',
    tiers: [
      { tier: 'pool', text: '2 x 15, holding the extended position', prescribedSets: [2, 2], source: 'Hörst — training extensors in neutral AND extended positions' },
    ],
    isoType: 'dynamic',
    equipment: ['kettlebell'],
    summary: 'Wrist extension trained at the extended end — the position chicken-winging loads.',
    howTo: [
      'Support the forearm with the hand past the edge, palm down, holding a light weight.',
      'Extend the wrist and work the last part of the range rather than the middle.',
      'Lower under control.',
      '15 reps, twice.',
    ],
    prescription: 'Pool: 2 x 15 at the extended end of the range, light',
    cues: [
      'Extended, not neutral — Hörst names training both positions as the overlooked part.',
      'Wrist extension makes the finger flexors pull harder, which is why this protects the elbow.',
    ],
    safetyNotes: [],
    gtgEligible: false,
  },
  {
    id: 'hip-90-90',
    name: 'Hip 90-90 Rotation',
    category: 'lower-body',
    target: 'hip',
    tiers: [
      { tier: 'pool', text: '2 x 10 per side', prescribedSets: [2, 2], source: 'Heel-hook prevention — open the whole hip rather than the tibia alone' },
    ],
    isoType: 'dynamic',
    equipment: ['bodyweight'],
    summary: 'Seated hip rotation — the range that lets a heel hook come from the hip, not the knee.',
    howTo: [
      'Sit with one leg bent 90° in front and the other 90° out to the side.',
      'Rotate the knees to swap sides, keeping the chest tall.',
      'Move under control, pausing at the end of each range.',
      '10 per side, twice.',
    ],
    prescription: 'Pool: 2 x 10 per side, controlled',
    cues: [
      'Heel hooks that use only tibial external rotation load the knee; opening the whole hip puts bigger muscles on it.',
      'This is range with control, not a stretch to hang in.',
    ],
    safetyNotes: [],
    gtgEligible: false,
  },
  {
    id: 'stability-ball-hamstring-curl',
    name: 'Stability-Ball Hamstring Curl',
    category: 'lower-body',
    target: 'knee',
    tiers: [
      { tier: 'pool', text: '2 x 10', prescribedSets: [2, 2], source: 'Climbing Doctor — mimics the heel hook, adds hip and core stabilisation' },
    ],
    isoType: 'dynamic',
    equipment: ['bodyweight'],
    summary: 'Ball curl — the closest thing to a heel hook you can train on the floor.',
    howTo: [
      'Lie on your back with the heels on a stability ball, hips lifted.',
      'Curl the ball toward you by bending the knees, keeping the hips up.',
      'Extend back out under control.',
      '10 reps, twice.',
    ],
    prescription: 'Pool: 2 x 10, hips held up throughout',
    cues: [
      'Hips stay lifted — dropping them takes the hamstring out of it.',
      'This trains hamstring, hip and core together, which is the combination a heel hook uses.',
    ],
    safetyNotes: [],
    gtgEligible: false,
  },
  {
    id: 'calf-raise',
    name: 'Calf Raise — Straight and Bent Knee',
    category: 'lower-body',
    target: 'ankle',
    tiers: [
      { tier: 'pool', text: '2 x 15, straight and bent knee', prescribedSets: [2, 2], source: 'Proprioceptive review — balance plus strengthening beats either alone' },
    ],
    isoType: 'dynamic',
    equipment: ['bodyweight'],
    summary: 'Calf raises through full range — the strength half of ankle resilience.',
    howTo: [
      'Stand with the forefoot on a step, heels free.',
      'Lower the heels below the step, then rise fully.',
      'Straight knee for the gastrocnemius, bent knee for the soleus.',
      '15 reps, twice, each variation.',
    ],
    prescription: 'Pool: 2 x 15 straight knee, 2 x 15 bent knee, full range',
    cues: [
      'Full range both ways — the bottom is where the Achilles is loaded.',
      'The meta-analysis found balance plus strengthening most complete; this is the strengthening.',
    ],
    safetyNotes: [],
    gtgEligible: false,
  },
  {
    id: 'unstable-surface-balance',
    name: 'Unstable-Surface Balance',
    category: 'lower-body',
    target: 'ankle',
    tiers: [
      { tier: 'pool', text: '3 x 30s per side on a cushion or wobble board', holdSeconds: [30, 30], prescribedSets: [3, 3], source: 'Proprioceptive training meta-analysis (RR 0.65, NNT 17)' },
    ],
    isoType: 'none',
    equipment: ['bodyweight'],
    summary: 'Balance on an unstable surface — the harder end of the proprioceptive dose.',
    howTo: [
      'Stand on one leg on a cushion, folded mat or wobble board.',
      'Keep a soft knee and let the ankle work.',
      '30 seconds per side, three times each.',
      'Progress by adding a task, not by adding minutes.',
    ],
    prescription: 'Pool: 3 x 30s per side on an unstable surface',
    cues: [
      'A wobble board and eyes-closed on the floor are two ways to remove the same input — alternate rather than stack.',
    ],
    safetyNotes: [],
    gtgEligible: false,
  },
  {
    id: 'drop-landing',
    name: 'Drop Landing',
    category: 'lower-body',
    target: 'ankle',
    tiers: [
      { tier: 'pool', text: '2 x 5, low box', prescribedSets: [2, 2], source: 'Landing mechanics for bouldering falls — standard practice, not separately cited' },
    ],
    isoType: 'dynamic',
    equipment: ['bodyweight'],
    summary: 'Practised landings from a low box — bouldering falls are the ankle’s actual mechanism.',
    howTo: [
      'Step off a low box — knee height at most to begin.',
      'Land on both feet, forefoot first, and absorb through the ankles, knees and hips.',
      'Hold the landing still for a beat before standing up.',
      '5 landings, twice.',
    ],
    prescription: 'Pool: 2 x 5 from a low box, absorbing through the whole chain',
    cues: [
      'Quiet landings. Noise is force that went into the joint instead of the muscle.',
      'Height is the last thing to add — do not progress this until the landings are silent and still.',
    ],
    safetyNotes: [
      'Start knee-height at most. This is the one pool movement with an acute injury mechanism of its own.',
    ],
    gtgEligible: false,
  },
];
