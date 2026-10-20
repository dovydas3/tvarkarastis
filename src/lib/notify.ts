// Priminimai prieš įvykį be serverio.
// Be push serverio naršyklė negali „pažadinti“ uždarytos programėlės, todėl priminimai
// suplanuojami tik kol programėlė atidaryta (arba gyva fone). Plačiau – README.

import type { Entry, Settings } from '../types';
import { TYPE_LABELS } from '../types';
import { vilniusToEpoch } from './dates';

let timers: number[] = [];
const shown = new Set<string>();

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}

async function show(e: Entry, minutes: number) {
  const key = `${e.id}@${e.date}${e.start}`;
  if (shown.has(key)) return;
  shown.add(key);
  const title = `${e.title} ${e.start}–${e.end}`;
  const body = minutes > 0 ? `${TYPE_LABELS[e.type]} prasideda po ${minutes} min.` : `${TYPE_LABELS[e.type]} prasideda dabar.`;
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) await reg.showNotification(title, { body, tag: key, icon: 'pwa-192.png', badge: 'pwa-192.png' });
  else new Notification(title, { body, tag: key });
}

/** Perplanuoja priminimams artimiausių 24 val. įvykius. */
export function scheduleNotifications(entries: Entry[], settings: Settings): void {
  timers.forEach(clearTimeout);
  timers = [];
  if (!settings.notifications || !notificationsSupported() || Notification.permission !== 'granted') return;
  const now = Date.now();
  const lead = settings.notifyMinutes * 60000;
  for (const e of entries) {
    const startAt = vilniusToEpoch(e.date, e.start);
    const fireAt = startAt - lead;
    if (startAt <= now || fireAt - now > 24 * 3600000) continue;
    const delay = Math.max(0, fireAt - now);
    timers.push(window.setTimeout(() => void show(e, Math.round((startAt - Date.now()) / 60000)), delay));
  }
}
