import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Entry, Settings, StoredRecord, Todo } from '../types';
import { DEFAULT_SETTINGS, isTodo } from '../types';
import { generateLectureEntries, generateSeedEntries, SEED_VERSION } from '../data/seed';
import { mergeRemote, sameContent, type LocalStore, type RemoteRow } from './syncCore';

interface ScheduleDB extends DBSchema {
  /** Tvarkaraščio įrašai ir darbai (kind = 'todo') vienoje saugykloje – sinchronizuojami kartu. */
  entries: { key: string; value: StoredRecord; indexes: { date: string; seriesId: string } };
  meta: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<ScheduleDB>> | null = null;

function db() {
  dbPromise ??= openDB<ScheduleDB>('tvarkarastis', 1, {
    upgrade(d) {
      const store = d.createObjectStore('entries', { keyPath: 'id' });
      store.createIndex('date', 'date');
      store.createIndex('seriesId', 'seriesId');
      d.createObjectStore('meta');
    },
  });
  return dbPromise;
}

// Sinchronizacija klausosi vietinių pakeitimų, kad galėtų juos greitai išsiųsti.
let changeListener: (() => void) | null = null;
export const setChangeListener = (fn: (() => void) | null) => {
  changeListener = fn;
};
const changed = () => changeListener?.();

/** Matomi (neištrinti) tvarkaraščio įrašai (be darbų). */
export async function getAllEntries(): Promise<Entry[]> {
  return (await (await db()).getAll('entries')).filter((e): e is Entry => !e.deleted && !isTodo(e));
}

/** Matomi (neištrinti) darbai. */
export async function getAllTodos(): Promise<Todo[]> {
  return (await (await db()).getAll('entries')).filter((e): e is Todo => !e.deleted && isTodo(e));
}

/** Įrašo pakeitimus (įrašus ar darbus): pažymi laiku ir kaip neišsiųstus. */
export async function putEntries(entries: StoredRecord[]): Promise<void> {
  if (!entries.length) return;
  const now = Date.now();
  const tx = (await db()).transaction('entries', 'readwrite');
  await Promise.all([...entries.map((e) => tx.store.put({ ...e, deleted: undefined, updatedAt: now, dirty: 1 })), tx.done]);
  changed();
}

/** Ištrina (palieka žymę, kad trynimas pasiektų kitus įrenginius). */
export async function deleteEntries(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const now = Date.now();
  const tx = (await db()).transaction('entries', 'readwrite');
  for (const id of ids) {
    const e = await tx.store.get(id);
    if (e) await tx.store.put({ ...e, deleted: true, updatedAt: now, dirty: 1 });
  }
  await tx.done;
  changed();
}

/**
 * Pakeičia visus tos pačios rūšies įrašus (importas, pradinio grafiko atstatymas):
 * kiti tos rūšies įrašai pažymimi ištrintais, kitos rūšies (pvz. darbai) – neliečiami.
 */
export async function replaceAllEntries(entries: StoredRecord[], kind: 'entry' | 'todo' = 'entry'): Promise<void> {
  const now = Date.now();
  const keep = new Set(entries.map((e) => e.id));
  const tx = (await db()).transaction('entries', 'readwrite');
  for (const e of await tx.store.getAll()) {
    if ((kind === 'todo') !== isTodo(e)) continue;
    if (!keep.has(e.id) && !e.deleted) await tx.store.put({ ...e, deleted: true, updatedAt: now, dirty: 1 });
  }
  for (const e of entries) await tx.store.put({ ...e, deleted: undefined, updatedAt: now, dirty: 1 });
  await tx.done;
  changed();
}

export async function getSettings(): Promise<Settings> {
  const s = (await (await db()).get('meta', 'settings')) as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...s };
}

export async function saveSettings(s: Settings): Promise<void> {
  await (await db()).put('meta', s, 'settings');
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get('meta', key)) as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const d = await db();
  if (value === undefined) await d.delete('meta', key);
  else await d.put('meta', value, key);
}

/**
 * Įkelia pradinį grafiką tik pirmą kartą (kai duomenų bazė dar niekada nebuvo užpildyta).
 * Pradiniai įrašai turi updatedAt = 0 ir nėra siunčiami į debesį: kiekvienas įrenginys
 * juos susigeneruoja pats (id sutampa), o debesin keliauja tik pakeitimai.
 */
