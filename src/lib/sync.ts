// Sinchronizacija su Supabase. Programėlė visada dirba su vietine IndexedDB;
// ši dalis tik išsiunčia pakeitimus ir parsiunčia kitų įrenginių pakeitimus.

import { useSyncExternalStore } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as db from './db';
import { runSync, type PulledRow, type RemoteApi } from './syncCore';

export type SyncState = 'unconfigured' | 'signed-out' | 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncStatus {
  state: SyncState;
  email?: string;
  lastSync?: number;
  error?: string;
  /** Iš kur paimti Supabase duomenys: build'o (GitHub secrets / .env) ar įvesti šiame įrenginyje */
  configSource?: 'env' | 'device';
}

export interface SyncConfig {
  url: string;
  key: string;
}

const ENV_CONFIG: SyncConfig | null =
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    ? { url: import.meta.env.VITE_SUPABASE_URL, key: import.meta.env.VITE_SUPABASE_ANON_KEY }
    : null;

// ---- būsena ir prenumeratos ----------------------------------------------

let status: SyncStatus = { state: 'unconfigured' };
const statusListeners = new Set<() => void>();
const dataListeners = new Set<() => void>();

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  statusListeners.forEach((fn) => fn());
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (fn) => {
      statusListeners.add(fn);
      return () => statusListeners.delete(fn);
    },
    () => status,
  );
}

/** Iškviečiama, kai iš debesies atėjo pakeitimų (programėlė turi perkrauti įrašus). */
export function onRemoteData(fn: () => void): () => void {
  dataListeners.add(fn);
  return () => dataListeners.delete(fn);
}

// ---- Supabase klientas ---------------------------------------------------

let client: SupabaseClient | null = null;
let currentConfig: SyncConfig | null = null;
let started = false;

/** Prisijungęs Supabase klientas ir jo nustatymai (push priminimams), arba null. */
export function getSupabase(): { client: SupabaseClient; config: SyncConfig } | null {
  return client && currentConfig && status.email ? { client, config: currentConfig } : null;
}

async function getConfig(): Promise<{ config: SyncConfig; source: 'env' | 'device' } | null> {
  const device = await db.getMeta<SyncConfig>('syncConfig');
  if (device) return { config: device, source: 'device' };
  if (ENV_CONFIG) return { config: ENV_CONFIG, source: 'env' };
  return null;
}

async function connect() {
  const found = await getConfig();
  currentConfig = found?.config ?? null;
  if (!found) {
    client = null;
    setStatus({ state: 'unconfigured', email: undefined, error: undefined, configSource: undefined });
    return;
  }
  // Supabase biblioteka įkeliama tik kai sinchronizacija sukonfigūruota.
  const { createClient } = await import('@supabase/supabase-js');
  client = createClient(found.config.url, found.config.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'tvarkarastis-auth' },
  });
  const lastSync = await db.getMeta<number>('lastSync');
  const { data } = await client.auth.getSession();
  const email = data.session?.user.email;
  setStatus({ state: email ? 'idle' : 'signed-out', email, lastSync, error: undefined, configSource: found.source });
  client.auth.onAuthStateChange((_event, session) => {
    // Supabase rekomenduoja čia nekviesti kitų jo funkcijų tiesiogiai – tik atnaujinam būseną.
    const mail = session?.user.email;
    if (!mail) setStatus({ state: 'signed-out', email: undefined });
    else if (status.state === 'signed-out') setStatus({ state: 'idle', email: mail });
  });
  if (email) scheduleSync(0);
}

/** Paleidžiama vieną kartą programėlei užsikrovus. */
export async function initSync(): Promise<void> {
  if (started) return;
  started = true;
  db.setChangeListener(() => scheduleSync(1500));
  window.addEventListener('online', () => scheduleSync(0));
  window.addEventListener('offline', () => status.email && setStatus({ state: 'offline' }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleSync(0);
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') scheduleSync(0);
  }, 60_000);
  await connect();
}

export async function saveConfig(url: string, key: string): Promise<void> {
  const clean = url.trim().replace(/\/+$/, '');
  if (!/^https:\/\/.+/.test(clean)) throw new Error('Adresas turi prasidėti https://');
  if (key.trim().length < 20) throw new Error('Raktas per trumpas – nukopijuok visą „anon“ / „publishable“ raktą.');
  await db.setMeta('syncConfig', { url: clean, key: key.trim() });
  await db.setMeta('syncCursor', undefined);
  await connect();
}

