import type { EntryType } from '../types';

export const BLOCK_CLASSES: Record<EntryType, string> = {
  lecture: 'bg-indigo-100 border-indigo-500 text-indigo-950 dark:bg-indigo-500/25 dark:text-indigo-50',
  practice: 'bg-emerald-100 border-emerald-600 text-emerald-950 dark:bg-emerald-500/25 dark:text-emerald-50',
  personal: 'bg-amber-100 border-amber-500 text-amber-950 dark:bg-amber-500/25 dark:text-amber-50',
  other: 'bg-slate-200 border-slate-500 text-slate-900 dark:bg-slate-500/30 dark:text-slate-50',
};

export const DOT_CLASSES: Record<EntryType, string> = {
  lecture: 'bg-indigo-500',
  practice: 'bg-emerald-500',
  personal: 'bg-amber-500',
  other: 'bg-slate-400',
};

export const TYPE_ORDER: EntryType[] = ['lecture', 'practice', 'personal', 'other'];
