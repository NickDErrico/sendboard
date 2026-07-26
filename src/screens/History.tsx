import { useEffect, useState } from 'react';
import type { Exercise, Routine, WorkoutLog } from '../types';
import { getAllExercises, getAllLogs, getAllRoutines, getSettings } from '../lib/storage';
import { blockPosition, formatPhaseWeeks, type BlockPosition } from '../lib/block';
import { describeSessionFacts, groupByStory, sessionFacts, type StoryGroup } from '../lib/sigil';
import { rotates } from '../lib/rotation';
import { SessionSigil } from '../components/SessionSigil';
import { LogDetail } from './LogDetail';

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
  // A log against a non-rotating routine is a §4E battery: a measurement, not a
  // session the block counts (D29). It still appears, in the week it happened.
  const isBattery = (log: WorkoutLog) => {
    const routine = routinesById.get(log.routineId);
    return routine !== undefined && !rotates(routine);
  };

  // getAllLogs is already sorted by startedAt descending (newest-first).
  const inProgress = (logs ?? []).filter((l) => l.completedAt === null);
  const groups = groupByStory(logs ?? [], position);

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">History</h1>
        {onExit && (
          <button onClick={onExit} className="rounded px-1 py-1 text-sm text-slate-400 hover:text-slate-200">
            Done
          </button>
        )}
      </header>

      {logs === null ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-brand-surface p-6 text-center">
          <p className="text-sm text-slate-300">No sessions yet.</p>
          <p className="mt-1 text-xs text-slate-500">
            Start one from the home screen to begin building your log.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* AC13: unchanged from T5 — pinned above the story, outside the week
              grouping, because an unfinished session has not happened yet. */}
          {inProgress.length > 0 && (
            <section className="space-y-2">
              {inProgress.map((l) => (
                <button
                  key={l.id}
                  onClick={() => onResume(l.id)}
                  className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                      In progress
                    </span>
                    <span className="text-xs font-medium text-amber-200">Tap to resume →</span>
                  </div>
                  <p className="mt-1 font-semibold text-slate-100">{routineName(l.routineId)}</p>
                  <p className="text-xs text-slate-400">
                    Started {new Date(l.startedAt).toLocaleString()}
                  </p>
                </button>
              ))}
            </section>
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
    <div className="flex flex-wrap items-baseline gap-x-2 border-b border-slate-800 pb-1">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {group.label}
      </h2>
      {group.phase && (
        <p className="min-w-0 flex-1 text-xs leading-snug text-slate-600">
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
      className="flex w-full items-center gap-3 rounded-xl border border-slate-700 bg-brand-surface p-3 text-left transition-colors hover:border-slate-600"
    >
      <SessionSigil log={log} exercises={exercises} size={30} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-semibold text-slate-100">{name}</span>
          <span className="shrink-0 text-xs text-slate-500">
            {new Date(log.completedAt ?? log.startedAt).toLocaleDateString()}
          </span>
        </span>
        {/* AC11: what the session held, not how many catalog entries it touched. */}
        <span className="mt-0.5 block truncate text-xs tabular-nums text-slate-400">
          {describeSessionFacts(facts)}
        </span>
        {/* AC12: present in its week, and named as what it is (D29). */}
        {battery && (
          <span className="mt-0.5 block text-xs text-slate-600">
            §4E battery — not counted as a block session
          </span>
        )}
      </span>
    </button>
  );
}
