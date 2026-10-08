-- 006: status per taak: todo (nieuw), in_progress of done.
-- De app schrijft alleen status; done en completed_at volgen automatisch, zodat
-- bestaande filters, tellers en de view projects_with_counts blijven werken.
-- Een medewerker mag de status wijzigen (net als afvinken): tasks_guard_update
-- controleert deze kolom niet.

alter table public.tasks
  add column status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done'));

-- Bestaande afgevinkte taken krijgen status done
update public.tasks set status = 'done' where done;

alter table public.tasks
  add constraint tasks_status_matches_done check (done = (status = 'done'));

create function public.tasks_sync_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Alleen done gewijzigd (bijv. vanuit de SQL Editor): status daaruit afleiden
  if tg_op = 'UPDATE' and new.status is not distinct from old.status
     and new.done is distinct from old.done then
    new.status := case when new.done then 'done' else 'todo' end;
  end if;

  new.done := new.status = 'done';
  if not new.done then
    new.completed_at := null;
  elsif tg_op = 'INSERT' or not old.done then
    new.completed_at := coalesce(new.completed_at, now());
  end if;
  return new;
end;
$$;

create trigger tasks_sync_status
  before insert or update on public.tasks
  for each row execute function public.tasks_sync_status();
