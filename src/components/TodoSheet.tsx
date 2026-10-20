import { useState } from 'react';
import type { Todo } from '../types';
import { addDays, formatLongDay, startOfWeek } from '../lib/dates';
import { haptic } from '../lib/hooks';
import { newId } from '../lib/entries';
import { Icon, type IconName } from './Icon';
import { IconPicker } from './IconPicker';
import { guessIcon, iconColor } from './typeStyles';

interface Props {
  todo?: Todo;
  today: string;
  /** Pradinis terminas naujam darbui */
  defaultDue?: string;
  onSave: (t: Todo) => void;
  onDelete: (t: Todo) => void;
  /** Perkelti į laiko juostą (sukurti įrašą su laiku) */
  onSchedule: (t: Todo) => void;
  onClose: () => void;
}

export function TodoSheet({ todo, today, defaultDue, onSave, onDelete, onSchedule, onClose }: Props) {
  const [title, setTitle] = useState(todo?.title ?? '');
  const [icon, setIcon] = useState<string | undefined>(todo?.icon);
  const [due, setDue] = useState<string | undefined>(todo?.due ?? defaultDue);
  const [note, setNote] = useState(todo?.note ?? '');
  const [showIcons, setShowIcons] = useState(false);

  const shownIcon = (icon ?? guessIcon(title) ?? 'inbox') as IconName;
  const valid = title.trim().length > 0;

  const build = (): Todo => ({
    ...(todo ?? { id: newId(), kind: 'todo' as const, createdAt: Date.now() }),
    title: title.trim(),
    icon: icon ?? guessIcon(title),
    due,
    note: note.trim() || undefined,
  });

  const nextMonday = addDays(startOfWeek(today), 7);
  const dueChips: { label: string; value?: string }[] = [
    { label: 'Šiandien', value: today },
    { label: 'Rytoj', value: addDays(today, 1) },
    { label: 'Kitą savaitę', value: nextMonday },
    { label: 'Be datos', value: undefined },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center" onClick={onClose}>
      <form
        className="sheet-in pb-safe max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[32px] bg-white shadow-2xl dark:bg-neutral-950 sm:rounded-[32px]"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(build());
        }}
      >
        <div className="sticky top-0 z-10 bg-white/90 px-4 pb-2 pt-2 backdrop-blur-xl dark:bg-neutral-950/90">
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex items-center justify-between">
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Uždaryti">
              <Icon name="close" className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <span className="text-sm font-semibold text-neutral-500">{todo ? 'Darbas' : 'Naujas darbas'}</span>
            <button
              type="submit"
              disabled={!valid}
              className="h-10 rounded-full bg-accent-500 px-4 text-sm font-bold text-white shadow-sm shadow-accent-500/30 active:scale-95 disabled:opacity-40"
            >
              Išsaugoti
            </button>
          </div>
        </div>

        <div className="space-y-4 px-4 pb-6 pt-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowIcons((v) => !v)}
              aria-label="Pasirinkti ikoną"
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${
                icon || guessIcon(title) ? iconColor(shownIcon) : 'bg-neutral-400'
              }`}
            >
              <Icon name={shownIcon} className="h-6 w-6" strokeWidth={2.2} />
            </button>
            <input
              className="min-w-0 flex-1 bg-transparent text-[22px] font-bold outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-700"
              placeholder="Ką reikia padaryti?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus={!todo}
              aria-label="Pavadinimas"
            />
          </div>

          {/* Ikona */}
          <div className="rounded-3xl bg-neutral-100/80 p-3 dark:bg-neutral-900">
            <button
              type="button"
              className="flex w-full items-center justify-between px-1 text-sm font-semibold"
              onClick={() => setShowIcons((v) => !v)}
            >
              Ikona
              <span className="text-xs font-normal text-neutral-500">{showIcons ? 'Slėpti' : 'Rodyti visas'}</span>
            </button>
            {showIcons && (
              <div className="mt-3">
                <IconPicker
                  value={icon ?? guessIcon(title)}
                  onChange={(i) => {
                    setIcon(i);
                    setShowIcons(false);
                  }}
                />
              </div>
            )}
          </div>

          {/* Terminas */}
          <div className="space-y-3 rounded-3xl bg-neutral-100/80 p-4 dark:bg-neutral-900">
            <div className="text-sm font-semibold">Iki kada?</div>
            <div className="flex flex-wrap gap-2">
              {dueChips.map((c) => {
                const active = due === c.value;
                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => {
                      haptic(8);
                      setDue(c.value);
                    }}
                    className={`h-9 rounded-full px-3.5 text-sm font-semibold ${
                      active ? 'bg-accent-500 text-white' : 'bg-white text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3">
              <Icon name="month" className="h-5 w-5 text-neutral-400" />
              <input
                type="date"
                className="bg-transparent text-[15px] font-semibold outline-none"
                value={due ?? ''}
                onChange={(e) => setDue(e.target.value || undefined)}
                aria-label="Terminas"
              />
              {due && <span className="text-xs text-neutral-500">{formatLongDay(due)}</span>}
            </div>
          </div>

          <div className="flex gap-3 rounded-3xl bg-neutral-100/80 px-4 py-3 dark:bg-neutral-900">
            <Icon name="note" className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" />
            <textarea
              className="min-h-16 w-full resize-none bg-transparent text-[15px] outline-none placeholder:text-neutral-400"
              placeholder="Pastaba"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-label="Pastaba"
            />
          </div>

          <button type="button" className="btn-secondary w-full" disabled={!valid} onClick={() => onSchedule(build())}>
            <Icon name="clock" className="h-5 w-5" />
            Suplanuoti laiko juostoje
          </button>
          {todo && (
            <button type="button" className="btn w-full text-red-500" onClick={() => onDelete(todo)}>
              <Icon name="trash" className="h-5 w-5" />
              Ištrinti
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
