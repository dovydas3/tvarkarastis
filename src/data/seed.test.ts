import { describe, expect, it } from 'vitest';
import { findWeekDiscrepancies, generateSeedEntries, PRACTICE_TARGET_HOURS, PRACTICE_WEEKS, suggestFill } from './seed';
import { addDays, durationHours, weekdayIndex } from '../lib/dates';

// Praktikos blokai, ranka perrašyti iš grafiko lentelės (Pr, An, Tr, Kt, Pn).
// Tyčia nepriklauso nuo šablonų seed.ts faile.
const A = [
  '08:00-10:30',
  '08:00-10:30 13:30-17:00',
  '13:30-15:00',
  '08:00-10:30 13:30-17:00',
  '11:00-12:00 13:00-15:00',
];
const C = ['08:00-12:00 13:00-17:00', '08:00-12:00', '08:00-12:00 13:00-17:00', '08:00-12:00', '08:00-12:00 13:00-17:00'];
const D = Array(5).fill('08:00-12:00 13:00-17:00');
const NONE = ['', '', '', '', ''];

const EXPECTED_PRACTICE: Record<string, { days: string[]; required: number }> = {
  '2026-10-26': { days: A, required: 19 },
  '2026-11-02': { days: ['', A[1], A[2], A[3], ''], required: 21.5 },
  '2026-11-09': { days: A, required: 19 },
  '2026-11-16': { days: [A[0], A[1], A[2], A[3], ''], required: 24 },
  '2026-11-23': { days: A, required: 19 },
  '2026-11-30': { days: [A[0], A[1], A[2], A[3], ''], required: 24 },
  '2026-12-07': { days: A, required: 19 },
  '2026-12-14': { days: [A[0], A[1], A[2], A[3], ''], required: 24 },
  '2026-12-21': { days: [A[0], A[1], '', '', ''], required: 8.5 },
  '2026-12-28': { days: NONE, required: 0 },
  '2027-01-04': { days: C, required: 32 },
  '2027-01-11': { days: C, required: 32 },
  '2027-01-18': { days: D, required: 40 },
  '2027-01-25': { days: D, required: 40 },
};

const entries = generateSeedEntries();

const blocksOn = (date: string, type: 'practice' | 'lecture') =>
  entries
    .filter((e) => e.date === date && e.type === type)
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((e) => `${e.start}-${e.end}`)
    .join(' ');

describe('pradinis grafikas', () => {
  it('apima visas 14 grafiko savaičių', () => {
    expect(PRACTICE_WEEKS.map((w) => w.start)).toEqual(Object.keys(EXPECTED_PRACTICE));
  });

  it.each(Object.entries(EXPECTED_PRACTICE))('savaitės %s praktikos blokai sutampa su lentele', (start, exp) => {
    exp.days.forEach((dayBlocks, i) => {
      expect(blocksOn(addDays(start, i), 'practice'), `${start} +${i} d.`).toBe(dayBlocks);
    });
    expect(PRACTICE_WEEKS.find((w) => w.start === start)!.requiredHours).toBe(exp.required);
  });

  it('savaitgaliais įrašų nėra; praktika – tik praktikos laikotarpiu, paskaitos – 10-12 … 12-23', () => {
    for (const e of entries) {
      expect(weekdayIndex(e.date)).toBeLessThan(5);
      if (e.type === 'practice') expect(e.date >= '2026-10-26' && e.date <= '2027-01-29').toBe(true);
      else expect(e.date >= '2026-10-12' && e.date <= '2026-12-23').toBe(true);
    }
  });
});

// Paskaitos, perrašytos iš universiteto tvarkaraščio ekrano (7 sav. – spalio 12 d., 8 sav. – spalio 19 d.).
const lecturesOnDay = (date: string) =>
  entries
    .filter((e) => e.date === date && e.type === 'lecture')
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((e) => `${e.start}-${e.end} ${e.note!.split(' · ')[0]}`)
    .join(', ');

const WEEK_8 = [
  '11:00-12:30 T120B145, 13:30-15:00 P170B114, 15:30-17:00 P170B115',
  '11:00-12:30 P170B328',
  '09:00-10:30 P170B115, 11:00-12:30 P170B114, 15:30-17:00 P170B328',
  '11:00-12:30 T120B194',
  '',
];
const WEEK_7 = [
  WEEK_8[0],
  WEEK_8[1],
  '09:00-10:30 P170B115, 11:00-12:30 P170B114, 15:30-17:00 P170B328, 17:30-19:00 T120B145',
  WEEK_8[3],
  '09:00-10:30 T120B145, 15:30-17:00 T120B194',
];

