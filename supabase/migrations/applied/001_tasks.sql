-- 001: taken. Draai migraties op volgorde in de Supabase SQL Editor.
-- Elke gebruiker ziet en bewerkt alleen zijn eigen taken (RLS op user_id).

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index tasks_user_open_idx on public.tasks (user_id, done, due_date);

alter table public.tasks enable row level security;

grant select, insert, update, delete on public.tasks to authenticated;

create policy "users read own tasks" on public.tasks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "users create own tasks" on public.tasks
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users update own tasks" on public.tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "users delete own tasks" on public.tasks
  for delete to authenticated using ((select auth.uid()) = user_id);
