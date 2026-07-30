import { useCallback, useEffect, useState } from 'react';
import type { Check, Exercise, WorkoutLog } from '../types';
import {
  dateKey,
  deleteCheck,
  getAllChecks,
  getAllExercises,
  getAllLogs,
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
import { describeGtgToday, gtgToday, type GtgKindToday } from '../lib/gtg';
import { dailyIsometricsToday, poolToday } from '../lib/pool';
import { go } from '../lib/routes';
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
//
// T33 changed the GtG half only. Two tiles that toggled a whole category became
// two rows that *open* the routine, because the tile was answering "did you do
// the thing" about a thing the app never named — the movements, their doses and
// their triggers live on `#/gtg` now, and a category-level tick here would be a
// second way to record the same day that names none of them (D11a). The climbing
// week above the rule is untouched: a climbing day is a day, not a list (D9).

type ClimbingKind = 'climbing-volume' | 'climbing-limit';

function fmt(key: string): string {
  return keyToLocalDate(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function CheckOffs() {
  const [week, setWeek] = useState<Check[] | null>(null);
  const [today, setToday] = useState<Check[] | null>(null);
  const [all, setAll] = useState<Check[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  // The joint rotation counts a movement done inside a session as well as one
  // ticked, so the logs are needed here as well as the checks (see pool.ts).
  const [logs, setLogs] = useState<WorkoutLog[]>([]);

  // Every read recomputes from `new Date()`, so leaving the app open across
  // midnight (or across a Monday) and refocusing rolls over rather than showing
  // yesterday's day or last week's week.
  const refresh = useCallback(async () => {
    const [weekChecks, dayChecks, allChecks, exs, allLogs] = await Promise.all([
      getChecksForWeek(new Date()),
      getChecksForDay(new Date()),
      getAllChecks(),
      getAllExercises(),
      getAllLogs(),
    ]);
    setWeek(weekChecks);
    setToday(dayChecks);
    setAll(allChecks);
    setExercises(exs);
    setLogs(allLogs);
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
  const gtg = gtgToday(today ?? [], exercises);
  // The kind-level roll-up stays the one every week summary is built on, rather
  // than a second reading of "the kind happened today" that could disagree.
  const kindDone = dailyGtgStatus(today ?? []);
  const counts = last7DayGtgCounts(all, new Date());
  const mondayKey = dateKey(mondayOf(new Date()));
  const weekDone = Number(climbing.volume) + Number(climbing.limit);
  // Read from `pool.ts` rather than counted here, so this card and the joints
  // screen answer "how many today" the same way.
  const daily = dailyIsometricsToday(exercises, logs, all, new Date());
  const dailyDone = daily.filter((s) => s.doneToday !== null).length;
  const poolDue = poolToday(exercises, logs, all, new Date()).filter((s) => s.due).length;

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

      <div className="flex items-baseline">
        <h2 className={kicker}>Today’s GtG</h2>
        <span className="ml-auto text-[11px] text-neutral-600">§8’s list · tap to open</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <GtgRow label="General" today={gtg['gtg-general']} done={kindDone.general} days={counts.general} />
        <GtgRow label="Pull" today={gtg['gtg-pull']} done={kindDone.pull} days={counts.pull} />
      </div>

      <hr className="hr my-0.5" />

      {/* The joint rotation's line in. Its own screen owns which movement is up
          and what is due; this reports the two counts and navigates, exactly as
          the GtG rows above do — one place decides, so the two cannot disagree. */}
      <div className="flex items-baseline">
        <h2 className={kicker}>Joints &amp; tendons</h2>
        <span className="ml-auto text-[11px] text-neutral-600">daily + queue · tap to open</span>
      </div>
      <button
        onClick={() => go({ name: 'joints' })}
        className={`flex items-center gap-2.5 rounded-[10px] border px-2.5 py-[11px] text-left text-[13px] font-medium transition-colors ${
          dailyDone === daily.length && daily.length > 0
            ? 'border-accent bg-accent/[.12] text-accent-200'
            : 'border-neutral-800 text-neutral-400 hover:border-white/[.34]'
        }`}
      >
        <Icon
          name={dailyDone === daily.length && daily.length > 0 ? 'check-circle' : 'circle'}
          weight={dailyDone === daily.length && daily.length > 0 ? 'fill' : 'regular'}
          className={`shrink-0 text-[18px] ${
            dailyDone === daily.length && daily.length > 0 ? 'text-accent-400' : 'text-neutral-600'
          }`}
        />
        <span className="min-w-0 flex-1">
          Daily isometrics
          <span className="block text-[10px] font-normal text-neutral-600">
            {dailyDone} of {daily.length} today · {poolDue} in the queue
          </span>
        </span>
        <Icon name="caret-right" className="shrink-0 text-[13px] text-neutral-600" />
      </button>
    </section>
  );
}

/**
 * One kind's line into the routine (T33).
 *
 * It reports and navigates; it does not tick. The mark is filled when the day
 * holds anything for the kind — a movement, or one of the whole-kind checks the
 * check-log still writes — so the reading agrees with `dailyGtgStatus` and with
 * every week summary built on it.
 */
function GtgRow({
  label,
  today,
  done,
  days,
}: {
  label: string;
  today: GtgKindToday;
  done: boolean;
  days: number;
}) {
  return (
    <button
      onClick={() => go({ name: 'gtg' })}
      className={`flex items-center gap-2.5 rounded-[10px] border px-2.5 py-[11px] text-left text-[13px] font-medium transition-colors ${
        done ? 'border-accent bg-accent/[.12] text-accent-200' : 'border-neutral-800 text-neutral-400 hover:border-white/[.34]'
      }`}
    >
      <Icon
        name={done ? 'check-circle' : 'circle'}
        weight={done ? 'fill' : 'regular'}
        className={`shrink-0 text-[18px] ${done ? 'text-accent-400' : 'text-neutral-600'}`}
      />
      <span className="min-w-0 flex-1">
        {label}
        <span className={`block text-[10px] font-normal ${done ? 'text-neutral-500' : 'text-neutral-600'}`}>
          {describeGtgToday(today)} · {days} of last 7 days
        </span>
      </span>
      <Icon name="caret-right" className="shrink-0 text-[13px] text-neutral-600" />
    </button>
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
