import type { Entry, EntryType, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

export interface Backup {
  app: 'tvarkarastis';
  version: 1;
  exportedAt: string;
  entries: Entry[];
  settings: Settings;
}

export function makeBackup(entries: Entry[], settings: Settings): Backup {
  const clean = entries.map(({ dirty: _d, deleted: _x, ...e }) => e);
  return { app: 'tvarkarastis', version: 1, exportedAt: new Date().toISOString(), entries: clean, settings };
}

const TYPES: EntryType[] = ['lecture', 'practice', 'personal', 'other'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

/** Patikrina importuojamą failą; meta klaidą lietuviškai, jei formatas netinka. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Failas nėra tinkamas JSON.');
  }
  const b = data as Partial<Backup>;
  if (b?.app !== 'tvarkarastis' || !Array.isArray(b.entries)) throw new Error('Tai ne šios programėlės atsarginė kopija.');
  b.entries.forEach((e, i) => {
    if (
      typeof e?.id !== 'string' ||
      typeof e.title !== 'string' ||
      !TYPES.includes(e.type) ||
      !DATE.test(e.date) ||
      !TIME.test(e.start) ||
      !TIME.test(e.end)
    )
      throw new Error(`Netinkamas įrašas Nr. ${i + 1}.`);
  });
  return {
    app: 'tvarkarastis',
    version: 1,
    exportedAt: b.exportedAt ?? '',
    entries: b.entries,
    settings: { ...DEFAULT_SETTINGS, ...b.settings },
  };
}

export async function downloadBackup(backup: Backup): Promise<void> {
  const name = `tvarkarastis-${backup.exportedAt.slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  // Telefone (ypač iOS „įdiegtoje“ programėlėje) patogiau per dalinimosi meniu.
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
