-- Tvarkaraščio sinchronizacija. Įklijuok į Supabase → SQL Editor → Run.
-- Galima paleisti pakartotinai (viskas sukuriama tik jei dar nėra).

create table if not exists public.entries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  -- visas įrašas (pavadinimas, data, laikas, būsena ...) JSON pavidalu
  data jsonb not null,
  -- kada įrašas paskutinį kartą pakeistas įrenginyje (ms nuo 1970); naujesnis laimi
  updated_at bigint not null,
  -- ištrinti įrašai paliekami kaip žymės, kad trynimas pasiektų kitus įrenginius
  deleted boolean not null default false,
  -- kada eilutė pasikeitė serveryje; pagal tai įrenginiai parsisiunčia naujienas
  server_updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create index if not exists entries_user_server_updated_idx
  on public.entries (user_id, server_updated_at);

-- Kiekvienas mato ir keičia tik savo įrašus.
alter table public.entries enable row level security;
revoke all on public.entries from anon;
grant select, insert, update, delete on public.entries to authenticated;

drop policy if exists "entries: tik savo" on public.entries;
create policy "entries: tik savo" on public.entries
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- server_updated_at atnaujinamas kiekvieną kartą, kai eilutė pasikeičia.
create or replace function public.entries_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists entries_touch on public.entries;
create trigger entries_touch
  before insert or update on public.entries
  for each row execute function public.entries_touch();

-- Įrašų išsiuntimas: įrašoma tik tada, kai atsiųsta versija naujesnė už esamą serveryje
-- (kitaip senas pakeitimas iš kito įrenginio galėtų užrašyti naujesnį).
create or replace function public.push_entries(rows jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.entries as e (user_id, id, data, updated_at, deleted)
  select
    (select auth.uid()),
    r ->> 'id',
    r -> 'data',
    (r ->> 'updated_at')::bigint,
    coalesce((r ->> 'deleted')::boolean, false)
  from jsonb_array_elements(rows) as r
  on conflict (user_id, id) do update
    set data = excluded.data,
        updated_at = excluded.updated_at,
        deleted = excluded.deleted
    where e.updated_at < excluded.updated_at;
$$;

revoke all on function public.push_entries(jsonb) from public, anon;
grant execute on function public.push_entries(jsonb) to authenticated;
