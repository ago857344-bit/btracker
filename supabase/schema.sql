-- BTracker cloud sync schema for Supabase.
-- Run this in the Supabase SQL Editor (or `supabase db push`) once per project.

create table if not exists public.tracker_state (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  data      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.tracker_state enable row level security;

-- Each signed-in user can only read/write their own row.
drop policy if exists "own tracker_state (select)" on public.tracker_state;
create policy "own tracker_state (select)" on public.tracker_state
  for select using (auth.uid() = user_id);

drop policy if exists "own tracker_state (insert)" on public.tracker_state;
create policy "own tracker_state (insert)" on public.tracker_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "own tracker_state (update)" on public.tracker_state;
create policy "own tracker_state (update)" on public.tracker_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
