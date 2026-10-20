import type { Entry } from '../types';
import { addDays, diffDays, durationHours, nowInVilnius, toMinutes } from './dates';

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export const sortEntries = (a: Entry, b: Entry) =>
  a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.end.localeCompare(b.end);

/** Visos savaitinės datos nuo `from` iki `until` imtinai. */
export function weeklyDates(from: string, until: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= until; d = addDays(d, 7)) out.push(d);
  return out;
}

export type EntryDraft = Omit<Entry, 'id'> & { id?: string };

/** Naujas įrašas arba savaitinė serija. */
export function createEntries(draft: EntryDraft): Entry[] {
  const { id: _ignored, ...base } = draft;
  if (!base.repeatUntil || base.repeatUntil <= base.date) {
    return [{ ...base, repeatUntil: undefined, seriesId: undefined, id: newId(), source: 'user' }];
  }
  const seriesId = newId();
  return weeklyDates(base.date, base.repeatUntil).map((date) => ({
    ...base,
    date,
    seriesId,
    id: newId(),
    source: 'user',
  }));
}

export interface SeriesChange {
  put: Entry[];
  remove: string[];
}

/**
 * Pritaiko pakeitimus visai serijai: perkelia visas datas tuo pačiu dienų skirtumu,
 * atnaujina laukus ir prailgina / patrumpina seriją pagal naują „iki“ datą.
 * Esami nariai (su jų praktikos būsena) išlaikomi, kai data sutampa.
 */
export function applyToSeries(series: Entry[], original: Entry, draft: EntryDraft): SeriesChange {
  const shift = diffDays(draft.date, original.date);
  const sorted = [...series].sort(sortEntries);
  const firstDate = addDays(sorted[0].date, shift);
  const oldUntil = original.repeatUntil ?? sorted[sorted.length - 1].date;
  const until = draft.repeatUntil || addDays(oldUntil, shift);
  const seriesId = original.seriesId!;

  const byDate = new Map(sorted.map((e) => [addDays(e.date, shift), e]));
  const shared = {
    title: draft.title,
    short: draft.short,
    type: draft.type,
    start: draft.start,
    end: draft.end,
    note: draft.note,
    repeatUntil: until,
  };
  const put: Entry[] = [];
  const keep = new Set<string>();
  for (const date of weeklyDates(firstDate, until)) {
    const existing = byDate.get(date);
    if (existing) {
      keep.add(existing.id);
      put.push({ ...existing, ...shared, date });
    } else {
      put.push({ ...shared, date, seriesId, id: newId(), source: 'user', status: draft.type === 'practice' ? 'auto' : undefined });
    }
  }
  // Redaguojamam įrašui pritaikomi ir jo asmeniniai laukai (būsena, faktinės val.).
  const self = put.find((e) => e.id === original.id);
  if (self) {
    self.status = draft.status;
    self.actualHours = draft.actualHours;
  }
  const remove = sorted.filter((e) => !keep.has(e.id)).map((e) => e.id);
  return { put, remove };
}

export function overlaps(a: Pick<Entry, 'date' | 'start' | 'end'>, b: Pick<Entry, 'date' | 'start' | 'end'>): boolean {
  return a.date === b.date && toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

/** Esami įrašai, persidengiantys su bent vienu iš `candidates` (išskyrus pačius kandidatus). */
export function findConflicts(candidates: Entry[], all: Entry[]): { entry: Entry; with: Entry }[] {
  const ids = new Set(candidates.map((c) => c.id));
  const out: { entry: Entry; with: Entry }[] = [];
  for (const c of candidates) {
    for (const e of all) {
      if (!ids.has(e.id) && overlaps(c, e)) out.push({ entry: c, with: e });
    }
  }
  return out;
}

/** Įrašų id, kurie persidengia su kitais tą pačią dieną. */
export function conflictingIds(dayEntries: Entry[]): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < dayEntries.length; i++)
    for (let j = i + 1; j < dayEntries.length; j++)
      if (overlaps(dayEntries[i], dayEntries[j])) {
        set.add(dayEntries[i].id);
        set.add(dayEntries[j].id);
      }
  return set;
}

export interface Positioned {
  entry: Entry;
  col: number;
  cols: number;
}

