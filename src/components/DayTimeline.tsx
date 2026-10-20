// Dienos laiko juosta Structured stiliumi: įrašai išrikiuoti iš eilės ant vertikalios linijos,
// kiekvienas – spalvota kapsulė su ikona (aukštis pagal trukmę), laikas, pavadinimas ir varnelė.
// Tarpai tarp įrašų rodomi kaip „Laisva …“ (paspaudus – naujas įrašas tuo laiku).

import { useEffect, useRef } from 'react';
import type { Entry } from '../types';
import { TYPE_LABELS } from '../types';
import { formatDuration, formatIn, fromMinutes, toMinutes } from '../lib/dates';
import { conflictingIds, dragTimes, isChecked, noteDetails, sortEntries, type DragMode } from '../lib/entries';
import { useLongPressDrag } from '../lib/useLongPressDrag';
import { haptic } from '../lib/hooks';
import { Icon } from './Icon';
import { RING_CLASSES, SOLID_CLASSES, TYPE_ICON } from './typeStyles';

interface Props {
  date: string;
  entries: Entry[];
  now: { date: string; minutes: number };
  onSelect: (e: Entry) => void;
  onCreate: (date: string, start: string) => void;
  onMove: (e: Entry, start: string, end: string) => void;
  onToggle: (e: Entry) => void;
}

/** Kapsulės aukštis pagal trukmę */
const pillHeight = (minutes: number) => Math.round(Math.min(200, Math.max(52, minutes * 0.75)));
/** Tempiant: kiek pikselių piršto judesio = 1 minutė */
const DRAG_PX_PER_MIN = 1.2;
/** Mažesni tarpai nerodomi kaip „laisvas laikas“ */
const MIN_GAP = 15;

type Row =
  | { kind: 'entry'; entry: Entry }
  | { kind: 'gap'; start: number; end: number }
  | { kind: 'now' };

