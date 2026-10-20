import { describe, expect, it } from 'vitest';
import {
  applyToSeries,
  createEntries,
  displayShort,
  dragTimes,
  findConflicts,
  isChecked,
  layoutDay,
  toggleChecked,
  noteDetails,
  practiceTotals,
  repeatDates,
  shortTitle,
} from './entries';
import { nowInVilnius, vilniusToEpoch } from './dates';
import type { Entry } from '../types';

const base = { title: 'Sporto salė', type: 'personal' as const, date: '2026-11-03', start: '18:00', end: '19:00' };

describe('pasikartojimas', () => {
  it('sukuria savaitinę seriją iki datos imtinai', () => {
    const s = createEntries({ ...base, repeatUntil: '2026-11-24' });
    expect(s.map((e) => e.date)).toEqual(['2026-11-03', '2026-11-10', '2026-11-17', '2026-11-24']);
    expect(new Set(s.map((e) => e.seriesId)).size).toBe(1);
  });

  it('be pasikartojimo – vienas įrašas be serijos', () => {
    const s = createEntries(base);
    expect(s).toHaveLength(1);
    expect(s[0].seriesId).toBeUndefined();
  });

  it('„visus“: perkelia dieną, keičia laiką, trumpina seriją ir išlaiko būseną', () => {
    const s = createEntries({ ...base, repeatUntil: '2026-11-24' });
    s[1].note = 'tik antras';
    const original = s[1];
    const { put, remove } = applyToSeries(s, original, {
      ...original,
      date: '2026-11-11',
      start: '17:00',
      repeatUntil: '2026-11-18',
    });
    expect(put.map((e) => e.date)).toEqual(['2026-11-04', '2026-11-11', '2026-11-18']);
    expect(put.every((e) => e.start === '17:00')).toBe(true);
    expect(put.map((e) => e.id)).toEqual([s[0].id, s[1].id, s[2].id]);
    expect(remove).toEqual([s[3].id]);
  });

  it('„visus“: prailgina seriją naujais įrašais', () => {
    const s = createEntries({ ...base, repeatUntil: '2026-11-10' });
    const { put, remove } = applyToSeries(s, s[0], { ...s[0], repeatUntil: '2026-11-24' });
    expect(put.map((e) => e.date)).toEqual(['2026-11-03', '2026-11-10', '2026-11-17', '2026-11-24']);
    expect(remove).toEqual([]);
  });
});

describe('pasikartojimas pasirinktomis dienomis', () => {
  it('Pr, Tr, Pn iki datos', () => {
    // 2026-11-02 – pirmadienis
    expect(repeatDates('2026-11-02', '2026-11-13', [0, 2, 4])).toEqual([
      '2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09', '2026-11-11', '2026-11-13',
    ]);
    // be dienų – kas savaitę ta pačia diena (kaip anksčiau)
    expect(repeatDates('2026-11-03', '2026-11-17')).toEqual(['2026-11-03', '2026-11-10', '2026-11-17']);
  });

  it('serija sukuriama tik pažymėtomis dienomis, net jei pradžios diena nepažymėta', () => {
    const s = createEntries({ ...base, date: '2026-11-03', repeatUntil: '2026-11-12', repeatDays: [0, 3] });
    expect(s.map((e) => e.date)).toEqual(['2026-11-05', '2026-11-09', '2026-11-12']);
    expect(s.every((e) => e.repeatDays?.join() === '0,3')).toBe(true);
  });

  it('„visus“: pakeitus dienas, serija perdaroma, sutampančios dienos išlaikomos', () => {
    const s = createEntries({ ...base, date: '2026-11-02', repeatUntil: '2026-11-13', repeatDays: [0, 2] });
    const { put, remove } = applyToSeries(s, s[0], { ...s[0], repeatDays: [0, 4] });
    expect(put.map((e) => e.date)).toEqual(['2026-11-02', '2026-11-06', '2026-11-09', '2026-11-13']);
    expect(put[0].id).toBe(s[0].id);
    expect(remove).toHaveLength(2); // abu trečiadieniai
  });
});

describe('konfliktai ir išdėstymas', () => {
  const mk = (id: string, start: string, end: string): Entry => ({ ...base, id, start, end });

  it('randa persidengimą, bet ne gretimus blokus', () => {
    const all = [mk('a', '08:00', '10:30'), mk('b', '10:30', '12:00')];
    expect(findConflicts([mk('n', '10:00', '11:00')], all).map((c) => c.with.id)).toEqual(['a', 'b']);
    expect(findConflicts([mk('n', '12:00', '13:00')], all)).toEqual([]);
  });

  it('persidengiantys įrašai gauna atskirus stulpelius', () => {
    const l = layoutDay([mk('a', '08:00', '10:00'), mk('b', '09:00', '11:00'), mk('c', '12:00', '13:00')]);
    const by = Object.fromEntries(l.map((p) => [p.entry.id, p]));
    expect([by.a.col, by.b.col, by.a.cols]).toEqual([0, 1, 2]);
    expect(by.c.cols).toBe(1);
  });
});

