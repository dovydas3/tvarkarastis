// Pradinis grafikas: individualus praktikos atlikimo grafikas (2026-10-26 – 2027-01-29, 322 val.).
// Praktikos vadovas: Lukas Janėnas (IoT akademijos vadovas).
// Praktikos blokai generuojami iš savaičių šablonų; įkeliama tik tai, kas surašyta grafike.
// Paskaitos – iš universiteto tvarkaraščio (2026–2027 m.m. rudens semestras, 7 ir 8 savaitės).

import type { Entry } from '../types';
import { addDays, diffDays, durationHours, weekdayIndex } from '../lib/dates';

/** Pradinio grafiko versija: padidinus, esamose duomenų bazėse atnaujinamos pradinės paskaitos. */
export const SEED_VERSION = 2;

export const PRACTICE_START = '2026-10-26';
export const PRACTICE_END = '2027-01-29';
export const PRACTICE_TARGET_HOURS = 322;
export const PRACTICE_SUPERVISOR = 'Lukas Janėnas (IoT akademijos vadovas)';

type Block = [start: string, end: string];
interface DayPlan {
  /** Paskaitų laikas, kaip surašytas praktikos grafike (tik patikrai; įrašai kuriami iš LECTURES). */
  lectures: Block[];
  practice: Block[];
}
/** Pirmadienis–penktadienis */
type WeekTemplate = [DayPlan, DayPlan, DayPlan, DayPlan, DayPlan];

const EMPTY: DayPlan = { lectures: [], practice: [] };

const A: WeekTemplate = [
  { lectures: [['11:00', '17:00']], practice: [['08:00', '10:30']] },
  { lectures: [['11:00', '12:30']], practice: [['08:00', '10:30'], ['13:30', '17:00']] },
  { lectures: [['09:00', '12:30'], ['15:30', '17:00']], practice: [['13:30', '15:00']] },
  { lectures: [['11:00', '12:30']], practice: [['08:00', '10:30'], ['13:30', '17:00']] },
  { lectures: [['09:00', '10:30'], ['15:30', '17:00']], practice: [['11:00', '12:00'], ['13:00', '15:00']] },
];

const FULL: DayPlan = { lectures: [], practice: [['08:00', '12:00'], ['13:00', '17:00']] };
const HALF: DayPlan = { lectures: [], practice: [['08:00', '12:00']] };

/** Sausis, dalinis */
const C: WeekTemplate = [FULL, HALF, FULL, HALF, FULL];
/** Sausis, pilnas */
const D: WeekTemplate = [FULL, FULL, FULL, FULL, FULL];

const withDays = (t: WeekTemplate, overrides: Partial<Record<0 | 1 | 2 | 3 | 4, DayPlan>>): WeekTemplate =>
  t.map((d, i) => overrides[i as 0 | 1 | 2 | 3 | 4] ?? d) as WeekTemplate;

export interface PracticeWeek {
  /** Pirmadienio data */
  start: string;
  days: WeekTemplate;
  /** Praktikos valandos pagal grafiką (savaitės suma) */
  requiredHours: number;
}

export const PRACTICE_WEEKS: PracticeWeek[] = [
  { start: '2026-10-26', days: A, requiredHours: 19 },
  { start: '2026-11-02', days: withDays(A, { 0: EMPTY, 4: EMPTY }), requiredHours: 21.5 },
  { start: '2026-11-09', days: A, requiredHours: 19 },
  { start: '2026-11-16', days: withDays(A, { 4: EMPTY }), requiredHours: 24 },
  { start: '2026-11-23', days: A, requiredHours: 19 },
  { start: '2026-11-30', days: withDays(A, { 4: EMPTY }), requiredHours: 24 },
  { start: '2026-12-07', days: A, requiredHours: 19 },
  { start: '2026-12-14', days: withDays(A, { 4: EMPTY }), requiredHours: 24 },
  {
    start: '2026-12-21',
    days: withDays(A, { 2: { lectures: A[2].lectures, practice: [] }, 3: EMPTY, 4: EMPTY }),
    requiredHours: 8.5,
  },
  { start: '2026-12-28', days: [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY], requiredHours: 0 },
  { start: '2027-01-04', days: C, requiredHours: 32 },
  { start: '2027-01-11', days: C, requiredHours: 32 },
  { start: '2027-01-18', days: D, requiredHours: 40 },
  { start: '2027-01-25', days: D, requiredHours: 40 },
];

