import { describe, expect, it } from 'vitest';
import type { Entry } from '../types';
import { mergeRemote, runSync, sameContent, type LocalStore, type PulledRow, type RemoteApi, type RemoteRow } from './syncCore';

// ---- Imitacijos: serveris elgiasi kaip supabase/schema.sql (push_entries + server_updated_at) ----

let clock = 1_000_000;
const tick = () => ++clock;

function memServer() {
  const rows = new Map<string, PulledRow>();
  let serverTime = Date.parse('2026-11-01T00:00:00Z');
  const api: RemoteApi & { rows: typeof rows; pushes: number } = {
    rows,
    pushes: 0,
    async push(batch) {
      api.pushes++;
      for (const r of batch) {
        const cur = rows.get(r.id);
        // on conflict do update ... where e.updated_at < excluded.updated_at
        if (!cur || cur.updated_at < r.updated_at) {
          serverTime += 1;
          rows.set(r.id, { ...structuredClone(r), server_updated_at: new Date(serverTime).toISOString() });
        }
      }
    },
    async pull(since, limit, inclusive) {
      return [...rows.values()]
        .filter((r) => !since || (inclusive ? r.server_updated_at >= since : r.server_updated_at > since))
        .sort((a, b) => a.server_updated_at.localeCompare(b.server_updated_at))
        .slice(0, limit)
        .map((r) => structuredClone(r));
    },
  };
  return api;
}

/** Įrenginys su vietine saugykla, veikiančia kaip IndexedDB versija (db.ts). */
function memDevice(seed: Entry[] = []) {
  const store = new Map<string, Entry>(seed.map((e) => [e.id, { ...e, updatedAt: 0 }]));
  let cursor: string | null = null;
  const local: LocalStore = {
    async getDirty() {
      return [...store.values()].filter((e) => e.dirty).map((e) => ({ ...e }));
    },
    async markClean(sent) {
      for (const { id, updatedAt } of sent) {
        const e = store.get(id);
        if (e?.dirty && (e.updatedAt ?? 0) === updatedAt) store.set(id, { ...e, dirty: undefined });
      }
    },
    async applyRemote(rows: RemoteRow[]) {
      let n = 0;
      for (const r of rows) {
        const next = mergeRemote(store.get(r.id), r);
        if (next) {
          store.set(r.id, next as Entry);
          n++;
        }
      }
      return n;
    },
    getCursor: async () => cursor,
    setCursor: async (c) => {
      cursor = c;
    },
  };
  return {
    local,
    put(e: Entry) {
      store.set(e.id, { ...e, deleted: undefined, updatedAt: tick(), dirty: 1 });
    },
    remove(id: string) {
      const e = store.get(id)!;
      store.set(id, { ...e, deleted: true, updatedAt: tick(), dirty: 1 });
    },
    get: (id: string) => {
      const e = store.get(id);
      return e && !e.deleted ? e : undefined;
    },
    visible: () => [...store.values()].filter((e) => !e.deleted),
  };
}

const entry = (id: string, extra: Partial<Entry> = {}): Entry => ({
  id,
  title: 'Sporto salė',
  type: 'personal',
  date: '2026-11-10',
  start: '18:00',
  end: '19:00',
  ...extra,
});