export function DayTimeline({ date, entries, now, onSelect, onCreate, onMove, onToggle }: Props) {
  const day = entries.filter((e) => e.date === date).sort(sortEntries);
  const conflicts = conflictingIds(day);
  const isToday = date === now.date;

  const { drag, bind, consumeClick } = useLongPressDrag({
    pxPerMin: DRAG_PX_PER_MIN,
    onDrop: (id: string, mode: DragMode, delta: number) => {
      const e = day.find((x) => x.id === id);
      if (!e) return;
      const t = dragTimes(e, mode, delta);
      onMove(e, fromMinutes(t.start), fromMinutes(t.end));
    },
  });

  // Atidarius šiandieną, kai „dabar“ žemiau ekrano – nuslenkama iki jo.
  const root = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const mark = root.current?.querySelector('[data-now]');
    if (!mark) return;
    const top = mark.getBoundingClientRect().top;
    if (top > window.innerHeight * 0.75) window.scrollBy({ top: top - window.innerHeight * 0.4, behavior: 'smooth' });
    // Tik atidarius (komponentas pernaudojamas su key, kai keičiasi data).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!day.length) {
    return (
      <div className="flex flex-col items-center px-8 pb-10 pt-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-50 text-accent-500 dark:bg-accent-500/15">
          <Icon name="star" className="h-9 w-9" />
        </div>
        <div className="mt-4 text-lg font-semibold">Laisva diena</div>
        <p className="mt-1 text-sm text-neutral-500">Įrašų nėra. Paspausk „+“, kad suplanuotum ką nors.</p>
      </div>
    );
  }

  // Eilutės: įrašai, laisvo laiko tarpai ir „dabar“ žymė (jei dabar – tarpe).
  const rows: Row[] = [];
  let cursor = -1;
  let nowPlaced = !isToday;
  for (const entry of day) {
    const s = toMinutes(entry.start);
    if (!nowPlaced && now.minutes < s && (cursor < 0 || now.minutes >= cursor)) {
      rows.push({ kind: 'now' });
      nowPlaced = true;
    }
    if (cursor >= 0 && s - cursor >= MIN_GAP) rows.push({ kind: 'gap', start: cursor, end: s });
    rows.push({ kind: 'entry', entry });
    cursor = Math.max(cursor, toMinutes(entry.end));
    if (!nowPlaced && now.minutes < cursor) nowPlaced = true; // dabar vyksta šis įrašas
  }
  if (!nowPlaced) rows.push({ kind: 'now' });

  const nowLabel = fromMinutes(now.minutes);

  return (
    <ol ref={root} className="relative px-3 pb-6 pt-2">
      {rows.map((row, i) => {
        if (row.kind === 'now') {
          return (
            <li key="now" data-now className="flex items-center gap-3 py-1">
              <div className="w-11 shrink-0 text-right text-xs font-bold tabular-nums text-accent-500">{nowLabel}</div>
              <div className="relative flex w-12 shrink-0 justify-center self-stretch">
                <Line />
                <span className="relative z-10 my-1 h-3 w-3 rounded-full bg-accent-500 ring-4 ring-accent-500/20" />
              </div>
              <div className="h-0.5 flex-1 rounded bg-accent-500/60" />
            </li>
          );
        }
        if (row.kind === 'gap') {
          const past = isToday ? row.end <= now.minutes : date < now.date;
          return (
            <li key={`gap${i}`} className="flex items-center gap-3">
              <div className="w-11 shrink-0" />
              <div className="relative flex w-12 shrink-0 justify-center self-stretch">
                <Line dashed />
              </div>
              <button
                type="button"
                onClick={() => {
                  haptic(8);
                  onCreate(date, fromMinutes(row.start));
                }}
                className={`my-2 flex flex-1 items-center gap-1.5 rounded-xl py-1.5 text-left text-xs ${
                  past ? 'text-neutral-300 dark:text-neutral-700' : 'text-neutral-400'
                }`}
              >
                <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.5} />
                Laisva {formatDuration(row.end - row.start)}
              </button>
            </li>
          );
        }

        const e = row.entry;
        const dragging = drag?.id === e.id ? drag : null;
        const t = dragging ? dragTimes(e, dragging.mode, dragging.delta) : { start: toMinutes(e.start), end: toMinutes(e.end) };
        const duration = t.end - t.start;
        const h = pillHeight(duration);
        const checked = isChecked(e);
        const missed = e.type === 'practice' && e.status === 'missed';
        const running = isToday && !dragging && t.start <= now.minutes && now.minutes < t.end;
        const past = !dragging && (date < now.date || (isToday && t.end <= now.minutes));
        const progress = running ? (now.minutes - t.start) / duration : past ? 1 : 0;
        const details = noteDetails(e.note);
        const startsIn = isToday && !past && !running ? t.start - now.minutes : null;

        return (
          <li
            key={e.id}
            data-now={running || undefined}
            className={`no-callout relative flex gap-3 ${dragging ? 'z-20' : ''}`}
            style={dragging?.mode === 'move' ? { transform: `translateY(${dragging.dy}px)` } : undefined}
          >
            <div className={`w-11 shrink-0 pt-2 text-right text-xs tabular-nums ${dragging ? 'font-bold text-accent-500' : 'text-neutral-400'}`}>
              {fromMinutes(t.start)}
            </div>

            {/* Kapsulė su ikona ant linijos */}
            <div className="relative flex w-12 shrink-0 justify-center pb-2">
              <Line />
              <button
                type="button"
                aria-label={`${TYPE_LABELS[e.type]}: ${e.title}`}
                {...bind(e.id, 'move')}
                onClick={() => !consumeClick() && onSelect(e)}
                className={`relative z-10 flex w-12 items-start justify-center overflow-hidden rounded-full pt-3.5 text-white shadow-sm transition-[height] ${
                  SOLID_CLASSES[e.type]
                } ${dragging ? `scale-105 shadow-lg ring-4 ${RING_CLASSES[e.type]}` : ''} ${missed ? 'opacity-40' : ''}`}
                style={{ height: h }}
              >
                {/* Praėjusi dalis – šviesesnė */}
                {progress > 0 && (
                  <span className="absolute inset-x-0 top-0 bg-white/30" style={{ height: `${progress * 100}%` }} />
                )}
                <Icon name={TYPE_ICON[e.type]} className="relative h-5 w-5" strokeWidth={2.2} />
                {/* Apačia – trukmės keitimas */}
                <span
                  {...bind(e.id, 'resize')}
                  onClick={(ev) => ev.stopPropagation()}
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 flex h-4 cursor-ns-resize items-center justify-center"
                >
                  <span className="h-1 w-4 rounded-full bg-white/60" />
                </span>
              </button>
            </div>

            {/* Tekstas */}
            <button
              type="button"
              {...bind(e.id, 'move')}
              onClick={() => !consumeClick() && onSelect(e)}
              className="flex min-w-0 flex-1 flex-col justify-start pb-4 pt-1 text-left"
              style={{ minHeight: h }}
            >
              <div className={`text-xs tabular-nums ${dragging ? 'font-bold text-accent-500' : 'text-neutral-500'}`}>
                {fromMinutes(t.start)}–{fromMinutes(t.end)}
                <span className="text-neutral-400"> · {formatDuration(duration)}</span>
              </div>
              <div
                className={`mt-0.5 font-semibold leading-snug ${checked ? 'text-neutral-400 line-through decoration-2' : ''} ${
                  missed ? 'text-neutral-400 line-through' : ''
                }`}
              >
                {conflicts.has(e.id) && <span title="Persidengia su kitu įrašu">⚠️ </span>}
                {e.title}
              </div>
              {details && <div className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{details}</div>}
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {running && (
                  <span className="rounded-full bg-accent-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                    Dabar · liko {formatIn(t.end - now.minutes).replace('po ', '')}
                  </span>
                )}
                {startsIn !== null && startsIn <= 180 && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {formatIn(startsIn)}
                  </span>
                )}
                {missed && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500 dark:bg-neutral-800">
                    neįvyko
                  </span>
                )}
                {dragging && (
                  <span className="rounded-full bg-accent-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {dragging.mode === 'move' ? 'Perkelti' : 'Trukmė'}: {fromMinutes(t.start)}–{fromMinutes(t.end)}
                  </span>
                )}
              </div>
            </button>

            {/* Varnelė */}
            <button
              type="button"
              aria-label={checked ? 'Pažymėta kaip atlikta' : 'Pažymėti kaip atliktą'}
              aria-pressed={checked}
              onClick={() => {
                haptic(checked ? 8 : [10, 40, 10]);
                onToggle(e);
              }}
              className="flex h-11 w-9 shrink-0 items-start justify-center pt-1.5"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${
                  checked ? `pop border-transparent text-white ${SOLID_CLASSES[e.type]}` : 'border-neutral-300 dark:border-neutral-600'
                }`}
              >
                {checked && <Icon name="check" className="h-4 w-4" strokeWidth={3} />}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Vertikali linija per visą eilutės aukštį (jungia kapsules). */
function Line({ dashed }: { dashed?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute inset-y-0 left-1/2 -translate-x-1/2 ${
        dashed
          ? 'border-l-2 border-dashed border-neutral-200 dark:border-neutral-800'
          : 'w-0.5 bg-neutral-200 dark:bg-neutral-800'
      }`}
    />
  );
}
