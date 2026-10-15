-- online-paint: Supabase skeem
-- Käivita: Supabase Dashboard → SQL Editor → New query → kleebi → Run

-- 1. Tabel valmis joonte jaoks
create table if not exists public.strokes (
  id         bigint generated always as identity primary key,
  room       text        not null check (char_length(room) between 1 and 64),
  data       jsonb       not null check (
               jsonb_typeof(data) = 'array'
               and jsonb_array_length(data) between 1 and 5000
             ),
  created_at timestamptz not null default now()
);

-- 2. Indeks: toa jooned kiiresti õiges järjekorras
create index if not exists strokes_room_id_idx on public.strokes (room, id);

-- 3. Õigused (anon = sisselogimata kasutaja)
grant select, insert, delete on public.strokes to anon, authenticated;

-- 4. RLS: sisse lülitatud, prototüübis kõik lubatud
alter table public.strokes enable row level security;

drop policy if exists "strokes_select" on public.strokes;
create policy "strokes_select" on public.strokes
  for select to anon, authenticated using (true);

drop policy if exists "strokes_insert" on public.strokes;
create policy "strokes_insert" on public.strokes
  for insert to anon, authenticated with check (true);

drop policy if exists "strokes_delete" on public.strokes;
create policy "strokes_delete" on public.strokes
  for delete to anon, authenticated using (true);

-- Kontroll (peaks tagastama 0 rida, mitte vea):
-- select * from public.strokes limit 1;