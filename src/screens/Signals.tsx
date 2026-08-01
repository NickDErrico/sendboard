import { useCallback, useEffect, useState } from 'react';
import type { Check, SymptomKind } from '../types';
import { dateKey, deleteCheck, getAllChecks, saveCheck } from '../lib/storage';
import { SYMPTOM_KINDS, SYMPTOM_SIGNALS, activeSymptoms } from '../lib/symptoms';
import { go } from '../lib/routes';
import { Icon, card, kicker } from '../components/ui';

/**
 * The plan's stop signals, on a route of their own (T37).
 *
 * These lived on `#/joints`, under the joint rotation, and that was the wrong
 * home for them — which only became visible once the tiers got screens. A signal
 * does not belong to a tier: §8 puts full pull-ups first out and the scapular
 * work second at any elbow or shoulder symptom, and §10D drops the day's second
 * abrahang session when stiffness will not clear. Those responses reach across
 * the collagen tier, the pool and the heavy work at once, so filing the input
 * under one tier made a rule that governs all of them reachable from one.
 *
 * It is reached from Today, beside the lanes rather than inside one — the same
 * argument D47 makes about the tiers, applied to the thing that overrides them.
 *
 * Recording is one tap and clearing confirms, both unchanged from `#/joints`.
 * Nothing here expires a signal: the plan gives no duration for any of these
 * readings, and an app that quietly decided an elbow had stopped hurting after
 * seven days would be inventing the one number that matters.
 */

export function Signals() {
  const [checks, setChecks] = useState<Check[] | null>(null);

  const refresh = useCallback(async () => {
    setChecks(await getAllChecks());
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

  const symptoms = activeSymptoms(checks ?? []);

  async function record(kind: SymptomKind) {
    await saveCheck({
      id: crypto.randomUUID(),
      kind: 'symptom',
      date: dateKey(new Date()),
      notes: '',
      symptom: kind,
    });
    await refresh();
  }

  // Clearing confirms, unlike un-ticking a movement. A symptom is not a daily
  // yes/no that costs one tap to redo — it is the record that changed what the
  // plan says to do, and losing it by a mis-tap loses the reason a movement was
  // dropped.
  async function clear(kind: SymptomKind, checkIds: string[]) {
    if (!window.confirm(`Clear “${SYMPTOM_SIGNALS[kind].label}”?`)) return;
    await Promise.all(checkIds.map((id) => deleteCheck(id)));
    await refresh();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3.5 px-4 pb-24 pt-[54px]">
      <header className="flex items-baseline gap-2">
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">Stop signals</h1>
        <span className="text-[11px] text-neutral-600">§7 · §8 · §10D</span>
        <button
          onClick={() => go({ name: 'today' })}
          className="ml-auto rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10"
        >
          Done
        </button>
      </header>

      {checks === null ? (
        <p className="text-[13px] text-neutral-400">Loading…</p>
      ) : (
        <section className={`${card} flex flex-col gap-2.5 shadow-edge`}>
          <h2 className={kicker}>Active</h2>

          {symptoms.length === 0 ? (
            <p className="px-0.5 text-[11px] leading-snug text-neutral-500">
              Nothing flagged. Record one when you notice it — the plan attaches a drop order to
              each, and it can’t apply one it doesn’t know about.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {symptoms.map((symptom) => (
                <li
                  key={symptom.kind}
                  className="rounded-[10px] border border-amber-500/40 bg-amber-500/[.08] px-2.5 py-[11px]"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-medium text-amber-200">
                      {symptom.signal.label}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      since{' '}
                      {new Date(`${symptom.since}T00:00`).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <button
                      onClick={() => void clear(symptom.kind, symptom.checkIds)}
                      className="ml-auto rounded-md px-1 py-0.5 text-[11px] font-medium text-accent hover:bg-accent/10"
                    >
                      Clear
                    </button>
                  </div>
                  {/* The plan's own instruction, quoted rather than summarised —
                      it is the reason the record exists. */}
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {symptom.signal.response.map((line) => (
                      <li key={line} className="flex items-start gap-1.5">
                        <Icon
                          name="caret-right"
                          className="mt-[3px] shrink-0 text-[10px] text-amber-400/70"
                        />
                        <span className="text-[11px] leading-snug text-neutral-300">{line}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[10px] text-neutral-600">plan {symptom.signal.source}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-1.5">
            {SYMPTOM_KINDS.filter((k) => !symptoms.some((s) => s.kind === k)).map((kind) => (
              <button
                key={kind}
                onClick={() => void record(kind)}
                title={SYMPTOM_SIGNALS[kind].reading}
                className="rounded-[8px] border border-neutral-800 px-2 py-1 text-[11px] text-neutral-400 transition-colors hover:border-amber-500/50 hover:text-amber-200"
              >
                + {SYMPTOM_SIGNALS[kind].label}
              </button>
            ))}
          </div>

          <p className="px-0.5 text-[10px] leading-snug text-neutral-600">
            A signal stays up until you clear it. The plan gives no duration for any of them, so the
            app does not invent one — and while one is up, the movements its drop order names are
            marked on the tier screens.
          </p>
        </section>
      )}
    </div>
  );
}
