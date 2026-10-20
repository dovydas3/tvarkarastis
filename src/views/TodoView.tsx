import { useState } from 'react';
import type { Todo } from '../types';
import { addDays } from '../lib/dates';
import { Icon } from '../components/Icon';
import { TodoRow } from '../components/TodoRow';
import { ViewHeader } from '../components/ui';

interface Props {
  todos: Todo[];
  today: string;
  onAdd: (title: string) => void;
  onOpen: (t: Todo) => void;
  onToggle: (t: Todo) => void;
  onClearDone: () => void;
}

const byDueThenCreated = (a: Todo, b: Todo) =>
  (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.createdAt - b.createdAt;

/** Darbų sąrašas („Inbox“): greitas įvedimas, grupės pagal terminą, atlikti apačioje. */
export function TodoView({ todos, today, onAdd, onOpen, onToggle, onClearDone }: Props) {
  const [text, setText] = useState('');
  const [showDone, setShowDone] = useState(false);
  const tomorrow = addDays(today, 1);

  const open = todos.filter((t) => !t.done).sort(byDueThenCreated);
  const done = todos.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));

  const groups: { title: string; items: Todo[]; tone?: string }[] = [
    { title: 'Vėluoja', items: open.filter((t) => t.due && t.due < today), tone: 'text-red-500' },
    { title: 'Šiandien', items: open.filter((t) => t.due === today), tone: 'text-accent-500' },
    { title: 'Rytoj', items: open.filter((t) => t.due === tomorrow) },
    { title: 'Vėliau', items: open.filter((t) => t.due && t.due > tomorrow) },
    { title: 'Be datos', items: open.filter((t) => !t.due) },
  ].filter((g) => g.items.length);

  const submit = () => {
    const title = text.trim();
    if (!title) return;
    onAdd(title);
    setText('');
  };

  return (
    <div>
      <ViewHeader eyebrow={open.length ? `${open.length} neatlikti` : 'Viskas atlikta'} title="Darbai">
        <form
          className="px-4 pb-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex items-center gap-2 rounded-2xl bg-neutral-100 py-1 pl-4 pr-1 dark:bg-neutral-900">
            <input
              className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-neutral-400"
              placeholder="Pridėti darbą… (pvz. „Nupirkti pieno“)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              enterKeyHint="done"
              aria-label="Naujas darbas"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              aria-label="Pridėti"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-500 text-white disabled:opacity-30"
            >
              <Icon name="plus" className="h-5 w-5" strokeWidth={2.6} />
            </button>
          </div>
        </form>
      </ViewHeader>

      <div className="space-y-5 px-4 pb-8 pt-2">
        {!open.length && !done.length && (
          <div className="flex flex-col items-center pt-10 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-50 text-accent-500 dark:bg-accent-500/15">
              <Icon name="inbox" className="h-9 w-9" />
            </div>
            <div className="mt-4 text-lg font-semibold">Darbų nėra</div>
            <p className="mt-1 max-w-xs text-sm text-neutral-500">
              Užrašyk viską, ko nenori pamiršti. Darbą su terminu matysi ir Šiandien ekrane.
            </p>
          </div>
        )}

        {groups.map((g) => (
          <section key={g.title}>
            <h2 className={`mb-1 text-xs font-bold uppercase tracking-wider ${g.tone ?? 'text-neutral-400'}`}>
              {g.title} <span className="font-semibold text-neutral-400">· {g.items.length}</span>
            </h2>
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-900">
              {g.items.map((t) => (
                <TodoRow key={t.id} todo={t} today={today} onOpen={onOpen} onToggle={onToggle} />
              ))}
            </ul>
          </section>
        ))}

        {done.length > 0 && (
          <section>
            <div className="mb-1 flex items-center justify-between">
              <button type="button" onClick={() => setShowDone((v) => !v)} className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Atlikta · {done.length} {showDone ? '▾' : '▸'}
              </button>
              {showDone && (
                <button type="button" onClick={onClearDone} className="text-xs font-semibold text-red-500">
                  Ištrinti atliktus
                </button>
              )}
            </div>
            {showDone && (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {done.map((t) => (
                  <TodoRow key={t.id} todo={t} today={today} onOpen={onOpen} onToggle={onToggle} />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
