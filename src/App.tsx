import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Routine } from './types';
import { getAllLogs, getRoutine, getSettings, saveSettings } from './lib/storage';
import { requestPersistence } from './lib/persistence';
import { go, useRoute, type Route } from './lib/routes';
import { Today } from './screens/Today';
import { RoutineList } from './screens/RoutineList';
import { RoutineDetail } from './screens/RoutineDetail';
import { ActiveSession } from './screens/ActiveSession';
import { History } from './screens/History';
import { Retest } from './screens/Retest';
import { Block } from './screens/Block';
import { Poster } from './screens/Poster';
import { Source } from './screens/Source';
import { Settings } from './screens/Settings';
import { InstallGuide } from './screens/InstallGuide';
import { CheckLog } from './screens/CheckLog';
import { GtgToday } from './screens/GtgToday';
import { TierDetail } from './screens/TierDetail';
import { HeavyTier } from './screens/HeavyTier';
import { Signals } from './screens/Signals';
import { Library } from './screens/Library';
import { LaneLibrary } from './screens/LaneLibrary';
import { TabBar } from './components/TabBar';
import { btnGhost, btnPrimary } from './components/ui';
import { storageFailureMessage } from './lib/storageFailure';

// The tab bar is hidden on immersive/transient screens (active logging, the
// focused routine start, the install guide, and not-found), which carry their
// own back/done affordances.
const NO_TAB_BAR = new Set(['session', 'routine', 'install', 'notFound']);

// T6 introduced hash routing (src/lib/routes.ts); T8 added the Home that T36
// replaced with Today, the tab bar, and first-run install onboarding. T37 split
// `#/joints` into per-tier screens and took the tabs to four. This is the route
// table.
export default function App() {
  const route = useRoute();
  const onboarding = useInstallOnboarding();
  const { failure, dismissFailure } = useStorageFailure();

  // T13 AC1: ask to be moved out of the browser's best-effort storage bucket, on
  // every launch — a denial is not permanent, and the browser is more willing
  // once the app is installed and used. The result is reported in Settings;
  // nothing here depends on the answer, and D5's export is still the real backup.
  useEffect(() => {
    void requestPersistence();
  }, []);

  // First open in a browser (not the installed PWA), not yet dismissed → show the
  // install guide once (AC3). Overlays the app so it can't be routed past.
  if (onboarding.show) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
        <InstallGuide ctaLabel="Got it" onCta={() => void onboarding.dismiss()} />
      </div>
    );
  }

  return (
    <>
      {failure !== null && (
        <div
          role="alert"
          className="sticky top-0 z-40 flex items-start gap-3 bg-surface px-4 py-3 text-sm text-warn"
        >
          <span className="flex-1">{failure}</span>
          <button type="button" className={btnGhost} onClick={dismissFailure}>
            Dismiss
          </button>
        </div>
      )}
      {renderRoute(route)}
      {!NO_TAB_BAR.has(route.name) && <TabBar />}
    </>
  );
}

/**
 * Surfaces a failed storage operation, wherever in the app it came from.
 *
 * Listening for the rejection rather than guarding each call site is deliberate.
 * There are 23 write calls across the screens and none of them caught anything;
 * every one is either fire-and-forget (`void saveLog(next)`) or an unawaited
 * async handler, so all of them arrive here. A guard added at 23 sites is also a
 * guard that the 24th site forgets, and this is the failure the app can least
 * afford to miss.
 *
 * The rejection is deliberately *not* marked handled: it still reaches the
 * console for debugging. This only adds the half the owner can see. Anything
 * that is not a `StorageError` is left entirely alone — see `storageFailure.ts`.
 */
function useStorageFailure(): { failure: string | null; dismissFailure: () => void } {
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      const message = storageFailureMessage(event.reason);
      if (message !== null) setFailure(message);
    };
    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, []);
  return { failure, dismissFailure: () => setFailure(null) };
}

function renderRoute(route: Route): ReactNode {
  switch (route.name) {
    case 'routines':
      return (
        <RoutineList
          onOpenSession={() => go({ name: 'session' })}
          onExit={() => go({ name: 'today' })}
        />
      );
    case 'routine':
      return <RoutineStartRoute routineId={route.routineId} />;
    case 'session':
      return <SessionRoute />;
    case 'history':
      return <History onResume={() => go({ name: 'session' })} onExit={() => go({ name: 'today' })} />;
    case 'block':
      return <Block onExit={() => go({ name: 'tier', tier: 'heavy' })} />;
    case 'poster':
      return <Poster onExit={() => go({ name: 'block' })} />;
    case 'retest':
      return <Retest onExit={() => go({ name: 'tier', tier: 'heavy' })} />;
    case 'source':
      return (
        <Source
          key={`${route.sourceId}:${route.sectionRef ?? 'all'}`}
          sourceId={route.sourceId}
          initialRef={route.sectionRef}
          onExit={() => go({ name: 'library', lane: null })}
        />
      );
    case 'checklog':
      return <CheckLog onExit={() => go({ name: 'history' })} />;
    case 'gtg':
      return <GtgToday onExit={() => go({ name: 'today' })} />;
    case 'library':
      return route.lane === null ? (
        <Library />
      ) : (
        <LaneLibrary key={route.lane} lane={route.lane} />
      );
    case 'tier':
      // The one branch T38 allows: the heavy tier is routines, a block and a
      // battery, not slots, so it gets its own component rather than a third
      // shape inside the one that renders `SlotStatus[]`.
      return route.tier === 'heavy' ? (
        <HeavyTier />
      ) : (
        <TierDetail key={route.tier} tier={route.tier} />
      );
    case 'signals':
      return <Signals />;
    case 'settings':
      return (
        <Settings
          onExit={() => go({ name: 'today' })}
          onOpenInstallGuide={() => go({ name: 'install' })}
        />
      );
    case 'install':
      return <InstallGuide ctaLabel="Back" onCta={() => go({ name: 'settings' })} />;
    case 'notFound':
      return <NotFound path={route.path} />;
    case 'today':
    default:
      return <Today />;
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
  // Relies on the single-open-log invariant (`startSession` sweeps, every exit
  // path cleans up after itself): there is at most one log with completedAt ===
  // null. Resolve it and hand its id to ActiveSession; if none exists (already
  // finished), fall back home.
  //
  // Deliberately *not* `resumable`: D46 governs which sessions are offered on
  // the screens that ask, and the log a Start tap just created is unstarted by
  // definition. Filtering it out here would refuse to open the session the tap
  // opened.
  const [logId, setLogId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    void (async () => {
      const logs = await getAllLogs();
      setLogId(logs.find((l) => l.completedAt === null)?.id ?? null);
    })();
  }, []);
  useEffect(() => {
    if (logId === null) go({ name: 'today' });
  }, [logId]);

  if (logId === undefined || logId === null) {
    return <CenteredNote>Loading…</CenteredNote>;
  }
  return <ActiveSession logId={logId} onFinish={() => go({ name: 'today' })} />;
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

function NotFound({ path }: { path: string }) {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-[22px] font-medium tracking-[-0.02em]">Page not found</h1>
      <p className="text-[13px] text-neutral-500">
        Nothing lives at <span className="text-neutral-300">{path}</span>.
      </p>
      <button onClick={() => go({ name: 'today' })} className={`${btnPrimary} px-4 py-2`}>
        Go home
      </button>
    </main>
  );
}

function CenteredNote({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-full max-w-md items-center justify-center p-6">
      <p className="text-[13px] text-neutral-500">{children}</p>
    </main>
  );
}
