import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { haptic } from '../lib/hooks';

/** Ekrano antraštė Structured stiliumi: mažas užrašas viršuje, didelis pavadinimas, apvalūs mygtukai dešinėje. */
export function ViewHeader({
  title,
  eyebrow,
  subtitle,
  onPrev,
  onNext,
  right,
  children,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
  right?: ReactNode;
  /** Turinys po antrašte, kuris taip pat lieka prilipęs viršuje (pvz. savaitės juosta) */
  children?: ReactNode;
}) {
  return (
    <header className="pt-safe sticky top-0 z-30 bg-white/90 backdrop-blur-xl dark:bg-neutral-950/90">
      <div className="flex items-end gap-2 px-4 pb-2 pt-3">
        <div className="min-w-0 flex-1">
          {eyebrow && <div className="truncate text-xs font-bold uppercase tracking-wider text-accent-500">{eyebrow}</div>}
          <h1 className="truncate text-[26px] font-bold leading-tight tracking-tight">{title}</h1>
          {subtitle && <div className="truncate text-sm text-neutral-500">{subtitle}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pb-1">
          {right}
          {onPrev && (
            <button type="button" className="icon-btn" onClick={onPrev} aria-label="Ankstesnis">
              <Icon name="left" className="h-5 w-5" strokeWidth={2.5} />
            </button>
          )}
          {onNext && (
            <button type="button" className="icon-btn" onClick={onNext} aria-label="Kitas">
              <Icon name="right" className="h-5 w-5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
      {children}
    </header>
  );
}

/** iOS stiliaus jungiklis. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        haptic(8);
        onChange(!checked);
      }}
      className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors ${checked ? 'bg-accent-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left] ${checked ? 'left-[24px]' : 'left-1'}`}
      />
    </button>
  );
}

/** Mažas apvalus mygtukas antraštėje (pvz. „Šiandien“). */
export function PillButton({ children, onClick, active }: { children: ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic(8);
        onClick();
      }}
      className={`inline-flex h-10 items-center rounded-full px-3.5 text-sm font-semibold active:scale-95 ${
        active ? 'bg-accent-500 text-white' : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100'
      }`}
    >
      {children}
    </button>
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true">
      <div className="sheet-in pb-safe w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">{title}</h2>
        {message && <div className="mt-2 text-neutral-600 dark:text-neutral-300">{message}</div>}
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
    <div className="toast-in fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-full bg-neutral-900 py-1.5 pl-5 pr-1.5 text-white shadow-xl dark:bg-neutral-100 dark:text-neutral-900" role="status">
      <span className="flex-1 text-sm">{message}</span>
      {action && (
        <button type="button" className="btn min-h-10 rounded-full px-4 font-semibold text-accent-300 dark:text-accent-600" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

const TIME_SELECT =
  'appearance-none rounded-xl bg-white px-3 py-2 text-center text-[15px] font-bold tabular-nums shadow-sm outline-none ring-accent-500 focus:ring-2 dark:bg-neutral-800';

const pad = (n: number) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

/** 24 val. laiko pasirinkimas (native <input type=time> rodo AM/PM pagal įrenginio lokalę). */
export function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [h, m] = value.split(':');
  const minutes = MINUTES.includes(m) ? MINUTES : [...MINUTES, m].sort();
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <select className={TIME_SELECT} aria-label={`${label}: valanda`} value={h} onChange={(e) => onChange(`${e.target.value}:${m}`)}>
        {HOURS.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <span className="font-semibold">:</span>
      <select className={TIME_SELECT} aria-label={`${label}: minutės`} value={m} onChange={(e) => onChange(`${h}:${e.target.value}`)}>
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
    <div className="flex rounded-2xl bg-neutral-100 p-1 dark:bg-neutral-800">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => {
            if (o.value !== value) haptic(8);
            onChange(o.value);
          }}
          className={`min-h-10 flex-1 rounded-xl px-2 text-sm font-semibold transition-colors ${
            o.value === value ? 'bg-white shadow-sm dark:bg-neutral-600' : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
