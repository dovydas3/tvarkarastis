import type { EntryType } from '../types';
import type { IconName } from './Icon';

/** Savaitės tinklelio blokai: švelnus fonas + spalvota juosta kairėje. */
export const BLOCK_CLASSES: Record<EntryType, string> = {
  lecture: 'bg-indigo-50 border-indigo-400 text-indigo-950 dark:bg-indigo-400/15 dark:text-indigo-50',
  practice: 'bg-emerald-50 border-emerald-400 text-emerald-950 dark:bg-emerald-400/15 dark:text-emerald-50',
  personal: 'bg-accent-50 border-accent-400 text-accent-900 dark:bg-accent-400/15 dark:text-accent-50',
  other: 'bg-amber-50 border-amber-400 text-amber-950 dark:bg-amber-400/15 dark:text-amber-50',
};

/** Ryški spalva: laiko juostos „kapsulė“, taškai, ikonų fonas. */
export const SOLID_CLASSES: Record<EntryType, string> = {
  lecture: 'bg-indigo-400',
  practice: 'bg-emerald-400',
  personal: 'bg-accent-400',
  other: 'bg-amber-400',
};

/** Švelnus fonas (pvz. tipo pasirinkimui). */
export const SOFT_CLASSES: Record<EntryType, string> = {
  lecture: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200',
  practice: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200',
  personal: 'bg-accent-50 text-accent-700 dark:bg-accent-400/15 dark:text-accent-200',
  other: 'bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200',
};

/** Spalvotas tekstas / rėmelis (pažymėtai būsenai). */
export const RING_CLASSES: Record<EntryType, string> = {
  lecture: 'ring-indigo-400/40',
  practice: 'ring-emerald-400/40',
  personal: 'ring-accent-400/40',
  other: 'ring-amber-400/40',
};

export const DOT_CLASSES = SOLID_CLASSES;

export const TYPE_ICON: Record<EntryType, IconName> = {
  lecture: 'book',
  practice: 'briefcase',
  personal: 'heart',
  other: 'star',
};

export const TYPE_ORDER: EntryType[] = ['lecture', 'practice', 'personal', 'other'];
