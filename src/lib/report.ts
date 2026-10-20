// Praktikos ataskaitos duomenys (spausdinimui / PDF ir CSV).

import type { Entry } from '../types';
import { addDays, durationHours, formatHours, WEEKDAYS_LONG, weekdayIndex } from './dates';
import { countedHours, isCompleted, sortEntries } from './entries';
import { PRACTICE_END, PRACTICE_START, PRACTICE_WEEKS } from '../data/seed';

export type ReportStatus = 'Įvyko' | 'Neįvyko' | 'Suplanuota';

export interface ReportRow {
  date: string;
  weekday: string;
  start: string;
  end: string;
  /** Suplanuota pagal laiką */
  planned: number;
  /** Įskaityta (faktinės arba pagal laiką; neįvykus – 0 arba nurodytos) */
  counted: number;
  status: ReportStatus;
  note?: string;
}

export interface ReportWeek {
  start: string;
  end: string;
  /** Valandos pagal grafiką (savaitės suma); null – savaitė ne iš grafiko */
  required: number | null;
  rows: ReportRow[];
  planned: number;
  done: number;
}

export interface Report {
  weeks: ReportWeek[];
  planned: number;
  done: number;
}

const statusOf = (e: Entry, now: { date: string; minutes: number }): ReportStatus =>
  e.status === 'missed' ? 'Neįvyko' : isCompleted(e, now) ? 'Įvyko' : 'Suplanuota';

/**
 * Ataskaita pagal grafiko savaites. `onlyHappened` – tik įvykę / neįvykę (be būsimų) blokai.
 * Praktikos blokai už laikotarpio ribų pridedami atskira grupe.
 */
export function buildReport(entries: Entry[], now: { date: string; minutes: number }, onlyHappened = false): Report {
  const practice = entries.filter((e) => e.type === 'practice').sort(sortEntries);
  const toRow = (e: Entry): ReportRow => {
    const status = statusOf(e, now);
    return {
      date: e.date,
      weekday: WEEKDAYS_LONG[weekdayIndex(e.date)],
      start: e.start,
      end: e.end,
      planned: durationHours(e.start, e.end),
      counted: countedHours(e),
      status,
      note: e.note,
    };
  };
  const keep = (r: ReportRow) => !onlyHappened || r.status !== 'Suplanuota';

  const weeks: ReportWeek[] = PRACTICE_WEEKS.map((w) => {
    const end = addDays(w.start, 6);
    const rows = practice.filter((e) => e.date >= w.start && e.date <= end).map(toRow).filter(keep);
    return { start: w.start, end: addDays(w.start, 4), required: w.requiredHours, rows, planned: 0, done: 0 };
  });
  const outside = practice.filter((e) => e.date < PRACTICE_START || e.date > PRACTICE_END).map(toRow).filter(keep);
  if (outside.length) {
    weeks.push({ start: outside[0].date, end: outside[outside.length - 1].date, required: null, rows: outside, planned: 0, done: 0 });
  }
  for (const w of weeks) {
    w.planned = w.rows.reduce((s, r) => s + (r.status === 'Neįvyko' ? 0 : r.counted), 0);
    w.done = w.rows.filter((r) => r.status !== 'Suplanuota').reduce((s, r) => s + r.counted, 0);
  }
  return {
    weeks,
    planned: weeks.reduce((s, w) => s + w.planned, 0),
    done: weeks.reduce((s, w) => s + w.done, 0),
  };
}

/** CSV (Excel LT: kabliataškis, dešimtainis kablelis, UTF-8 su BOM). */
export function reportCsv(report: Report): string {
  const q = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [['Data', 'Diena', 'Pradžia', 'Pabaiga', 'Suplanuota val.', 'Įskaityta val.', 'Būsena', 'Pastaba'].join(';')];
  for (const w of report.weeks) {
    for (const r of w.rows) {
      lines.push(
        [r.date, r.weekday, r.start, r.end, formatHours(r.planned), formatHours(r.counted), r.status, r.note ?? ''].map(q).join(';'),
      );
    }
  }
  lines.push('');
  lines.push(['Iš viso', '', '', '', formatHours(report.planned), formatHours(report.done), '', ''].join(';'));
  return '﻿' + lines.join('\r\n');
}
