import type { Entry, EntryType } from '../types';
import {
  addDays,
  diffDays,
  formatDayMonth,
  formatHours,
  formatIn,
  startOfWeek,
  toMinutes,
  WEEKDAYS_LONG,
  WEEKDAYS_SHORT,
  weekdayIndex,
} from '../lib/dates';
import { countedHours } from '../lib/entries';
import { haptic, useSlideClass, useSwipe } from '../lib/hooks';
import { DayTimeline } from '../components/DayTimeline';
import { Icon } from '../components/Icon';
import { PillButton, ViewHeader } from '../components/ui';
import { DOT_CLASSES, TYPE_ICON, TYPE_ORDER } from '../components/typeStyles';

interface Props {
  date: string;
  setDate: (d: string) => void;
  entries: Entry[];
  now: { date: string; minutes: number };
  onSelect: (e: Entry) => void;
  onCreate: (date: string, start: string) => void;
  onMove: (e: Entry, start: string, end: string) => void;
  onToggle: (e: Entry) => void;
}

/** „Spalio 20“ */
const bigDate = (d: string) => {
  const m = formatDayMonth(d).replace(' d.', '');
  return m.charAt(0).toUpperCase() + m.slice(1);
};

export function DayView({ date, setDate, entries, now, onSelect, onCreate, onMove, onToggle }: Props) {
  const slide = useSlideClass(date);
  const swipe = useSwipe(
    () => setDate(addDays(date, -1)),
    () => setDate(addDays(date, 1)),
  );
  const isToday = date === now.date;
  const offset = diffDays(date, now.date);
  const rel = offset === 0 ? 'Šiandien' : offset === 1 ? 'Rytoj' : offset === -1 ? 'Vakar' : null;
  const eyebrow = `${rel ? `${rel} · ` : ''}${WEEKDAYS_LONG[weekdayIndex(date)]}`;

  return (
    <div {...swipe}>
      <ViewHeader
        eyebrow={eyebrow}
        title={bigDate(date)}
        right={!isToday && <PillButton onClick={() => setDate(now.date)}>Šiandien</PillButton>}
      >
        <WeekStrip
          date={date}
          today={now.date}
          entries={entries}
          onPick={(d) => {
            haptic(8);
            setDate(d);
          }}
        />
      </ViewHeader>
      <div key={date} className={slide}>
        {isToday && <NextLine entries={entries} now={now} onSelect={onSelect} />}
        <DaySummary entries={entries.filter((e) => e.date === date)} />
        <DayTimeline
          date={date}
          entries={entries}
          now={now}
          onSelect={onSelect}
          onCreate={onCreate}
          onMove={onMove}
          onToggle={onToggle}
        />
      </div>
    </div>
  );
}

/** Savaitės dienų juosta: raidė, skaičius apskritime, taškai. */
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
    <div className="grid grid-cols-7 px-2 pb-2">
      {days.map((d) => {
        const selected = d === date;
        const isToday = d === today;
        return (
          <button key={d} type="button" onClick={() => onPick(d)} aria-pressed={selected} className="flex flex-col items-center gap-1 py-1">
            <span className={`text-[11px] font-semibold ${isToday ? 'text-accent-500' : 'text-neutral-400'}`}>
              {WEEKDAYS_SHORT[weekdayIndex(d)]}
            </span>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-bold tabular-nums transition-colors ${
                selected
                  ? 'bg-accent-500 text-white shadow-sm shadow-accent-500/40'
                  : isToday
                    ? 'text-accent-500 ring-2 ring-accent-500/30'
                    : weekdayIndex(d) > 4
                      ? 'text-neutral-400'
                      : ''
              }`}
            >
              {Number(d.slice(8))}
            </span>
            <span className="flex h-1.5 gap-0.5">
              {TYPE_ORDER.filter((t) => types.get(d)?.has(t)).map((t) => (
                <span key={t} className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[t]}`} />
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
  if (!entries.length) return null;
  const lectures = entries.filter((e) => e.type === 'lecture').length;
  const practice = entries.filter((e) => e.type === 'practice').reduce((s, e) => s + countedHours(e), 0);
  const other = entries.filter((e) => e.type === 'personal' || e.type === 'other').length;
  const chips = [
    lectures && { type: 'lecture' as const, text: `${lectures} ${plural(lectures, 'paskaita', 'paskaitos', 'paskaitų')}` },
    practice && { type: 'practice' as const, text: `${formatHours(practice)} val. praktikos` },
    other && { type: 'personal' as const, text: `${other} ${plural(other, 'kitas', 'kiti', 'kitų')}` },
  ].filter(Boolean) as { type: EntryType; text: string }[];
  return (
    <div className="flex flex-wrap gap-1.5 px-4 pt-3">
      {chips.map((c) => (
        <span
          key={c.type}
          className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
        >
          <span className={`h-2 w-2 rounded-full ${DOT_CLASSES[c.type]}`} />
          {c.text}
        </span>
      ))}
    </div>
  );
}

/** „Kitas: Praktika 13:30, po 45 min.“ – kai artimiausias įrašas ne šiandien, rodoma ir jo diena. */
function NextLine({
  entries,
  now,
  onSelect,
}: {
  entries: Entry[];
  now: { date: string; minutes: number };
  onSelect: (e: Entry) => void;
}) {
  const next = entries.find((e) => e.date > now.date || (e.date === now.date && toMinutes(e.start) > now.minutes));
  if (!next) return null;
  const mins = diffDays(next.date, now.date) * 1440 + toMinutes(next.start) - now.minutes;
  const when = next.date === now.date ? next.start : `${WEEKDAYS_SHORT[weekdayIndex(next.date)]}, ${formatDayMonth(next.date)} ${next.start}`;
  return (
    <div className="px-4 pt-2">
      <button
        type="button"
        onClick={() => onSelect(next)}
        className="flex w-full items-center gap-3 rounded-2xl bg-accent-50 px-3.5 py-2.5 text-left dark:bg-accent-500/10"
      >
        <Icon name={TYPE_ICON[next.type]} className="h-4 w-4 shrink-0 text-accent-500" strokeWidth={2.4} />
        <span className="min-w-0 flex-1 truncate text-sm">
          <b>Kitas:</b> {next.title} {when}
        </span>
        <span className="shrink-0 text-xs font-bold text-accent-600 dark:text-accent-300">{formatIn(mins)}</span>
      </button>
    </div>
  );
}
