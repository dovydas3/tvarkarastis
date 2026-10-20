import type { Entry, Settings } from '../types';
import { addDays, formatDayMonth, formatHours, startOfWeek } from '../lib/dates';
import { countedHours } from '../lib/entries';
import { useSlideClass, useSwipe } from '../lib/hooks';
import { TimeGrid } from '../components/TimeGrid';
import { Segmented, ViewHeader } from '../components/ui';

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

export function WeekView({ anchor, setAnchor, settings, updateSettings, entries, now, onSelect, onCreate }: Props) {
  const threeDay = settings.weekDays === 3;
  const step = threeDay ? 3 : 7;
  const first = threeDay ? anchor : startOfWeek(anchor);
  const count = threeDay ? 3 : settings.showWeekend ? 7 : 5;
  const days = Array.from({ length: count }, (_, i) => addDays(first, i));
  const last = days[days.length - 1];

  const prev = () => setAnchor(addDays(first, -step));
  const next = () => setAnchor(addDays(first, step));
  const swipe = useSwipe(prev, next);
  const slide = useSlideClass(first);

  const practice = entries
    .filter((e) => e.type === 'practice' && e.date >= first && e.date <= last)
    .reduce((s, e) => s + countedHours(e), 0);

  return (
    <div {...swipe}>
      <ViewHeader
        title={`${formatDayMonth(first)} – ${formatDayMonth(last)}`}
        subtitle={practice ? `Praktika: ${formatHours(practice)} val.` : `${first.slice(0, 4)} m.`}
        onPrev={prev}
        onNext={next}
      />
      <div className="flex gap-2 px-3 pt-2">
        <div className="flex-1">
          <Segmented
            value={settings.weekDays}
            options={[
              { value: 3, label: '3 dienos' },
              { value: 5, label: 'Savaitė' },
            ]}
            onChange={(v) => {
              updateSettings({ weekDays: v });
              if (v === 3) setAnchor(startOfWeek(anchor) <= now.date && now.date <= addDays(startOfWeek(anchor), 6) ? now.date : startOfWeek(anchor));
            }}
          />
        </div>
        {!threeDay && (
          <button
            type="button"
            className={`btn min-h-10 px-3 text-sm ${settings.showWeekend ? 'bg-teal-700 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}
            onClick={() => updateSettings({ showWeekend: !settings.showWeekend })}
          >
            Št–Sk
          </button>
        )}
        <button type="button" className="btn-secondary min-h-10 px-3 text-sm" onClick={() => setAnchor(now.date)}>
          Šiandien
        </button>
      </div>
      <div key={first} className={`px-1 pb-4 pt-1 ${slide}`}>
        <TimeGrid
          days={days}
          entries={entries}
          now={now}
          hourHeight={52}
          compact={count > 3}
          showHeaders
          onSelect={onSelect}
          onCreate={onCreate}
        />
      </div>
    </div>
  );
}
