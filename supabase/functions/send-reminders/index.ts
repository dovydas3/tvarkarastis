// Supabase Edge Function: siunčia push priminimus prieš įvykius.
// Kviečiama kas minutę (pg_cron, žr. supabase/push.sql). GET ?public-key grąžina VAPID viešąjį raktą programėlei.
//
// Paslaptys (npx supabase secrets set ...): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET.
// SUPABASE_URL ir SUPABASE_SERVICE_ROLE_KEY Supabase pateikia automatiškai.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { addDays, dueReminders, vilniusNow, type EntryRow } from './logic.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  // Programėlė pasiima viešąjį raktą (jis neslaptas).
  if (req.method === 'GET') return json({ publicKey });

  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);

  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  webpush.setVapidDetails('mailto:noreply@tvarkarastis.app', publicKey, Deno.env.get('VAPID_PRIVATE_KEY')!);

  const { data: subs, error: subErr } = await supa.from('push_subscriptions').select('endpoint, user_id, p256dh, auth, lead_minutes');
  if (subErr) return json({ error: subErr.message }, 500);
  if (!subs?.length) return json({ sent: 0 });

  const now = vilniusNow(new Date());
  const dates = [now.date, addDays(now.date, 1)]; // priminimas gali „pereiti“ per vidurnaktį
  const userIds = [...new Set(subs.map((s) => s.user_id))];

  const { data: rows, error: rowErr } = await supa
    .from('entries')
    .select('user_id, id, data')
    .in('user_id', userIds)
    .eq('deleted', false)
    .in('data->>date', dates);
  if (rowErr) return json({ error: rowErr.message }, 500);

  const { data: sentRows } = await supa
    .from('push_sent')
    .select('endpoint, fire_key')
    .in(
      'endpoint',
      subs.map((s) => s.endpoint),
    );
  const sent = new Set((sentRows ?? []).map((r) => `${r.endpoint}|${r.fire_key}`));

  let count = 0;
  const gone: string[] = [];
  for (const sub of subs) {
    const mine = (rows ?? []).filter((r) => r.user_id === sub.user_id) as (EntryRow & { user_id: string })[];
    const sentForSub = new Set([...sent].filter((k) => k.startsWith(`${sub.endpoint}|`)).map((k) => k.slice(sub.endpoint.length + 1)));
    for (const r of dueReminders(mine, now, sub.lead_minutes, sentForSub)) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: r.title, body: r.body, tag: r.key }),
          { TTL: 600, urgency: 'high' },
        );
        count++;
        await supa.from('push_sent').upsert({ endpoint: sub.endpoint, fire_key: r.key });
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // Prenumerata nebegalioja (programėlė pašalinta / leidimas atšauktas).
        if (status === 404 || status === 410) {
          gone.push(sub.endpoint);
          break;
        }
        console.error('push failed', status, (err as Error).message);
      }
    }
  }
  if (gone.length) await supa.from('push_subscriptions').delete().in('endpoint', gone);
  return json({ sent: count, removed: gone.length });
});
