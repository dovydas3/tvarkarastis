import { useState } from 'react';
import type { Entry } from '../types';
import { formatHours, formatShort, nowInVilnius } from '../lib/dates';
import { buildReport, reportCsv } from '../lib/report';
import { saveFile } from '../lib/backup';
import { PRACTICE_END, PRACTICE_START, PRACTICE_SUPERVISOR, PRACTICE_TARGET_HOURS } from '../data/seed';
import { Icon } from '../components/Icon';
import { Switch } from '../components/ui';

interface Props {
  entries: Entry[];
  now: { date: string; minutes: number };
  studentName: string;
  onStudentName: (name: string) => void;
  onClose: () => void;
}

/**
 * Praktikos ataskaita A4 formatu. „Spausdinti / PDF“ atidaro naršyklės spausdinimą
 * (telefone ten galima pasirinkti „Išsaugoti kaip PDF“). Spausdinant rodomas tik dokumentas.
 */
export function PracticeReport({ entries, now, studentName, onStudentName, onClose }: Props) {
  const [onlyHappened, setOnlyHappened] = useState(false);
  const [name, setName] = useState(studentName);
  const report = buildReport(entries, now, onlyHappened);
  const generated = nowInVilnius();

  return (
    <div className="min-h-dvh bg-neutral-100 pb-10 print:bg-white print:pb-0 dark:bg-neutral-950">
      {/* Įrankių juosta (nespausdinama) */}
      <div className="pt-safe sticky top-0 z-10 bg-white/90 px-4 py-3 backdrop-blur-xl print:hidden dark:bg-neutral-950/90">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Uždaryti">
            <Icon name="close" className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold">Ataskaita</h1>
          <button
            type="button"
            className="h-10 rounded-full bg-neutral-100 px-3.5 text-sm font-semibold dark:bg-neutral-800"
            onClick={() =>
              void saveFile(new Blob([reportCsv(report)], { type: 'text/csv;charset=utf-8' }), `praktikos-ataskaita-${generated.date}.csv`)
            }
          >
            CSV
          </button>
          <button
            type="button"
            className="h-10 rounded-full bg-accent-500 px-4 text-sm font-bold text-white shadow-sm shadow-accent-500/30"
            onClick={() => window.print()}
          >
            Spausdinti / PDF
          </button>
        </div>
        <div className="mx-auto mt-2 flex max-w-3xl items-center justify-between gap-3 text-sm">
          <span className="text-neutral-500">Tik įvykę blokai (be būsimų)</span>
          <Switch checked={onlyHappened} onChange={setOnlyHappened} label="Tik įvykę blokai" />
        </div>
      </div>

      {/* Dokumentas */}
      <article className="mx-auto mt-3 max-w-3xl bg-white px-6 py-8 font-[system-ui] text-[13px] text-black shadow-sm print:mt-0 print:max-w-none print:px-0 print:py-0 print:shadow-none sm:rounded-2xl">
        <h2 className="text-center text-lg font-bold uppercase tracking-wide">Praktikos atlikimo ataskaita</h2>
        <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <span className="text-neutral-600">Praktikantas:</span>
          <input
            className="border-b border-dotted border-neutral-400 bg-transparent font-semibold outline-none print:border-0"
            placeholder="Vardas Pavardė"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name !== studentName && onStudentName(name.trim())}
            aria-label="Praktikanto vardas ir pavardė"
          />
          <span className="text-neutral-600">Laikotarpis:</span>
          <span>
            {PRACTICE_START} – {PRACTICE_END}
          </span>
          <span className="text-neutral-600">Praktikos vadovas:</span>
          <span>{PRACTICE_SUPERVISOR}</span>
          <span className="text-neutral-600">Iš viso:</span>
          <span>
            <b>{formatHours(report.done)} val.</b> atlikta, {formatHours(report.planned)} val. suplanuota (tikslas {PRACTICE_TARGET_HOURS} val.)
          </span>
        </div>

        <table className="mt-6 w-full border-collapse">
          <thead>
            <tr className="border-y-2 border-black text-left">
              <th className="py-1.5 pr-2 font-semibold">Data</th>
              <th className="py-1.5 pr-2 font-semibold">Diena</th>
              <th className="py-1.5 pr-2 font-semibold">Laikas</th>
              <th className="py-1.5 pr-2 text-right font-semibold">Val.</th>
              <th className="py-1.5 font-semibold">Būsena</th>
            </tr>
          </thead>
          {report.weeks
            .filter((w) => w.rows.length || (w.required ?? 0) > 0)
            .map((w) => (
              <tbody key={w.start} className="break-inside-avoid">
                <tr className="bg-neutral-100 print:bg-neutral-100">
                  <td colSpan={5} className="px-1 py-1 text-[12px] font-semibold">
                    {w.required === null ? 'Kiti praktikos blokai' : `Savaitė ${formatShort(w.start)} – ${formatShort(w.end)}`}
                    {w.required !== null && <span className="font-normal text-neutral-600"> · pagal grafiką {formatHours(w.required)} val.</span>}
                  </td>
                </tr>
                {w.rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-1 text-neutral-500">
                      —
                    </td>
                  </tr>
                )}
                {w.rows.map((r) => (
                  <tr key={`${r.date}${r.start}`} className="border-b border-neutral-200">
                    <td className="py-1 pr-2 tabular-nums">{r.date}</td>
                    <td className="py-1 pr-2">{r.weekday}</td>
                    <td className="py-1 pr-2 tabular-nums">
                      {r.start}–{r.end}
                    </td>
                    <td className="py-1 pr-2 text-right tabular-nums">{formatHours(r.counted)}</td>
                    <td className={`py-1 ${r.status === 'Neįvyko' ? 'text-red-600' : r.status === 'Suplanuota' ? 'text-neutral-500' : ''}`}>
                      {r.status}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} className="py-1 pr-2 text-right text-[12px] text-neutral-600">
                    Savaitės suma
                  </td>
                  <td className="py-1 pr-2 text-right font-semibold tabular-nums">{formatHours(w.planned)}</td>
                  <td className="py-1 text-[12px] text-neutral-600">atlikta {formatHours(w.done)}</td>
                </tr>
              </tbody>
            ))}
          <tfoot>
            <tr className="border-t-2 border-black">
              <td colSpan={3} className="py-2 pr-2 text-right font-bold">
                Iš viso
              </td>
              <td className="py-2 pr-2 text-right font-bold tabular-nums">{formatHours(report.planned)}</td>
              <td className="py-2 font-semibold">atlikta {formatHours(report.done)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-12 grid grid-cols-2 gap-10 text-[12px]">
          <div>
            <div className="h-8 border-b border-black" />
            <div className="mt-1 text-neutral-600">Praktikantas (vardas, pavardė, parašas)</div>
          </div>
          <div>
            <div className="h-8 border-b border-black" />
            <div className="mt-1 text-neutral-600">Praktikos vadovas: {PRACTICE_SUPERVISOR.replace(/ \(.*\)$/, '')}</div>
          </div>
        </div>
        <div className="mt-8 text-right text-[11px] text-neutral-500">Sugeneruota {generated.date}</div>
      </article>
    </div>
  );
}
