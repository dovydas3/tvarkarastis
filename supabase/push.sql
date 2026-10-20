-- Push priminimai. Paleisk Supabase → SQL Editor (po schema.sql). Galima paleisti pakartotinai.

-- Įrenginių prenumeratos (kiekvienas telefonas / naršyklė – atskira eilutė).
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  -- prieš kiek minučių priminti
  lead_minutes int not null default 15 check (lead_minutes between 0 and 240),
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

drop policy if exists "push_subscriptions: tik savo" on public.push_subscriptions;
create policy "push_subscriptions: tik savo" on public.push_subscriptions
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Kas jau išsiųsta (kad tas pats priminimas neateitų du kartus). Naudoja tik serverio funkcija.
create table if not exists public.push_sent (
  endpoint text not null,
  fire_key text not null,
  created_at timestamptz not null default now(),
  primary key (endpoint, fire_key)
);
alter table public.push_sent enable row level security;
revoke all on public.push_sent from anon, authenticated;

-- Senų žymų valymas kartą per parą.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'push-sent-cleanup',
  '17 3 * * *',
  $$ delete from public.push_sent where created_at < now() - interval '3 days' $$
);

-- Kas minutę iškviečiama funkcija send-reminders.
-- PASTABA: šį bloką su tikru adresu ir slaptažodžiu rasi faile supabase/push-cron.sql.local
-- (jis nekeliamas į GitHub). Čia – tik pavyzdys:
--
-- select cron.schedule(
--   'send-reminders',
--   '* * * * *',
--   $job$
--   select net.http_post(
--     url := 'https://<PROJEKTAS>.supabase.co/functions/v1/send-reminders',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
--     body := '{}'::jsonb
--   );
--   $job$
-- );
