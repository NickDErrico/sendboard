# Sendboard

A personal, installable PWA for a single climber following the 8-week
overcoming-isometrics training block in [`docs/training-plan.md`](docs/training-plan.md).
It answers three questions: *what am I training today*, *how do I do this exercise*,
and *what did I actually do*. 100% on-device (IndexedDB), no backend, no accounts.

The full build specification and its decision log live in
[`climbing-app-spec.md`](climbing-app-spec.md) — that file is the source of truth.

## Status

Scaffold (T1): installable, auto-deploying PWA shell. Feature tasks T2–T8 follow.

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

> **Reminders:** the app intentionally has no reminder feature (spec decision D2a).
> Scheduling lives in an external repeating iPhone alarm or a Todoist recurring task.
> The reminder-setup steps and deep-link URLs will be documented here in task T6.

## Regenerating icons

```bash
node scripts/generate-icons.mjs
```
