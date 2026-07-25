import { useCallback, useEffect, useState } from 'react';
import type { BodyweightEntry } from '../types';
import { dateKey, getAllBodyweights, saveBodyweight } from '../lib/storage';
import { describeAge, latestBodyweight, parseBodyweight } from '../lib/bodyweight';
import { daysBetween } from '../lib/rotation';

// T15: the bodyweight capture surface, shaped like the check cards beside it.
//
// It reports and invites; it never prompts, chases, or judges (D23, D24). There
// is no target, no delta from last time, no "you haven't weighed in for a while"
// — §4E wants this number recorded next to added load, and nothing in the plan
// asks the app to have a view about the number itself.

export function BodyweightCard() {
  const [entries, setEntries] = useState<BodyweightEntry[] | null>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(async () => {
    setEntries(await getAllBodyweights());
  }, []);

  // Reloads on refocus like the other home cards, so a value entered in another
  // tab (or a day rolling over) is reflected without a reload.
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

  const latest = latestBodyweight(entries ?? []);
  const parsed = parseBodyweight(draft);

  async function save() {
    if (parsed === null) return;
    // Keyed by today's local day, so saving twice in one day corrects rather than
    // accumulates (D24) — the same reason storage keys the store by `date`.
    await saveBodyweight({ date: dateKey(new Date()), lb: parsed });
    setDraft('');
    setEditing(false);
    await refresh();
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-brand-surface p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Bodyweight
      </h2>

      {!editing ? (
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 text-sm text-slate-300">
            {latest === null ? (
              // An invitation, not a nag: it states what the number is for.
              <span className="text-slate-400">
                Not recorded. Added load only compares against a known bodyweight (§4E).
              </span>
            ) : (
              <>
                <span className="font-semibold text-slate-100">{latest.lb} lb</span>{' '}
                <span className="text-xs text-slate-500">
                  · {describeAge(daysBetween(latest.date, new Date()))}
                </span>
              </>
            )}
          </p>
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-200"
          >
            {latest === null ? 'Record' : 'Update'}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save();
            }}
            inputMode="decimal"
            autoFocus
            placeholder={latest === null ? 'lb' : String(latest.lb)}
            aria-label="Bodyweight in pounds"
            className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-accent focus:outline-none"
          />
          <button
            onClick={() => void save()}
            disabled={parsed === null}
            className="shrink-0 rounded-lg bg-brand-accent px-3 py-1.5 text-sm font-semibold text-brand-bg disabled:opacity-40"
          >
            Save
          </button>
          <button
            onClick={() => {
              setDraft('');
              setEditing(false);
            }}
            className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-slate-400"
          >
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}