// ---------------------------------------------------------------------------
// Paskaitos pagal universiteto tvarkaraštį.
// Nukirpti pavadinimai / pavardės papildyti ten, kur aišku; kur ne – palikta „…“.

const KT = 'Kompiuterių tinklai ir internetinės technologijos';
const SMA = 'Skaitiniai metodai ir algoritmai';
const ISP = 'Informacinių sistemų pagrindai';
const LP = 'Lygiagretusis programavimas';
const SK = 'Scenarijų kalbos';

export interface Lecture {
  start: string;
  end: string;
  title: string;
  /** Modulio kodas · auditorija · dėstytojas */
  note: string;
}

const lec = (start: string, end: string, title: string, note: string): Lecture => ({ start, end, title, note });

/** Kiekvieną savaitę (Pr–Pn). */
const LECTURES_WEEKLY: Lecture[][] = [
  [
    lec('11:00', '12:30', KT, 'T120B145 · XI r.-206 · asist. Donatas …'),
    lec('13:30', '15:00', ISP, 'P170B114 · XI r.-515 · asist. Algirdas ŠUKYS; …'),
    lec('15:30', '17:00', SMA, 'P170B115 · B2-102 · prof. Rimantas …'),
  ],
  [lec('11:00', '12:30', LP, 'P170B328 · XI r.-101 · doc. prakt. Karolis Rysel')],
  [
    lec('09:00', '10:30', SMA, 'P170B115 · nuotoliniu būdu · prof. Rimantas BARAUSKAS'),
    lec('11:00', '12:30', ISP, 'P170B114 · XI r.-150; nuotoliniu būdu · prof. Rimantas BUTLERIS; …'),
    lec('15:30', '17:00', LP, 'P170B328 · B2-305 · asist. Mindaugas JANČIUKA…'),
  ],
  [lec('11:00', '12:30', SK, 'T120B194 · B2-508 · doc. prakt. Darius MATULI…')],
  [],
];

/** Papildomai tik nelyginėmis semestro savaitėmis (7, 9, 11, …). */
const LECTURES_ODD_WEEKS: Lecture[][] = [
  [],
  [],
  [lec('17:30', '19:00', KT, 'T120B145 · XI r.-206 · asist. Donatas …')],
  [],
  [
    lec('09:00', '10:30', KT, 'T120B145 · XI r.-101 · doc. Gytis VILUTIS'),
    lec('15:30', '17:00', SK, 'T120B194 · XI r.-518 · doc. prakt. Darius MATULI…'),
  ],
];

/** 7 semestro savaitės pirmadienis. */
const SEMESTER_WEEK_7 = '2026-10-12';
/** Paskaitos įkeliamos nuo 7 savaitės iki paskutinės paskaitų dienos pagal praktikos grafiką. */
export const LECTURES_FROM = SEMESTER_WEEK_7;
export const LECTURES_UNTIL = '2026-12-23';
/** Valstybinės šventės (grafike tomis dienomis nieko nėra): Vėlinės, Kūčios, Kalėdos. */
export const HOLIDAYS = ['2026-11-02', '2026-12-24', '2026-12-25'];

export function semesterWeek(date: string): number {
  return 7 + Math.floor(diffDays(date, SEMESTER_WEEK_7) / 7);
}

export function lecturesOn(date: string): Lecture[] {
  const wd = weekdayIndex(date);
  if (wd > 4 || date < LECTURES_FROM || date > LECTURES_UNTIL || HOLIDAYS.includes(date)) return [];
  const odd = semesterWeek(date) % 2 === 1;
  return [...LECTURES_WEEKLY[wd], ...(odd ? LECTURES_ODD_WEEKS[wd] : [])].sort((a, b) => a.start.localeCompare(b.start));
}

