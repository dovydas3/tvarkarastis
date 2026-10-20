import type { EntryType } from '../types';
import type { IconName } from './Icon';

/** Savaitės tinklelio blokai: švelnus fonas + spalvota juosta kairėje. */
export const BLOCK_CLASSES: Record<EntryType, string> = {
  lecture: 'bg-indigo-50 border-indigo-400 text-indigo-950 dark:bg-indigo-400/15 dark:text-indigo-50',
  practice: 'bg-emerald-50 border-emerald-400 text-emerald-950 dark:bg-emerald-400/15 dark:text-emerald-50',
  exam: 'bg-rose-50 border-rose-500 text-rose-950 dark:bg-rose-500/15 dark:text-rose-50',
  personal: 'bg-sky-50 border-sky-400 text-sky-950 dark:bg-sky-400/15 dark:text-sky-50',
  other: 'bg-amber-50 border-amber-400 text-amber-950 dark:bg-amber-400/15 dark:text-amber-50',
};

/** Ryški spalva: laiko juostos „kapsulė“, taškai, ikonų fonas. */
export const SOLID_CLASSES: Record<EntryType, string> = {
  lecture: 'bg-indigo-400',
  practice: 'bg-emerald-400',
  exam: 'bg-rose-500',
  personal: 'bg-sky-400',
  other: 'bg-amber-400',
};

/** Švelnus fonas (pvz. tipo pasirinkimui). */
export const SOFT_CLASSES: Record<EntryType, string> = {
  lecture: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200',
  practice: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200',
  exam: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
  personal: 'bg-sky-50 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200',
  other: 'bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200',
};

/** Rėmelis tempiamam elementui. */
export const RING_CLASSES: Record<EntryType, string> = {
  lecture: 'ring-indigo-400/40',
  practice: 'ring-emerald-400/40',
  exam: 'ring-rose-500/40',
  personal: 'ring-sky-400/40',
  other: 'ring-amber-400/40',
};

export const DOT_CLASSES = SOLID_CLASSES;

export const TYPE_ICON: Record<EntryType, IconName> = {
  lecture: 'book',
  practice: 'briefcase',
  exam: 'cap',
  personal: 'user',
  other: 'star',
};

export const TYPE_ORDER: EntryType[] = ['lecture', 'practice', 'exam', 'personal', 'other'];

/** Ikona, kurią rodyti įrašui: pasirinkta arba tipo numatytoji. */
export const entryIcon = (e: { icon?: string; type: EntryType }): IconName => (e.icon as IconName) || TYPE_ICON[e.type];

/** Ikonų rinkinys pasirinkimui (įrašams ir darbams), su spalva darbų sąrašui. */
export const ICON_PRESETS: { icon: IconName; label: string; color: string }[] = [
  { icon: 'book', label: 'Paskaita', color: 'bg-indigo-400' },
  { icon: 'briefcase', label: 'Praktika', color: 'bg-emerald-400' },
  { icon: 'cap', label: 'Atsiskaitymas', color: 'bg-rose-500' },
  { icon: 'pencil', label: 'Užduotis', color: 'bg-violet-400' },
  { icon: 'book2', label: 'Mokytis', color: 'bg-indigo-300' },
  { icon: 'user', label: 'Asmeninis', color: 'bg-sky-400' },
  { icon: 'heart', label: 'Šeima', color: 'bg-pink-400' },
  { icon: 'users', label: 'Draugai', color: 'bg-cyan-400' },
  { icon: 'dumbbell', label: 'Sportas', color: 'bg-orange-400' },
  { icon: 'health', label: 'Sveikata', color: 'bg-red-400' },
  { icon: 'cart', label: 'Pirkiniai', color: 'bg-lime-500' },
  { icon: 'food', label: 'Maistas', color: 'bg-yellow-500' },
  { icon: 'coffee', label: 'Kava', color: 'bg-amber-600' },
  { icon: 'home', label: 'Namai', color: 'bg-teal-400' },
  { icon: 'car', label: 'Kelionė', color: 'bg-blue-400' },
  { icon: 'phone', label: 'Skambutis', color: 'bg-green-500' },
  { icon: 'laptop', label: 'Kompiuteris', color: 'bg-slate-500' },
  { icon: 'gift', label: 'Šventė', color: 'bg-fuchsia-400' },
  { icon: 'music', label: 'Muzika', color: 'bg-purple-400' },
  { icon: 'game', label: 'Žaidimai', color: 'bg-indigo-500' },
  { icon: 'moon', label: 'Miegas', color: 'bg-slate-400' },
  { icon: 'paw', label: 'Augintinis', color: 'bg-amber-500' },
  { icon: 'star', label: 'Kita', color: 'bg-amber-400' },
];

export const iconColor = (icon?: string) => ICON_PRESETS.find((p) => p.icon === icon)?.color ?? 'bg-neutral-400';

/** Raktažodžiai → ikona (lietuviškai, pagal žodžio pradžią). */
const KEYWORDS: [RegExp, IconName][] = [
  [/(egzamin|atsiskait|kontrolin|koliokv|gynim|testas)/i, 'cap'],
  [/(paskait|seminar|pratyb|laboratorin)/i, 'book'],
  [/(praktik)/i, 'briefcase'],
  [/(namų darb|užduot|ataskait|referat|rašin|projekt)/i, 'pencil'],
  [/(mokyt|kartot|skaityt|studij)/i, 'book2'],
  [/(sport|treniruot|salė|bėgi|baseinas|futbol|krepš|joga|gym)/i, 'dumbbell'],
  [/(šeim|mama|mam\b|tėt|tėv|močiut|senel|brol|ses)/i, 'heart'],
  [/(draug|susitik|vakarėl)/i, 'users'],
  [/(gydytoj|daktar|odontolog|vaist|sveikat)/i, 'health'],
  [/(pirk|parduotuv|maxim|iki\b|lidl|rimi|norfa)/i, 'cart'],
  [/(valgy|pietūs|pietus|vakarienė|pusryči|gamint)/i, 'food'],
  [/(kava|kavin)/i, 'coffee'],
  [/(skambin|paskambint)/i, 'phone'],
  [/(gimtadien|dovan|švent)/i, 'gift'],
  [/(kelion|vairav|autobus|traukin|lėktuv|mašin)/i, 'car'],
  [/(tvarky|valy|skalb|namuose)/i, 'home'],
  [/(muzik|koncert)/i, 'music'],
  [/(žaid|žaidim)/i, 'game'],
  [/(miega|miegot)/i, 'moon'],
  [/(šun|kat|augintin)/i, 'paw'],
  [/(kompiuter|programuo|kod)/i, 'laptop'],
];

/** Ikona pagal pavadinimą (pvz. „Sporto salė“ → hantelis), arba undefined. */
export function guessIcon(title: string): IconName | undefined {
  return KEYWORDS.find(([re]) => re.test(title))?.[1];
}
