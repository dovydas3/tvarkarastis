// Push priminimai (veikia ir uždarius programėlę): įrenginio prenumerata saugoma Supabase,
// o serverio funkcija send-reminders kas minutę siunčia priminimus prieš įvykius.

import * as db from './db';
import { getSupabase, syncNow } from './sync';

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** iPhone: push veikia tik programėlėje, įdiegtoje į pradžios ekraną. */
export const isIosBrowserTab = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !(matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone);

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const functionUrl = (url: string) => `${new URL(url).origin}/functions/v1/send-reminders`;

async function fetchPublicKey(url: string, key: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(functionUrl(url), { headers: { apikey: key } });
  } catch {
    throw new Error('Nepavyko pasiekti funkcijos send-reminders. Patikrink internetą.');
  }
  if (!res.ok) throw new Error('Supabase funkcija send-reminders neįdiegta (žr. sąrankos žingsnius).');
  const { publicKey } = (await res.json()) as { publicKey?: string };
  if (!publicKey) throw new Error('Funkcijai nenustatytas VAPID_PUBLIC_KEY.');
  return publicKey;
}

/** Ar šis įrenginys jau prenumeruoja priminimus. */
export async function pushSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return Boolean(await reg?.pushManager.getSubscription());
}

/** Įjungia priminimus šiame įrenginyje. */
export async function enablePush(leadMinutes: number): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Pirma prisijunk prie sinchronizacijos (skiltis viršuje).');
  if (!pushSupported()) throw new Error('Ši naršyklė push pranešimų nepalaiko.');
  if (isIosBrowserTab()) throw new Error('iPhone priminimai veikia tik įdiegtoje programėlėje (pradžios ekrane).');
  if ((await Notification.requestPermission()) !== 'granted') {
    throw new Error('Pranešimai neleisti. Leisk juos telefono / naršyklės nustatymuose.');
  }
  const publicKey = await fetchPublicKey(sb.config.url, sb.config.key);
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await sb.client
    .from('push_subscriptions')
    .upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, lead_minutes: leadMinutes });
  if (error) {
    throw new Error(
      /push_subscriptions/.test(error.message)
        ? 'Duomenų bazėje nėra push_subscriptions lentelės. Paleisk supabase/push.sql.'
        : error.message,
    );
  }
  // Serveris turi matyti visą tvarkaraštį (ir nepakeistas pradines paskaitas / praktiką).
  await db.markSeedsForUpload();
  await syncNow();
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await getSupabase()?.client.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

export async function updatePushLead(leadMinutes: number): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await getSupabase()?.client.from('push_subscriptions').update({ lead_minutes: leadMinutes }).eq('endpoint', sub.endpoint);
}