export async function seedIfEmpty(): Promise<void> {
  const d = await db();
  if (!(await d.get('meta', 'seeded'))) {
    if ((await d.count('entries')) === 0) {
      const tx = d.transaction('entries', 'readwrite');
      await Promise.all([...generateSeedEntries().map((e) => tx.store.put(e)), tx.done]);
    }
    await d.put('meta', true, 'seeded');
    await d.put('meta', SEED_VERSION, 'seedVersion');
    await d.put('meta', 1, 'syncStamp');
    return;
  }
  const version = ((await d.get('meta', 'seedVersion')) as number | undefined) ?? 1;
  if (version < 2) await migrateLecturesV2();
  await d.put('meta', SEED_VERSION, 'seedVersion');
  if (!(await d.get('meta', 'syncStamp'))) {
    await stampForSync();
    await d.put('meta', 1, 'syncStamp');
  }
}

/**
 * v1 → v2: bevardės pradinės paskaitos („Paskaita“) pakeičiamos tikrais pavadinimais ir laikais.
 * Paties vartotojo pakeistos paskaitos ir visi praktikos blokai (su būsenomis) paliekami.
 */
async function migrateLecturesV2(): Promise<void> {
  const tx = (await db()).transaction('entries', 'readwrite');
  const all = await tx.store.getAll();
  const kept = new Set<string>();
  for (const e of all) {
    if (isTodo(e)) continue;
    if (e.source !== 'seed' || e.type !== 'lecture') continue;
    if (e.title === 'Paskaita' && !e.note) await tx.store.delete(e.id);
    else kept.add(e.id);
  }
  for (const e of generateLectureEntries()) if (!kept.has(e.id)) await tx.store.put(e);
  await tx.done;
}

/**
 * Duomenys iš versijos be sinchronizacijos: įrašai neturi updatedAt.
 * Paties sukurti ir pakeisti pradiniai įrašai pažymimi išsiuntimui, nepakeisti pradiniai – ne.
 */
async function stampForSync(): Promise<void> {
  const seeds = new Map(generateSeedEntries().map((e) => [e.id, e]));
  const now = Date.now();
  const tx = (await db()).transaction('entries', 'readwrite');
  for (const e of await tx.store.getAll()) {
    if (e.updatedAt !== undefined) continue;
    const seed = seeds.get(e.id);
    if (seed && sameContent(seed, e)) await tx.store.put({ ...e, updatedAt: 0 });
    else await tx.store.put({ ...e, updatedAt: now, dirty: 1 });
  }
  await tx.done;
}

/**
 * Serverio priminimams reikia viso tvarkaraščio debesyje, o nepakeisti pradiniai įrašai
 * (updatedAt = 0) į jį nesiunčiami. Pažymim juos išsiuntimui su updatedAt = 1 –
 * bet kuris tikras pakeitimas kitame įrenginyje (ms laikas) vis tiek laimės.
 */
export async function markSeedsForUpload(): Promise<number> {
  const tx = (await db()).transaction('entries', 'readwrite');
  let n = 0;
  for (const e of await tx.store.getAll()) {
    if (!e.deleted && !e.updatedAt) {
      await tx.store.put({ ...e, updatedAt: 1, dirty: 1 });
      n++;
    }
  }
  await tx.done;
  if (n) changed();
  return n;
}

export async function resetToSeed(): Promise<void> {
  await replaceAllEntries(generateSeedEntries());
  const d = await db();
  await d.put('meta', true, 'seeded');
  await d.put('meta', SEED_VERSION, 'seedVersion');
}

/** IndexedDB kaip sinchronizacijos vietinė saugykla. */
export const localStore: LocalStore = {
  async getDirty() {
    return (await (await db()).getAll('entries')).filter((e) => e.dirty);
  },
  async markClean(sent) {
    const tx = (await db()).transaction('entries', 'readwrite');
    for (const { id, updatedAt } of sent) {
      const e = await tx.store.get(id);
      // Jei įrašas pasikeitė kol buvo siunčiamas – lieka dirty ir bus išsiųstas kitą kartą.
      if (e && e.dirty && (e.updatedAt ?? 0) === updatedAt) await tx.store.put({ ...e, dirty: undefined });
    }
    await tx.done;
  },
  async applyRemote(rows: RemoteRow[]) {
    let count = 0;
    const tx = (await db()).transaction('entries', 'readwrite');
    for (const row of rows) {
      const next = mergeRemote(await tx.store.get(row.id), row);
      if (next) {
        await tx.store.put(next);
        count++;
      }
    }
    await tx.done;
    return count;
  },
  getCursor: async () => (await getMeta<string>('syncCursor')) ?? null,
  setCursor: (c) => setMeta('syncCursor', c),
};

/** Paprašo naršyklės nevalyti duomenų automatiškai (ypač svarbu iOS). */
export async function requestPersistence(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* nepalaikoma */
  }
}
