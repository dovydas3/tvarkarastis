import { useEffect, useState } from 'react';
import {
  clearDeviceConfig,
  saveConfig,
  sendCode,
  signOut,
  syncNow,
  useSyncStatus,
  verifyCode,
  type SyncStatus,
} from '../lib/sync';
import { haptic } from '../lib/hooks';

/** „Sinchronizuota prieš 3 min.“ */
function ago(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return 'ką tik';
  const m = Math.round(s / 60);
  if (m < 60) return `prieš ${m} min.`;
  const h = Math.round(m / 60);
  if (h < 24) return `prieš ${h} val.`;
  return new Date(ts).toLocaleString('lt-LT', { timeZone: 'Europe/Vilnius', dateStyle: 'short', timeStyle: 'short' });
}

function StatusLine({ status }: { status: SyncStatus }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(id);
  }, []);
  const map: Record<string, { dot: string; text: string }> = {
    idle: { dot: 'bg-emerald-500', text: status.lastSync ? `Sinchronizuota ${ago(status.lastSync, now)}` : 'Prisijungta' },
    syncing: { dot: 'bg-sky-500 animate-pulse', text: 'Sinchronizuojama…' },
    offline: { dot: 'bg-slate-400', text: 'Nėra interneto – pakeitimai bus išsiųsti vėliau' },
    error: { dot: 'bg-red-500', text: status.error ?? 'Klaida' },
  };
  const s = map[status.state];
  if (!s) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
      <span className={status.state === 'error' ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}>{s.text}</span>
    </div>
  );
}

export function SyncSection() {
  const status = useSyncStatus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      haptic(15);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const configForm = (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          await saveConfig(url, key);
          setShowConfig(false);
        });
      }}
    >
      <input className="field" type="url" inputMode="url" placeholder="https://xxxx.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} required />
      <input
        className="field font-mono text-sm"
        placeholder="anon / publishable raktas"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        required
      />
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        Išsaugoti
      </button>
    </form>
  );

  return (
    <section className="card space-y-3">
      <h2 className="font-semibold">Sinchronizacija</h2>

      {status.state === 'unconfigured' && (
        <>
          <p className="text-sm text-slate-500">
            Kad duomenys sutaptų telefone ir kompiuteryje, reikia nemokamo Supabase projekto (žr. README, „Sinchronizacija“). Įvesk
            jo adresą ir raktą:
          </p>
          {configForm}
        </>
      )}

      {status.state === 'signed-out' && (
        <>
          <p className="text-sm text-slate-500">
            Prisijunk tuo pačiu el. paštu visuose įrenginiuose. Gausi kodą el. paštu – įvesk jį čia.
          </p>
          {!codeSent ? (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await sendCode(email);
                  setCodeSent(true);
                });
              }}
            >
              <input
                className="field"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="tavo@pastas.lt"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? 'Siunčiama…' : 'Siųsti kodą'}
              </button>
            </form>
          ) : (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await verifyCode(email, code);
                  setCode('');
                  setCodeSent(false);
                });
              }}
            >
              <p className="text-sm">
                Kodas išsiųstas į <b>{email}</b>.
              </p>
              <input
                className="field text-center text-2xl tracking-[0.4em] tabular-nums"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,10}"
                maxLength={10}
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
              />
              <button type="submit" className="btn-primary w-full" disabled={busy || code.length < 6}>
                {busy ? 'Tikrinama…' : 'Prisijungti'}
              </button>
              <button type="button" className="btn w-full text-sm text-slate-500" onClick={() => setCodeSent(false)}>
                Kitas el. paštas / siųsti iš naujo
              </button>
            </form>
          )}
        </>
      )}

      {status.email && (
        <>
          <div className="text-sm">
            Prisijungta kaip <b>{status.email}</b>
          </div>
          <StatusLine status={status} />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={busy || status.state === 'syncing'}
              onClick={() => void run(syncNow)}
            >
              Sinchronizuoti dabar
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => void run(signOut)}>
              Atsijungti
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Pakeitimai išsiunčiami automatiškai po kelių sekundžių, o kitų įrenginių pakeitimai parsiunčiami atidarius programėlę ir
            kas minutę. Be interneto viskas veikia kaip anksčiau.
          </p>
        </>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {status.state !== 'unconfigured' && (
        <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
          {!showConfig ? (
            <button type="button" className="text-sm text-slate-500 underline" onClick={() => setShowConfig(true)}>
              {status.configSource === 'env' ? 'Naudoti kitą Supabase projektą' : 'Keisti Supabase projektą'}
            </button>
          ) : (
            <div className="space-y-2 pt-1">
              {configForm}
              {status.configSource === 'device' && (
                <button type="button" className="btn w-full text-sm text-red-600" onClick={() => void run(clearDeviceConfig)}>
                  Pašalinti šio įrenginio nustatymus
                </button>
              )}
              <button type="button" className="btn w-full text-sm" onClick={() => setShowConfig(false)}>
                Atšaukti
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
