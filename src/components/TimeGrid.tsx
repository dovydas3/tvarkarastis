import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import type { Entry } from '../types';
import { conflictingIds, displayShort, dragTimes, layoutDay, noteDetails, type DragMode } from '../lib/entries';
import { fromMinutes, toMinutes, WEEKDAYS_SHORT, weekdayIndex } from '../lib/dates';
import { gesture, haptic } from '../lib/hooks';
import { BLOCK_CLASSES } from './typeStyles';

interface Props {
  days: string[];
  entries: Entry[];
  now: { date: string; minutes: number };
  hourHeight: number;
  compact?: boolean;
  showHeaders?: boolean;
  onSelect: (e: Entry) => void;
  onCreate: (date: string, start: string) => void;
  /** Jei nurodyta – blokus galima tempti (perkelti) ir ištempti (keisti pabaigą). */
  onMove?: (e: Entry, start: string, end: string) => void;
}

const DEFAULT_FROM = 7 * 60;
const DEFAULT_TO = 20 * 60;
/** Tempiant laikas pritraukiamas kas 15 min. */
const SNAP = 15;
/** Kiek laikyti pirštą, kol blokas „pakeliamas“ (kad paprastas slinkimas jo nejudintų). */
const LONG_PRESS_MS = 350;

/** Laiko juosta (07:00–20:00, prasiplečia, jei yra ankstesnių / vėlesnių įrašų) vienai ar kelioms dienoms. */
export function TimeGrid({ days, entries, now, hourHeight, compact, showHeaders, onSelect, onCreate, onMove }: Props) {
  const shown = entries.filter((e) => days.includes(e.date));
  const from = Math.min(DEFAULT_FROM, ...shown.map((e) => Math.floor(toMinutes(e.start) / 60) * 60));
  const to = Math.max(DEFAULT_TO, ...shown.map((e) => Math.ceil(toMinutes(e.end) / 60) * 60));
  const px = hourHeight / 60;
  const height = (to - from) * px;
  const hours: number[] = [];
  for (let m = from; m <= to; m += 60) hours.push(m);

  // Atidarius šiandieną, kai dabartinis laikas žemiau ekrano – nuslenkama iki jo.
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const line = root.current?.querySelector('[data-now-line]');
    if (!line) return;
    const top = line.getBoundingClientRect().top;
    if (top > window.innerHeight * 0.75) window.scrollBy({ top: top - window.innerHeight * 0.4, behavior: 'smooth' });
    // Tik atidarius (komponentas pernaudojamas su key, kai keičiasi data).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root}>
      {showHeaders && (
        <div className="sticky top-0 z-20 flex border-b border-slate-200 bg-slate-50/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="w-10 shrink-0" />
          {days.map((d) => {
            const isToday = d === now.date;
            return (
              <div key={d} className="flex-1 py-1 text-center">
                <div className="text-xs text-slate-500">{WEEKDAYS_SHORT[weekdayIndex(d)]}</div>
                <div
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold ${
                    isToday ? 'bg-teal-700 text-white' : ''
                  }`}
                >
                  {Number(d.slice(8))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="relative mt-2 flex" style={{ height }}>
        <div className="relative w-10 shrink-0">
          {hours.map((m) => (
            <div
              key={m}
              className="absolute right-1 -translate-y-1/2 text-[11px] tabular-nums text-slate-500"
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
              className="pointer-events-none absolute inset-x-0 border-t border-slate-200 dark:border-slate-800"
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
              onMove={compact ? undefined : onMove}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface DragState {
  id: string;
  mode: DragMode;
  /** Pasislinkimas minutėmis (jau pritrauktas prie SNAP) */
  delta: number;
}

const applyDelta = (e: Entry, mode: DragMode, delta: number) => dragTimes(e, mode, delta, SNAP);

function DayColumn({
  date,
  entries,
  from,
  px,
  now,
  compact,
  onSelect,
  onCreate,
  onMove,
}: {
  date: string;
  entries: Entry[];
  from: number;
  px: number;
  now: { date: string; minutes: number };
  compact?: boolean;
  onSelect: (e: Entry) => void;
  onCreate: (date: string, start: string) => void;
  onMove?: (e: Entry, start: string, end: string) => void;
}) {
  const conflicts = conflictingIds(entries);
  const isToday = date === now.date;
  const [drag, setDrag] = useState<DragState | null>(null);
  const pending = useRef<{
    entry: Entry;
    mode: DragMode;
    x0: number;
    y0: number;
    pointerType: string;
    active: boolean;
    timer?: number;
    delta: number;
  } | null>(null);
  const suppressClick = useRef(false);

  useEffect(
    () => () => {
      clearTimeout(pending.current?.timer);
      gesture.dragging = false;
    },
    [],
  );

  const handleEmptyClick = (ev: MouseEvent<HTMLDivElement>) => {
    if (ev.target !== ev.currentTarget) return;
    const y = ev.clientY - ev.currentTarget.getBoundingClientRect().top;
    const minutes = Math.floor((from + y / px) / 30) * 30;
    onCreate(date, fromMinutes(Math.min(minutes, 23 * 60)));
  };

  const activate = () => {
    const p = pending.current;
    if (!p) return;
    p.active = true;
    gesture.dragging = true;
    haptic(15);
    setDrag({ id: p.entry.id, mode: p.mode, delta: 0 });
  };

  const reset = () => {
    clearTimeout(pending.current?.timer);
    const wasActive = pending.current?.active;
    pending.current = null;
    // pointerup ateina prieš touchend – vėliavą nuimam vėliau, kad braukimas nepakeistų dienos.
    if (wasActive) setTimeout(() => (gesture.dragging = false), 50);
    setDrag(null);
  };

  const onPointerDown = (ev: PointerEvent<HTMLElement>, entry: Entry, mode: DragMode) => {
    if (!onMove || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    ev.stopPropagation();
    clearTimeout(pending.current?.timer);
    pending.current = { entry, mode, x0: ev.clientX, y0: ev.clientY, pointerType: ev.pointerType, active: false, delta: 0 };
    if (ev.pointerType === 'mouse') ev.currentTarget.setPointerCapture(ev.pointerId);
    else pending.current.timer = window.setTimeout(activate, LONG_PRESS_MS);
  };

  const onPointerMove = (ev: PointerEvent<HTMLElement>) => {
    const p = pending.current;
    if (!p) return;
    const dx = ev.clientX - p.x0;
    const dy = ev.clientY - p.y0;
    if (!p.active) {
      if (p.pointerType === 'mouse') {
        if (Math.abs(dy) > 4) activate();
        else return;
      } else {
        // Pirštas pajudėjo prieš ilgą paspaudimą – tai slinkimas, ne tempimas.
        if (Math.hypot(dx, dy) > 8) {
          clearTimeout(p.timer);
          pending.current = null;
        }
        return;
      }
    }
    const delta = Math.round(dy / px / SNAP) * SNAP;
    if (delta !== p.delta) {
      p.delta = delta;
      haptic(5);
      setDrag({ id: p.entry.id, mode: p.mode, delta });
    }
  };

  const onPointerUp = () => {
    const p = pending.current;
    if (!p) return;
    if (p.active) {
      suppressClick.current = true;
      const { start, end } = applyDelta(p.entry, p.mode, p.delta);
      if (p.delta !== 0) onMove?.(p.entry, fromMinutes(start), fromMinutes(end));
    }
    reset();
  };

  return (
    <div
      className={`relative flex-1 border-l border-slate-200 dark:border-slate-800 ${isToday ? 'bg-teal-500/5' : ''}`}
      onClick={handleEmptyClick}
    >
      {layoutDay(entries).map(({ entry: e, col, cols }) => {
        const dragging = drag?.id === e.id ? drag : null;
        const { start: sMin, end: eMin } = dragging
          ? applyDelta(e, dragging.mode, dragging.delta)
          : { start: toMinutes(e.start), end: toMinutes(e.end) };
        const top = (sMin - from) * px;
        const h = Math.max(22, (eMin - sMin) * px - 2);
        const isNow = isToday && sMin <= now.minutes && now.minutes < eMin;
        const past = !dragging && (date < now.date || (isToday && eMin <= now.minutes));
        const missed = e.type === 'practice' && e.status === 'missed';
        const details = noteDetails(e.note);
        const timeLabel = compact ? fromMinutes(sMin) : `${fromMinutes(sMin)}–${fromMinutes(eMin)}`;
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              onSelect(e);
            }}
            onPointerDown={(ev) => onPointerDown(ev, e, 'move')}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={reset}
            onContextMenu={(ev) => onMove && ev.preventDefault()}
            className={`no-callout absolute flex flex-col justify-start overflow-hidden rounded-lg border-l-4 px-1.5 py-1 text-left leading-tight ${
              BLOCK_CLASSES[e.type]
            } ${isNow && !dragging ? 'ring-2 ring-teal-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-950' : ''} ${
              past ? 'opacity-60' : ''
            } ${missed ? 'line-through' : ''} ${
              dragging ? 'z-30 cursor-grabbing shadow-2xl ring-2 ring-teal-500' : 'shadow-sm transition-[top,height] duration-150'
            }`}
            style={{
              top,
              height: h,
              left: `calc(${(col / cols) * 100}% + 2px)`,
              width: `calc(${100 / cols}% - 4px)`,
            }}
          >
            <div
              className={`font-semibold ${compact ? 'truncate text-[11px]' : h > 80 ? 'line-clamp-2 text-sm' : 'truncate text-sm'}`}
            >
              {conflicts.has(e.id) && <span title="Persidengia">⚠️ </span>}
              {compact ? displayShort(e) : e.title}
            </div>
            <div className={`tabular-nums ${dragging ? 'font-bold' : 'opacity-80'} ${compact ? 'text-[10px]' : 'text-xs'}`}>
              {timeLabel}
              {!compact && !dragging && e.status === 'done' && ' · įvyko ✓'}
              {!compact && !dragging && missed && ' · neįvyko'}
            </div>
            {details && h > (compact ? 60 : 50) && (
              <div className={`truncate opacity-70 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                {compact ? details.split(' · ')[0] : details}
              </div>
            )}
            {onMove && h >= 36 && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 flex h-3.5 cursor-ns-resize items-end justify-center pb-1"
                onPointerDown={(ev) => onPointerDown(ev, e, 'resize')}
              >
                <span className="h-1 w-8 rounded-full bg-current opacity-25" />
              </span>
            )}
          </button>
        );
      })}
      {isToday && now.minutes >= from && (
        <div data-now-line className="pointer-events-none absolute inset-x-0 z-10" style={{ top: (now.minutes - from) * px }}>
          <div className="relative h-0.5 bg-red-500">
            <div className="absolute -left-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
          </div>
        </div>
      )}
    </div>
  );
}
