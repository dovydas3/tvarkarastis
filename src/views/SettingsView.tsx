import { useRef, useState } from 'react';
import type { Settings } from '../types';
import { ViewHeader, Dialog } from '../components/ui';
import { notificationsSupported, requestNotificationPermission } from '../lib/notify';
import { parseBackup, type Backup } from '../lib/backup';
import { hapticsSupported } from '../lib/hooks';
import { SyncSection } from '../components/SyncSection';
import { PRACTICE_SUPERVISOR } from '../data/seed';

interface Props {
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
  entryCount: number;
  onExport: () => void;
  onImport: (b: Backup) => Promise<void>;
  onReset: () => Promise<void>;
}

export function SettingsView({ settings, updateSettings, entryCount, onExport, onImport, onReset }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<Backup | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
  const notifSupported = notificationsSupported();

  return (
    <div>
      <ViewHeader title="Nustatymai" />
      <div className="space-y-4 p-3">
        {message && <div className="card border-l-4 border-teal-600 text-sm">{message}</div>}

        <SyncSection />

        <section className="card space-y-3">
          <h2 className="font-semibold">Atsarginė kopija</h2>
          <p className="text-sm text-slate-500">Įrašų įrenginyje: {entryCount}. JSON failas – atsarginė kopija, nepriklausoma nuo sinchronizacijos.</p>
          <button type="button" className="btn-primary w-full" onClick={onExport}>
            Eksportuoti į JSON
          </button>
          <button type="button" className="btn-secondary w-full" onClick={() => fileRef.current?.click()}>
            Importuoti iš JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                setPendingImport(parseBackup(await f.text()));
              } catch (err) {
                setMessage(`Importuoti nepavyko: ${(err as Error).message}`);
              }
            }}
          />
        </section>

        {hapticsSupported() && (
          <section className="card">
            <label className="flex min-h-10 items-center justify-between">
              <span>
                <span className="block font-semibold">Vibracija</span>
                <span className="text-sm text-slate-500">Lengvas atsakas paspaudus ir išsaugojus</span>
              </span>
              <input
                type="checkbox"
                className="h-6 w-6 accent-teal-700"
                checked={settings.haptics}
                onChange={(e) => updateSettings({ haptics: e.target.checked })}
              />
            </label>
          </section>
        )}

        <section className="card space-y-3">
          <h2 className="font-semibold">Priminimai</h2>
          {!notifSupported ? (
            <p className="text-sm text-slate-500">
              Ši naršyklė pranešimų nepalaiko.{' '}
              {!standalone && 'iPhone pranešimai veikia tik įdiegus programėlę į pradžios ekraną.'}
            </p>
          ) : (
            <>
              <label className="flex min-h-10 items-center justify-between">
                <span>Priminti prieš įvykį</span>
                <input
                  type="checkbox"
                  className="h-6 w-6 accent-teal-700"
                  checked={settings.notifications}
                  onChange={async (e) => {
                    if (e.target.checked && !(await requestNotificationPermission())) {
                      setMessage('Pranešimai neleisti. Leisk juos naršyklės / telefono nustatymuose.');
                      return;
                    }
                    updateSettings({ notifications: e.target.checked });
                  }}
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>Prieš kiek minučių</span>
                <select
                  className="field w-28"
                  value={settings.notifyMinutes}
                  onChange={(e) => updateSettings({ notifyMinutes: Number(e.target.value) })}
                >
                  {[5, 10, 15, 30, 60].map((m) => (
                    <option key={m} value={m}>
                      {m} min.
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-slate-500">
                Be serverio priminimai veikia tik kol programėlė atidaryta arba neseniai naudota (fone). Uždarius jos – priminimų
                nebus.
              </p>
            </>
          )}
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">Pradinis grafikas</h2>
          <p className="text-sm text-slate-500">
            Ištrina visus įrašus (ir tavo pridėtus) ir įkelia praktikos grafiką iš naujo. Prieš tai verta eksportuoti kopiją.
          </p>
          <button type="button" className="btn-danger w-full" onClick={() => setConfirmReset(true)}>
            Atstatyti pradinį grafiką
          </button>
        </section>

        <section className="card space-y-1 text-sm text-slate-500">
          <div>Praktikos vadovas: {PRACTICE_SUPERVISOR}</div>
          <div>Laiko zona: Europe/Vilnius</div>
          <div>{standalone ? 'Veikia kaip įdiegta programėlė ✓' : 'Įdiek: „Bendrinti“ → „Pridėti prie pradžios ekrano“.'}</div>
        </section>
      </div>

      {pendingImport && (
        <Dialog
          title="Importuoti duomenis?"
          message={`Faile ${pendingImport.entries.length} įrašų. Dabartiniai įrašai bus pakeisti.`}
          actions={[
            {
              label: 'Importuoti',
              kind: 'primary',
              onClick: async () => {
                await onImport(pendingImport);
                setPendingImport(null);
                setMessage(`Importuota įrašų: ${pendingImport.entries.length}.`);
              },
            },
            { label: 'Atšaukti', onClick: () => setPendingImport(null) },
          ]}
        />
      )}
      {confirmReset && (
        <Dialog
          title="Atstatyti pradinį grafiką?"
          message="Visi dabartiniai įrašai bus ištrinti ir pakeisti pradiniu praktikos grafiku. Šio veiksmo atšaukti negalima."
          actions={[
            {
              label: 'Taip, atstatyti',
              kind: 'danger',
              onClick: async () => {
                await onReset();
                setConfirmReset(false);
                setMessage('Pradinis grafikas atstatytas.');
              },
            },
            { label: 'Atšaukti', onClick: () => setConfirmReset(false) },
          ]}
        />
      )}
    </div>
  );
}
