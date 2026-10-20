import { describe, expect, it } from 'vitest';
import { buildReport, reportCsv } from './report';
import { generateSeedEntries } from '../data/seed';
import type { Entry } from '../types';

const seed = generateSeedEntries();

describe('praktikos ataskaita', () => {
  it('apima visas grafiko savaites ir visus 290 val. suplanuotų blokų', () => {
    const r = buildReport(seed, { date: '2026-10-20', minutes: 0 });
    expect(r.weeks).toHaveLength(14);
    expect(r.planned).toBe(290);
    expect(r.done).toBe(0);
    expect(r.weeks[0].rows[0]).toMatchObject({ date: '2026-10-26', weekday: 'Pirmadienis', start: '08:00', end: '10:30', planned: 2.5, status: 'Suplanuota' });
  });

  it('būsenos ir faktinės valandos: įvyko / neįvyko / suplanuota', () => {
    const entries: Entry[] = seed.map((e) =>
      e.id === 'seed-2026-10-27-practice-0800'
        ? { ...e, status: 'missed' }
        : e.id === 'seed-2026-10-27-practice-1330'
          ? { ...e, actualHours: 3 }
          : e,
    );
    const r = buildReport(entries, { date: '2026-10-28', minutes: 0 }, true);
    const w = r.weeks[0];
    expect(w.rows.map((x) => `${x.date} ${x.start} ${x.status} ${x.counted}`)).toEqual([
      '2026-10-26 08:00 Įvyko 2.5',
      '2026-10-27 08:00 Neįvyko 0',
      '2026-10-27 13:30 Įvyko 3',
    ]);
    expect(w.done).toBe(5.5);
  });

  it('CSV su kabliataškiais ir dešimtainiu kableliu', () => {
    const csv = reportCsv(buildReport(seed, { date: '2026-10-20', minutes: 0 }));
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('Data;Diena;Pradžia;Pabaiga;Suplanuota val.;Įskaityta val.;Būsena;Pastaba');
    expect(lines[1]).toBe('2026-10-26;Pirmadienis;08:00;10:30;2,5;2,5;Suplanuota;');
    expect(lines.at(-1)).toBe('Iš viso;;;;290;0;;');
  });
});
