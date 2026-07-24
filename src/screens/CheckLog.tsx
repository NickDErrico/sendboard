import { useCallback, useEffect, useState } from 'react';
import type { Check, CheckKind } from '../types';
import { dateKey, getAllChecks, saveCheck } from '../lib/storage';
import { CHECK_KIND_LABELS, keyToLocalDate, summarizePastWeeks, weekEndKey } from '../lib/checks';

const KIND_OPTIONS = Object.entries(CHECK_KIND_LABELS) as [CheckKind, string][];

function fmt(key: string): string {
  return keyToLocalDate(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function CheckLog({ onExit }: { onExit?: () => void }) {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<CheckKind>('climbing-volume');
  const [date, setDate] = useState(dateKey(new Date()));
  const [note, setNote] = useState('');

  const refresh = useCallback(async () => {
    setChecks(await getAllChecks());
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function save() {
    await saveCheck({ id: crypto.randomUUID(), kind, date, notes: note.trim() });
    setShowForm(false);
    setNote('');
    setDate(dateKey(new Date()));
    setKind('climbing-volume');
    await refresh();
  }

  const weeks = checks ? summarizePastWeeks(checks, new Date()) : [];

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Check log</h1>
        {onExit && (
          <button onClick={onExit} className="rounded px-1 py-1 text-sm text-slate-400 hover:text-slate-200">
            Done
          </button>
        )}
      </header>

      <button
        onClick={() => setShowForm((v) => !v)}
        className="mb-4 w-full rounded-lg border border-slate-700 bg-brand-surface px-4 py-2 text-sm font-semibold text-slate-200"
      >
        {showForm ? 'Cancel' : '+ Add a check (incl. past days)'}
      </button>

      {showForm && (
        <div className="mb-5 space-y-3 rounded-xl border border-slate-700 bg-brand-surface p-3">
          <label className="block text-xs text-slate-400">
            Type
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as CheckKind)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {KIND_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Note (optional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </label>
          <button
            onClick={() => void save()}
            disabled={!date}
            className="w-full rounded-lg bg-brand-accent px-4 py-2 font-semibold text-brand-bg disabled:opacity-50"
          >
            Save check
          </button>
        </div>
      )}

      {checks === null ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {weeks.map((w) => {
            const empty = !w.volume && !w.limit && w.gtgGeneralDays === 0 && w.gtgPullDays === 0;
            return (
              <li
                key={w.weekStartKey}
                className="rounded-xl border border-slate-700 bg-brand-surface p-3"
              >
                <p className="text-sm font-semibold text-slate-200">
                  {fmt(w.weekStartKey)} – {fmt(weekEndKey(w.weekStartKey))}
                </p>
                {empty ? (
                  <p className="mt-1 text-xs text-slate-500">No checks this week</p>
                ) : (
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span className={w.volume ? 'text-emerald-300' : 'text-slate-500'}>
                      {w.volume ? '✓' : '○'} Volume
                    </span>
                    <span className={w.limit ? 'text-emerald-300' : 'text-slate-500'}>
                      {w.limit ? '✓' : '○'} Limit
                    </span>
                    <span className="text-slate-400">GtG general: {w.gtgGeneralDays}d</span>
                    <span className="text-slate-400">GtG pull: {w.gtgPullDays}d</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
