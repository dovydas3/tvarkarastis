import { describe, expect, it } from 'vitest';
import { dueReminders, vilniusNow, type EntryRow } from '../../supabase/functions/send-reminders/logic.ts';

const row = (id: string, data: EntryRow['data']): EntryRow => ({ id, data });
const lecture = row('l1', {
  title: 'Lygiagretusis programavimas',
  type: 'lecture',
  date: '2026-11-10',
  start: '11:00',
  end: '12:30',
  note: 'P170B328 · XI r.-101 · doc. prakt. Karolis Rysel',
});

describe('serverio priminimai', () => {
  it('siunčia, kai atėjo priminimo laikas, bet įrašas dar neprasidėjo', () => {
    const at = (h: number, m: number) => dueReminders([lecture], { date: '2026-11-10', minutes: h * 60 + m }, 15, new Set());
    expect(at(10, 44)).toEqual([]);
    const r = at(10, 45);
    expect(r).toHaveLength(1);
    expect(r[0]).toEqual({
      key: 'l1@2026-11-10T11:00',
      title: 'Lygiagretusis programavimas 11:00–12:30',
      body: 'Paskaita prasideda po 15 min. · XI r.-101 · doc. prakt. Karolis Rysel',
    });
    // cron pavėlavo – vis tiek siunčiama, kol neprasidėjo
    expect(at(10, 58)[0].body).toContain('po 2 min.');
    expect(at(11, 0)).toEqual([]);
  });

  it('nesiunčia antrą kartą to paties', () => {
    const sent = new Set(['l1@2026-11-10T11:00']);
    expect(dueReminders([lecture], { date: '2026-11-10', minutes: 10 * 60 + 50 }, 15, sent)).toEqual([]);
  });

  it('perkėlus įrašą į kitą laiką – naujas priminimas', () => {
    const sent = new Set(['l1@2026-11-10T11:00']);
    const moved = row('l1', { ...lecture.data, start: '11:30', end: '13:00' });
    expect(dueReminders([moved], { date: '2026-11-10', minutes: 11 * 60 + 20 }, 15, sent)).toHaveLength(1);
  });

  it('veikia per vidurnaktį ir praleidžia darbus, atliktus ir neįvykusius', () => {
    const early = row('e', { title: 'Traukinys', type: 'personal', date: '2026-11-11', start: '00:10', end: '01:00' });
    const todo = row('t', { kind: 'todo', title: 'Pienas', date: '2026-11-10', start: '23:59', end: '23:59' });
    const missed = row('m', { title: 'Praktika', type: 'practice', date: '2026-11-11', start: '00:20', end: '01:00', status: 'missed' });
    const r = dueReminders([early, todo, missed], { date: '2026-11-10', minutes: 23 * 60 + 58 }, 15, new Set());
    expect(r.map((x) => x.key)).toEqual(['e@2026-11-11T00:10']);
  });

  it('Vilniaus laikas', () => {
    expect(vilniusNow(new Date('2026-11-10T09:45:00Z'))).toEqual({ date: '2026-11-10', minutes: 11 * 60 + 45 });
  });
});
