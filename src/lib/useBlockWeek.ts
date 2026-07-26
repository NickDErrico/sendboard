import { useEffect, useState } from 'react';
import { blockPosition } from './block';
import { getAllLogs, getAllRoutines, getSettings } from './storage';

/**
 * The derived block week, or null while loading and where nothing is logged (T24).
 *
 * Exists so `ExerciseDetail` — rendered from the catalog list, the routine
 * preview, and mid-session — keeps its existing props and stays presentational,
 * the same reason `ExerciseProgress` loads its own logs. Null is a real answer and
 * renders as "no week known": every variant readable, none emphasised (AC9).
 *
 * `ActiveSession` deliberately does *not* use this: it already holds the log, the
 * routines and the settings, and its label has to count the session in progress,
 * which needs the log this hook does not have.
 */
export function useBlockWeek(): number | null {
  const [week, setWeek] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [logs, routines, settings] = await Promise.all([
        getAllLogs(),
        getAllRoutines(),
        getSettings(),
      ]);
      if (cancelled) return;
      setWeek(blockPosition({ logs, routines, settings, today: new Date() })?.week ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return week;
}
