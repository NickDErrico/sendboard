# Sendboard

A personal, installable PWA for a single climber following the 8-week
overcoming-isometrics training block in [`docs/training-plan.md`](docs/training-plan.md).
It answers three questions: *what am I training today*, *how do I do this exercise*,
and *what did I actually do*. 100% on-device (IndexedDB), no backend, no accounts.

The full build specification and its decision log live in
[`climbing-app-spec.md`](climbing-app-spec.md) — that file is the source of truth.

## Status

Feature-complete (T1–T11): data layer, exercise browsing, session logging, history,
climbing/GtG check-offs, settings with JSON backup export/import, hash routing, a
home + tab-bar navigation shell, install onboarding, routine rotation with preview and
per-exercise completion, an in-session hold + rest timer, and last-time carry-forward.

Remaining is the on-device acceptance pass (T0 48h storage gate, T7 export/import on
iOS Safari, T8 criterion-5 walkthrough) — plus three items T10 could not verify off
the device: rest-complete beep audibility, screen wake-lock acquisition, and a real
background/resume cycle mid-interval.

## Timing a session

Exercises the training plan gives a duration for carry a **Start hold** control during
a session. The hold counts *up* with its target range banded — 7–10s reads amber below
7s, green inside the range, and keeps counting past 10s rather than stopping itself,
because the plan prescribes ranges and you decide when to drop off. Stopping measures
the hold, starts its prescribed rest in the same tap, and offers to log the measured
duration as a set with last session's load carried forward.

Two platform limits worth knowing: iOS suspends a backgrounded PWA, so the
rest-complete beep only fires while Sendboard is on screen (the app holds a screen wake
lock during a session for that reason), and a force-quit discards a running timer. The
countdown itself is computed from wall-clock instants, so backgrounding and returning
never makes it drift.

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
