create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 80),
  slug text not null unique,
  short_description text not null default '' check (char_length(short_description) <= 180),
  description text not null default '' check (char_length(description) <= 10000),
  status text not null default 'idea' check (status in ('idea', 'building', 'paused', 'completed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists projects_created_at_desc_idx on public.projects (created_at desc);
create index if not exists projects_owner_created_at_desc_idx on public.projects (owner_id, created_at desc);

create table if not exists public.project_skills (
  project_id uuid not null references public.projects(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (project_id, skill_id)
);

alter table public.projects enable row level security;
alter table public.project_skills enable row level security;

drop policy if exists "Authenticated users can discover projects" on public.projects;
create policy "Authenticated users can discover projects"
  on public.projects for select to authenticated
  using (auth.uid() is not null);

drop policy if exists "Users can create projects they own" on public.projects;
create policy "Users can create projects they own"
  on public.projects for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Owners can update their projects" on public.projects;
create policy "Owners can update their projects"
  on public.projects for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owners can delete their projects" on public.projects;
create policy "Owners can delete their projects"
  on public.projects for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Authenticated users can read project skills" on public.project_skills;
create policy "Authenticated users can read project skills"
  on public.project_skills for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));

drop policy if exists "Owners can add project skills" on public.project_skills;
create policy "Owners can add project skills"
  on public.project_skills for insert to authenticated
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

drop policy if exists "Owners can remove project skills" on public.project_skills;
create policy "Owners can remove project skills"
  on public.project_skills for delete to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

create or replace function public.enforce_project_skill_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  existing_skill_count integer;
  affected_project record;
begin
  for affected_project in
    select inserted.project_id
    from new_project_skills inserted
    group by inserted.project_id
    order by inserted.project_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(affected_project.project_id::text, 1));
    select count(*) into existing_skill_count
    from public.project_skills ps
    where ps.project_id = affected_project.project_id;

    if existing_skill_count > 8 then raise exception 'A project can have at most 8 skills'; end if;
  end loop;
  return null;
end;
$$;

drop trigger if exists project_skills_enforce_limit on public.project_skills;
create trigger project_skills_enforce_limit
after insert on public.project_skills
referencing new table as new_project_skills
for each statement execute function public.enforce_project_skill_limit();

revoke all on function public.enforce_project_skill_limit() from public, anon;
grant execute on function public.enforce_project_skill_limit() to authenticated;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- Expose only project owners' public identity fields, never the full profile row.
create or replace view public.project_owner_profiles
with (security_barrier = true)
as
  select id, username, display_name
  from public.profiles
  where exists (select 1 from public.projects p where p.owner_id = profiles.id);

revoke all on public.project_owner_profiles from anon, public;
grant select on public.project_owner_profiles to authenticated;

create or replace function public.project_slug_base(project_title text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(nullif(trim(both '-' from regexp_replace(lower(btrim(project_title)), '[^a-z0-9]+', '-', 'g')), ''), 'project');
$$;

revoke all on function public.project_slug_base(text) from public, anon;
grant execute on function public.project_slug_base(text) to authenticated;

create or replace function public.create_project_with_skills(
  project_title text,
  project_short_description text,
  project_description text,
  project_status text,
  skill_slugs text[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_project_id uuid;
  base_slug text;
  candidate_slug text;
  slug_number integer := 1;
  selected_count integer := coalesce(cardinality(skill_slugs), 0);
  matched_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(btrim(project_title)) not between 3 and 80 then raise exception 'Invalid project title'; end if;
  if char_length(coalesce(project_short_description, '')) > 180 then raise exception 'Invalid short description'; end if;
  if char_length(coalesce(project_description, '')) > 10000 then raise exception 'Invalid description'; end if;
  if project_status not in ('idea', 'building', 'paused', 'completed') then raise exception 'Invalid project status'; end if;
  if selected_count > 8 or selected_count <> (select count(distinct item) from unnest(coalesce(skill_slugs, '{}'::text[])) item) then
    raise exception 'Choose up to 8 unique skills';
  end if;
  select count(*) into matched_count from public.skills s where s.slug = any(coalesce(skill_slugs, '{}'::text[]));
  if matched_count <> selected_count then raise exception 'Invalid project skill'; end if;

  base_slug := public.project_slug_base(project_title);
  perform pg_advisory_xact_lock(hashtextextended(base_slug, 0));
  candidate_slug := base_slug;
  while exists (select 1 from public.projects p where p.slug = candidate_slug) loop
    slug_number := slug_number + 1;
    candidate_slug := base_slug || '-' || slug_number::text;
  end loop;

  insert into public.projects (owner_id, title, slug, short_description, description, status)
  values (auth.uid(), btrim(project_title), candidate_slug, coalesce(btrim(project_short_description), ''), coalesce(btrim(project_description), ''), project_status)
  returning id into created_project_id;

  insert into public.project_skills (project_id, skill_id)
  select created_project_id, s.id from public.skills s where s.slug = any(coalesce(skill_slugs, '{}'::text[]));

  return created_project_id;
end;
$$;

create or replace function public.update_project_with_skills(
  target_project_id uuid,
  project_title text,
  project_short_description text,
  project_description text,
  project_status text,
  skill_slugs text[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  base_slug text;
  candidate_slug text;
  slug_number integer := 1;
  selected_count integer := coalesce(cardinality(skill_slugs), 0);
  matched_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(btrim(project_title)) not between 3 and 80 then raise exception 'Invalid project title'; end if;
  if char_length(coalesce(project_short_description, '')) > 180 then raise exception 'Invalid short description'; end if;
  if char_length(coalesce(project_description, '')) > 10000 then raise exception 'Invalid description'; end if;
  if project_status not in ('idea', 'building', 'paused', 'completed') then raise exception 'Invalid project status'; end if;
  if selected_count > 8 or selected_count <> (select count(distinct item) from unnest(coalesce(skill_slugs, '{}'::text[])) item) then
    raise exception 'Choose up to 8 unique skills';
  end if;
  select count(*) into matched_count from public.skills s where s.slug = any(coalesce(skill_slugs, '{}'::text[]));
  if matched_count <> selected_count then raise exception 'Invalid project skill'; end if;

  base_slug := public.project_slug_base(project_title);
  perform pg_advisory_xact_lock(hashtextextended(base_slug, 0));
  candidate_slug := base_slug;
  while exists (select 1 from public.projects p where p.slug = candidate_slug and p.id <> target_project_id) loop
    slug_number := slug_number + 1;
    candidate_slug := base_slug || '-' || slug_number::text;
  end loop;

  update public.projects
  set title = btrim(project_title), slug = candidate_slug,
      short_description = coalesce(btrim(project_short_description), ''),
      description = coalesce(btrim(project_description), ''), status = project_status
  where id = target_project_id and owner_id = auth.uid();
  if not found then raise exception 'Project could not be updated'; end if;

  delete from public.project_skills where project_id = target_project_id;
  insert into public.project_skills (project_id, skill_id)
  select target_project_id, s.id from public.skills s where s.slug = any(coalesce(skill_slugs, '{}'::text[]));

  return target_project_id;
end;
$$;

revoke all on function public.create_project_with_skills(text, text, text, text, text[]) from public, anon;
grant execute on function public.create_project_with_skills(text, text, text, text, text[]) to authenticated;
revoke all on function public.update_project_with_skills(uuid, text, text, text, text, text[]) from public, anon;
grant execute on function public.update_project_with_skills(uuid, text, text, text, text, text[]) to authenticated;
