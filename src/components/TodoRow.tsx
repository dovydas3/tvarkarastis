import type { Todo } from '../types';
import { dueLabel } from '../lib/dates';
import { haptic } from '../lib/hooks';
import { Icon, type IconName } from './Icon';
import { iconColor } from './typeStyles';

/** Darbo eilutė: spalvota ikona, pavadinimas, terminas, varnelė (Structured „Inbox“ stiliumi). */
export function TodoRow({
  todo,
  today,
  onOpen,
  onToggle,
}: {
  todo: Todo;
  today: string;
  onOpen: (t: Todo) => void;
  onToggle: (t: Todo) => void;
}) {
  const overdue = !todo.done && todo.due && todo.due < today;
  const icon = (todo.icon as IconName) || 'inbox';
  return (
    <li className="flex items-center gap-3">
      <button type="button" onClick={() => onOpen(todo)} className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white ${
            todo.done ? 'bg-neutral-300 dark:bg-neutral-700' : todo.icon ? iconColor(todo.icon) : 'bg-neutral-400'
          }`}
        >
          <Icon name={icon} className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block font-semibold leading-snug ${todo.done ? 'text-neutral-400 line-through decoration-2' : ''}`}>
            {todo.title}
          </span>
          {(todo.due || todo.note) && (
            <span className="mt-0.5 flex items-center gap-1.5 text-xs">
              {todo.due && (
                <span className={overdue ? 'font-semibold text-red-500' : 'text-neutral-500'}>{dueLabel(todo.due, today)}</span>
              )}
              {todo.due && todo.note && <span className="text-neutral-300">·</span>}
              {todo.note && <span className="truncate text-neutral-400">{todo.note}</span>}
            </span>
          )}
        </span>
      </button>
      <button
        type="button"
        aria-label={todo.done ? 'Pažymėti kaip neatliktą' : 'Pažymėti kaip atliktą'}
        aria-pressed={!!todo.done}
        onClick={() => {
          haptic(todo.done ? 8 : [10, 40, 10]);
          onToggle(todo);
        }}
        className="flex h-11 w-10 shrink-0 items-center justify-center"
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${
            todo.done ? 'pop border-transparent bg-accent-500 text-white' : overdue ? 'border-red-400' : 'border-neutral-300 dark:border-neutral-600'
          }`}
        >
          {todo.done && <Icon name="check" className="h-4 w-4" strokeWidth={3} />}
        </span>
      </button>
    </li>
  );
}
