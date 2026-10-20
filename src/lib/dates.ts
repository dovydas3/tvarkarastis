// Visos datos – eilutės 'YYYY-MM-DD' (Vilniaus vietinė data), laikai – 'HH:mm'.
// Aritmetika daroma per UTC, kad vasaros/žiemos laiko kaita nesugadintų dienų skaičiavimo.

export const TIME_ZONE = 'Europe/Vilnius';

const pad = (n: number) => String(n).padStart(2, '0');

export function parseDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function formatDate(dt: Date): string {
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addDays(d: string, n: number): string {
  const dt = parseDate(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return formatDate(dt);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / 86400000);
}

/** 0 = pirmadienis … 6 = sekmadienis */
export function weekdayIndex(d: string): number {
  return (parseDate(d).getUTCDay() + 6) % 7;
}

export function startOfWeek(d: string): string {
  return addDays(d, -weekdayIndex(d));
}

export function startOfMonth(d: string): string {
  return d.slice(0, 8) + '01';
}

export function addMonths(d: string, n: number): string {
  const dt = parseDate(startOfMonth(d));
  dt.setUTCMonth(dt.getUTCMonth() + n);
  return formatDate(dt);
}

export function daysInMonth(d: string): number {
  const dt = parseDate(startOfMonth(d));
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function durationHours(start: string, end: string): number {
  return Math.max(0, toMinutes(end) - toMinutes(start)) / 60;
}

/** Dabartinė data ir minutė Vilniaus laiku, nepriklausomai nuo įrenginio laiko zonos. */
export function nowInVilnius(now: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** Absoliutus laiko momentas (ms) Vilniaus vietinei datai ir laikui. */
export function vilniusToEpoch(date: string, time: string): number {
  const naive = parseDate(date).getTime() + toMinutes(time) * 60000;
  // Paslinkimas tarp UTC ir Vilniaus tuo momentu (pataisoma dviem žingsniais dėl DST ribos).
  let guess = naive;
  for (let i = 0; i < 2; i++) {
    const v = nowInVilnius(new Date(guess));
    const shown = parseDate(v.date).getTime() + v.minutes * 60000;
    guess += naive - shown;
  }
  return guess;
}

export const WEEKDAYS_SHORT = ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk'];
export const WEEKDAYS_LONG = [
  'Pirmadienis',
  'Antradienis',
  'Trečiadienis',
  'Ketvirtadienis',
  'Penktadienis',
  'Šeštadienis',
  'Sekmadienis',
];
export const MONTHS = [
  'Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis',
  'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis',
];
const MONTHS_GENITIVE = [
  'sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio',
  'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio',
];

/** „spalio 26 d.“ */
export function formatDayMonth(d: string): string {
  const dt = parseDate(d);
  return `${MONTHS_GENITIVE[dt.getUTCMonth()]} ${dt.getUTCDate()} d.`;
}

/** „Pirmadienis, spalio 26 d.“ */
export function formatLongDay(d: string): string {
  return `${WEEKDAYS_LONG[weekdayIndex(d)]}, ${formatDayMonth(d)}`;
}

/** „10-26“ */
export function formatShort(d: string): string {
  return d.slice(5);
}

export function formatHours(h: number): string {
  const r = Math.round(h * 100) / 100;
  return r.toLocaleString('lt-LT', { maximumFractionDigits: 2 });
}

/** Trukmė: „45 min.“, „2 val.“, „1 val. 30 min.“ */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min.`;
  return m ? `${h} val. ${m} min.` : `${h} val.`;
}

/** „po 45 min.“, „po 2 val. 5 min.“, „po 3 d.“ */
export function formatIn(minutes: number): string {
  if (minutes < 1) return 'dabar';
  if (minutes < 60) return `po ${minutes} min.`;
  if (minutes < 24 * 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `po ${h} val. ${m} min.` : `po ${h} val.`;
  }
  return `po ${Math.round(minutes / (24 * 60))} d.`;
}
