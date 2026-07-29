import { useEffect, useState } from 'react';
import type { Exercise, Routine, WorkoutLog } from '../types';
import { getAllExercises, getAllLogs, getAllRoutines, getSettings } from '../lib/storage';
import { blockPosition, formatPhaseWeeks, type BlockPosition } from '../lib/block';
import { describeSessionFacts, groupByStory, sessionFacts, type StoryGroup } from '../lib/sigil';
import { BATTERY_ROUTINE_ID } from '../lib/retest';
import { resumable } from '../lib/session';
import { SessionSigil } from '../components/SessionSigil';
import { LogDetail } from './LogDetail';
import { Icon } from '../components/ui';

// The block's story (T27), which is what T5's flat list becomes once there is a
// block to tell it against.
//
// Two changes, both of them "render what the log already holds". Sessions group
// under the week they happened in (T24's derived position), and each row reports
// its holds, its time under tension and the edges it used instead of the count
// of catalog entries it touched — a number that made a two-set deload session and
// a full Day 1 look identical.
//
// Nothing is ranked, nothing is captioned, and §4F's row is quoted with its
// reference rather than applied. The deload week is *supposed* to be the
// smallest marks on this screen (D23).

export function History({
  onResume,
  onExit,
}: {
  onResume: (logId: string) => void;
  onExit?: () => void;
}) {
  const [logs, setLogs] = useState<WorkoutLog[] | null>(null);
  const [routinesById, setRoutinesById] = useState<Map<string, Routine>>(new Map());
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [position, setPosition] = useState<BlockPosition | null>(null);
  const [selected, setSelected] = useState<WorkoutLog | null>(null);

  useEffect(() => {
    void (async () => {
      const [ls, rs, es, settings] = await Promise.all([
        getAllLogs(),
        getAllRoutines(),
        getAllExercises(),
        getSettings(),
      ]);
      setLogs(ls);
      setRoutinesById(new Map(rs.map((r) => [r.id, r])));
      setExercises(es);
      // No `liveLog`, matching Home: an abandoned session must not anchor or
      // advance the block (D16).
      setPosition(blockPosition({ logs: ls, routines: rs, settings, today: new Date() }));
    })();
  }, []);

  if (selected) {
    return <LogDetail log={selected} onBack={() => setSelected(null)} />;
  }

  const routineName = (id: string) => routinesById.get(id)?.name ?? id;
  // The §4E battery: a measurement, not a session the block counts (D29). It
  // still appears, in the week it happened.
  //
  // T34 narrowed this from "any non-rotating routine" to the battery by id. Both
  // readings were the same set until §10D's daily became the second routine
  // outside the rotation — and a daily warm-up marked as a *test* would put a
  // §4E badge on ten minutes of abrahangs. Non-rotating is why the block does not
  // count a log; it is not what the log is.
  const isBattery = (log: WorkoutLog) => log.routineId === BATTERY_ROUTINE_ID;

  // getAllLogs is already sorted by startedAt descending (newest-first). D46:
  // one unfinished session at most, and only if it recorded something — a log
  // opened and backed out of is not a session this list owes a row to.
  const open = resumable(logs ?? []);
  const groups = groupByStory(logs ?? [], position);

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-[54px]">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-[15px] font-medium tracking-[-0.01em]">History</h1>
        {onExit && (
          <button onClick={onExit} className="rounded-md px-1 py-1 text-[13px] font-medium text-accent hover:bg-accent/10">
            Done
          </button>
        )}
      </header>

      {logs === null ? (
        <p className="text-[13px] text-neutral-400">Loading…</p>
      ) : logs.length === 0 ? (
        <div className="rounded-md bg-surface shadow-edge p-6 text-center">
          <p className="text-[13px] text-neutral-300">No sessions yet.</p>
          <p className="mt-1 text-xs text-neutral-500">
            Start one from the home screen to begin building your log.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* AC13: unchanged from T5 — pinned above the story, outside the week
              grouping, because an unfinished session has not happened yet. */}
          {open && (
            <button
              onClick={() => onResume(open.id)}
              className="w-full rounded-md border border-accent/40 bg-accent/[.08] p-3 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-accent-300">
                  In progress
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-accent-200">
                  Tap to resume
                  <Icon name="caret-right" className="text-[11px]" />
                </span>
              </div>
              <p className="mt-1 font-medium text-ink">{routineName(open.routineId)}</p>
              <p className="text-xs text-neutral-400">
                Started {new Date(open.startedAt).toLocaleString()}
              </p>
            </button>
          )}

          {groups.map((group) => (
            <section key={group.label || 'all'} className="space-y-2">
              <WeekHeading group={group} />
              <ul className="space-y-2">
                {group.logs.map((l) => (
                  <li key={l.id}>
                    <SessionRow
                      log={l}
                      name={routineName(l.routineId)}
                      exercises={exercises}
                      battery={isBattery(l)}
                      onOpen={() => setSelected(l)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A week's heading with §4F's row for it, quoted (AC9).
 *
 * The ungrouped case (no derivable block position) renders nothing at all rather
 * than an "All sessions" heading — the list is then exactly what T5 shipped, and
 * a heading over the only group is noise (AC10).
 */
function WeekHeading({ group }: { group: StoryGroup }) {
  if (group.label === '') return null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 border-b border-neutral-900 pb-1">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-400">
        {group.label}
      </h2>
      {group.phase && (
        <p className="min-w-0 flex-1 text-xs leading-snug text-neutral-600">
          {formatPhaseWeeks(group.phase)}: {group.phase.focus} (plan §4F)
        </p>
      )}
    </div>
  );
}

function SessionRow({
  log,
  name,
  exercises,
  battery,
  onOpen,
}: {
  log: WorkoutLog;
  name: string;
  exercises: Exercise[];
  battery: boolean;
  onOpen: () => void;
}) {
  const facts = sessionFacts(log, exercises);
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-md bg-surface shadow-edge p-3 text-left transition-colors hover:bg-white/5"
    >
      <SessionSigil log={log} exercises={exercises} size={30} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-medium text-ink">{name}</span>
          <span className="shrink-0 text-xs text-neutral-500">
            {new Date(log.completedAt ?? log.startedAt).toLocaleDateString()}
          </span>
        </span>
        {/* AC11: what the session held, not how many catalog entries it touched. */}
        <span className="mt-0.5 block truncate text-xs tabular-nums text-neutral-400">
          {describeSessionFacts(facts)}
        </span>
        {/* AC12: present in its week, and named as what it is (D29). */}
        {battery && (
          <span className="mt-0.5 block text-xs text-neutral-600">
            §4E battery — not counted as a block session
          </span>
        )}
      </span>
    </button>
  );
}
