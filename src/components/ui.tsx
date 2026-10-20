import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { haptic } from '../lib/hooks';

export function ViewHeader({
  title,
  subtitle,
  onPrev,
  onNext,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
  right?: ReactNode;
}) {
  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-slate-200 bg-slate-50/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex items-center gap-1 px-2 py-2">
        {onPrev && (
          <button type="button" className="icon-btn" onClick={onPrev} aria-label="Ankstesnis">
            <Icon name="left" />
          </button>
        )}
        <div className="min-w-0 flex-1 px-1">
          <h1 className="truncate text-lg font-semibold">{title}</h1>
          {subtitle && <div className="truncate text-sm text-slate-500">{subtitle}</div>}
        </div>
        {right}
        {onNext && (
          <button type="button" className="icon-btn" onClick={onNext} aria-label="Kitas">
            <Icon name="right" />
          </button>
        )}
      </div>
    </header>
  );
}

export interface DialogAction {
  label: string;
  kind?: 'primary' | 'secondary' | 'danger';
  onClick: () => void;
}

/** Patvirtinimo / pasirinkimo langas, rodomas ekrano apačioje (patogu viena ranka). */
export function Dialog({ title, message, actions }: { title: string; message?: ReactNode; actions: DialogAction[] }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-modal="true">
      <div className="card pb-safe w-full max-w-md">
        <h2 className="text-lg font-semibold">{title}</h2>
        {message && <div className="mt-2 text-slate-600 dark:text-slate-300">{message}</div>}
        <div className="mt-4 flex flex-col gap-2">
          {actions.map((a) => (
            <button key={a.label} type="button" className={`btn-${a.kind ?? 'secondary'} w-full`} onClick={a.onClick}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Trumpas pranešimas virš apatinio meniu su neprivalomu veiksmu (pvz. „Atšaukti“). */
export function Toast({ message, action, onAction }: { message: string; action?: string; onAction?: () => void }) {
  return (
    <div className="toast-in fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-slate-900 py-2 pl-4 pr-2 text-white shadow-xl dark:bg-slate-100 dark:text-slate-900" role="status">
      <span className="flex-1 text-sm">{message}</span>
      {action && (
        <button type="button" className="btn min-h-10 px-3 font-semibold text-teal-300 dark:text-teal-700" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

/** 24 val. laiko pasirinkimas (native <input type=time> rodo AM/PM pagal įrenginio lokalę). */
export function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [h, m] = value.split(':');
  const minutes = MINUTES.includes(m) ? MINUTES : [...MINUTES, m].sort();
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <select className="field px-2 text-center tabular-nums" aria-label={`${label}: valanda`} value={h} onChange={(e) => onChange(`${e.target.value}:${m}`)}>
        {HOURS.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <span className="font-semibold">:</span>
      <select className="field px-2 text-center tabular-nums" aria-label={`${label}: minutės`} value={m} onChange={(e) => onChange(`${h}:${e.target.value}`)}>
        {minutes.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => {
            if (o.value !== value) haptic(8);
            onChange(o.value);
          }}
          className={`min-h-10 flex-1 rounded-lg px-2 text-sm font-medium ${
            o.value === value ? 'bg-white shadow dark:bg-slate-600' : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
