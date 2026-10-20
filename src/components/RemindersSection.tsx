import { useEffect, useState } from 'react';
import type { Settings } from '../types';
import { notificationsSupported, requestNotificationPermission } from '../lib/notify';
import { disablePush, enablePush, isIosBrowserTab, pushSubscribed, pushSupported, updatePushLead } from '../lib/push';
import { useSyncStatus } from '../lib/sync';
import { Switch } from './ui';

/**
 * Priminimai: pagrindinis būdas – push per Supabase (veikia ir uždarius programėlę);
 * be prisijungimo lieka vietiniai priminimai (tik kol programėlė atidaryta).
 */
export function RemindersSection({ settings, updateSettings }: { settings: Settings; updateSettings: (s: Partial<Settings>) => void }) {
  const sync = useSyncStatus();
  const [push, setPush] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void pushSubscribed().then((on) => {
      setPush(on);
      if (on !== settings.push) updateSettings({ push: on });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loggedIn = Boolean(sync.email);
  const canPush = pushSupported() && !isIosBrowserTab();

  const togglePush = async (on: boolean) => {
    setBusy(true);
    setError(null);
    try {
      if (on) await enablePush(settings.notifyMinutes);
      else await disablePush();
      setPush(on);
      // Kai veikia push, vietiniai priminimai išjungiami (kad neateitų du kartus).
      updateSettings({ push: on, notifications: on ? false : settings.notifications });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card space-y-3">
      <h2 className="font-semibold">Priminimai</h2>

      <div className="flex items-center justify-between gap-3">
        <span>
          <span className="block">Priminti prieš įvykį</span>
          <span className="text-xs text-neutral-500">Ateina ir uždarius programėlę</span>
        </span>
        <Switch checked={push} onChange={(v) => void togglePush(v)} label="Push priminimai" />
      </div>
      {busy && <p className="text-xs text-neutral-500">Jungiama…</p>}
      {!loggedIn && <p className="text-xs text-neutral-500">Reikia prisijungti prie sinchronizacijos (skiltis viršuje).</p>}
      {loggedIn && !canPush && (
        <p className="text-xs text-neutral-500">
          {isIosBrowserTab() ? 'iPhone priminimai veikia tik programėlėje, įdiegtoje į pradžios ekraną.' : 'Ši naršyklė push pranešimų nepalaiko.'}
        </p>
      )}

      <label className="flex items-center justify-between gap-3">
        <span>Prieš kiek minučių</span>
        <select
          className="field w-28"
          value={settings.notifyMinutes}
          onChange={(e) => {
            const m = Number(e.target.value);
            updateSettings({ notifyMinutes: m });
            if (push) void updatePushLead(m);
          }}
        >
          {[5, 10, 15, 30, 60].map((m) => (
            <option key={m} value={m}>
              {m} min.
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Atsarginis variantas be serverio */}
      {!push && notificationsSupported() && (
        <div className="flex items-center justify-between gap-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <span>
            <span className="block text-sm">Tik kol programėlė atidaryta</span>
            <span className="text-xs text-neutral-500">Be serverio, šiame įrenginyje</span>
          </span>
          <Switch
            checked={settings.notifications}
            label="Vietiniai priminimai"
            onChange={async (v) => {
              if (v && !(await requestNotificationPermission())) {
                setError('Pranešimai neleisti. Leisk juos naršyklės / telefono nustatymuose.');
                return;
              }
              updateSettings({ notifications: v });
            }}
          />
        </div>
      )}
    </section>
  );
}
