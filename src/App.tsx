import { useCallback, useEffect, useRef, useState } from 'react';
import type { Entry, Settings } from './types';
import { DEFAULT_SETTINGS } from './types';
import * as db from './lib/db';
import { applyToSeries, createEntries, newId, sortEntries, type EntryDraft } from './lib/entries';
import { fromMinutes, startOfMonth, toMinutes } from './lib/dates';
import { haptic, setHapticsEnabled, useNow } from './lib/hooks';
import { downloadBackup, makeBackup, type Backup } from './lib/backup';
import { scheduleNotifications } from './lib/notify';
import { initSync, onRemoteData, useSyncStatus } from './lib/sync';
import { DayView } from './views/DayView';
import { WeekView } from './views/WeekView';
import { MonthView } from './views/MonthView';
import { PracticeView } from './views/PracticeView';
import { SettingsView } from './views/SettingsView';
import { EntrySheet, type Scope } from './components/EntrySheet';
import { Icon, type IconName } from './components/Icon';
import { Dialog, Toast } from './components/ui';

type Tab = 'day' | 'week' | 'month' | 'practice' | 'settings';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'day', label: 'Šiandien', icon: 'today' },
  { id: 'week', label: 'Savaitė', icon: 'week' },
  { id: 'month', label: 'Mėnuo', icon: 'month' },
  { id: 'practice', label: 'Praktika', icon: 'practice' },
  { id: 'settings', label: 'Daugiau', icon: 'more' },
];

type Editor = { entry: Entry } | { defaults: Partial<Entry> };
type ToastState = { message: string; undo?: Entry[] };

