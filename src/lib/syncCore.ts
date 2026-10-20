// Sinchronizacijos logika be priklausomybių nuo IndexedDB ar Supabase – kad būtų galima testuoti.
//
// Principas („last write wins“ kiekvienam įrašui):
// - kiekvienas pakeitimas įrenginyje gauna updatedAt (ms) ir žymę dirty;
// - push: dirty įrašai išsiunčiami; serveris įrašo tik jei jo versija senesnė;
// - pull: parsiunčiamos eilutės, pasikeitusios serveryje nuo paskutinio karto
//   (pagal serverio laiką), ir pritaikomos, jei naujesnės už vietines;
// - ištrynimai keliauja kaip žymės deleted = true.

import type { StoredRecord } from '../types';

export interface RemoteRow {
  id: string;
  data: StoredRecord;
  updated_at: number;
  deleted: boolean;
}

export interface PulledRow extends RemoteRow {
  /** Serverio laikas (ISO), kada eilutė pasikeitė */
  server_updated_at: string;
}

/** Vietinė saugykla (IndexedDB programoje, atmintis testuose). */
export interface LocalStore {
  getDirty(): Promise<StoredRecord[]>;
  /** Nuima dirty žymę, jei įrašas nuo išsiuntimo nepasikeitė (updatedAt sutampa). */
  markClean(sent: { id: string; updatedAt: number }[]): Promise<void>;
  /** Pritaiko parsiųstas eilutes; grąžina, kiek vietinių įrašų pasikeitė. */
  applyRemote(rows: RemoteRow[]): Promise<number>;
  getCursor(): Promise<string | null>;
  setCursor(cursor: string): Promise<void>;
}

/** Debesis (Supabase programoje, atmintis testuose). */
export interface RemoteApi {
  push(rows: RemoteRow[]): Promise<void>;
  /** Eilutės, kurių server_updated_at > since (arba >= kai inclusive), surūšiuotos didėjimo tvarka. */
  pull(since: string | null, limit: number, inclusive: boolean): Promise<PulledRow[]>;
}

/** Laukai, kurie egzistuoja tik šiame įrenginyje ir į debesį nesiunčiami. */
export function stripLocal(e: StoredRecord): StoredRecord {
  const { dirty: _d, ...rest } = e;
  return rest;
}

export function toRemote(e: StoredRecord): RemoteRow {
  const data = stripLocal(e);
  return { id: e.id, data, updated_at: e.updatedAt ?? 0, deleted: Boolean(e.deleted) };
}

/**
 * Ką padaryti su parsiųsta eilute: grąžina naują vietinį įrašą arba null (palikti vietinį).
 * Laimi naujesnis updatedAt; vienodam – vietinis paliekamas (jis jau toks pat arba bus išsiųstas).
 */
export function mergeRemote(local: StoredRecord | undefined, row: RemoteRow): StoredRecord | null {
  const localTs = local?.updatedAt ?? 0;
  if (local && row.updated_at <= localTs) return null;
  return { ...row.data, id: row.id, updatedAt: row.updated_at, deleted: row.deleted || undefined };
}

const CONTENT_IGNORED = new Set(['updatedAt', 'dirty', 'deleted']);

/** Ar du įrašai vienodi turiniu (neskaitant sinchronizacijos laukų ir undefined reikšmių). */
export function sameContent(a: StoredRecord, b: StoredRecord): boolean {
  const norm = (e: StoredRecord) =>
    JSON.stringify(
      Object.keys(e)
        .filter((k) => !CONTENT_IGNORED.has(k) && (e as unknown as Record<string, unknown>)[k] !== undefined)
        .sort()
        .map((k) => [k, (e as unknown as Record<string, unknown>)[k]]),
    );
  return norm(a) === norm(b);
}

const PUSH_BATCH = 200;
const PULL_PAGE = 500;
/** Pirmas pull puslapis persidengia su ankstesniu, kad nepraleistų lygiagrečiai įrašytų eilučių. */
const PULL_OVERLAP_MS = 5000;

export interface SyncResult {
  pushed: number;
  pulled: number;
  changed: number;
}

export async function runSync(local: LocalStore, remote: RemoteApi): Promise<SyncResult> {
  // 1. Išsiųsti vietinius pakeitimus
  const dirty = await local.getDirty();
  for (let i = 0; i < dirty.length; i += PUSH_BATCH) {
    const batch = dirty.slice(i, i + PUSH_BATCH);
    await remote.push(batch.map(toRemote));
    await local.markClean(batch.map((e) => ({ id: e.id, updatedAt: e.updatedAt ?? 0 })));
  }

  // 2. Parsisiųsti, kas pasikeitė serveryje
  const cursor = await local.getCursor();
  let since = cursor ? new Date(Date.parse(cursor) - PULL_OVERLAP_MS).toISOString() : null;
  let inclusive = true;
  let pulled = 0;
  let changed = 0;
  let last = cursor;
  for (;;) {
    const rows = await remote.pull(since, PULL_PAGE, inclusive);
    if (!rows.length) break;
    pulled += rows.length;
    changed += await local.applyRemote(rows);
    last = rows[rows.length - 1].server_updated_at;
    if (rows.length < PULL_PAGE) break;
    since = last;
    inclusive = false;
  }
  // Kursorius niekada nejuda atgal (persidengimo lange gali grįžti senesnės eilutės).
  if (last && (!cursor || Date.parse(last) > Date.parse(cursor))) await local.setCursor(last);
  return { pushed: dirty.length, pulled, changed };
}
