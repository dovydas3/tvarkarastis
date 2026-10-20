import type { ReactNode } from 'react';
import type { Entry, EntryType } from '../types';
import { TYPE_LABELS } from '../types';
import { addDays, addMonths, daysInMonth, MONTHS, parseDate, startOfMonth, WEEKDAYS_SHORT, weekdayIndex } from '../lib/dates';
import { haptic, useSlideClass, useSwipe } from '../lib/hooks';
import { PillButton, ViewHeader } from '../components/ui';
import { DOT_CLASSES, TYPE_ORDER } from '../components/typeStyles';

interface Props {
  month: string;
  setMonth: (m: string) => void;
  entries: Entry[];
  today: string;
  onOpenDay: (d: string) => void;
  switcher?: ReactNode;
}

export function MonthView({ month, setMonth, entries, today, onOpenDay, switcher }: Props) {
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
        eyebrow={`${dt.getUTCFullYear()} m.`}
        title={MONTHS[dt.getUTCMonth()]}
        onPrev={prev}
        onNext={next}
        right={!today.startsWith(first.slice(0, 7)) && <PillButton onClick={() => setMonth(startOfMonth(today))}>Šiandien</PillButton>}
      >
        {switcher && <div className="px-4 pb-2">{switcher}</div>}
      </ViewHeader>
      <div key={first} className={`px-3 pt-2 ${slide}`}>
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-neutral-400">
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
                className={`flex aspect-square flex-col items-center justify-start rounded-2xl pt-1 active:bg-neutral-100 dark:active:bg-neutral-900 ${
                  weekdayIndex(d) > 4 ? 'text-neutral-400' : ''
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-bold tabular-nums ${
                    d === today ? 'bg-accent-500 text-white shadow-sm shadow-accent-500/40' : ''
                  }`}
                >
                  {Number(d.slice(8))}
                </span>
                <span className="mt-0.5 flex gap-0.5">
                  {TYPE_ORDER.filter((t) => byDate.get(d)?.has(t)).map((t) => (
                    <span key={t} className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[t]}`} />
                  ))}
                </span>
              </button>
            ) : (
              <div key={`e${i}`} />
            ),
          )}
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {TYPE_ORDER.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
            >
              <span className={`h-2 w-2 rounded-full ${DOT_CLASSES[t]}`} />
              {TYPE_LABELS[t]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
