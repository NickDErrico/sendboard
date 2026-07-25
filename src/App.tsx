import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Routine } from './types';
import { getAllLogs, getRoutine, getSettings, saveSettings } from './lib/storage';
import { go, useRoute, type Route } from './lib/routes';
import { Home } from './screens/Home';
import { ExerciseList } from './screens/ExerciseList';
import { RoutineList } from './screens/RoutineList';
import { RoutineDetail } from './screens/RoutineDetail';
import { ActiveSession } from './screens/ActiveSession';
import { History } from './screens/History';
import { Settings } from './screens/Settings';
import { InstallGuide } from './screens/InstallGuide';
import { CheckLog } from './screens/CheckLog';
import { WeekStatus } from './components/WeekStatus';
import { DailyGtgStatus } from './components/DailyGtgStatus';
import { TabBar } from './components/TabBar';

// The tab bar is hidden on immersive/transient screens (active logging, the
// focused routine start, the install guide, and not-found), which carry their
// own back/done affordances.
const NO_TAB_BAR = new Set(['session', 'routine', 'install', 'notFound']);

// T6 introduced hash routing (src/lib/routes.ts); T8 adds the real Home, the tab
// bar, and first-run install onboarding. This component is the route table.
export default function App() {
  const route = useRoute();
  const onboarding = useInstallOnboarding();

  // First open in a browser (not the installed PWA), not yet dismissed → show the
  // install guide once (AC3). Overlays the app so it can't be routed past.
  if (onboarding.show) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-bg">
        <InstallGuide ctaLabel="Got it" onCta={() => void onboarding.dismiss()} />
      </div>
    );
  }

  return (
    <>
      {renderRoute(route)}
      {!NO_TAB_BAR.has(route.name) && <TabBar />}
    </>
  );
}

function renderRoute(route: Route): ReactNode {
  switch (route.name) {
    case 'exercises':
      return <ExerciseList onExit={() => go({ name: 'home' })} />;
    case 'routines':
      return (
        <RoutineList
          onOpenSession={() => go({ name: 'session' })}
          onExit={() => go({ name: 'home' })}
        />
      );
    case 'routine':
      return <RoutineStartRoute routineId={route.routineId} />;
    case 'session':
      return <SessionRoute />;
    case 'history':
      return <History onResume={() => go({ name: 'session' })} onExit={() => go({ name: 'home' })} />;
    case 'checks':
      return <ChecksRoute />;
    case 'checklog':
      return <CheckLog onExit={() => go({ name: 'checks' })} />;
    case 'settings':
      return (
        <Settings
          onExit={() => go({ name: 'home' })}
          onOpenInstallGuide={() => go({ name: 'install' })}
        />
      );
    case 'install':
      return <InstallGuide ctaLabel="Back" onCta={() => go({ name: 'settings' })} />;
    case 'notFound':
      return <NotFound path={route.path} />;
    case 'home':
    default:
      return <Home />;
  }
}

// ─── Install onboarding ──────────────────────────────────────────────────────

function useInstallOnboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    void (async () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        // iOS Safari exposes standalone here rather than via display-mode.
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (standalone) return;
      const settings = await getSettings();
      if (!settings.installGuideDismissed) setShow(true);
    })();
  }, []);

  async function dismiss() {
    const settings = await getSettings();
    await saveSettings({ ...settings, installGuideDismissed: true });
    setShow(false);
  }

  return { show, dismiss };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

function SessionRoute() {
  // Relies on the single-in-progress-log invariant (enforced in RoutineList):
  // there is at most one log with completedAt === null. Resolve it and hand its
  // id to ActiveSession; if none exists (already finished), fall back home.
  const [logId, setLogId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    void (async () => {
      const logs = await getAllLogs();
      setLogId(logs.find((l) => l.completedAt === null)?.id ?? null);
    })();
  }, []);
  useEffect(() => {
    if (logId === null) go({ name: 'home' });
  }, [logId]);

  if (logId === undefined || logId === null) {
    return <CenteredNote>Loading…</CenteredNote>;
  }
  return <ActiveSession logId={logId} onFinish={() => go({ name: 'home' })} />;
}

function RoutineStartRoute({ routineId }: { routineId: string }) {
  // Resolves the id and owns the not-found decision; the screen itself is
  // RoutineDetail (T9), which lists the exercises and handles start/resume.
  const [routine, setRoutine] = useState<Routine | null | undefined>(undefined);

  useEffect(() => {
    void (async () => setRoutine((await getRoutine(routineId)) ?? null))();
  }, [routineId]);

  if (routine === undefined) return <CenteredNote>Loading…</CenteredNote>;
  if (routine === null) return <NotFound path={`/routine/${routineId}`} />;
  return <RoutineDetail routine={routine} />;
}

function ChecksRoute() {
  return (
    <div className="mx-auto max-w-md space-y-3 p-4 pb-24">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Check-offs</h1>
        <button
          onClick={() => go({ name: 'home' })}
          className="rounded px-1 py-1 text-sm text-slate-400 hover:text-slate-200"
        >
          Done
        </button>
      </header>
      <WeekStatus />
      <DailyGtgStatus />
      <button
        onClick={() => go({ name: 'checklog' })}
        className="w-full rounded-lg border border-slate-700 bg-brand-surface px-4 py-2 text-sm font-semibold text-slate-200"
      >
        View check log
      </button>
    </div>
  );
}

function NotFound({ path }: { path: string }) {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-slate-100">Page not found</h1>
      <p className="text-sm text-slate-400">
        Nothing lives at <span className="font-mono text-slate-300">{path}</span>.
      </p>
      <button
        onClick={() => go({ name: 'home' })}
        className="rounded-lg bg-brand-accent px-4 py-2 font-semibold text-brand-bg"
      >
        Go home
      </button>
    </main>
  );
}

function CenteredNote({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-full max-w-md items-center justify-center p-6">
      <p className="text-sm text-slate-400">{children}</p>
    </main>
  );
}