const lectureEntry = (date: string, l: Lecture): Entry => ({
  id: `seed-${date}-lecture-${l.start.replace(':', '')}`,
  title: l.title,
  type: 'lecture',
  date,
  start: l.start,
  end: l.end,
  note: l.note,
  source: 'seed',
});

const practiceEntry = (date: string, [start, end]: Block): Entry => ({
  id: `seed-${date}-practice-${start.replace(':', '')}`,
  title: 'Praktika',
  type: 'practice',
  date,
  start,
  end,
  status: 'auto',
  source: 'seed',
});

export function generateLectureEntries(): Entry[] {
  const entries: Entry[] = [];
  for (let date = LECTURES_FROM; date <= LECTURES_UNTIL; date = addDays(date, 1)) {
    for (const l of lecturesOn(date)) entries.push(lectureEntry(date, l));
  }
  return entries;
}

export function generateSeedEntries(weeks: PracticeWeek[] = PRACTICE_WEEKS): Entry[] {
  const entries: Entry[] = generateLectureEntries();
  for (const week of weeks) {
    week.days.forEach((day, i) => {
      const date = addDays(week.start, i);
      for (const b of day.practice) entries.push(practiceEntry(date, b));
    });
  }
  return entries;
}

export interface FillSuggestion {
  weekStart: string;
  date: string;
  blocks: Block[];
  hours: number;
}

/**
 * Pasiūlymas, kaip užpildyti trūkstamas savaitės valandas: pirma laisva darbo diena
 * (be jokių įrašų, ne šventė), pirmenybė penktadieniui. Blokai kaip pilnos praktikos dienos:
 * 08:00–12:00 ir 13:00–17:00 (jei trūksta mažiau – sutrumpinama).
 */
export function suggestFill(weekStart: string, missingHours: number, entries: Entry[]): FillSuggestion | null {
  if (missingHours <= 0) return null;
  const order = [4, 0, 3, 2, 1]; // Pn, Pr, Kt, Tr, An
  const busy = new Set(entries.filter((e) => !(e as { deleted?: boolean }).deleted).map((e) => e.date));
  for (const i of order) {
    const date = addDays(weekStart, i);
    if (HOLIDAYS.includes(date) || busy.has(date)) continue;
    const minutes = Math.round(Math.min(missingHours, 8) * 60);
    const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const blocks: Block[] =
      minutes <= 240 ? [['08:00', fmt(8 * 60 + minutes)]] : [['08:00', '12:00'], ['13:00', fmt(13 * 60 + minutes - 240)]];
    return { weekStart, date, blocks, hours: minutes / 60 };
  }
  return null;
}

export interface WeekDiscrepancy {
  start: string;
  requiredHours: number;
  scheduledHours: number;
  /** Teigiamas – trūksta valandų iki grafiko sumos */
  missingHours: number;
}

/**
 * Lygina suplanuotas praktikos valandas kiekvienoje grafiko savaitėje su savaitės suma.
 * Skaičiuojama pagal bloko trukmę (nepriklausomai nuo būsenos), kad pažymėtas
 * „neįvyko“ blokas nekeistų grafiko palyginimo.
 */
export function findWeekDiscrepancies(entries: Entry[], weeks: PracticeWeek[] = PRACTICE_WEEKS): WeekDiscrepancy[] {
  const result: WeekDiscrepancy[] = [];
  for (const week of weeks) {
    const end = addDays(week.start, 6);
    const scheduledHours = entries
      .filter((e) => e.type === 'practice' && e.date >= week.start && e.date <= end)
      .reduce((s, e) => s + durationHours(e.start, e.end), 0);
    const missingHours = week.requiredHours - scheduledHours;
    if (Math.abs(missingHours) > 0.001) {
      result.push({ start: week.start, requiredHours: week.requiredHours, scheduledHours, missingHours });
    }
  }
  return result;
}
