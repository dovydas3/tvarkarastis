import { useMemo, useState, type ReactNode } from 'react';
import type { Entry, EntryType, PracticeStatus } from '../types';
import { TYPE_LABELS } from '../types';
import { addDays, formatDuration, formatLongDay, formatShort, toMinutes, WEEKDAYS_SHORT, weekdayIndex } from '../lib/dates';
import { findConflicts, shortTitle, weeklyDates, type EntryDraft } from '../lib/entries';
import { haptic } from '../lib/hooks';
import { Dialog, Segmented, Switch, TimeSelect } from './ui';
import { Icon, type IconName } from './Icon';
import { guessIcon, SOFT_CLASSES, SOLID_CLASSES, TYPE_ICON, TYPE_ORDER } from './typeStyles';
import { IconPicker } from './IconPicker';

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

/** Sugrupuotų laukų kortelė (kaip iOS nustatymuose). */
function Group({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-neutral-200/70 rounded-3xl bg-neutral-100/80 dark:divide-neutral-800 dark:bg-neutral-900">{children}</div>;
}

function Row({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-2">
      <Icon name={icon} className="h-5 w-5 shrink-0 text-neutral-400" />
      <span className="shrink-0 text-[15px]">{label}</span>
      <div className="ml-auto flex min-w-0 items-center justify-end">{children}</div>
    </div>
  );
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
  const [icon, setIcon] = useState<string | undefined>(init.icon);
  const [showIcons, setShowIcons] = useState(false);
  // Asmeniniams / kitiems įrašams ikona spėjama pagal pavadinimą (pvz. „Sporto salė“ → hantelis).
  const guessed = type === 'personal' || type === 'other' ? guessIcon(title) : undefined;
  const shownIcon = (icon ?? guessed ?? TYPE_ICON[type]) as IconName;

  const inSeries = Boolean(entry?.seriesId);
  const duration = toMinutes(end) - toMinutes(start);
  const valid = date && duration > 0 && (!repeat || until >= date);

  const draft: EntryDraft = {
    id: entry?.id,
    title: title.trim() || TYPE_LABELS[type],
    short: short.trim() || undefined,
    icon: icon ?? guessed,
    type,
    date,
    start,
    end,
    note: note.trim() || undefined,
    repeatUntil: repeat ? until : undefined,
    seriesId: entry?.seriesId,
    status: type === 'practice' ? status : undefined,
    actualHours: type === 'practice' && actual !== '' ? Math.max(0, Number(actual.replace(',', '.'))) : undefined,
    done: type === 'practice' ? undefined : entry?.done,
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center" onClick={onClose}>
      <form
        className="sheet-in pb-safe max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[32px] bg-white shadow-2xl dark:bg-neutral-950 sm:rounded-[32px]"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {/* Viršus: rankenėlė, uždaryti, išsaugoti */}
        <div className="sticky top-0 z-10 bg-white/90 px-4 pb-2 pt-2 backdrop-blur-xl dark:bg-neutral-950/90">
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex items-center justify-between">
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Uždaryti">
              <Icon name="close" className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <span className="text-sm font-semibold text-neutral-500">{entry ? 'Redaguoti' : 'Naujas įrašas'}</span>
            <button
              type="submit"
              className="h-10 rounded-full bg-accent-500 px-4 text-sm font-bold text-white shadow-sm shadow-accent-500/30 active:scale-95 disabled:opacity-40"
              disabled={!valid}
            >
              Išsaugoti
            </button>
          </div>
        </div>

        <div className="space-y-4 px-4 pb-6 pt-2">
          {/* Ikona + pavadinimas */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowIcons((v) => !v)}
              aria-label="Pasirinkti ikoną"
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${SOLID_CLASSES[type]}`}
            >
              <Icon name={shownIcon} className="h-6 w-6" strokeWidth={2.2} />
            </button>
            <input
              className="min-w-0 flex-1 bg-transparent text-[22px] font-bold outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-700"
              placeholder={TYPE_LABELS[type]}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus={!entry}
              aria-label="Pavadinimas"
            />
          </div>

          {/* Tipas */}
          <div className="flex flex-wrap gap-2">
            {TYPE_ORDER.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={type === t}
                onClick={() => {
                  haptic(8);
                  setType(t);
                }}
                className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${
                  type === t ? `${SOLID_CLASSES[t]} text-white shadow-sm` : SOFT_CLASSES[t]
                }`}
              >
                <Icon name={TYPE_ICON[t]} className="h-4 w-4" strokeWidth={2.4} />
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Ikona */}
          <div className="rounded-3xl bg-neutral-100/80 p-3 dark:bg-neutral-900">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-1 text-[15px]"
              onClick={() => setShowIcons((v) => !v)}
            >
              <Icon name={shownIcon} className="h-5 w-5 text-neutral-400" />
              Ikona
              <span className="ml-auto text-xs text-neutral-500">{showIcons ? 'Slėpti' : 'Keisti'}</span>
            </button>
            {showIcons && (
              <div className="mt-3">
                <IconPicker
                  value={shownIcon}
                  onChange={(i) => {
                    setIcon(i);
                    setShowIcons(false);
                  }}
                />
              </div>
            )}
          </div>

          {/* Kada */}
          <Group>
            <Row icon="month" label="Data">
              <input
                type="date"
                className="rounded-xl bg-transparent text-right text-[15px] font-semibold outline-none"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                aria-label="Data"
              />
            </Row>
            {date && <div className="px-4 py-2 text-xs text-neutral-500">{formatLongDay(date)}</div>}
            <Row icon="clock" label="Pradžia">
              <TimeSelect label="Pradžia" value={start} onChange={setStart} />
            </Row>
            <Row icon="clock" label="Pabaiga">
              <TimeSelect label="Pabaiga" value={end} onChange={setEnd} />
            </Row>
            <div className={`px-4 py-2.5 text-xs font-semibold ${duration > 0 ? 'text-neutral-500' : 'text-red-500'}`}>
              {duration > 0 ? `Trukmė: ${formatDuration(duration)}` : 'Pabaiga turi būti vėliau nei pradžia.'}
            </div>
          </Group>

          {/* Kartojimas */}
          <Group>
            <Row icon="repeat" label="Kas savaitę">
              <Switch checked={repeat} onChange={setRepeat} label="Kartoti kas savaitę" />
            </Row>
            {repeat && (
              <Row icon="month" label="Iki">
                <input
                  type="date"
                  className="bg-transparent text-right text-[15px] font-semibold outline-none"
                  value={until}
                  min={date}
                  onChange={(e) => setUntil(e.target.value)}
                  aria-label="Kartoti iki"
                />
              </Row>
            )}
            {inSeries && <div className="px-4 py-2.5 text-xs text-neutral-500">Šis įrašas priklauso pasikartojančiai serijai.</div>}
          </Group>

          {type === 'practice' && (
            <Group>
              <div className="space-y-2 px-4 py-3">
                <div className="text-sm font-semibold">Ar praktika įvyko?</div>
                <Segmented<PracticeStatus>
                  value={status}
                  options={[
                    { value: 'auto', label: 'Auto' },
                    { value: 'done', label: 'Įvyko' },
                    { value: 'missed', label: 'Neįvyko' },
                  ]}
                  onChange={setStatus}
                />
                <p className="text-xs text-neutral-500">„Auto“ – blokas įskaitomas, kai pasibaigia.</p>
              </div>
              <Row icon="practice" label="Faktinės val.">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.25"
                  min="0"
                  className="w-24 bg-transparent text-right text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-neutral-400"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  placeholder="pagal laiką"
                  aria-label="Faktinės valandos"
                />
              </Row>
            </Group>
          )}

          {/* Detalės */}
          <Group>
            <Row icon="week" label="Trumpinys">
              <input
                className="w-32 bg-transparent text-right text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-neutral-400"
                maxLength={12}
                placeholder={shortTitle(title.trim() || TYPE_LABELS[type])}
                value={short}
                onChange={(e) => setShort(e.target.value)}
                aria-label="Trumpinys savaitės vaizdui"
              />
            </Row>
            {short.trim() !== (init.short ?? '') && (
              <div className="px-4 py-2 text-xs text-neutral-500">
                Bus pritaikyta visiems „{title.trim() || TYPE_LABELS[type]}“ įrašams.
              </div>
            )}
            <div className="flex gap-3 px-4 py-3">
              <Icon name="note" className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" />
              <textarea
                className="min-h-16 w-full resize-none bg-transparent text-[15px] outline-none placeholder:text-neutral-400"
                placeholder="Pastaba"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                aria-label="Pastaba"
              />
            </div>
          </Group>

          {conflicts.length > 0 && (
            <div className="rounded-3xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              <div className="flex items-center gap-2 font-semibold">
                <Icon name="alert" className="h-4 w-4" strokeWidth={2.4} />
                Persidengia su kitais įrašais
              </div>
              <ul className="mt-1.5 space-y-0.5 pl-6">
                {conflicts.slice(0, 5).map((c, i) => (
                  <li key={i}>
                    {WEEKDAYS_SHORT[weekdayIndex(c.with.date)]} {formatShort(c.with.date)} {c.with.start}–{c.with.end} · {c.with.title}
                  </li>
                ))}
                {conflicts.length > 5 && <li>ir dar {conflicts.length - 5}</li>}
              </ul>
              <div className="mt-1.5 pl-6 text-xs opacity-80">Išsaugoti vis tiek galima.</div>
            </div>
          )}

          {entry && (
            <button
              type="button"
              className="btn w-full text-red-500"
              onClick={() => (inSeries ? setAsk('delete') : onDelete(entry, 'one'))}
            >
              <Icon name="trash" className="h-5 w-5" />
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