describe('paskaitos pagal universiteto tvarkaraštį', () => {
  it('7 savaitė (nelyginė) sutampa su tvarkaraščiu', () => {
    WEEK_7.forEach((exp, i) => expect(lecturesOnDay(addDays('2026-10-12', i))).toBe(exp));
  });

  it('8 savaitė (lyginė) sutampa su tvarkaraščiu', () => {
    WEEK_8.forEach((exp, i) => expect(lecturesOnDay(addDays('2026-10-19', i))).toBe(exp));
  });

  it('pavadinimai užpildyti, ne „Paskaita“', () => {
    expect(entries.filter((e) => e.type === 'lecture').every((e) => e.title !== 'Paskaita' && e.note)).toBe(true);
    expect(entries.find((e) => e.id === 'seed-2026-10-14-lecture-0900')!.title).toBe('Skaitiniai metodai ir algoritmai');
  });

  it('šventėmis ir po 12-23 paskaitų nėra', () => {
    for (const d of ['2026-11-02', '2026-12-24', '2026-12-25', '2027-01-04']) expect(lecturesOnDay(d)).toBe('');
    expect(lecturesOnDay('2026-12-23')).not.toBe('');
  });

  // Lyginių / nelyginių savaičių kaita turi atitikti praktikos grafiką: kiekviena paskaita iki 17:00
  // patenka į grafike nurodytą paskaitų laiką, o kiekvienas grafiko paskaitų intervalas turi bent vieną paskaitą.
  it.each(PRACTICE_WEEKS.map((w) => w.start))('savaitės %s paskaitos atitinka praktikos grafiką', (start) => {
    const week = PRACTICE_WEEKS.find((w) => w.start === start)!;
    week.days.forEach((day, i) => {
      const date = addDays(start, i);
      const lectures = entries.filter((e) => e.date === date && e.type === 'lecture' && e.end <= '17:00');
      for (const l of lectures) {
        expect(day.lectures.some(([s, e]) => s <= l.start && l.end <= e), `${date} ${l.start}`).toBe(true);
      }
      for (const [s, e] of day.lectures) {
        expect(lectures.some((l) => s <= l.start && l.end <= e), `${date} ${s}-${e}`).toBe(true);
      }
    });
  });
});

describe('pradinis grafikas (tęsinys)', () => {

  it('savaičių sumos kartu duoda 322 val., o surašyti blokai – 290 val.', () => {
    expect(PRACTICE_WEEKS.reduce((s, w) => s + w.requiredHours, 0)).toBe(PRACTICE_TARGET_HOURS);
    const listed = entries.filter((e) => e.type === 'practice').reduce((s, e) => s + durationHours(e.start, e.end), 0);
    expect(listed).toBe(290);
  });

  it('neatitikimas aptinkamas būtent 4 savaitėse, po 8 val.', () => {
    const d = findWeekDiscrepancies(entries);
    expect(d.map((x) => x.start)).toEqual(['2026-11-02', '2026-11-16', '2026-11-30', '2026-12-14']);
    for (const x of d) expect(x.missingHours).toBe(8);
  });

  it('pridėjus trūkstamą 8 val. dieną, įspėjimas toms savaitėms dingsta', () => {
    const extra = ['2026-11-16', '2026-11-30', '2026-12-14'].map((mon, i) => ({
      ...entries[0],
      id: `x${i}`,
      date: addDays(mon, 4),
      start: '08:00',
      end: '16:00',
      type: 'practice' as const,
    }));
    expect(findWeekDiscrepancies([...entries, ...extra]).map((x) => x.start)).toEqual(['2026-11-02']);
  });

  it('trūkstamoms valandoms siūlo laisvą penktadienį 08–12 ir 13–17 (Vėlinių pirmadienis praleidžiamas)', () => {
    const s = findWeekDiscrepancies(entries).map((d) => suggestFill(d.start, d.missingHours, entries));
    expect(s.map((x) => x?.date)).toEqual(['2026-11-06', '2026-11-20', '2026-12-04', '2026-12-18']);
    for (const x of s) {
      expect(x?.blocks).toEqual([
        ['08:00', '12:00'],
        ['13:00', '17:00'],
      ]);
      expect(x?.hours).toBe(8);
    }
  });

  it('jei trūksta mažiau – blokas sutrumpinamas; užimtos dienos praleidžiamos', () => {
    expect(suggestFill('2026-11-16', 3, entries)?.blocks).toEqual([['08:00', '11:00']]);
    expect(suggestFill('2026-11-16', 6.5, entries)?.blocks).toEqual([
      ['08:00', '12:00'],
      ['13:00', '15:30'],
    ]);
    // visa savaitė užimta (A šablonas) – pasiūlymo nėra
    expect(suggestFill('2026-10-26', 8, entries)).toBeNull();
  });

  it('id yra unikalūs ir deterministiniai', () => {
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
    expect(generateSeedEntries().map((e) => e.id)).toEqual(entries.map((e) => e.id));
  });
});
