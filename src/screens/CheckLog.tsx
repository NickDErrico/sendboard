import { useCallback, useEffect, useState } from 'react';
import type { Check, CheckKind } from '../types';
import { dateKey, getAllChecks, saveCheck } from '../lib/storage';
import { CHECK_KIND_LABELS, keyToLocalDate, summarizePastWeeks, weekEndKey } from '../lib/checks';
import { Icon, btnPrimary, btnSecondary, input } from '../components/ui';

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
    <div className="mx-auto max-w-md px-4 pb-24 pt-[54px]">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">Check log</h1>
        {onExit && (
          <button onClick={onExit} className="rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10">
            Done
          </button>
        )}
      </header>

      <button onClick={() => setShowForm((v) => !v)} className={`${btnSecondary} mb-4 w-full py-2`}>
        {showForm ? (
          'Cancel'
        ) : (
          <>
            <Icon name="plus" className="text-[13px]" />
            Add a check (incl. past days)
          </>
        )}
      </button>

      {showForm && (
        <div className="mb-5 space-y-3 rounded-md bg-surface shadow-edge p-3">
          <label className="block text-xs text-neutral-400">
            Type
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as CheckKind)}
              className={`${input} mt-1`}
            >
              {KIND_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-neutral-400">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${input} mt-1`}
            />
          </label>
          <label className="block text-xs text-neutral-400">
            Note (optional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
              className={`${input} mt-1`}
            />
          </label>
          <button
            onClick={() => void save()}
            disabled={!date}
            className={`${btnPrimary} w-full py-2`}
          >
            Save check
          </button>
        </div>
      )}

      {checks === null ? (
        <p className="text-[13px] text-neutral-400">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {weeks.map((w) => {
            const empty = !w.volume && !w.limit && w.gtgGeneralDays === 0 && w.gtgPullDays === 0;
            return (
              <li
                key={w.weekStartKey}
                className="rounded-md bg-surface shadow-edge p-3"
              >
                <p className="text-[13px] font-medium text-neutral-200">
                  {fmt(w.weekStartKey)} – {fmt(weekEndKey(w.weekStartKey))}
                </p>
                {empty ? (
                  <p className="mt-1 text-xs text-neutral-500">No checks this week</p>
                ) : (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span
                      className={`flex items-center gap-1 ${w.volume ? 'text-accent-300' : 'text-neutral-500'}`}
                    >
                      <Mark done={w.volume} /> Volume
                    </span>
                    <span
                      className={`flex items-center gap-1 ${w.limit ? 'text-accent-300' : 'text-neutral-500'}`}
                    >
                      <Mark done={w.limit} /> Limit
                    </span>
                    <span className="text-neutral-400">GtG general: {w.gtgGeneralDays}d</span>
                    <span className="text-neutral-400">GtG pull: {w.gtgPullDays}d</span>
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

/** The done / not-done marker used inline in a text run. */
function Mark({ done }: { done: boolean }) {
  return (
    <Icon
      name={done ? 'check' : 'circle'}
      className={`text-[11px] ${done ? '' : 'text-neutral-600'}`}
    />
  );
}
