import type { Entry, EntryType } from '../types';
import { TYPE_LABELS } from '../types';
import {
  addDays,
  diffDays,
  formatDayMonth,
  formatHours,
  formatIn,
  formatLongDay,
  startOfWeek,
  toMinutes,
  WEEKDAYS_LONG,
  WEEKDAYS_SHORT,
  weekdayIndex,
} from '../lib/dates';
import { countedHours, noteDetails } from '../lib/entries';
import { haptic, useSlideClass, useSwipe } from '../lib/hooks';
import { TimeGrid } from '../components/TimeGrid';
import { ViewHeader } from '../components/ui';
import { DOT_CLASSES, TYPE_ORDER } from '../components/typeStyles';

interface Props {
  date: string;
  setDate: (d: string) => void;
  entries: Entry[];
  now: { date: string; minutes: number };
  onSelect: (e: Entry) => void;
  onCreate: (date: string, start: string) => void;
  onMove: (e: Entry, start: string, end: string) => void;
}

export function DayView({ date, setDate, entries, now, onSelect, onCreate, onMove }: Props) {
  const slide = useSlideClass(date);
  const swipe = useSwipe(
    () => setDate(addDays(date, -1)),
    () => setDate(addDays(date, 1)),
  );
  const isToday = date === now.date;
  const offset = diffDays(date, now.date);
  const rel = offset === 0 ? 'Šiandien' : offset === 1 ? 'Rytoj' : offset === -1 ? 'Vakar' : null;

  return (
    <div {...swipe}>
      <ViewHeader
        title={rel ?? WEEKDAYS_LONG[weekdayIndex(date)]}
        subtitle={rel ? formatLongDay(date) : `${date.slice(0, 4)} m. ${formatDayMonth(date)}`}
        onPrev={() => setDate(addDays(date, -1))}
        onNext={() => setDate(addDays(date, 1))}
        right={
          !isToday && (
            <button type="button" className="btn-secondary min-h-10 px-3 text-sm" onClick={() => setDate(now.date)}>
              Šiandien
            </button>
          )
        }
      />
      <WeekStrip
        date={date}
        today={now.date}
        entries={entries}
        onPick={(d) => {
          haptic(8);
          setDate(d);
        }}
      />
      <div key={date} className={slide}>
        {isToday && <NowNext entries={entries} now={now} onSelect={onSelect} />}
        <DaySummary entries={entries.filter((e) => e.date === date)} />
        <div className="px-1 pb-4 pt-1">
          <TimeGrid
            days={[date]}
            entries={entries}
            now={now}
            hourHeight={64}
            onSelect={onSelect}
            onCreate={onCreate}
            onMove={onMove}
          />
        </div>
      </div>
    </div>
  );
}

