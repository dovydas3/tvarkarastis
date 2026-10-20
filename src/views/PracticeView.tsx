import { useState, type ReactNode } from 'react';
import type { Entry, PracticeStatus } from '../types';
import { addDays, durationHours, formatDayMonth, formatHours, formatShort, WEEKDAYS_SHORT, weekdayIndex } from '../lib/dates';
import { countedHours, isCompleted, practiceTotals } from '../lib/entries';
import {
  findWeekDiscrepancies,
  PRACTICE_END,
  PRACTICE_START,
  PRACTICE_SUPERVISOR,
  PRACTICE_TARGET_HOURS,
  PRACTICE_WEEKS,
  suggestFill,
  type FillSuggestion,
} from '../data/seed';
import { Dialog, Segmented, ViewHeader } from '../components/ui';
import { Icon } from '../components/Icon';

interface Props {
  entries: Entry[];
  now: { date: string; minutes: number };
  onUpdate: (e: Entry) => void;
  onSelect: (e: Entry) => void;
  /** Sukurti praktikos blokus (trūkstamoms valandoms) */
  onAddPractice: (blocks: { date: string; start: string; end: string }[]) => void;
  onOpenReport: () => void;
}

export function PracticeView({ entries, now, onUpdate, onSelect, onAddPractice, onOpenReport }: Props) {
  const practice = entries.filter((e) => e.type === 'practice');
  const totals = practiceTotals(practice, now);
  const discrepancies = new Map(findWeekDiscrepancies(practice).map((d) => [d.start, d]));
  const [open, setOpen] = useState<string | null>(null);
  const outside = practice.filter((e) => e.date < PRACTICE_START || e.date > PRACTICE_END);
  // Pasiūlymai trūkstamoms valandoms (laisva darbo diena, pirmenybė penktadieniui)
  const suggestions = new Map(
    [...discrepancies.values()]
      .map((d) => suggestFill(d.start, d.missingHours, entries))
      .filter((x): x is FillSuggestion => !!x)
      .map((x) => [x.weekStart, x]),
  );
  const [confirm, setConfirm] = useState<FillSuggestion[] | null>(null);
  const toBlocks = (list: FillSuggestion[]) => list.flatMap((x) => x.blocks.map(([start, end]) => ({ date: x.date, start, end })));
  const dayLabel = (x: FillSuggestion) => `${WEEKDAYS_SHORT[weekdayIndex(x.date)]}, ${formatDayMonth(x.date)}`;

  return (
    <div>
      <ViewHeader eyebrow={`${PRACTICE_START} – ${PRACTICE_END}`} title="Praktika" />
      <div className="space-y-3 p-3">
        <div className="card">
          <div className="flex items-center gap-4">
            <ProgressRing planned={totals.planned / PRACTICE_TARGET_HOURS} done={totals.completed / PRACTICE_TARGET_HOURS}>
              <div className="text-2xl font-bold tabular-nums leading-none">{formatHours(totals.completed)}</div>
              <div className="mt-0.5 text-[11px] font-semibold text-neutral-500">iš {PRACTICE_TARGET_HOURS} val.</div>
            </ProgressRing>
            <div className="min-w-0 flex-1 space-y-2">
              <Stat color="bg-emerald-500" label="Atlikta" value={`${formatHours(totals.completed)} val.`} />
              <Stat color="bg-emerald-200 dark:bg-emerald-800" label="Suplanuota" value={`${formatHours(totals.planned)} val.`} />
              <Stat color="bg-neutral-200 dark:bg-neutral-700" label="Liko atlikti" value={`${formatHours(Math.max(0, PRACTICE_TARGET_HOURS - totals.completed))} val.`} />
            </div>
          </div>
          <div className="mt-3 text-sm">
            {totals.planned < PRACTICE_TARGET_HOURS ? (
              <span className="text-amber-700 dark:text-amber-400">
                ⚠️ Iki tikslo trūksta suplanuoti {formatHours(PRACTICE_TARGET_HOURS - totals.planned)} val.
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400">✓ Suplanuota pakankamai valandų</span>
            )}
          </div>
          <div className="mt-1 text-xs text-neutral-500">Vadovas: {PRACTICE_SUPERVISOR}</div>
          {suggestions.size > 0 && (
            <button type="button" className="btn-primary mt-3 w-full" onClick={() => setConfirm([...suggestions.values()])}>
              <Icon name="plus" className="h-5 w-5" strokeWidth={2.5} />
              Užpildyti trūkstamas dienas ({suggestions.size})
            </button>
          )}
          <button type="button" className="btn-secondary mt-2 w-full" onClick={onOpenReport}>
            <Icon name="note" className="h-5 w-5" />
            Praktikos ataskaita (PDF / CSV)
          </button>
        </div>

        <div className="card p-0">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 border-b border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-500 dark:border-neutral-800">
            <span>Savaitė</span>
            <span className="w-12 text-right">Supl.</span>
            <span className="w-12 text-right">Grafikas</span>
            <span className="w-12 text-right">Atlikta</span>
          </div>
          {PRACTICE_WEEKS.map((w) => {
            const end = addDays(w.start, 6);
            const blocks = practice.filter((e) => e.date >= w.start && e.date <= end);
            const planned = blocks.reduce((s, e) => s + countedHours(e), 0);
            const done = blocks.filter((e) => isCompleted(e, now)).reduce((s, e) => s + countedHours(e), 0);
            const d = discrepancies.get(w.start);
            const current = now.date >= w.start && now.date <= end;
            const isOpen = open === w.start;
            return (
              <div key={w.start} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : w.start)}
                  className={`grid min-h-12 w-full grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 px-4 py-2 text-left ${
                    current ? 'bg-accent-500/10' : ''
                  }`}
                >
                  <span className="text-sm">
                    <span className="font-medium tabular-nums">
                      {formatShort(w.start)} – {formatShort(addDays(w.start, 4))}
                    </span>
                    {w.requiredHours > 0 && (
                      <span className="relative mt-1 block h-1.5 w-full max-w-36 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <span
                          className="absolute inset-y-0 left-0 bg-emerald-300 dark:bg-emerald-900"
                          style={{ width: `${Math.min(100, (planned / w.requiredHours) * 100)}%` }}
                        />
                        <span
                          className="absolute inset-y-0 left-0 bg-emerald-600"
                          style={{ width: `${Math.min(100, (done / w.requiredHours) * 100)}%` }}
                        />
                      </span>
                    )}
                    {d && (
                      <span className="mt-0.5 block text-xs text-amber-700 dark:text-amber-400">
                        ⚠️{' '}
                        {d.missingHours > 0
                          ? `trūksta ${formatHours(d.missingHours)} val. pagal grafiką`
                          : `${formatHours(-d.missingHours)} val. daugiau nei grafike`}
                      </span>
                    )}
                  </span>
                  <span className="w-12 text-right tabular-nums">{formatHours(planned)}</span>
                  <span className="w-12 text-right tabular-nums text-neutral-500">{formatHours(w.requiredHours)}</span>
                  <span className="w-12 text-right tabular-nums">{formatHours(done)}</span>
                </button>
                {suggestions.get(w.start) && (
                  <div className="px-4 pb-2">
                    <button
                      type="button"
                      onClick={() => setConfirm([suggestions.get(w.start)!])}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
                    >
                      <Icon name="plus" className="h-4 w-4" strokeWidth={2.6} />
                      Pridėti {dayLabel(suggestions.get(w.start)!)} ({formatHours(suggestions.get(w.start)!.hours)} val.)
                    </button>
                  </div>
                )}
                {isOpen && (
                  <div className="space-y-2 bg-neutral-50 px-3 py-3 dark:bg-neutral-950/50">
                    {blocks.length === 0 && <div className="text-sm text-neutral-500">Šią savaitę praktikos blokų nėra.</div>}
                    {blocks.map((e) => (
                      <BlockRow key={e.id} entry={e} now={now} onUpdate={onUpdate} onSelect={onSelect} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {outside.length > 0 && (
            <div className="px-4 py-3 text-sm text-neutral-500">
              Už praktikos laikotarpio ribų: {outside.length} blok. ({formatHours(outside.reduce((s, e) => s + countedHours(e), 0))} val.)
            </div>
          )}
        </div>
      </div>

      {confirm && (
        <Dialog
          title={confirm.length === 1 ? 'Pridėti praktikos dieną?' : `Pridėti ${confirm.length} praktikos dienas?`}
          message={
            <ul className="space-y-1 text-sm">
              {confirm.map((x) => (
                <li key={x.date}>
                  <b>{dayLabel(x)}</b>: {x.blocks.map(([a, b]) => `${a}–${b}`).join(', ')} ({formatHours(x.hours)} val.)
                </li>
              ))}
            </ul>
          }
          actions={[
            {
              label: 'Pridėti',
              kind: 'primary',
              onClick: () => {
                onAddPractice(toBlocks(confirm));
                setConfirm(null);
              },
            },
            { label: 'Atšaukti', onClick: () => setConfirm(null) },
          ]}
        />
      )}
    </div>
  );
}

/** Žiedas: šviesiai – suplanuota, ryškiai – atlikta (dalis nuo tikslo). */
function ProgressRing({ planned, done, children }: { planned: number; done: number; children: ReactNode }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const arc = (v: number) => `${Math.min(1, Math.max(0, v)) * c} ${c}`;
  return (
    <div className="relative h-[110px] w-[110px] shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-neutral-200 dark:stroke-neutral-800" />
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray={arc(planned)} className="stroke-emerald-200 dark:stroke-emerald-900" />
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray={arc(done)} className="stroke-emerald-500" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function Stat({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
      <span className="text-neutral-500">{label}</span>
      <span className="ml-auto font-bold tabular-nums">{value}</span>
    </div>
  );
}

function BlockRow({
  entry: e,
  now,
  onUpdate,
  onSelect,
}: {
  entry: Entry;
  now: { date: string; minutes: number };
  onUpdate: (e: Entry) => void;
  onSelect: (e: Entry) => void;
}) {
  const planned = durationHours(e.start, e.end);
  const done = isCompleted(e, now);
  return (
    <div className="rounded-xl bg-white p-3 dark:bg-neutral-900">
      <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => onSelect(e)}>
        <span className="font-medium">
          {WEEKDAYS_SHORT[weekdayIndex(e.date)]} {formatShort(e.date)} · {e.start}–{e.end}
        </span>
        <span className={`text-sm ${done ? 'text-emerald-600' : 'text-neutral-500'}`}>
          {formatHours(countedHours(e))} val.{done ? ' ✓' : ''}
        </span>
      </button>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1">
          <Segmented<PracticeStatus>
            value={e.status ?? 'auto'}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'done', label: 'Įvyko' },
              { value: 'missed', label: 'Neįvyko' },
            ]}
            onChange={(status) => onUpdate({ ...e, status })}
          />
        </div>
        <input
          type="number"
          inputMode="decimal"
          step="0.25"
          min="0"
          max="24"
          aria-label="Faktinės valandos"
          placeholder={formatHours(e.status === 'missed' ? 0 : planned)}
          defaultValue={e.actualHours ?? ''}
          onBlur={(ev) => {
            const v = ev.target.value.replace(',', '.');
            const actualHours = v === '' ? undefined : Math.max(0, Number(v));
            if (actualHours !== e.actualHours && !Number.isNaN(actualHours)) onUpdate({ ...e, actualHours });
          }}
          className="field w-20 py-2 text-right"
        />
      </div>
    </div>
  );
}
