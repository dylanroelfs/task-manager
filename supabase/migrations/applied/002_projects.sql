-- 002: projecten. Een taak hoort bij nul of één project van dezelfde gebruiker.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  color text not null default 'blue'
    check (color in ('blue', 'orange', 'aqua', 'yellow', 'magenta', 'green', 'violet', 'red')),
  created_at timestamptz not null default now(),
  -- nodig voor de samengestelde foreign key hieronder
  unique (id, user_id)
);

alter table public.projects enable row level security;

grant select, insert, update, delete on public.projects to authenticated;

create policy "users read own projects" on public.projects
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "users create own projects" on public.projects
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users update own projects" on public.projects
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "users delete own projects" on public.projects
  for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.tasks add column project_id uuid;

-- (project_id, user_id) samen: een taak kan alleen naar een project van dezelfde gebruiker
-- wijzen. Wordt het project verwijderd, dan blijft de taak bestaan zonder project.
alter table public.tasks
  add constraint tasks_project_fkey
  foreign key (project_id, user_id) references public.projects (id, user_id)
  on delete set null (project_id);

create index tasks_project_idx on public.tasks (project_id) where project_id is not null;

-- Projecten met het aantal open taken. security_invoker: RLS van de lezer geldt.
create view public.projects_with_counts
with (security_invoker = true) as
select
  p.id,
  p.name,
  p.color,
  p.created_at,
  count(t.id) filter (where not t.done) as open_count
from public.projects p
left join public.tasks t on t.project_id = p.id
group by p.id;

grant select on public.projects_with_counts to authenticated;
