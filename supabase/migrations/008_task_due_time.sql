-- Optionele tijd bij een taak, alleen samen met een datum.

alter table public.tasks
  add column if not exists due_time time,
  drop constraint if exists tasks_due_time_needs_date,
  add constraint tasks_due_time_needs_date check (due_time is null or due_date is not null);

-- Tijd hoort bij de kolommen die alleen de eigenaar mag wijzigen.
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
     and (new.title, new.description, new.due_date, new.due_time, new.project_id, new.section_id, new.assignee_id)
         is distinct from
         (old.title, old.description, old.due_date, old.due_time, old.project_id, old.section_id, old.assignee_id) then
    raise exception 'Alleen de eigenaar kan deze taak bewerken' using errcode = '42501';
  end if;
  return new;
end;
$$;