/** Išdėsto persidengiančius įrašus stulpeliais (kaip kalendoriuose). */
export function layoutDay(dayEntries: Entry[]): Positioned[] {
  const sorted = [...dayEntries].sort(sortEntries);
  const result: Positioned[] = [];
  let group: Positioned[] = [];
  let groupEnd = -1;
  const flush = () => {
    const cols = Math.max(1, ...group.map((p) => p.col + 1));
    for (const p of group) p.cols = cols;
    result.push(...group);
    group = [];
  };
  for (const entry of sorted) {
    const s = toMinutes(entry.start);
    if (group.length && s >= groupEnd) flush();
    const used = new Set(group.filter((p) => toMinutes(p.entry.end) > s).map((p) => p.col));
    let col = 0;
    while (used.has(col)) col++;
    group.push({ entry, col, cols: 1 });
    groupEnd = Math.max(groupEnd, toMinutes(entry.end));
  }
  if (group.length) flush();
  return result;
}

/** Pastaba be modulio kodo („P170B115 · B2-102 · prof. …“ → „B2-102 · prof. …“). */
export function noteDetails(note?: string): string {
  if (!note) return '';
  const parts = note.split(' · ');
  return parts.length > 1 && /^[A-Z]\d{3}[A-Z]\d{3}$/.test(parts[0]) ? parts.slice(1).join(' · ') : note;
}

const SMALL_WORDS = new Set(['ir', 'bei', 'ar', 'su', 'į', 'iš']);

/** Trumpinys siauriems stulpeliams: „Skaitiniai metodai ir algoritmai“ → „SMA“. */
export function shortTitle(title: string): string {
  const words = title.split(/\s+/).filter((w) => w && !SMALL_WORDS.has(w.toLowerCase()));
  if (title.length <= 10 || words.length < 2) return title;
  return words.map((w) => w[0].toUpperCase()).join('');
}

export type DragMode = 'move' | 'resize';
const DAY_END = 24 * 60 - 1;

/**
 * Naujas bloko laikas (minutėmis) po tempimo per `delta` min.:
 * 'move' perkelia visą bloką, 'resize' keičia tik pabaigą. Neišeina už paros ribų,
 * trukmė ne trumpesnė nei `minDuration`.
 */
export function dragTimes(e: Pick<Entry, 'start' | 'end'>, mode: DragMode, delta: number, minDuration = 15) {
  const s = toMinutes(e.start);
  const en = toMinutes(e.end);
  if (mode === 'move') {
    const d = Math.max(-s, Math.min(DAY_END - en, delta));
    return { start: s + d, end: en + d };
  }
  return { start: s, end: Math.max(s + minDuration, Math.min(DAY_END, en + delta)) };
}

/** Savaitės stulpelyje rodomas pavadinimas: paties įvestas trumpinys arba sugeneruotas. */
export const displayShort = (e: Pick<Entry, 'title' | 'short'>) => e.short?.trim() || shortTitle(e.title);

/** Ar įrašas pažymėtas atliktu (laiko juostos varnelė). */
export const isChecked = (e: Entry) => (e.type === 'practice' ? e.status === 'done' : Boolean(e.done));

/** Varnelės perjungimas: praktikai – „įvyko“ ↔ „auto“, kitiems – done. */
export function toggleChecked(e: Entry): Entry {
  if (e.type === 'practice') return { ...e, status: e.status === 'done' ? 'auto' : 'done' };
  return { ...e, done: !e.done || undefined };
}

/** Praktikos bloko įskaitomos valandos. */
export function countedHours(e: Entry): number {
  if (e.status === 'missed') return e.actualHours ?? 0;
  return e.actualHours ?? durationHours(e.start, e.end);
}

/** Ar praktikos blokas jau laikomas atliktu. */
export function isCompleted(e: Entry, now = nowInVilnius()): boolean {
  if (e.status === 'done') return true;
  if (e.status === 'missed') return (e.actualHours ?? 0) > 0;
  return e.date < now.date || (e.date === now.date && toMinutes(e.end) <= now.minutes);
}

export interface PracticeTotals {
  planned: number;
  completed: number;
}

export function practiceTotals(entries: Entry[], now = nowInVilnius()): PracticeTotals {
  let planned = 0;
  let completed = 0;
  for (const e of entries) {
    if (e.type !== 'practice') continue;
    const h = countedHours(e);
    planned += h;
    if (isCompleted(e, now)) completed += h;
  }
  return { planned, completed };
}
