export type EntryType = 'lecture' | 'practice' | 'exam' | 'personal' | 'other';

/** Praktikos bloko būsena. 'auto' – laikoma įvykusia, kai blokas pasibaigia. */
export type PracticeStatus = 'auto' | 'done' | 'missed';

export interface Entry {
  id: string;
  title: string;
  /** Trumpinys siauriems stulpeliams (savaitės vaizdas); jei nėra – sugeneruojamas. */
  short?: string;
  type: EntryType;
  /** Pasirinkta ikona (Icon pavadinimas); jei nėra – pagal tipą. */
  icon?: string;
  /** Visada undefined įrašams (skiria nuo darbų toje pačioje saugykloje). */
  kind?: undefined;
  /** Vietinė (Europe/Vilnius) data, YYYY-MM-DD */
  date: string;
  /** HH:mm, 24 val. */
  start: string;
  end: string;
  note?: string;
  /** Pasikartojančio įrašo serija – visi jos nariai turi tą patį seriesId. */
  seriesId?: string;
  /** Serijos pabaiga (imtinai), YYYY-MM-DD */
  repeatUntil?: string;
  status?: PracticeStatus;
  /** Pažymėta kaip atlikta (ne praktikos įrašams; praktikai naudojamas status). */
  done?: boolean;
  /** Faktinės valandos, jei skiriasi nuo suplanuotų. */
  actualHours?: number;
  source?: 'seed' | 'user';
  /** Kada paskutinį kartą pakeista (ms). 0 / nėra – nepakeistas pradinis įrašas. Sinchronizacijoje naujesnis laimi. */
  updatedAt?: number;
  /** Ištrintas (žymė lieka DB, kad trynimas pasiektų kitus įrenginius). */
  deleted?: boolean;
  /** Tik vietinė žymė: pakeista, bet dar neišsiųsta į debesį. */
  dirty?: 1;
}

/**
 * Darbas be laiko („Inbox“). Saugomas toje pačioje saugykloje ir sinchronizuojamas
 * kartu su įrašais; skiriamas pagal kind = 'todo'.
 */
export interface Todo {
  id: string;
  kind: 'todo';
  title: string;
  /** Ikona (Icon pavadinimas) */
  icon?: string;
  /** Iki kada (YYYY-MM-DD), neprivaloma */
  due?: string;
  note?: string;
  done?: boolean;
  /** Kada pažymėta atlikta (ms) */
  doneAt?: number;
  createdAt: number;
  updatedAt?: number;
  deleted?: boolean;
  dirty?: 1;
}

/** Viskas, kas saugoma vietinėje DB ir sinchronizuojama. */
export type StoredRecord = Entry | Todo;

export const isTodo = (r: StoredRecord): r is Todo => r.kind === 'todo';

export interface Settings {
  showWeekend: boolean;
  notifications: boolean;
  notifyMinutes: number;
  /** Šis įrenginys gauna push priminimus iš serverio */
  push: boolean;
  /** Lengva vibracija paspaudus (veikia Android; iOS naršyklės to neleidžia). */
  haptics: boolean;
  /** Vardas ir pavardė praktikos ataskaitoje */
  studentName: string;
  /** Kalendoriaus skiltyje rodomas vaizdas */
  calendarView: 'week' | 'month';
}

export const DEFAULT_SETTINGS: Settings = {
  showWeekend: false,
  notifications: false,
  notifyMinutes: 15,
  push: false,
  haptics: true,
  calendarView: 'week',
  studentName: '',
};

export const TYPE_LABELS: Record<EntryType, string> = {
  lecture: 'Paskaita',
  practice: 'Praktika',
  exam: 'Atsiskaitymas',
  personal: 'Asmeninis',
  other: 'Kita',
};
