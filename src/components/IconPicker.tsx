import { haptic } from '../lib/hooks';
import { Icon, type IconName } from './Icon';
import { ICON_PRESETS } from './typeStyles';

/** Ikonų tinklelis: pažymėta ikona rodoma savo spalva. */
export function IconPicker({ value, onChange }: { value?: string; onChange: (icon: IconName) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
      {ICON_PRESETS.map((p) => {
        const selected = value === p.icon;
        return (
          <button
            key={p.icon}
            type="button"
            title={p.label}
            aria-label={p.label}
            aria-pressed={selected}
            onClick={() => {
              haptic(8);
              onChange(p.icon);
            }}
            className="flex flex-col items-center gap-1"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                selected
                  ? `${p.color} scale-105 text-white shadow-sm`
                  : 'bg-white text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              <Icon name={p.icon} className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className={`w-full truncate text-center text-[10px] ${selected ? 'font-bold' : 'text-neutral-500'}`}>{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