describe('sinchronizacija tarp dviejų įrenginių', () => {
  it('naujas įrašas telefone atsiranda kompiuteryje', async () => {
    const server = memServer();
    const phone = memDevice();
    const pc = memDevice();
    phone.put(entry('a'));
    expect(await runSync(phone.local, server)).toMatchObject({ pushed: 1 });
    const r = await runSync(pc.local, server);
    expect(r.changed).toBe(1);
    expect(pc.get('a')?.title).toBe('Sporto salė');
    expect(pc.get('a')?.dirty).toBeUndefined();
  });

  it('abu pakeitė tą patį įrašą be interneto – laimi vėlesnis pakeitimas, nepriklausomai nuo sinchronizavimo tvarkos', async () => {
    const server = memServer();
    const phone = memDevice();
    const pc = memDevice();
    phone.put(entry('a'));
    await runSync(phone.local, server);
    await runSync(pc.local, server);

    phone.put(entry('a', { start: '17:00' })); // ankstesnis
    pc.put(entry('a', { start: '20:00' })); // vėlesnis
    // vėlesnis sinchronizuojasi pirmas, ankstesnis – po jo
    await runSync(pc.local, server);
    await runSync(phone.local, server);
    await runSync(pc.local, server);
    expect(phone.get('a')?.start).toBe('20:00');
    expect(pc.get('a')?.start).toBe('20:00');
    expect((server.rows.get('a')?.data as Entry).start).toBe('20:00');
  });

  it('ištrynimas pasiekia kitą įrenginį, o senesnis pakeitimas jo neatgaivina', async () => {
    const server = memServer();
    const phone = memDevice();
    const pc = memDevice();
    phone.put(entry('a'));
    await runSync(phone.local, server);
    await runSync(pc.local, server);

    pc.put(entry('a', { note: 'senas pakeitimas' })); // anksčiau, be interneto
    phone.remove('a'); // vėliau
    await runSync(phone.local, server);
    await runSync(pc.local, server);
    expect(pc.get('a')).toBeUndefined();
    expect(server.rows.get('a')?.deleted).toBe(true);
  });

  it('atšaukus ištrynimą (įrašas grąžintas vėliau) jis vėl atsiranda kitame įrenginyje', async () => {
    const server = memServer();
    const phone = memDevice();
    const pc = memDevice();
    phone.put(entry('a'));
    await runSync(phone.local, server);
    await runSync(pc.local, server);
    phone.remove('a');
    await runSync(phone.local, server);
    await runSync(pc.local, server);
    expect(pc.get('a')).toBeUndefined();
    phone.put(entry('a'));
    await runSync(phone.local, server);
    await runSync(pc.local, server);
    expect(pc.get('a')).toBeDefined();
  });

  it('nepakeisti pradiniai įrašai nesiunčiami, bet jų pakeitimai keliauja', async () => {
    const seed = [entry('seed-1', { type: 'practice', title: 'Praktika' }), entry('seed-2', { type: 'lecture', title: 'Paskaita' })];
    const server = memServer();
    const phone = memDevice(seed);
    const pc = memDevice(seed);
    expect(await runSync(phone.local, server)).toMatchObject({ pushed: 0 });
    expect(server.rows.size).toBe(0);

    phone.put({ ...phone.get('seed-1')!, status: 'missed' });
    await runSync(phone.local, server);
    await runSync(pc.local, server);
    expect(pc.get('seed-1')?.status).toBe('missed');
    expect(pc.get('seed-2')?.updatedAt).toBe(0);
  });

  it('pakeitimas, padarytas kol vyko išsiuntimas, lieka neišsiųstas ir išsiunčiamas kitą kartą', async () => {
    const server = memServer();
    const phone = memDevice();
    phone.put(entry('a'));
    const realPush = server.push.bind(server);
    server.push = async (rows) => {
      await realPush(rows);
      phone.put(entry('a', { start: '07:00' })); // vartotojas redaguoja kol vyksta užklausa
    };
    await runSync(phone.local, server);
    server.push = realPush;
    expect(phone.get('a')?.dirty).toBe(1);
    await runSync(phone.local, server);
    expect((server.rows.get('a')?.data as Entry).start).toBe('07:00');
    expect(phone.get('a')?.dirty).toBeUndefined();
  });

  it('daug įrašų parsiunčiama keliais puslapiais', async () => {
    const server = memServer();
    const phone = memDevice();
    const pc = memDevice();
    for (let i = 0; i < 1234; i++) phone.put(entry(`e${i}`));
    await runSync(phone.local, server);
    expect(server.pushes).toBe(7); // po 200
    const r = await runSync(pc.local, server);
    expect(r.pulled).toBe(1234);
    expect(pc.visible()).toHaveLength(1234);
    // antras kartas – nieko naujo (tik persidengimo langas, be pakeitimų)
    expect((await runSync(pc.local, server)).changed).toBe(0);
  });

  it('darbai (todo) sinchronizuojami kartu su įrašais, varnelė ir ištrynimas keliauja', async () => {
    const server = memServer();
    const phone = memDevice();
    const pc = memDevice();
    const todo = { id: 't1', kind: 'todo' as const, title: 'Nupirkti pieno', icon: 'cart', createdAt: 1 };
    phone.put(todo as unknown as Entry);
    await runSync(phone.local, server);
    await runSync(pc.local, server);
    expect(pc.get('t1')?.title).toBe('Nupirkti pieno');
    expect((pc.get('t1') as unknown as { kind: string }).kind).toBe('todo');
    pc.put({ ...pc.get('t1')!, done: true });
    await runSync(pc.local, server);
    await runSync(phone.local, server);
    expect(phone.get('t1')?.done).toBe(true);
    phone.remove('t1');
    await runSync(phone.local, server);
    await runSync(pc.local, server);
    expect(pc.get('t1')).toBeUndefined();
  });

  it('į debesį nesiunčiama vietinė žymė dirty', async () => {
    const server = memServer();
    const phone = memDevice();
    phone.put(entry('a'));
    await runSync(phone.local, server);
    expect('dirty' in server.rows.get('a')!.data).toBe(false);
  });
});

describe('pagalbinės funkcijos', () => {
  it('sameContent nepaiso sinchronizacijos laukų ir undefined reikšmių', () => {
    const a = entry('a');
    expect(sameContent(a, { ...a, updatedAt: 5, dirty: 1, note: undefined })).toBe(true);
    expect(sameContent(a, { ...a, status: 'done' })).toBe(false);
  });

  it('mergeRemote: lygus laikas palieka vietinį, naujesnis – pakeičia', () => {
    const local = { ...entry('a'), updatedAt: 10 };
    const row = (ts: number): RemoteRow => ({ id: 'a', data: entry('a', { start: '08:00' }), updated_at: ts, deleted: false });
    expect(mergeRemote(local, row(10))).toBeNull();
    expect(mergeRemote(local, row(9))).toBeNull();
    expect((mergeRemote(local, row(11)) as Entry).start).toBe('08:00');
    expect(mergeRemote(undefined, { ...row(1), deleted: true })?.deleted).toBe(true);
  });
});
