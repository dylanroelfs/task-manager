-- 009: notities. Een notitie is van één gebruiker en hoort optioneel bij een project en
-- een onderdeel daarvan (bijv. AVN -> "Bugfix"). Alleen de eigenaar ziet en bewerkt ze.
-- Vereist 007 (sections).

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid,
  section_id uuid,
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Alleen in je eigen projecten. Wordt het project verwijderd, dan blijft de notitie bestaan.
  constraint notes_project_fkey
    foreign key (project_id, user_id) references public.projects (id, user_id)
    on delete set null (project_id),
  -- Het onderdeel hoort bij het project van de notitie. Weg met het onderdeel: notitie blijft in het project.
  constraint notes_section_fkey
    foreign key (section_id, project_id) references public.sections (id, project_id)
    on delete set null (section_id),
  -- Zonder project geen onderdeel (de foreign key hierboven controleert niets als project_id null is)
  constraint notes_section_needs_project check (section_id is null or project_id is not null)
);

create index notes_user_updated_idx on public.notes (user_id, updated_at desc);
create index notes_project_idx on public.notes (project_id) where project_id is not null;
create index notes_section_idx on public.notes (section_id) where section_id is not null;

alter table public.notes enable row level security;

grant select, insert, update, delete on public.notes to authenticated;

create policy "users read own notes" on public.notes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "users create own notes" on public.notes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users update own notes" on public.notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "users delete own notes" on public.notes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Verhuist een notitie naar een ander project (of verliest hij zijn project doordat het
-- verwijderd wordt), dan vervalt het onderdeel, tenzij er tegelijk een nieuw is gekozen.
-- updated_at schuift alleen mee als de titel of tekst verandert.
create function public.notes_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.project_id is distinct from old.project_id
     and new.section_id is not distinct from old.section_id then
    new.section_id := null;
  end if;
  if (new.title, new.body) is distinct from (old.title, old.body) then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger notes_before_update
  before update on public.notes
  for each row execute function public.notes_before_update();
