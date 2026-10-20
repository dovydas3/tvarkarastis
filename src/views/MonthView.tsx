import type { Entry, EntryType } from '../types';
import { TYPE_LABELS } from '../types';
import { addDays, addMonths, daysInMonth, MONTHS, parseDate, startOfMonth, WEEKDAYS_SHORT, weekdayIndex } from '../lib/dates';
import { haptic, useSlideClass, useSwipe } from '../lib/hooks';
import { ViewHeader } from '../components/ui';
import { DOT_CLASSES, TYPE_ORDER } from '../components/typeStyles';

interface Props {
  month: string;
  setMonth: (m: string) => void;
  entries: Entry[];
  today: string;
  onOpenDay: (d: string) => void;
}

export function MonthView({ month, setMonth, entries, today, onOpenDay }: Props) {
  const prev = () => setMonth(addMonths(month, -1));
  const next = () => setMonth(addMonths(month, 1));
  const swipe = useSwipe(prev, next);
  const slide = useSlideClass(startOfMonth(month));

  const first = startOfMonth(month);
  const lead = weekdayIndex(first);
  const total = daysInMonth(first);
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: total }, (_, i) => addDays(first, i)),
  ];
  while (cells.length % 7) cells.push(null);

  const byDate = new Map<string, Set<EntryType>>();
  for (const e of entries) {
    if (!e.date.startsWith(first.slice(0, 7))) continue;
    if (!byDate.has(e.date)) byDate.set(e.date, new Set());
    byDate.get(e.date)!.add(e.type);
  }
  const dt = parseDate(first);

  return (
    <div {...swipe} className="min-h-[70vh]">
      <ViewHeader
        title={`${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`}
        onPrev={prev}
        onNext={next}
        right={
          !today.startsWith(first.slice(0, 7)) && (
            <button type="button" className="btn-secondary min-h-10 px-3 text-sm" onClick={() => setMonth(startOfMonth(today))}>
              Šiandien
            </button>
          )
        }
      />
      <div key={first} className={`px-2 pt-2 ${slide}`}>
        <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-500">
          {WEEKDAYS_SHORT.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) =>
            d ? (
              <button
                key={d}
                type="button"
                onClick={() => {
                  haptic(8);
                  onOpenDay(d);
                }}
                className={`flex aspect-square flex-col items-center justify-start rounded-xl pt-1.5 active:bg-slate-200 dark:active:bg-slate-800 ${
                  d === today ? 'bg-teal-700 text-white' : weekdayIndex(d) > 4 ? 'text-slate-400' : ''
                }`}
              >
                <span className="text-base font-semibold tabular-nums">{Number(d.slice(8))}</span>
                <span className="mt-1 flex gap-0.5">
                  {TYPE_ORDER.filter((t) => byDate.get(d)?.has(t)).map((t) => (
                    <span
                      key={t}
                      className={`h-2 w-2 rounded-full ${DOT_CLASSES[t]} ${d === today ? 'ring-1 ring-white' : ''}`}
                    />
                  ))}
                </span>
              </button>
            ) : (
              <div key={`e${i}`} />
            ),
          )}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
          {TYPE_ORDER.map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${DOT_CLASSES[t]}`} />
              {TYPE_LABELS[t]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
