import { useCallback, useEffect, useState } from 'react';
import type { BodyweightEntry } from '../types';
import { dateKey, getAllBodyweights, saveBodyweight } from '../lib/storage';
import { describeAge, latestBodyweight, parseBodyweight } from '../lib/bodyweight';
import { daysBetween } from '../lib/rotation';
import { Icon, btnGhost, btnPrimary, btnSecondary, input, row } from './ui';

// T15: the bodyweight capture surface.
//
// It reports and invites; it never prompts, chases, or judges (D23, D24). There
// is no target, no delta from last time, no "you haven't weighed in for a while"
// — §4E wants this number recorded next to added load, and nothing in the plan
// asks the app to have a view about the number itself.
//
// Nocturne demoted it from a card to a row in Home's read list, alongside the
// two other things you read rather than do. It keeps its Update button, because
// it is the one row there that is also a thing you can act on.

export function BodyweightRow() {
  const [entries, setEntries] = useState<BodyweightEntry[] | null>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(async () => {
    setEntries(await getAllBodyweights());
  }, []);

  // Reloads on refocus like the rest of Home, so a value entered in another tab
  // (or a day rolling over) is reflected without a reload.
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

  if (editing) {
    return (
      <div className={`${row} hover:bg-transparent`}>
        <Icon name="scales" className="shrink-0 text-[17px] text-neutral-500" />
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
          className={`${input} min-w-0 flex-1`}
        />
        <button onClick={() => void save()} disabled={parsed === null} className={`${btnPrimary} shrink-0`}>
          Save
        </button>
        <button
          onClick={() => {
            setDraft('');
            setEditing(false);
          }}
          className={`${btnGhost} shrink-0 !text-neutral-500`}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className={`${row} hover:bg-transparent`}>
      <Icon name="scales" className="shrink-0 text-[17px] text-neutral-500" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">Bodyweight</p>
        <p className="text-[11px] leading-snug text-neutral-500">
          {latest === null ? (
            // An invitation, not a nag: it states what the number is for.
            'Not recorded. Added load only compares against a known bodyweight (§4E).'
          ) : (
            <>
              <span className="tabular-nums text-neutral-300">{latest.lb} lb</span> ·{' '}
              {describeAge(daysBetween(latest.date, new Date()))}
            </>
          )}
        </p>
      </div>
      <button onClick={() => setEditing(true)} className={`${btnSecondary} shrink-0 px-2.5 py-1 text-xs`}>
        {latest === null ? 'Record' : 'Update'}
      </button>
    </div>
  );
}
