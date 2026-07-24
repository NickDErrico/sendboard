import { useCallback, useEffect, useState } from 'react';
import type { Check } from '../types';
import { dateKey, deleteCheck, getAllChecks, getChecksForDay, saveCheck } from '../lib/storage';
import { dailyGtgStatus, last7DayGtgCounts } from '../lib/checks';

type GtgKind = 'gtg-general' | 'gtg-pull';

export function DailyGtgStatus() {
  const [today, setToday] = useState<Check[] | null>(null);
  const [all, setAll] = useState<Check[]>([]);

  // Reads use `new Date()` each time, so leaving the app open across midnight and
  // refocusing rolls the day over (edge case) rather than showing yesterday.
  const refresh = useCallback(async () => {
    const [dayChecks, allChecks] = await Promise.all([getChecksForDay(new Date()), getAllChecks()]);
    setToday(dayChecks);
    setAll(allChecks);
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

  const status = dailyGtgStatus(today ?? []);
  const counts = last7DayGtgCounts(all, new Date());

  async function toggle(kind: GtgKind) {
    const existing = (today ?? []).filter((c) => c.kind === kind);
    if (existing.length > 0) {
      if (window.confirm('Remove today’s check?')) {
        await Promise.all(existing.map((c) => deleteCheck(c.id)));
        await refresh();
      }
    } else {
      await saveCheck({ id: crypto.randomUUID(), kind, date: dateKey(new Date()), notes: '' });
      await refresh();
    }
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-brand-surface p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Today’s GtG</h2>
      <div className="grid grid-cols-2 gap-2">
        <Tile
          label="General"
          done={status.general}
          count={counts.general}
          onClick={() => void toggle('gtg-general')}
        />
        <Tile label="Pull" done={status.pull} count={counts.pull} onClick={() => void toggle('gtg-pull')} />
      </div>
    </section>
  );
}

function Tile({
  label,
  done,
  count,
  onClick,
}: {
  label: string;
  done: boolean;
  count: number;
  onClick: () => void;
}) {
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
      <span className="text-xs text-slate-500">{count}/7 days</span>
    </button>
  );
}
