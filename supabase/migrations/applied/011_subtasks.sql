-- 011: deeltaken. Een afvinklijst binnen een taak: alleen een titel en afgevinkt of niet.
-- Wie de taak ziet, ziet ook de deeltaken. De eigenaar van de taak voegt toe, wijzigt en
-- verwijdert; een toegewezen medewerker mag alleen afvinken (zoals de status van de taak).

create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Volgorde in de taak: op volgorde van toevoegen
create index subtasks_task_created_idx on public.subtasks (task_id, created_at);

alter table public.subtasks enable row level security;

grant select, insert, update, delete on public.subtasks to authenticated;

create policy "owners and assignees read subtasks" on public.subtasks
  for select to authenticated
  using (exists (
    select 1 from public.tasks t
    where t.id = subtasks.task_id and (select auth.uid()) in (t.user_id, t.assignee_id)
  ));
create policy "owners create subtasks" on public.subtasks
  for insert to authenticated
  with check (exists (
    select 1 from public.tasks t
    where t.id = subtasks.task_id and t.user_id = (select auth.uid())
  ));
create policy "owners and assignees update subtasks" on public.subtasks
  for update to authenticated
  using (exists (
    select 1 from public.tasks t
    where t.id = subtasks.task_id and (select auth.uid()) in (t.user_id, t.assignee_id)
  ))
  with check (exists (
    select 1 from public.tasks t
    where t.id = subtasks.task_id and (select auth.uid()) in (t.user_id, t.assignee_id)
  ));
create policy "owners delete subtasks" on public.subtasks
  for delete to authenticated
  using (exists (
    select 1 from public.tasks t
    where t.id = subtasks.task_id and t.user_id = (select auth.uid())
  ));

-- Een deeltaak verhuist nooit naar een andere taak. Alleen de eigenaar van de taak mag de
-- titel wijzigen; een medewerker alleen het vinkje.
create function public.subtasks_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.task_id is distinct from old.task_id then
    raise exception 'Een deeltaak kan niet naar een andere taak verhuizen' using errcode = '42501';
  end if;
  if new.title is distinct from old.title
     and not exists (select 1 from public.tasks t where t.id = old.task_id and t.user_id = auth.uid()) then
    raise exception 'Alleen de eigenaar kan deze deeltaak bewerken' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger subtasks_guard_update
  before update on public.subtasks
  for each row execute function public.subtasks_guard_update();
