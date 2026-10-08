-- 007: onderdelen. Structuur wordt projects -> sections -> tasks (bijv. AVN -> "Bugfix" ->
-- "Dubbele order samenvoegen"). Daarnaast: prioriteit vervalt en de view
-- projects_with_counts vervalt (de app telt zelf).
--
-- Veilig te draaien, ook als je een eerdere versie van deze migratie (tasks.section als tekst,
-- projects.sections als lijst, of de tabel project_sections) al gedraaid hebt: die wordt
-- opgeruimd en de onderdelen die erin stonden worden overgenomen.
-- Let op: verwijdert alle bestaande prioriteiten definitief.

-- Tussenversies opruimen
drop table if exists public.project_sections cascade;
drop trigger if exists tasks_clear_section on public.tasks;
drop function if exists public.tasks_clear_section();
alter table public.tasks drop column if exists section_id;
drop view if exists public.projects_with_counts;

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  -- Alleen in je eigen projecten; weg met het project, weg met het onderdeel
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade,
  -- nodig voor de samengestelde foreign key vanuit tasks hieronder
  unique (id, project_id)
);

-- Geen twee onderdelen met dezelfde naam in één project ("Bugfix" en "bugfix" tellen als gelijk)
create unique index sections_project_name_idx on public.sections (project_id, lower(name));

alter table public.sections enable row level security;

grant select, insert, update, delete on public.sections to authenticated;

create policy "users read own sections" on public.sections
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "users create own sections" on public.sections
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users update own sections" on public.sections
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "users delete own sections" on public.sections
  for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.tasks add column section_id uuid;

-- (section_id, project_id) samen: een taak kan alleen naar een onderdeel van zijn eigen
-- project wijzen. Wordt het onderdeel verwijderd, dan blijft de taak in het project.
alter table public.tasks
  add constraint tasks_section_fkey
  foreign key (section_id, project_id) references public.sections (id, project_id)
  on delete set null (section_id);

-- Zonder project geen onderdeel (de foreign key hierboven controleert niets als project_id null is)
alter table public.tasks
  add constraint tasks_section_needs_project check (section_id is null or project_id is not null);

create index tasks_section_idx on public.tasks (section_id) where section_id is not null;

-- Een medewerker mag de naam zien van het onderdeel van een taak die hij heeft
create policy "assignees read sections of their tasks" on public.sections
  for select to authenticated
  using (exists (
    select 1 from public.tasks t
    where t.section_id = sections.id and t.assignee_id = (select auth.uid())
  ));

-- Onderdelen uit een eerdere tekstversie overnemen (alleen als die kolommen bestaan)
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'projects' and column_name = 'sections') then
    insert into public.sections (project_id, user_id, name)
    select p.id, p.user_id, s.name
    from public.projects p, unnest(p.sections) with ordinality as s(name, pos)
    order by p.id, s.pos
    on conflict do nothing;
    alter table public.projects drop column sections;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'tasks' and column_name = 'section') then
    insert into public.sections (project_id, user_id, name)
    select distinct t.project_id, t.user_id, t.section
    from public.tasks t
    where t.section is not null and t.project_id is not null
    on conflict do nothing;

    update public.tasks t
    set section_id = s.id
    from public.sections s
    where s.project_id = t.project_id and lower(s.name) = lower(t.section);

    alter table public.tasks drop column section;
  end if;
end;
$$;

-- Verhuist een taak naar een ander project (of verliest hij zijn project doordat het
-- verwijderd wordt), dan vervalt het onderdeel, tenzij er tegelijk een nieuw is gekozen.
create function public.tasks_clear_section()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.project_id is distinct from old.project_id
     and new.section_id is not distinct from old.section_id then
    new.section_id := null;
  end if;
  return new;
end;
$$;

create trigger tasks_clear_section
  before update on public.tasks
  for each row execute function public.tasks_clear_section();

-- Eerst de guard bijwerken (die las priority), daarna de kolom weghalen.
-- Onderdeel hoort bij de kolommen die alleen de eigenaar mag wijzigen.
create or replace function public.tasks_guard_update()
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
     and (new.title, new.description, new.due_date, new.project_id, new.section_id, new.assignee_id)
         is distinct from
         (old.title, old.description, old.due_date, old.project_id, old.section_id, old.assignee_id) then
    raise exception 'Alleen de eigenaar kan deze taak bewerken' using errcode = '42501';
  end if;
  return new;
end;
$$;

alter table public.tasks drop column if exists priority;
