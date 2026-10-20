import { useEffect, useRef, type MouseEvent } from 'react';
import type { Entry } from '../types';
import { conflictingIds, displayShort, isChecked, layoutDay, noteDetails } from '../lib/entries';
import { fromMinutes, toMinutes } from '../lib/dates';
import { BLOCK_CLASSES } from './typeStyles';

interface Props {
  days: string[];
  entries: Entry[];
  now: { date: string; minutes: number };
  hourHeight: number;
  compact?: boolean;
  onSelect: (e: Entry) => void;
  onCreate: (date: string, start: string) => void;
}

const DEFAULT_FROM = 7 * 60;
const DEFAULT_TO = 20 * 60;

/** Savaitės tinklelis (07:00–20:00, prasiplečia, jei yra ankstesnių / vėlesnių įrašų). */
export function TimeGrid({ days, entries, now, hourHeight, compact, onSelect, onCreate }: Props) {
  const shown = entries.filter((e) => days.includes(e.date));
  const from = Math.min(DEFAULT_FROM, ...shown.map((e) => Math.floor(toMinutes(e.start) / 60) * 60));
  const to = Math.max(DEFAULT_TO, ...shown.map((e) => Math.ceil(toMinutes(e.end) / 60) * 60));
  const px = hourHeight / 60;
  const height = (to - from) * px;
  const hours: number[] = [];
  for (let m = from; m <= to; m += 60) hours.push(m);

  // Atidarius savaitę su šiandiena, kai dabartinis laikas žemiau ekrano – nuslenkama iki jo.
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const line = root.current?.querySelector('[data-now-line]');
    if (!line) return;
    const top = line.getBoundingClientRect().top;
    if (top > window.innerHeight * 0.75) window.scrollBy({ top: top - window.innerHeight * 0.4, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root} className="relative mt-3 flex" style={{ height }}>
      <div className="relative w-10 shrink-0">
        {hours.map((m) => (
          <div
            key={m}
            className="absolute right-1.5 -translate-y-1/2 text-[10px] font-medium tabular-nums text-neutral-400"
            style={{ top: (m - from) * px }}
          >
            {fromMinutes(m)}
          </div>
        ))}
      </div>
      <div className="relative flex flex-1">
        {hours.map((m) => (
          <div
            key={m}
            className="pointer-events-none absolute inset-x-0 border-t border-neutral-100 dark:border-neutral-900"
            style={{ top: (m - from) * px }}
          />
        ))}
        {days.map((d) => (
          <DayColumn
            key={d}
            date={d}
            entries={shown.filter((e) => e.date === d)}
            from={from}
            px={px}
            now={now}
            compact={compact}
            onSelect={onSelect}
            onCreate={onCreate}
          />
        ))}
      </div>
    </div>
  );
}

function DayColumn({
  date,
  entries,
  from,
  px,
  now,
  compact,
  onSelect,
  onCreate,
}: {
  date: string;
  entries: Entry[];
  from: number;
  px: number;
  now: { date: string; minutes: number };
  compact?: boolean;
  onSelect: (e: Entry) => void;
  onCreate: (date: string, start: string) => void;
}) {
  const conflicts = conflictingIds(entries);
  const isToday = date === now.date;

  const handleEmptyClick = (ev: MouseEvent<HTMLDivElement>) => {
    if (ev.target !== ev.currentTarget) return;
    const y = ev.clientY - ev.currentTarget.getBoundingClientRect().top;
    const minutes = Math.floor((from + y / px) / 30) * 30;
    onCreate(date, fromMinutes(Math.min(minutes, 23 * 60)));
  };

  return (
    <div className={`relative flex-1 ${isToday ? 'rounded-xl bg-accent-500/[0.04]' : ''}`} onClick={handleEmptyClick}>
      {layoutDay(entries).map(({ entry: e, col, cols }) => {
        const sMin = toMinutes(e.start);
        const eMin = toMinutes(e.end);
        const top = (sMin - from) * px;
        const h = Math.max(22, (eMin - sMin) * px - 2);
        const isNow = isToday && sMin <= now.minutes && now.minutes < eMin;
        const past = date < now.date || (isToday && eMin <= now.minutes);
        const missed = e.type === 'practice' && e.status === 'missed';
        const checked = isChecked(e);
        const details = noteDetails(e.note);
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => onSelect(e)}
            className={`absolute flex flex-col justify-start overflow-hidden rounded-xl border-l-[3px] px-1.5 py-1 text-left leading-tight ${
              BLOCK_CLASSES[e.type]
            } ${isNow ? 'ring-2 ring-accent-500' : ''} ${past ? 'opacity-55' : ''} ${missed || checked ? 'line-through' : ''}`}
            style={{
              top,
              height: h,
              left: `calc(${(col / cols) * 100}% + 1.5px)`,
              width: `calc(${100 / cols}% - 3px)`,
            }}
          >
            <div className={`font-bold ${compact ? 'truncate text-[11px]' : 'truncate text-sm'}`}>
              {conflicts.has(e.id) && <span title="Persidengia">⚠️ </span>}
              {compact ? displayShort(e) : e.title}
            </div>
            <div className={`tabular-nums opacity-70 ${compact ? 'text-[10px]' : 'text-xs'}`}>
              {compact ? e.start : `${e.start}–${e.end}`}
            </div>
            {details && h > 60 && (
              <div className={`truncate opacity-60 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                {compact ? details.split(' · ')[0] : details}
              </div>
            )}
          </button>
        );
      })}
      {isToday && now.minutes >= from && (
        <div data-now-line className="pointer-events-none absolute inset-x-0 z-10" style={{ top: (now.minutes - from) * px }}>
          <div className="relative h-0.5 bg-accent-500">
            <div className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-accent-500" />
          </div>
        </div>
      )}
    </div>
  );
}
