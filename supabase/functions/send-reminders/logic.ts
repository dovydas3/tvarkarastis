// Priminimų skaičiavimas be priklausomybių (testuojama Vitest, naudojama Deno funkcijoje).

export interface EntryRow {
  id: string;
  /** Įrašo duomenys (kaip programėlėje) */
  data: {
    kind?: string;
    title?: string;
    type?: string;
    date?: string;
    start?: string;
    end?: string;
    note?: string;
    status?: string;
    done?: boolean;
  };
}

export interface Reminder {
  /** Unikalus raktas (kad neišsiųstume du kartus): id@data laikas */
  key: string;
  title: string;
  body: string;
}

const TYPE_LABELS: Record<string, string> = {
  lecture: 'Paskaita',
  practice: 'Praktika',
  exam: 'Atsiskaitymas',
  personal: 'Asmeninis',
  other: 'Kita',
};

const pad = (n: number) => String(n).padStart(2, '0');
const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const dayIndex = (d: string) => Math.round(Date.parse(`${d}T00:00:00Z`) / 86400000);

/** Dabartinė data ir minutė Vilniaus laiku. */
export function vilniusNow(now: Date): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Vilnius',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

export function addDays(d: string, n: number): string {
  const dt = new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Pastaba be modulio kodo („P170B115 · B2-102 · …“ → „B2-102 · …“). */
function details(note?: string): string {
  if (!note) return '';
  const parts = note.split(' · ');
  return parts.length > 1 && /^[A-Z]\d{3}[A-Z]\d{3}$/.test(parts[0]) ? parts.slice(1).join(' · ') : note;
}

/**
 * Kuriems įrašams dabar laikas priminti: priminimo momentas (pradžia − lead) jau atėjo,
 * bet įrašas dar neprasidėjo, ir šis priminimas dar nesiųstas. Taip priminimai nepasimeta,
 * net jei cron kvietimas pavėluoja.
 */
export function dueReminders(
  rows: EntryRow[],
  now: { date: string; minutes: number },
  leadMinutes: number,
  alreadySent: Set<string>,
): Reminder[] {
  const out: Reminder[] = [];
  const today = dayIndex(now.date);
  for (const { id, data: e } of rows) {
    if (e.kind === 'todo' || !e.date || !e.start || !e.end) continue;
    if (e.done || e.status === 'missed') continue;
    const startAbs = (dayIndex(e.date) - today) * 1440 + toMinutes(e.start);
    const fireAbs = startAbs - leadMinutes;
    if (!(fireAbs <= now.minutes && now.minutes < startAbs)) continue;
    const key = `${id}@${e.date}T${e.start}`;
    if (alreadySent.has(key)) continue;
    const left = startAbs - now.minutes;
    const type = TYPE_LABELS[e.type ?? ''] ?? 'Įrašas';
    const where = details(e.note);
    out.push({
      key,
      title: `${e.title ?? type} ${e.start}–${e.end}`,
      body: `${type} prasideda po ${left} min.${where ? ` · ${where}` : ''}`,
    });
  }
  return out;
}
