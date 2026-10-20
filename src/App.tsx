import { useCallback, useEffect, useRef, useState } from 'react';
import type { Entry, EntryType, Settings, StoredRecord, Todo } from './types';
import { DEFAULT_SETTINGS } from './types';
import * as db from './lib/db';
import { applyToSeries, createEntries, newId, sortEntries, toggleChecked, type EntryDraft } from './lib/entries';
import { fromMinutes, startOfMonth, toMinutes } from './lib/dates';
import { haptic, setHapticsEnabled, useNow } from './lib/hooks';
import { downloadBackup, makeBackup, type Backup } from './lib/backup';
import { scheduleNotifications } from './lib/notify';
import { initSync, onRemoteData, useSyncStatus } from './lib/sync';
import { DayView } from './views/DayView';
import { WeekView } from './views/WeekView';
import { MonthView } from './views/MonthView';
import { TodoView } from './views/TodoView';
import { PracticeView } from './views/PracticeView';
import { SettingsView } from './views/SettingsView';
import { EntrySheet, type Scope } from './components/EntrySheet';
import { TodoSheet } from './components/TodoSheet';
import { Icon, type IconName } from './components/Icon';
import { Dialog, Segmented, Toast } from './components/ui';
import { guessIcon } from './components/typeStyles';

type Tab = 'day' | 'todos' | 'calendar' | 'practice' | 'settings';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'day', label: 'Šiandien', icon: 'today' },
  { id: 'todos', label: 'Darbai', icon: 'inbox' },
  { id: 'calendar', label: 'Kalendorius', icon: 'month' },
  { id: 'practice', label: 'Praktika', icon: 'practice' },
  { id: 'settings', label: 'Daugiau', icon: 'more' },
];

/** Redaguojamas įrašas arba naujas (fromTodo – kuriamas iš darbo; išsaugojus darbas pašalinamas). */
type Editor = { entry: Entry } | { defaults: Partial<Entry>; fromTodo?: string };
type TodoEditor = { todo?: Todo; defaultDue?: string };
type ToastState = { message: string; undo?: StoredRecord[] };

/** Įrašo tipas pagal darbo ikoną, kai darbas perkeliamas į laiko juostą. */
const typeFromIcon = (icon?: string): EntryType =>
  icon === 'book' ? 'lecture' : icon === 'briefcase' ? 'practice' : icon === 'cap' ? 'exam' : 'personal';