/** Savaitės dienų juosta: greitas perėjimas į kitą dieną vienu paspaudimu. */
function WeekStrip({
  date,
  today,
  entries,
  onPick,
}: {
  date: string;
  today: string;
  entries: Entry[];
  onPick: (d: string) => void;
}) {
  const monday = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const types = new Map<string, Set<EntryType>>();
  for (const e of entries) {
    if (e.date < monday || e.date > days[6]) continue;
    if (!types.has(e.date)) types.set(e.date, new Set());
    types.get(e.date)!.add(e.type);
  }
  return (
    <div className="grid grid-cols-7 gap-1 px-2 pt-2">
      {days.map((d) => {
        const selected = d === date;
        const isToday = d === today;
        return (
          <button
            key={d}
            type="button"
            onClick={() => onPick(d)}
            aria-pressed={selected}
            className={`flex flex-col items-center rounded-2xl py-1.5 transition-colors ${
              selected ? 'bg-teal-700 text-white dark:bg-teal-600' : 'active:bg-slate-200 dark:active:bg-slate-800'
            }`}
          >
            <span className={`text-[11px] ${selected ? 'text-teal-50' : weekdayIndex(d) > 4 ? 'text-slate-400' : 'text-slate-500'}`}>
              {WEEKDAYS_SHORT[weekdayIndex(d)]}
            </span>
            <span
              className={`text-lg font-semibold tabular-nums leading-tight ${
                isToday && !selected ? 'text-teal-700 underline decoration-2 underline-offset-4 dark:text-teal-400' : ''
              }`}
            >
              {Number(d.slice(8))}
            </span>
            <span className="mt-0.5 flex h-1.5 gap-0.5">
              {TYPE_ORDER.filter((t) => types.get(d)?.has(t)).map((t) => (
                <span key={t} className={`h-1.5 w-1.5 rounded-full ${selected ? 'bg-white' : DOT_CLASSES[t]}`} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && (m100 < 10 || m100 > 20)) return few;
  return many;
};

function DaySummary({ entries }: { entries: Entry[] }) {
  if (!entries.length) {
    return (
      <div className="mx-3 mt-3 rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">
        Laisva diena – įrašų nėra. Paspausk laiką juostoje arba „+“, kad pridėtum.
      </div>
    );
  }
  const lectures = entries.filter((e) => e.type === 'lecture').length;
  const practice = entries.filter((e) => e.type === 'practice').reduce((s, e) => s + countedHours(e), 0);
  const other = entries.filter((e) => e.type === 'personal' || e.type === 'other').length;
  const first = entries.reduce((m, e) => (e.start < m ? e.start : m), '24:00');
  const last = entries.reduce((m, e) => (e.end > m ? e.end : m), '00:00');
  const parts = [
    lectures && `${lectures} ${plural(lectures, 'paskaita', 'paskaitos', 'paskaitų')}`,
    practice && `praktika ${formatHours(practice)} val.`,
    other && `${other} ${plural(other, 'kitas įrašas', 'kiti įrašai', 'kitų įrašų')}`,
  ].filter(Boolean);
  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-3 text-sm text-slate-500">
      <span className="truncate">{parts.join(' · ')}</span>
      <span className="shrink-0 tabular-nums">
        {first}–{last}
      </span>
    </div>
  );
}

function NowNext({
  entries,
  now,
  onSelect,
}: {
  entries: Entry[];
  now: { date: string; minutes: number };
  onSelect: (e: Entry) => void;
}) {
  const current = entries.filter(
    (e) => e.date === now.date && toMinutes(e.start) <= now.minutes && now.minutes < toMinutes(e.end),
  );
  const next = entries.find((e) => e.date > now.date || (e.date === now.date && toMinutes(e.start) > now.minutes));

  let nextWhen = '';
  let nextIn = '';
  if (next) {
    const mins = diffDays(next.date, now.date) * 1440 + toMinutes(next.start) - now.minutes;
    nextIn = formatIn(mins);
    nextWhen =
      next.date === now.date
        ? `${next.start}–${next.end}`
        : `${WEEKDAYS_SHORT[weekdayIndex(next.date)]}, ${formatDayMonth(next.date)} ${next.start}`;
  }

  return (
    <div className="space-y-2 px-3 pt-3">
      {current.map((e) => {
        const total = toMinutes(e.end) - toMinutes(e.start);
        const done = now.minutes - toMinutes(e.start);
        const details = noteDetails(e.note);
        return (
          <button key={e.id} type="button" onClick={() => onSelect(e)} className="card w-full overflow-hidden p-0 text-left">
            <div className="flex items-start gap-3 p-4 pb-3">
              <span className={`mt-1.5 h-3 w-3 shrink-0 animate-pulse rounded-full ${DOT_CLASSES[e.type]}`} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
                  Dabar · {TYPE_LABELS[e.type]}
                </div>
                <div className="font-semibold leading-snug">{e.title}</div>
                <div className="mt-0.5 text-sm text-slate-500">
                  {e.start}–{e.end}
                  {details && ` · ${details}`}
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-teal-600/15 px-2.5 py-1 text-xs font-semibold text-teal-800 dark:text-teal-300">
                liko {formatIn(toMinutes(e.end) - now.minutes).replace('po ', '')}
              </span>
            </div>
            <div className="h-1 bg-slate-200 dark:bg-slate-800">
              <div className="h-full bg-teal-600" style={{ width: `${Math.min(100, (done / total) * 100)}%` }} />
            </div>
          </button>
        );
      })}
      {next ? (
        <button type="button" onClick={() => onSelect(next)} className="card flex w-full items-start gap-3 text-left">
          <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${DOT_CLASSES[next.type]}`} />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kitas · {TYPE_LABELS[next.type]}</div>
            <div className="font-semibold leading-snug">{next.title}</div>
            <div className="mt-0.5 truncate text-sm text-slate-500">
              {nextWhen}
              {noteDetails(next.note) && ` · ${noteDetails(next.note)}`}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold dark:bg-slate-800">{nextIn}</span>
        </button>
      ) : (
        !current.length && <div className="card text-slate-500">Artimiausių įrašų nėra.</div>
      )}
    </div>
  );
}