export async function clearDeviceConfig(): Promise<void> {
  await client?.auth.signOut().catch(() => undefined);
  await db.setMeta('syncConfig', undefined);
  await db.setMeta('syncCursor', undefined);
  await connect();
}

// ---- prisijungimas -------------------------------------------------------

/**
 * Prisijungimas el. paštu ir slaptažodžiu. Vartotojas sukuriamas Supabase skydelyje
 * (Authentication → Users → Add user, „Auto Confirm User“), todėl laiškų siųsti nereikia.
 */
export async function signIn(email: string, password: string): Promise<void> {
  if (!client) throw new Error('Sinchronizacija nesukonfigūruota.');
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(friendlyError(error));
  // Nauja paskyra / įrenginys – parsisiunčiam viską iš naujo.
  await db.setMeta('syncCursor', undefined);
  setStatus({ state: 'idle', email: data.user?.email ?? email, error: undefined });
  await syncNow();
}

export async function signOut(): Promise<void> {
  await client?.auth.signOut();
  await db.setMeta('syncCursor', undefined);
  setStatus({ state: 'signed-out', email: undefined, error: undefined });
}

// ---- sinchronizavimas ----------------------------------------------------

function remoteApi(c: SupabaseClient): RemoteApi {
  return {
    async push(rows) {
      const { error } = await c.rpc('push_entries', { rows });
      if (error) throw error;
    },
    async pull(since, limit, inclusive) {
      let q = c
        .from('entries')
        .select('id, data, updated_at, deleted, server_updated_at')
        .order('server_updated_at', { ascending: true })
        .limit(limit);
      if (since) q = inclusive ? q.gte('server_updated_at', since) : q.gt('server_updated_at', since);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, updated_at: Number(r.updated_at) }) as PulledRow);
    },
  };
}

let timer: number | undefined;
let running: Promise<void> | null = null;
let again = false;

export function scheduleSync(delay: number) {
  clearTimeout(timer);
  timer = window.setTimeout(() => void syncNow(), delay);
}

/** Sinchronizuoja dabar (jei jau vyksta – pakartos po jos). */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await syncOnce();
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

async function syncOnce() {
  if (!client || !status.email) return;
  if (!navigator.onLine) {
    setStatus({ state: 'offline' });
    return;
  }
  setStatus({ state: 'syncing' });
  try {
    const result = await runSync(db.localStore, remoteApi(client));
    const lastSync = Date.now();
    await db.setMeta('lastSync', lastSync);
    setStatus({ state: 'idle', lastSync, error: undefined });
    if (result.changed) dataListeners.forEach((fn) => fn());
  } catch (e) {
    setStatus({ state: 'error', error: friendlyError(e) });
  }
}

function friendlyError(e: unknown): string {
  const err = e as { message?: string; code?: string; status?: number };
  const msg = err?.message ?? String(e);
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return 'Nepavyko pasiekti serverio. Patikrink internetą ir Supabase adresą.';
  if (err.code === '42P01' || err.code === 'PGRST205' || /relation .* does not exist|could not find the table/i.test(msg))
    return 'Duomenų bazėje nėra lentelės „entries“. Paleisk supabase/schema.sql Supabase SQL redaktoriuje.';
  if (err.code === 'PGRST202' || /push_entries/i.test(msg))
    return 'Nerasta funkcija push_entries. Paleisk supabase/schema.sql Supabase SQL redaktoriuje.';
  if (/invalid login credentials/i.test(msg)) return 'Neteisingas el. paštas arba slaptažodis.';
  if (/email not confirmed/i.test(msg))
    return 'Vartotojas nepatvirtintas. Supabase: Authentication → Users → sukurk vartotoją su „Auto Confirm User“.';
  if (/rate limit|too many/i.test(msg) || err.status === 429) return 'Per daug bandymų. Palauk kelias minutes ir bandyk vėl.';
  if (/invalid api key|no api key|jwt/i.test(msg)) return 'Neteisingas Supabase raktas. Patikrink jį nustatymuose.';
  return msg;
}