describe('praktikos valandos', () => {
  const p = (id: string, date: string, extra: Partial<Entry> = {}): Entry => ({
    id, title: 'Praktika', type: 'practice', date, start: '08:00', end: '10:30', status: 'auto', ...extra,
  });
  it('skaičiuoja suplanuotas ir atliktas valandas su būsenomis', () => {
    const now = { date: '2026-10-28', minutes: 9 * 60 };
    const t = practiceTotals(
      [
        p('1', '2026-10-26'),
        p('2', '2026-10-27', { status: 'missed' }),
        p('3', '2026-10-28'),
        p('4', '2026-10-29', { status: 'done', actualHours: 3 }),
      ],
      now,
    );
    expect(t.planned).toBe(2.5 + 0 + 2.5 + 3);
    expect(t.completed).toBe(2.5 + 3);
  });
});

describe('pavadinimų trumpiniai', () => {
  it('trumpina ilgus pavadinimus ir išmeta modulio kodą iš pastabos', () => {
    expect(shortTitle('Skaitiniai metodai ir algoritmai')).toBe('SMA');
    expect(shortTitle('Kompiuterių tinklai ir internetinės technologijos')).toBe('KTIT');
    expect(shortTitle('Praktika')).toBe('Praktika');
    expect(noteDetails('P170B115 · B2-102 · prof. Rimantas …')).toBe('B2-102 · prof. Rimantas …');
    expect(noteDetails('Atsinešti kompiuterį')).toBe('Atsinešti kompiuterį');
  });
});

describe('tempimas', () => {
  const e = { start: '13:30', end: '15:00' };
  it('perkelia visą bloką ir neišeina už paros ribų', () => {
    expect(dragTimes(e, 'move', 30)).toEqual({ start: 14 * 60, end: 15 * 60 + 30 });
    expect(dragTimes(e, 'move', -20 * 60)).toEqual({ start: 0, end: 90 });
    expect(dragTimes(e, 'move', 20 * 60)).toEqual({ start: 1439 - 90, end: 1439 });
  });
  it('ištempia tik pabaigą, bet ne trumpiau nei 15 min.', () => {
    expect(dragTimes(e, 'resize', 45)).toEqual({ start: 13 * 60 + 30, end: 15 * 60 + 45 });
    expect(dragTimes(e, 'resize', -300)).toEqual({ start: 13 * 60 + 30, end: 13 * 60 + 45 });
  });
  it('savas trumpinys turi pirmenybę prieš sugeneruotą', () => {
    expect(displayShort({ title: 'Kompiuterių tinklai ir internetinės technologijos', short: 'KT' })).toBe('KT');
    expect(displayShort({ title: 'Kompiuterių tinklai ir internetinės technologijos', short: ' ' })).toBe('KTIT');
  });
});

describe('varnelė', () => {
  it('praktikai perjungia „įvyko“ ↔ „auto“, kitiems – done', () => {
    const p: Entry = { id: 'p', title: 'Praktika', type: 'practice', date: '2026-11-10', start: '08:00', end: '10:30', status: 'auto' };
    expect(isChecked(p)).toBe(false);
    expect(toggleChecked(p).status).toBe('done');
    expect(toggleChecked(toggleChecked(p)).status).toBe('auto');
    const l: Entry = { ...p, id: 'l', type: 'lecture', status: undefined };
    expect(isChecked(toggleChecked(l))).toBe(true);
    expect(toggleChecked(toggleChecked(l)).done).toBeUndefined();
  });
});

describe('laiko zona', () => {
  it('Vilniaus laikas teisingai verčiamas žiemą ir vasarą', () => {
    expect(new Date(vilniusToEpoch('2026-11-02', '08:00')).toISOString()).toBe('2026-11-02T06:00:00.000Z');
    expect(new Date(vilniusToEpoch('2026-07-01', '08:00')).toISOString()).toBe('2026-07-01T05:00:00.000Z');
    expect(nowInVilnius(new Date('2026-10-25T22:30:00Z'))).toEqual({ date: '2026-10-26', minutes: 30 });
  });
});
