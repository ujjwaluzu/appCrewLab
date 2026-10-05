create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  starts_at timestamptz not null,
  ends_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 2000),
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index if not exists events_owner_starts_at_idx on public.events(owner_id, starts_at);
alter table public.events enable row level security;
create policy "Owners manage their events" on public.events for all to authenticated
  using (owner_id = (select auth.uid())) with check (
    owner_id = (select auth.uid()) and
    (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())))
  );
drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events for each row execute function public.set_updated_at();

create or replace function public.search_public_profiles(search_term text, result_limit integer default 5)
returns table(username text, display_name text)
language sql stable security definer set search_path = '' as $$
  select p.username, p.display_name
  from public.profiles p
  where auth.uid() is not null and p.onboarding_completed = true
    and (
      p.username ilike '%' || trim(search_term) || '%'
      or coalesce(p.display_name, '') ilike '%' || trim(search_term) || '%'
      or exists (
        select 1 from public.profile_skills ps join public.skills s on s.id = ps.skill_id
        where ps.profile_id = p.id and s.name ilike '%' || trim(search_term) || '%'
      )
    )
  order by p.display_name nulls last, p.username
  limit least(greatest(result_limit, 1), 50);
$$;
revoke all on function public.search_public_profiles(text, integer) from public, anon;
grant execute on function public.search_public_profiles(text, integer) to authenticated;
