import { useState } from 'react';
import type { Entry, PracticeStatus } from '../types';
import { addDays, durationHours, formatHours, formatShort, WEEKDAYS_SHORT, weekdayIndex } from '../lib/dates';
import { countedHours, isCompleted, practiceTotals } from '../lib/entries';
import {
  findWeekDiscrepancies,
  PRACTICE_END,
  PRACTICE_START,
  PRACTICE_SUPERVISOR,
  PRACTICE_TARGET_HOURS,
  PRACTICE_WEEKS,
} from '../data/seed';
import { Segmented, ViewHeader } from '../components/ui';

interface Props {
  entries: Entry[];
  now: { date: string; minutes: number };
  onUpdate: (e: Entry) => void;
  onSelect: (e: Entry) => void;
}

export function PracticeView({ entries, now, onUpdate, onSelect }: Props) {
  const practice = entries.filter((e) => e.type === 'practice');
  const totals = practiceTotals(practice, now);
  const discrepancies = new Map(findWeekDiscrepancies(practice).map((d) => [d.start, d]));
  const [open, setOpen] = useState<string | null>(null);
  const pct = (h: number) => `${Math.min(100, (h / PRACTICE_TARGET_HOURS) * 100)}%`;
  const outside = practice.filter((e) => e.date < PRACTICE_START || e.date > PRACTICE_END);

  return (
    <div>
      <ViewHeader title="Praktika" subtitle={`${PRACTICE_START} – ${PRACTICE_END}`} />
      <div className="space-y-3 p-3">
        <div className="card">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-bold tabular-nums">{formatHours(totals.completed)}</div>
              <div className="text-sm text-slate-500">val. atlikta iš {PRACTICE_TARGET_HOURS}</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-semibold tabular-nums">{formatHours(totals.planned)}</div>
              <div className="text-sm text-slate-500">val. suplanuota</div>
            </div>
          </div>
          <div className="relative mt-3 h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="absolute inset-y-0 left-0 bg-emerald-300 dark:bg-emerald-900" style={{ width: pct(totals.planned) }} />
            <div className="absolute inset-y-0 left-0 bg-emerald-600" style={{ width: pct(totals.completed) }} />
          </div>
          <div className="mt-2 text-sm">
            {totals.planned < PRACTICE_TARGET_HOURS ? (
              <span className="text-amber-700 dark:text-amber-400">
                ⚠️ Iki tikslo trūksta suplanuoti {formatHours(PRACTICE_TARGET_HOURS - totals.planned)} val.
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400">✓ Suplanuota pakankamai valandų</span>
            )}
          </div>
          <div className="mt-1 text-sm text-slate-500">Liko atlikti: {formatHours(Math.max(0, PRACTICE_TARGET_HOURS - totals.completed))} val.</div>
          <div className="mt-1 text-xs text-slate-500">Vadovas: {PRACTICE_SUPERVISOR}</div>
        </div>

        <div className="card p-0">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 border-b border-slate-200 px-4 py-2 text-xs font-medium text-slate-500 dark:border-slate-800">
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
              <div key={w.start} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : w.start)}
                  className={`grid min-h-12 w-full grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 px-4 py-2 text-left ${
                    current ? 'bg-teal-500/10' : ''
                  }`}
                >
                  <span className="text-sm">
                    <span className="font-medium tabular-nums">
                      {formatShort(w.start)} – {formatShort(addDays(w.start, 4))}
                    </span>
                    {w.requiredHours > 0 && (
                      <span className="relative mt-1 block h-1.5 w-full max-w-36 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
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
                  <span className="w-12 text-right tabular-nums text-slate-500">{formatHours(w.requiredHours)}</span>
                  <span className="w-12 text-right tabular-nums">{formatHours(done)}</span>
                </button>
                {isOpen && (
                  <div className="space-y-2 bg-slate-50 px-3 py-3 dark:bg-slate-950/50">
                    {blocks.length === 0 && <div className="text-sm text-slate-500">Šią savaitę praktikos blokų nėra.</div>}
                    {blocks.map((e) => (
                      <BlockRow key={e.id} entry={e} now={now} onUpdate={onUpdate} onSelect={onSelect} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {outside.length > 0 && (
            <div className="px-4 py-3 text-sm text-slate-500">
              Už praktikos laikotarpio ribų: {outside.length} blok. ({formatHours(outside.reduce((s, e) => s + countedHours(e), 0))} val.)
            </div>
          )}
        </div>
      </div>
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
    <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
      <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => onSelect(e)}>
        <span className="font-medium">
          {WEEKDAYS_SHORT[weekdayIndex(e.date)]} {formatShort(e.date)} · {e.start}–{e.end}
        </span>
        <span className={`text-sm ${done ? 'text-emerald-600' : 'text-slate-500'}`}>
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
