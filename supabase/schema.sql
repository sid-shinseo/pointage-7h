-- Pointage 7h : one row per document (settings, m-YYYY-MM) per user.
create table if not exists public.pointage_docs (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, name)
);

alter table public.pointage_docs enable row level security;

-- Each user only sees and changes their own rows.
create policy "read own" on public.pointage_docs for select to authenticated using (auth.uid() = user_id);
create policy "insert own" on public.pointage_docs for insert to authenticated with check (auth.uid() = user_id);
create policy "update own" on public.pointage_docs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on public.pointage_docs for delete to authenticated using (auth.uid() = user_id);

-- Live sync between phone and computer.
alter publication supabase_realtime add table public.pointage_docs;
