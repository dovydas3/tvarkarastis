import type { Entry, Settings } from '../types';
import { addDays, formatDayMonth, formatHours, startOfWeek, WEEKDAYS_SHORT, weekdayIndex } from '../lib/dates';
import { countedHours } from '../lib/entries';
import { useSlideClass, useSwipe } from '../lib/hooks';
import { TimeGrid } from '../components/TimeGrid';
import { PillButton, ViewHeader } from '../components/ui';

interface Props {
  anchor: string;
  setAnchor: (d: string) => void;
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
  entries: Entry[];
  now: { date: string; minutes: number };
  onSelect: (e: Entry) => void;
  onCreate: (date: string, start: string) => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function WeekView({ anchor, setAnchor, settings, updateSettings, entries, now, onSelect, onCreate }: Props) {
  const first = startOfWeek(anchor);
  const count = settings.showWeekend ? 7 : 5;
  const days = Array.from({ length: count }, (_, i) => addDays(first, i));
  const last = days[days.length - 1];
  const thisWeek = now.date >= first && now.date <= addDays(first, 6);

  const prev = () => setAnchor(addDays(first, -7));
  const next = () => setAnchor(addDays(first, 7));
  const swipe = useSwipe(prev, next);
  const slide = useSlideClass(first);

  const practice = entries
    .filter((e) => e.type === 'practice' && e.date >= first && e.date <= last)
    .reduce((s, e) => s + countedHours(e), 0);

  const sameMonth = first.slice(5, 7) === last.slice(5, 7);
  const title = sameMonth
    ? `${cap(formatDayMonth(first).replace(/ \d+ d\.$/, ''))} ${Number(first.slice(8))}–${Number(last.slice(8))}`
    : `${cap(formatDayMonth(first).replace(' d.', ''))} – ${formatDayMonth(last).replace(' d.', '')}`;

  return (
    <div {...swipe}>
      <ViewHeader
        eyebrow={thisWeek ? 'Ši savaitė' : `${first.slice(0, 4)} m.`}
        title={title}
        subtitle={practice ? `Praktika: ${formatHours(practice)} val.` : undefined}
        onPrev={prev}
        onNext={next}
      >
        <div className="flex gap-2 px-4 pb-2">
          <PillButton active={settings.showWeekend} onClick={() => updateSettings({ showWeekend: !settings.showWeekend })}>
            Su savaitgaliu
          </PillButton>
          {!thisWeek && <PillButton onClick={() => setAnchor(now.date)}>Ši savaitė</PillButton>}
        </div>
        {/* Dienų eilutė – prilipusi kartu su antrašte */}
        <div className="flex px-1 pb-2">
          <div className="w-10 shrink-0" />
          {days.map((d) => {
            const isToday = d === now.date;
            return (
              <div key={d} className="flex flex-1 flex-col items-center gap-0.5">
                <span className={`text-[11px] font-semibold ${isToday ? 'text-accent-500' : 'text-neutral-400'}`}>
                  {WEEKDAYS_SHORT[weekdayIndex(d)]}
                </span>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                    isToday ? 'bg-accent-500 text-white' : ''
                  }`}
                >
                  {Number(d.slice(8))}
                </span>
              </div>
            );
          })}
        </div>
      </ViewHeader>
      <div key={first} className={`px-1 pb-4 ${slide}`}>
        <TimeGrid days={days} entries={entries} now={now} hourHeight={52} compact onSelect={onSelect} onCreate={onCreate} />
      </div>
    </div>
  );
}
