import { useMemo, useState } from 'react';
import type { Entry, EntryType, PracticeStatus } from '../types';
import { TYPE_LABELS } from '../types';
import { addDays, formatLongDay, formatShort, toMinutes, WEEKDAYS_SHORT, weekdayIndex } from '../lib/dates';
import { findConflicts, shortTitle, weeklyDates, type EntryDraft } from '../lib/entries';
import { Dialog, Segmented, TimeSelect } from './ui';
import { TYPE_ORDER } from './typeStyles';

export type Scope = 'one' | 'all';

interface Props {
  /** Redaguojamas įrašas arba naujo įrašo pradinės reikšmės */
  entry?: Entry;
  defaults?: Partial<Entry>;
  entries: Entry[];
  onSave: (draft: EntryDraft, scope: Scope) => void;
  onDelete: (entry: Entry, scope: Scope) => void;
  onClose: () => void;
}

export function EntrySheet({ entry, defaults, entries, onSave, onDelete, onClose }: Props) {
  const init = entry ?? defaults ?? {};
  const [title, setTitle] = useState(init.title ?? '');
  const [short, setShort] = useState(init.short ?? '');
  const [type, setType] = useState<EntryType>(init.type ?? 'personal');
  const [date, setDate] = useState(init.date ?? '');
  const [start, setStart] = useState(init.start ?? '09:00');
  const [end, setEnd] = useState(init.end ?? '10:00');
  const [note, setNote] = useState(init.note ?? '');
  const [repeat, setRepeat] = useState(Boolean(init.repeatUntil));
  const [until, setUntil] = useState(init.repeatUntil ?? (init.date ? addDays(init.date, 28) : ''));
  const [status, setStatus] = useState<PracticeStatus>(init.status ?? 'auto');
  const [actual, setActual] = useState(init.actualHours?.toString() ?? '');
  const [ask, setAsk] = useState<null | 'save' | 'delete'>(null);

  const inSeries = Boolean(entry?.seriesId);
  const valid = date && toMinutes(end) > toMinutes(start) && (!repeat || until >= date);

  const draft: EntryDraft = {
    id: entry?.id,
    title: title.trim() || TYPE_LABELS[type],
    short: short.trim() || undefined,
    type,
    date,
    start,
    end,
    note: note.trim() || undefined,
    repeatUntil: repeat ? until : undefined,
    seriesId: entry?.seriesId,
    status: type === 'practice' ? status : undefined,
    actualHours: type === 'practice' && actual !== '' ? Math.max(0, Number(actual.replace(',', '.'))) : undefined,
    source: entry?.source ?? 'user',
  };

  // Konfliktai rodomi tiesiogiai pildant formą; išsaugoti vis tiek galima.
  const conflicts = useMemo(() => {
    if (!valid) return [];
    const dates = repeat && !inSeries ? weeklyDates(date, until) : [date];
    const others = entries.filter((e) => e.id !== entry?.id && (!inSeries || e.seriesId !== entry?.seriesId));
    const candidates = dates.map((d, i) => ({ ...draft, id: `__new${i}`, date: d }) as Entry);
    return findConflicts(candidates, others);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, date, start, end, repeat, until, entries, entry?.id]);

  const submit = () => {
    if (!valid) return;
    if (inSeries) setAsk('save');
    else onSave(draft, 'one');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <form
        className="pb-safe max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-slate-50 dark:bg-slate-950 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-slate-50/95 px-4 pb-2 pt-3 backdrop-blur dark:bg-slate-950/95">
          <button type="button" className="btn min-h-10 px-2 text-teal-700 dark:text-teal-400" onClick={onClose}>
            Atšaukti
          </button>
          <h2 className="font-semibold">{entry ? 'Redaguoti' : 'Naujas įrašas'}</h2>
          <button type="submit" className="btn min-h-10 px-2 font-semibold text-teal-700 disabled:opacity-40 dark:text-teal-400" disabled={!valid}>
            Išsaugoti
          </button>
        </div>

        <div className="space-y-4 px-4 pb-6">
          <input
            className="field text-lg"
            placeholder={`Pavadinimas (${TYPE_LABELS[type]})`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus={!entry}
          />
          <label className="-mt-2 flex items-center gap-3">
            <span className="shrink-0 text-sm text-slate-500">Trumpinys</span>
            <input
              className="field py-2"
              maxLength={12}
              placeholder={`${shortTitle(title.trim() || TYPE_LABELS[type])} (savaitės vaizdui)`}
              value={short}
              onChange={(e) => setShort(e.target.value)}
            />
          </label>
          {short.trim() !== (init.short ?? '') && (
            <p className="-mt-2 text-xs text-slate-500">Trumpinys bus pritaikytas visiems „{title.trim() || TYPE_LABELS[type]}“ įrašams.</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            {TYPE_ORDER.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`btn border-2 ${
                  type === t ? 'border-teal-600 bg-teal-600/10' : 'border-transparent bg-white dark:bg-slate-900'
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-1 block text-sm text-slate-500">Data</span>
            <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} required />
            {date && <span className="mt-1 block text-sm text-slate-500">{formatLongDay(date)}</span>}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1 block text-sm text-slate-500">Pradžia</span>
              <TimeSelect label="Pradžia" value={start} onChange={setStart} />
            </div>
            <div>
              <span className="mb-1 block text-sm text-slate-500">Pabaiga</span>
              <TimeSelect label="Pabaiga" value={end} onChange={setEnd} />
            </div>
          </div>
          {date && toMinutes(end) <= toMinutes(start) && (
            <p className="text-sm text-red-600">Pabaiga turi būti vėliau nei pradžia.</p>
          )}

          <div className="card space-y-3 p-3">
            <label className="flex min-h-10 items-center justify-between">
              <span>Kartoti kas savaitę</span>
              <input type="checkbox" className="h-6 w-6 accent-teal-700" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
            </label>
            {repeat && (
              <label className="block">
                <span className="mb-1 block text-sm text-slate-500">Iki (imtinai)</span>
                <input type="date" className="field" value={until} min={date} onChange={(e) => setUntil(e.target.value)} />
              </label>
            )}
            {inSeries && <p className="text-xs text-slate-500">Šis įrašas priklauso pasikartojančiai serijai.</p>}
          </div>

          {type === 'practice' && (
            <div className="card space-y-3 p-3">
              <div className="text-sm text-slate-500">Ar praktika įvyko?</div>
              <Segmented<PracticeStatus>
                value={status}
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'done', label: 'Įvyko' },
                  { value: 'missed', label: 'Neįvyko' },
                ]}
                onChange={setStatus}
              />
              <label className="block">
                <span className="mb-1 block text-sm text-slate-500">Faktinės valandos (jei skiriasi)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.25"
                  min="0"
                  className="field"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  placeholder="pagal laiką"
                />
              </label>
              <p className="text-xs text-slate-500">„Auto“ – blokas įskaitomas, kai pasibaigia.</p>
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-sm text-slate-500">Pastaba</span>
            <textarea className="field min-h-20" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          {conflicts.length > 0 && (
            <div className="rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              <div className="font-semibold">⚠️ Persidengia su kitais įrašais (išsaugoti vis tiek galima):</div>
              <ul className="mt-1 list-disc pl-5">
                {conflicts.slice(0, 5).map((c, i) => (
                  <li key={i}>
                    {WEEKDAYS_SHORT[weekdayIndex(c.with.date)]} {formatShort(c.with.date)} {c.with.start}–{c.with.end} · {c.with.title}
                  </li>
                ))}
                {conflicts.length > 5 && <li>ir dar {conflicts.length - 5}</li>}
              </ul>
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={!valid}>
            Išsaugoti
          </button>
          {entry && (
            <button type="button" className="btn w-full text-red-600" onClick={() => (inSeries ? setAsk('delete') : onDelete(entry, 'one'))}>
              Ištrinti
            </button>
          )}
        </div>
      </form>

      {ask && entry && (
        <div onClick={(e) => e.stopPropagation()}>
          <Dialog
            title={ask === 'save' ? 'Keisti pasikartojantį įrašą' : 'Ištrinti pasikartojantį įrašą'}
            message="Taikyti tik šiam įrašui ar visiems serijos įrašams?"
            actions={[
              {
                label: 'Tik šį',
                kind: ask === 'delete' ? 'danger' : 'primary',
                onClick: () => (ask === 'save' ? onSave(draft, 'one') : onDelete(entry, 'one')),
              },
              {
                label: 'Visus',
                kind: ask === 'delete' ? 'danger' : 'primary',
                onClick: () => (ask === 'save' ? onSave(draft, 'all') : onDelete(entry, 'all')),
              },
              { label: 'Atšaukti', onClick: () => setAsk(null) },
            ]}
          />
        </div>
      )}
    </div>
  );
}
