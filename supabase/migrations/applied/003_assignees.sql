-- 003: medewerkers. Alle accounts vormen één team; een taak kan aan een collega
-- worden toegewezen. Die ziet de taak en mag hem afvinken, maar alleen de
-- eigenaar mag hem bewerken of verwijderen.

-- Profielen: openbare naam + e-mail van elk account, automatisch bijgehouden.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;
create policy "team reads profiles" on public.profiles
  for select to authenticated using (true);

create function public.handle_user_saved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update
    set email = excluded.email, full_name = excluded.full_name;
  return new;
end;
$$;

revoke execute on function public.handle_user_saved() from public, anon, authenticated;

create trigger on_auth_user_saved
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_user_saved();

-- Bestaande accounts meteen een profiel geven
insert into public.profiles (id, email, full_name)
select id, coalesce(email, ''), raw_user_meta_data ->> 'full_name' from auth.users
on conflict (id) do nothing;

-- Toegewezen medewerker
alter table public.tasks
  add column assignee_id uuid references public.profiles (id) on delete set null;
create index tasks_assignee_idx on public.tasks (assignee_id) where assignee_id is not null;

-- Lezen en bijwerken: eigenaar én medewerker. Aanmaken en verwijderen: alleen eigenaar.
drop policy "users read own tasks" on public.tasks;
drop policy "users update own tasks" on public.tasks;

create policy "owners and assignees read tasks" on public.tasks
  for select to authenticated using ((select auth.uid()) in (user_id, assignee_id));
create policy "owners and assignees update tasks" on public.tasks
  for update to authenticated
  using ((select auth.uid()) in (user_id, assignee_id))
  with check ((select auth.uid()) in (user_id, assignee_id));

-- RLS kan geen kolommen afschermen, deze trigger wel: een medewerker mag alleen
-- afvinken (done/completed_at), en niemand mag de eigenaar van een taak wijzigen.
-- Geldt niet zonder ingelogde gebruiker (SQL Editor) en niet voor wijzigingen die de
-- database zelf doorvoert via foreign keys (pg_trigger_depth() > 1), zoals een
-- medewerker die op null gaat als zijn account verwijderd wordt.
create function public.tasks_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null or pg_trigger_depth() > 1 then
    return new;
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'De eigenaar van een taak kan niet gewijzigd worden' using errcode = '42501';
  end if;
  if auth.uid() is distinct from old.user_id
     and (new.title, new.priority, new.due_date, new.project_id, new.assignee_id)
         is distinct from (old.title, old.priority, old.due_date, old.project_id, old.assignee_id) then
    raise exception 'Alleen de eigenaar kan deze taak bewerken' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger tasks_guard_update
  before update on public.tasks
  for each row execute function public.tasks_guard_update();

-- Een medewerker mag de naam en kleur zien van het project van een taak die hij heeft
create policy "assignees read projects of their tasks" on public.projects
  for select to authenticated
  using (exists (
    select 1 from public.tasks t
    where t.project_id = projects.id and t.assignee_id = (select auth.uid())
  ));

-- De sidebar toont alleen je eigen projecten, ook nu je die van anderen kunt lezen
create or replace view public.projects_with_counts
with (security_invoker = true) as
select
  p.id,
  p.name,
  p.color,
  p.created_at,
  count(t.id) filter (where not t.done) as open_count
from public.projects p
left join public.tasks t on t.project_id = p.id
where p.user_id = (select auth.uid())
group by p.id;
