export type EntryType = 'lecture' | 'practice' | 'personal' | 'other';

/** Praktikos bloko būsena. 'auto' – laikoma įvykusia, kai blokas pasibaigia. */
export type PracticeStatus = 'auto' | 'done' | 'missed';

export interface Entry {
  id: string;
  title: string;
  /** Trumpinys siauriems stulpeliams (savaitės vaizdas); jei nėra – sugeneruojamas. */
  short?: string;
  type: EntryType;
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

export interface Settings {
  showWeekend: boolean;
  weekDays: 3 | 5;
  notifications: boolean;
  notifyMinutes: number;
  /** Lengva vibracija paspaudus (veikia Android; iOS naršyklės to neleidžia). */
  haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  showWeekend: false,
  weekDays: 5,
  notifications: false,
  notifyMinutes: 15,
  haptics: true,
};

export const TYPE_LABELS: Record<EntryType, string> = {
  lecture: 'Paskaita',
  practice: 'Praktika',
  personal: 'Asmeninis',
  other: 'Kita',
};
