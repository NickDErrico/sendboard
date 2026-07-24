import { useCallback, useEffect, useState } from 'react';
import type { Check } from '../types';
import { dateKey, deleteCheck, getChecksForWeek, mondayOf, saveCheck } from '../lib/storage';
import { keyToLocalDate, weekClimbingStatus, weekEndKey } from '../lib/checks';

type ClimbingKind = 'climbing-volume' | 'climbing-limit';

function fmt(key: string): string {
  return keyToLocalDate(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function WeekStatus() {
  const [checks, setChecks] = useState<Check[] | null>(null);

  // Recomputed from `new Date()` on every refresh so the week rolls over correctly.
  const refresh = useCallback(async () => {
    setChecks(await getChecksForWeek(new Date()));
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refresh]);

  const status = weekClimbingStatus(checks ?? []);
  const mondayKey = dateKey(mondayOf(new Date()));

  async function toggle(kind: ClimbingKind) {
    const existing = (checks ?? []).filter((c) => c.kind === kind);
    if (existing.length > 0) {
      if (window.confirm('Remove this check for the week?')) {
        await Promise.all(existing.map((c) => deleteCheck(c.id)));
        await refresh();
      }
    } else {
      await saveCheck({ id: crypto.randomUUID(), kind, date: dateKey(new Date()), notes: '' });
      await refresh();
    }
  }

  return (
    <section
      className={`rounded-xl border p-3 ${
        status.complete ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 bg-brand-surface'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          This week · {fmt(mondayKey)}–{fmt(weekEndKey(mondayKey))}
        </h2>
        {status.complete && (
          <span className="text-xs font-semibold text-emerald-300">✓ Week complete</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Tile label="Volume day" done={status.volume} onClick={() => void toggle('climbing-volume')} />
        <Tile label="Limit day" done={status.limit} onClick={() => void toggle('climbing-limit')} />
      </div>
    </section>
  );
}

function Tile({ label, done, onClick }: { label: string; done: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={done}
      className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
        done
          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100'
          : 'border-slate-700 bg-slate-800 text-slate-300'
      }`}
    >
      <span className="text-lg" aria-hidden>
        {done ? '✓' : '○'}
      </span>
      <span className="mt-1 text-sm font-medium">{label}</span>
      <span className="text-xs text-slate-500">{done ? 'Done — tap to undo' : 'Tap to mark done'}</span>
    </button>
  );
}
