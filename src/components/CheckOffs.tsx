import { useCallback, useEffect, useState } from 'react';
import type { Check } from '../types';
import {
  dateKey,
  deleteCheck,
  getAllChecks,
  getChecksForDay,
  getChecksForWeek,
  mondayOf,
  saveCheck,
} from '../lib/storage';
import {
  dailyGtgStatus,
  keyToLocalDate,
  last7DayGtgCounts,
  weekClimbingStatus,
  weekEndKey,
} from '../lib/checks';
import { Icon, card, kicker } from './ui';

// T5b's climbing week and T14's daily greasing-the-groove, in one card.
//
// They were two sibling cards until the Nocturne pass, and two cards read as two
// subjects — where in fact they answer one question ("what does the week owe?").
// One card with a fading rule between them says that, and says it in the space
// the two cards used to take up.
//
// Behaviour is unchanged from the two components this replaces: tapping an
// unchecked tile records a check for today, tapping a checked one confirms
// before removing it.

type ClimbingKind = 'climbing-volume' | 'climbing-limit';
type GtgKind = 'gtg-general' | 'gtg-pull';

function fmt(key: string): string {
  return keyToLocalDate(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function CheckOffs() {
  const [week, setWeek] = useState<Check[] | null>(null);
  const [today, setToday] = useState<Check[] | null>(null);
  const [all, setAll] = useState<Check[]>([]);

  // Every read recomputes from `new Date()`, so leaving the app open across
  // midnight (or across a Monday) and refocusing rolls over rather than showing
  // yesterday's day or last week's week.
  const refresh = useCallback(async () => {
    const [weekChecks, dayChecks, allChecks] = await Promise.all([
      getChecksForWeek(new Date()),
      getChecksForDay(new Date()),
      getAllChecks(),
    ]);
    setWeek(weekChecks);
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

  const climbing = weekClimbingStatus(week ?? []);
  const gtg = dailyGtgStatus(today ?? []);
  const counts = last7DayGtgCounts(all, new Date());
  const mondayKey = dateKey(mondayOf(new Date()));
  const weekDone = Number(climbing.volume) + Number(climbing.limit);

  async function toggleWeek(kind: ClimbingKind) {
    const existing = (week ?? []).filter((c) => c.kind === kind);
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

  async function toggleDay(kind: GtgKind) {
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
    <section className={`${card} flex flex-col gap-2.5 shadow-edge`}>
      <div className="flex items-baseline">
        <h2 className={kicker}>
          This week · {fmt(mondayKey)}–{fmt(weekEndKey(mondayKey))}
        </h2>
        <span className="ml-auto text-[11px] tabular-nums text-neutral-500">{weekDone} of 2</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Tile label="Volume day" done={climbing.volume} onClick={() => void toggleWeek('climbing-volume')} />
        <Tile label="Limit day" done={climbing.limit} onClick={() => void toggleWeek('climbing-limit')} />
      </div>

      <hr className="hr my-0.5" />

      <h2 className={kicker}>Today’s GtG</h2>
      <div className="grid grid-cols-2 gap-2">
        <Tile
          label="General"
          sub={`${counts.general}/7 days`}
          done={gtg.general}
          onClick={() => void toggleDay('gtg-general')}
        />
        <Tile
          label="Pull"
          sub={`${counts.pull}/7 days`}
          done={gtg.pull}
          onClick={() => void toggleDay('gtg-pull')}
        />
      </div>
    </section>
  );
}

function Tile({
  label,
  sub,
  done,
  onClick,
}: {
  label: string;
  sub?: string;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={done}
      className={`flex items-center gap-2.5 rounded-[10px] border px-2.5 py-[11px] text-left text-[13px] font-medium transition-colors ${
        done
          ? 'border-accent bg-accent/[.12] text-accent-200'
          : 'border-neutral-800 text-neutral-400 hover:border-white/[.34]'
      }`}
    >
      <Icon
        name={done ? 'check-circle' : 'circle'}
        weight={done ? 'fill' : 'regular'}
        className={`shrink-0 text-[18px] ${done ? 'text-accent-400' : 'text-neutral-600'}`}
      />
      <span className="min-w-0">
        {label}
        {sub !== undefined && (
          <span className={`block text-[10px] font-normal ${done ? 'text-neutral-500' : 'text-neutral-600'}`}>
            {sub}
          </span>
        )}
      </span>
    </button>
  );
}