export default function App() {
  const now = useNow();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [tab, setTab] = useState<Tab>('day');
  const [dayDate, setDayDate] = useState(now.date);
  const [weekAnchor, setWeekAnchor] = useState(now.date);
  const [month, setMonth] = useState(startOfMonth(now.date));
  const [editor, setEditor] = useState<Editor | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const [pendingMove, setPendingMove] = useState<{ entry: Entry; start: string; end: string } | null>(null);

  useEffect(() => setHapticsEnabled(settings.haptics), [settings.haptics]);
  const syncStatus = useSyncStatus();

  const reload = useCallback(async () => setEntries((await db.getAllEntries()).sort(sortEntries)), []);

  useEffect(() => {
    (async () => {
      await db.seedIfEmpty();
      setSettings(await db.getSettings());
      await reload();
      void db.requestPersistence();
      void initSync();
    })();
    // Kito įrenginio pakeitimai atėjo iš debesies – perkraunam.
    return onRemoteData(() => void reload());
  }, [reload]);

  useEffect(() => {
    if (entries) scheduleNotifications(entries, settings);
  }, [entries, settings, now.date]);

  const updateSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    void db.saveSettings(next);
  };

  const save = async (draft: EntryDraft, scope: Scope) => {
    const all = entries ?? [];
    const original = draft.id ? all.find((e) => e.id === draft.id) : undefined;
    if (!original) {
      await db.putEntries(createEntries(draft));
    } else if (original.seriesId && scope === 'one') {
      // „Tik šį“ – įrašas atjungiamas nuo serijos.
      await db.putEntries([{ ...original, ...draft, id: original.id, seriesId: undefined, repeatUntil: undefined }]);
    } else if (original.seriesId || (draft.repeatUntil && draft.repeatUntil > draft.date)) {
      // „Visus“ arba pavienio įrašo pavertimas serija.
      const seriesId = original.seriesId ?? newId();
      const seeded = { ...original, seriesId };
      const members = original.seriesId ? all.filter((e) => e.seriesId === seriesId) : [seeded];
      const { put, remove } = applyToSeries(members, seeded, { ...draft, seriesId });
      await db.deleteEntries(remove);
      await db.putEntries(put);
    } else {
      await db.putEntries([{ ...original, ...draft, id: original.id, repeatUntil: undefined }]);
    }
    // Trumpinys priklauso modulio pavadinimui: pakeitus jį, atnaujinami visi to paties pavadinimo įrašai.
    if (draft.short !== original?.short) {
      const same = all.filter((e) => e.title === draft.title && e.id !== draft.id && e.short !== draft.short);
      if (same.length) await db.putEntries(same.map((e) => ({ ...e, short: draft.short })));
    }
    haptic(15);
    setEditor(null);
    await reload();
  };

  const showToast = (t: ToastState) => {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  };

  const remove = async (entry: Entry, scope: Scope) => {
    const removed =
      scope === 'all' && entry.seriesId ? (entries ?? []).filter((e) => e.seriesId === entry.seriesId) : [entry];
    await db.deleteEntries(removed.map((e) => e.id));
    haptic(15);
    setEditor(null);
    await reload();
    showToast({
      message: removed.length === 1 ? 'Įrašas ištrintas' : `Ištrinta įrašų: ${removed.length}`,
      undo: removed,
    });
  };

  const undoDelete = async () => {
    if (!toast?.undo) return;
    clearTimeout(toastTimer.current);
    await db.putEntries(toast.undo);
    setToast(null);
    haptic(10);
    await reload();
  };

  /** Blokas nutemptas / ištemptas dienos vaizde. */
  const move = (entry: Entry, start: string, end: string) => {
    if (entry.seriesId) {
      setPendingMove({ entry, start, end });
      return;
    }
    // Iškart parodomas naujas laikas, kad blokas „neiššoktų“ atgal kol rašoma į DB.
    setEntries((prev) => prev && prev.map((e) => (e.id === entry.id ? { ...e, start, end } : e)).sort(sortEntries));
    void save({ ...entry, start, end }, 'one');
  };

  const quickUpdate = async (entry: Entry) => {
    await db.putEntries([entry]);
    await reload();
  };

  const openNew = (date?: string, start?: string) => {
    const s = start ?? fromMinutes(Math.min(22 * 60, Math.ceil((now.minutes + 1) / 30) * 30));
    const d = date ?? (tab === 'day' ? dayDate : now.date);
    setEditor({ defaults: { date: d, start: s, end: fromMinutes(Math.min(23 * 60 + 55, toMinutes(s) + 60)) } });
  };

  const selectTab = (t: Tab) => {
    haptic(8);
    if (t === tab) {
      // Pakartotinis paspaudimas grąžina į šiandieną.
      if (t === 'day') setDayDate(now.date);
      if (t === 'week') setWeekAnchor(now.date);
      if (t === 'month') setMonth(startOfMonth(now.date));
    }
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  if (!entries) {
    return <div className="flex min-h-dvh items-center justify-center text-slate-500">Įkeliama…</div>;
  }

  const select = (e: Entry) => setEditor({ entry: e });
  const tabLabel = (t: (typeof TABS)[number]) => (t.id === 'day' && dayDate !== now.date ? 'Diena' : t.label);

  return (
    <div className="mx-auto min-h-dvh max-w-3xl pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <main>
        {tab === 'day' && (
          <DayView
            date={dayDate}
            setDate={setDayDate}
            entries={entries}
            now={now}
            onSelect={select}
            onCreate={openNew}
            onMove={move}
          />
        )}
        {tab === 'week' && (
          <WeekView
            anchor={weekAnchor}
            setAnchor={setWeekAnchor}
            settings={settings}
            updateSettings={updateSettings}
            entries={entries}
            now={now}
            onSelect={select}
            onCreate={openNew}
          />
        )}
        {tab === 'month' && (
          <MonthView
            month={month}
            setMonth={setMonth}
            entries={entries}
            today={now.date}
            onOpenDay={(d) => {
              setDayDate(d);
              setTab('day');
            }}
          />
        )}
        {tab === 'practice' && <PracticeView entries={entries} now={now} onUpdate={quickUpdate} onSelect={select} />}
        {tab === 'settings' && (
          <SettingsView
            settings={settings}
            updateSettings={updateSettings}
            entryCount={entries.length}
            onExport={() => void downloadBackup(makeBackup(entries, settings))}
            onImport={async (b: Backup) => {
              await db.replaceAllEntries(b.entries);
              updateSettings(b.settings);
              await reload();
            }}
            onReset={async () => {
              await db.resetToSeed();
              await reload();
            }}
          />
        )}
      </main>

      {tab !== 'settings' && tab !== 'practice' && (
        <button
          type="button"
          aria-label="Naujas įrašas"
          onClick={() => {
            haptic(10);
            openNew();
          }}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-900/30 transition active:scale-95 dark:bg-teal-600"
        >
          <Icon name="plus" className="h-8 w-8" strokeWidth={2.5} />
        </button>
      )}

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-3xl">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] ${
                tab === t.id ? 'font-semibold text-teal-700 dark:text-teal-400' : 'text-slate-500'
              }`}
            >
              <span
                className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                  tab === t.id ? 'bg-teal-600/15 dark:bg-teal-400/15' : ''
                }`}
              >
                <Icon name={t.icon} className="h-5 w-5" />
                {t.id === 'settings' && syncStatus.state === 'error' && (
                  <span className="absolute right-3 top-1 h-2 w-2 rounded-full bg-red-500" aria-label="Sinchronizacijos klaida" />
                )}
              </span>
              {tabLabel(t)}
            </button>
          ))}
        </div>
      </nav>

      {toast && !editor && <Toast message={toast.message} action={toast.undo && 'Atšaukti'} onAction={undoDelete} />}

      {pendingMove && (
        <Dialog
          title="Perkelti pasikartojantį įrašą"
          message={`${pendingMove.entry.title}: ${pendingMove.start}–${pendingMove.end}. Taikyti tik šiam įrašui ar visiems serijos įrašams?`}
          actions={[
            {
              label: 'Tik šį',
              kind: 'primary',
              onClick: () => {
                const { entry, start, end } = pendingMove;
                setPendingMove(null);
                void save({ ...entry, start, end }, 'one');
              },
            },
            {
              label: 'Visus',
              kind: 'primary',
              onClick: () => {
                const { entry, start, end } = pendingMove;
                setPendingMove(null);
                void save({ ...entry, start, end }, 'all');
              },
            },
            { label: 'Atšaukti', onClick: () => setPendingMove(null) },
          ]}
        />
      )}

      {editor && (
        <EntrySheet
          key={'entry' in editor ? editor.entry.id : 'new'}
          entry={'entry' in editor ? editor.entry : undefined}
          defaults={'defaults' in editor ? editor.defaults : undefined}
          entries={entries}
          onSave={save}
          onDelete={remove}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
