-- 005: optionele beschrijving bij een taak.

alter table public.tasks
  add column description text check (char_length(description) <= 2000);

-- Beschrijving toevoegen aan de kolommen die alleen de eigenaar mag wijzigen
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
     and (new.title, new.description, new.priority, new.due_date, new.project_id, new.assignee_id)
         is distinct from
         (old.title, old.description, old.priority, old.due_date, old.project_id, old.assignee_id) then
    raise exception 'Alleen de eigenaar kan deze taak bewerken' using errcode = '42501';
  end if;
  return new;
end;
$$;
