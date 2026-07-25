# Sendboard

A personal, installable PWA for a single climber following the 8-week
overcoming-isometrics training block in [`docs/training-plan.md`](docs/training-plan.md).
It answers three questions: *what am I training today*, *how do I do this exercise*,
and *what did I actually do*. 100% on-device (IndexedDB), no backend, no accounts.

The full build specification and its decision log live in
[`climbing-app-spec.md`](climbing-app-spec.md) — that file is the source of truth.

## Status

Feature-complete (T1–T12): data layer, exercise browsing, session logging, history,
climbing/GtG check-offs, settings with JSON backup export/import, hash routing, a
home + tab-bar navigation shell, install onboarding, routine rotation with preview and
per-exercise completion, an in-session hold + rest timer, last-time carry-forward, and
per-exercise progress charts.

Remaining is the on-device acceptance pass: export/import on iOS Safari (T7), the T8
criterion-5 walkthrough, and four things that can only be confirmed on the phone —
beep audibility with the ringer off, screen wake-lock acquisition, a real
background/resume cycle mid-interval, and whether persistent storage is granted once
installed.

## Updating — do not delete the app

**Never delete Sendboard to pick up a new build.** That erases the log with it, and it
isn't necessary: the service worker updates itself (`registerType: 'autoUpdate'`).

Close Sendboard and reopen it twice, then check the **Build** timestamp at the top of
Settings — that's how you confirm an update landed. It changes with every deploy, which
`v0.1.0` never did.

Settings also reports whether the browser granted **persistent storage**, which asks it
not to evict your log under storage pressure. That's a request, not a guarantee, and it
doesn't survive deleting the app or clearing website data — so export a backup at the
end of each block regardless.

## Timing a session

Exercises the training plan gives a duration for carry a **Start hold** control during
a session. The hold counts *up* with its target range banded — 7–10s reads amber below
7s and green inside the range — and **ends itself at the top of the range**, sounding a
long low tone so you can hang with your eyes shut. It then starts the prescribed rest
in the same transition and offers to log the duration as a set, with last session's
load carried forward. Stopping early is always available and records what actually
elapsed; only the auto-stop records the prescribed figure.

Rest ending plays three short high tones — deliberately unlike the hold cue, so "stop
pulling" and "start pulling" can't be confused.

If you hear nothing, check **Settings → Test sound** first. On iOS the ringer switch
silences web audio unless the app claims a playback session, which Sendboard does.
Two limits remain: iOS suspends a backgrounded PWA, so cues only fire while Sendboard
is on screen (hence the screen wake lock during a session), and a force-quit discards a
running timer. The countdown is computed from wall-clock instants, so backgrounding and
returning never makes it drift.

## Progress charts

Three exercises are charted: both max hangs and the weighted lock-off. Those are the
ones the training plan actually progresses — §4B and §4E rule out measuring PIMA
numerically, §8 says keep greasing-the-groove pull-ups trivial, and warm-ups and prehab
aren't progressed at all. On those three, the set logger takes numbers (edge mm, added
lb, hold s) instead of free text, and hold time fills itself in from the timer.

Switch between **Time**, **Load**, and **Edge** on the exercise's detail screen. Time
and load are **cut into a separate segment for each edge you were on** — rebuilding
hold time after dropping to a smaller edge is progress, not a setback, and one
continuous line would draw it as the latter. Edge gets its own view where a smaller
edge sits higher.

The chart reports and never judges: no trendline, no projection, no personal-best
badge, no improving-or-declining verdict. §4E's interpretation rubric is yours to
apply, and §7 treats a falling line as a reason to deload.

Note that bodyweight isn't tracked, so an added-load line only compares cleanly against
a stable bodyweight — §4E records both together for that reason.

## Stack

Vite · React · TypeScript · Tailwind CSS · `vite-plugin-pwa` · `idb`.
Deployed to GitHub Pages from `main` via GitHub Actions.

## Develop

```bash
npm install
npm run dev        # local dev server
npm run build      # type-check + production build
npm run preview    # serve the production build locally
npm run test       # Vitest
npm run lint       # ESLint
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes `dist/` to GitHub Pages. The app is served from the `/sendboard/`
subpath — `base` in [`vite.config.ts`](vite.config.ts) must match the repo name.

Live URL: https://nickderrico.github.io/sendboard/

## Reminders

The app has **no built-in reminders** (spec decision D2a), and none is coming: iOS
Safari cannot fire notifications from an installed PWA, and no external trigger can
open the installed app directly (the T0 spike in
[`climbing-app-spec.md`](climbing-app-spec.md) confirmed this on device). So the
*timing* lives in a tool you already have, and you open Sendboard by tapping its
home-screen icon. Pick either option:

**Option A — repeating iPhone alarm**

1. Open the Clock app → **Alarms** → **+**.
2. Set your training time; under **Repeat**, choose your training days.
3. Label it "Sendboard — train" so the alarm text names the task.
4. When it goes off, tap the **Sendboard** icon on your home screen.

**Option B — Todoist recurring task**

1. Create a task "Sendboard training" with a recurring due date (e.g. `every Mon, Wed, Fri, Sat`).
2. Turn on Todoist's reminder for the task's due time.
3. When the reminder fires, tap the **Sendboard** icon on your home screen.

> There is deliberately **no deep-link URL** to paste into the alarm or task. On iOS
> an `https` URL opens Safari — a separate storage context from the installed app —
> which would split your logged data across two stores. Tapping the installed icon is
> the only reliable way in.

## Regenerating icons

```bash
node scripts/generate-icons.mjs
```
