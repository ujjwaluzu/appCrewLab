create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  constraint project_members_project_user_unique unique (project_id, user_id)
);

create index if not exists project_members_user_joined_idx
  on public.project_members (user_id, joined_at desc);
create index if not exists project_members_project_joined_idx
  on public.project_members (project_id, joined_at asc);

create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists join_requests_user_created_idx
  on public.join_requests (user_id, created_at desc);
create index if not exists join_requests_project_status_created_idx
  on public.join_requests (project_id, status, created_at asc);
create unique index if not exists join_requests_one_pending_per_user_project
  on public.join_requests (project_id, user_id) where status = 'pending';

drop trigger if exists join_requests_set_updated_at on public.join_requests;
create trigger join_requests_set_updated_at
before update on public.join_requests
for each row execute function public.set_updated_at();

alter table public.project_members enable row level security;
alter table public.join_requests enable row level security;

drop policy if exists "Authenticated users can read project crew" on public.project_members;
create policy "Authenticated users can read project crew"
  on public.project_members for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));

drop policy if exists "Members can leave or owners can remove members" on public.project_members;
create policy "Members can leave or owners can remove members"
  on public.project_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
        and p.owner_id <> user_id
    )
  );

drop policy if exists "Users can read own requests and owners can read project requests" on public.join_requests;
create policy "Users can read own requests and owners can read project requests"
  on public.join_requests for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can request to join other projects" on public.join_requests;
create policy "Users can request to join other projects"
  on public.join_requests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id <> (select auth.uid())
    )
    and not exists (
      select 1 from public.project_members pm
      where pm.project_id = join_requests.project_id and pm.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can cancel own pending requests" on public.join_requests;
create policy "Users can cancel own pending requests"
  on public.join_requests for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'pending');

-- Replace the old owner profile view (which ran with its creator's privileges)
-- with a narrowly scoped function that returns only public identity and skills.
drop view if exists public.project_owner_profiles;

revoke all on public.project_members from public, anon, authenticated;
grant select, delete on public.project_members to authenticated;
revoke all on public.join_requests from public, anon, authenticated;
grant select, insert, delete on public.join_requests to authenticated;

create or replace function public.accept_project_join_request(target_request_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_project_id uuid;
  request_user_id uuid;
  request_status text;
  project_owner_id uuid;
  member_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select jr.project_id into request_project_id
  from public.join_requests jr where jr.id = target_request_id;
  if not found then raise exception 'Request not found'; end if;

  -- Serializes acceptances for the same project while enforcing the ten person cap.
  select p.owner_id into project_owner_id
  from public.projects p where p.id = request_project_id for update;
  if not found or project_owner_id <> auth.uid() then raise exception 'Not project owner'; end if;

  select jr.user_id, jr.status into request_user_id, request_status
  from public.join_requests jr
  where jr.id = target_request_id and jr.project_id = request_project_id
  for update;
  if not found then raise exception 'Request not found'; end if;
  if request_status = 'accepted' then return 'accepted'; end if;
  if request_status <> 'pending' then raise exception 'Request is no longer pending'; end if;

  select 1 + count(*) into member_count
  from public.project_members pm
  where pm.project_id = request_project_id;

  if not exists (
    select 1 from public.project_members pm
    where pm.project_id = request_project_id and pm.user_id = request_user_id
  ) and member_count >= 10 then
    return 'full';
  end if;

  insert into public.project_members (project_id, user_id)
  values (request_project_id, request_user_id)
  on conflict (project_id, user_id) do nothing;

  update public.join_requests set status = 'accepted'
  where id = target_request_id;

  return 'accepted';
end;
$$;

create or replace function public.decline_project_join_request(target_request_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_project_id uuid;
  request_status text;
  project_owner_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select jr.project_id into request_project_id
  from public.join_requests jr where jr.id = target_request_id;
  if not found then raise exception 'Request not found'; end if;

  select p.owner_id into project_owner_id
  from public.projects p where p.id = request_project_id for update;
  if not found or project_owner_id <> auth.uid() then raise exception 'Not project owner'; end if;

  select jr.status into request_status
  from public.join_requests jr
  where jr.id = target_request_id and jr.project_id = request_project_id
  for update;
  if not found then raise exception 'Request not found'; end if;
  if request_status = 'rejected' then return 'rejected'; end if;
  if request_status <> 'pending' then raise exception 'Request is no longer pending'; end if;

  update public.join_requests set status = 'rejected'
  where id = target_request_id;
  return 'rejected';
end;
$$;

create or replace function public.get_visible_project_profiles(target_profile_ids uuid[])
returns table (
  profile_id uuid,
  username text,
  display_name text,
  skill_id uuid,
  skill_slug text,
  skill_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.display_name, s.id, s.slug, s.name
  from public.profiles p
  left join public.profile_skills ps on ps.profile_id = p.id
  left join public.skills s on s.id = ps.skill_id
  where auth.uid() is not null
    and p.id = any(coalesce(target_profile_ids, array[]::uuid[]))
    and (
      p.id = auth.uid()
      or exists (select 1 from public.projects owner_project where owner_project.owner_id = p.id)
      or exists (
        select 1 from public.project_members pm
        where pm.user_id = p.id
      )
      or exists (
        select 1 from public.join_requests jr
        join public.projects request_project on request_project.id = jr.project_id
        where jr.user_id = p.id and jr.status = 'pending'
          and request_project.owner_id = auth.uid()
      )
    )
  order by p.display_name, s.sort_order, s.name;
$$;

revoke all on function public.accept_project_join_request(uuid) from public, anon;
grant execute on function public.accept_project_join_request(uuid) to authenticated;
revoke all on function public.decline_project_join_request(uuid) from public, anon;
grant execute on function public.decline_project_join_request(uuid) to authenticated;
revoke all on function public.get_visible_project_profiles(uuid[]) from public, anon;
grant execute on function public.get_visible_project_profiles(uuid[]) to authenticated;