export default function App() {
  const now = useNow();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [tab, setTab] = useState<Tab>('day');
  const [dayDate, setDayDate] = useState(now.date);
  const [weekAnchor, setWeekAnchor] = useState(now.date);
  const [month, setMonth] = useState(startOfMonth(now.date));
  const [editor, setEditor] = useState<Editor | null>(null);
  const [todoEditor, setTodoEditor] = useState<TodoEditor | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const [pendingMove, setPendingMove] = useState<{ entry: Entry; start: string; end: string } | null>(null);

  useEffect(() => setHapticsEnabled(settings.haptics), [settings.haptics]);
  const syncStatus = useSyncStatus();

  const reload = useCallback(async () => {
    const [e, t] = await Promise.all([db.getAllEntries(), db.getAllTodos()]);
    setEntries(e.sort(sortEntries));
    setTodos(t);
  }, []);

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

  const showToast = (t: ToastState) => {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  };

  // ---- tvarkaraščio įrašai ----

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
    // Darbas perkeltas į laiko juostą – iš darbų sąrašo jis dingsta.
    if (editor && 'fromTodo' in editor && editor.fromTodo && !original) await db.deleteEntries([editor.fromTodo]);
    haptic(15);
    setEditor(null);
    await reload();
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

  /** Laiko juostos varnelė: iškart parodoma, įrašoma fone. */
  const toggleDone = (entry: Entry) => {
    const next = toggleChecked(entry);
    setEntries((prev) => prev && prev.map((e) => (e.id === entry.id ? next : e)));
    void db.putEntries([next]);
  };

  const quickUpdate = async (entry: Entry) => {
    await db.putEntries([entry]);
    await reload();
  };

  const nextSlot = () => fromMinutes(Math.min(22 * 60, Math.ceil((now.minutes + 1) / 30) * 30));

  const openNew = (date?: string, start?: string) => {
    const s = start ?? nextSlot();
    const d = date ?? (tab === 'day' ? dayDate : now.date);
    setEditor({ defaults: { date: d, start: s, end: fromMinutes(Math.min(23 * 60 + 55, toMinutes(s) + 60)) } });
  };

  // ---- darbai ----

  const addTodo = (title: string) => {
    const todo: Todo = { id: newId(), kind: 'todo', title, icon: guessIcon(title), createdAt: Date.now() };
    setTodos((prev) => [...prev, todo]);
    haptic(10);
    void db.putEntries([todo]);
  };

  const saveTodo = async (todo: Todo) => {
    await db.putEntries([todo]);
    haptic(15);
    setTodoEditor(null);
    await reload();
  };

  const toggleTodo = (todo: Todo) => {
    const next: Todo = { ...todo, done: !todo.done || undefined, doneAt: todo.done ? undefined : Date.now() };
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? next : t)));
    void db.putEntries([next]);
  };

  const deleteTodos = async (list: Todo[]) => {
    await db.deleteEntries(list.map((t) => t.id));
    haptic(15);
    setTodoEditor(null);
    await reload();
    showToast({ message: list.length === 1 ? 'Darbas ištrintas' : `Ištrinta darbų: ${list.length}`, undo: list });
  };

  /** Darbas → įrašas su laiku (atidaromas įrašo redaktorius). */
  const scheduleTodo = (todo: Todo) => {
    const s = nextSlot();
    setTodoEditor(null);
    setEditor({
      defaults: {
        title: todo.title,
        icon: todo.icon,
        note: todo.note,
        type: typeFromIcon(todo.icon),
        date: todo.due && todo.due >= now.date ? todo.due : now.date,
        start: s,
        end: fromMinutes(Math.min(23 * 60 + 55, toMinutes(s) + 60)),
      },
      // Jei darbas dar neišsaugotas (naujas), nėra ko trinti.
      fromTodo: todos.some((t) => t.id === todo.id) ? todo.id : undefined,
    });
  };

  // ---- navigacija ----

  const selectTab = (t: Tab) => {
    haptic(8);
    if (t === tab) {
      // Pakartotinis paspaudimas grąžina į šiandieną.
      if (t === 'day') setDayDate(now.date);
      if (t === 'calendar') {
        setWeekAnchor(now.date);
        setMonth(startOfMonth(now.date));
      }
    }
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  if (!entries) {
    return <div className="flex min-h-dvh items-center justify-center text-neutral-500">Įkeliama…</div>;
  }

  const select = (e: Entry) => setEditor({ entry: e });
  const openTodo = (t: Todo) => setTodoEditor({ todo: t });
  const tabLabel = (t: (typeof TABS)[number]) => (t.id === 'day' && dayDate !== now.date ? 'Diena' : t.label);
  const dueCount = todos.filter((t) => !t.done && t.due && t.due <= now.date).length;

  const calendarSwitcher = (
    <div className="w-44">
      <Segmented<'week' | 'month'>
        value={settings.calendarView}
        options={[
          { value: 'week', label: 'Savaitė' },
          { value: 'month', label: 'Mėnuo' },
        ]}
        onChange={(v) => updateSettings({ calendarView: v })}
      />
    </div>
  );

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
            onToggle={toggleDone}
            todos={todos}
            onOpenTodo={openTodo}
            onToggleTodo={toggleTodo}
          />
        )}
        {tab === 'todos' && (
          <TodoView
            todos={todos}
            today={now.date}
            onAdd={addTodo}
            onOpen={openTodo}
            onToggle={toggleTodo}
            onClearDone={() => void deleteTodos(todos.filter((t) => t.done))}
          />
        )}
        {tab === 'calendar' && settings.calendarView === 'week' && (
          <WeekView
            anchor={weekAnchor}
            setAnchor={setWeekAnchor}
            settings={settings}
            updateSettings={updateSettings}
            entries={entries}
            now={now}
            onSelect={select}
            onCreate={openNew}
            switcher={calendarSwitcher}
          />
        )}
        {tab === 'calendar' && settings.calendarView === 'month' && (
          <MonthView
            month={month}
            setMonth={setMonth}
            entries={entries}
            today={now.date}
            switcher={calendarSwitcher}
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
            onExport={() => void downloadBackup(makeBackup(entries, todos, settings))}
            onImport={async (b: Backup) => {
              await db.replaceAllEntries(b.entries);
              if (b.todos) await db.replaceAllEntries(b.todos, 'todo');
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
          aria-label={tab === 'todos' ? 'Naujas darbas' : 'Naujas įrašas'}
          onClick={() => {
            haptic(10);
            if (tab === 'todos') setTodoEditor({});
            else openNew();
          }}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-accent-500 text-white shadow-xl shadow-accent-500/40 transition active:scale-90"
        >
          <Icon name="plus" className="h-8 w-8" strokeWidth={2.5} />
        </button>
      )}

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-neutral-100 bg-white/90 backdrop-blur-xl dark:border-neutral-900 dark:bg-neutral-950/90">
        <div className="mx-auto flex max-w-3xl">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] ${
                tab === t.id ? 'font-bold text-accent-500' : 'font-medium text-neutral-400'
              }`}
            >
              <span
                className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                  tab === t.id ? 'bg-accent-500/10' : ''
                }`}
              >
                <Icon name={t.icon} className="h-5 w-5" />
                {t.id === 'settings' && syncStatus.state === 'error' && (
                  <span className="absolute right-3 top-1 h-2 w-2 rounded-full bg-red-500" aria-label="Sinchronizacijos klaida" />
                )}
                {t.id === 'todos' && dueCount > 0 && (
                  <span className="absolute -top-0.5 right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                    {dueCount}
                  </span>
                )}
              </span>
              {tabLabel(t)}
            </button>
          ))}
        </div>
      </nav>

      {toast && !editor && !todoEditor && <Toast message={toast.message} action={toast.undo && 'Atšaukti'} onAction={undoDelete} />}

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

      {todoEditor && (
        <TodoSheet
          key={todoEditor.todo?.id ?? 'new'}
          todo={todoEditor.todo}
          today={now.date}
          defaultDue={todoEditor.defaultDue}
          onSave={saveTodo}
          onDelete={(t) => void deleteTodos([t])}
          onSchedule={scheduleTodo}
          onClose={() => setTodoEditor(null)}
        />
      )}
    </div>
  );
}
