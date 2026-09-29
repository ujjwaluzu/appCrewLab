-- Profile constraints, database-enforced onboarding, and join application throttling.
-- This migration intentionally stops before changing any existing profile data.

do $$
begin
  if exists (
    select 1 from public.profiles
    where char_length(btrim(display_name)) > 80
       or (onboarding_completed and char_length(btrim(display_name)) < 1)
  ) then
    raise exception 'Cannot add profile constraints: profiles.display_name contains values outside the allowed range. Review affected rows and correct them manually before retrying.';
  end if;

  if exists (
    select 1 from public.profiles
    where (username is not null and username !~ '^[A-Za-z0-9_]{3,24}$')
       or (onboarding_completed and username is null)
  ) then
    raise exception 'Cannot add profile constraints: profiles.username contains invalid or missing values for completed profiles. Review affected rows and correct them manually before retrying.';
  end if;

  if exists (
    select 1 from public.profiles
    where bio is not null and char_length(bio) > 160
  ) then
    raise exception 'Cannot add profile constraints: profiles.bio contains values longer than 160 characters. Review affected rows and correct them manually before retrying.';
  end if;

  if exists (
    select 1 from public.profiles
    where cardinality(intents) > 4
       or not (intents <@ array['idea', 'join', 'collaborators', 'portfolio']::text[])
  ) then
    raise exception 'Cannot add profile constraints: profiles.intents contains unsupported or excessive values. Review affected rows and correct them manually before retrying.';
  end if;
end;
$$;

alter table public.profiles
  add constraint profiles_display_name_length_check
    check (char_length(btrim(display_name)) <= 80 and (not onboarding_completed or char_length(btrim(display_name)) >= 1)),
  add constraint profiles_username_format_check
    check ((username is null or username ~ '^[A-Za-z0-9_]{3,24}$') and (not onboarding_completed or username is not null)),
  add constraint profiles_bio_length_check
    check (bio is null or char_length(bio) <= 160),
  add constraint profiles_intents_valid_check
    check (cardinality(intents) <= 4 and intents <@ array['idea', 'join', 'collaborators', 'portfolio']::text[]);

-- Keep self-service profile writes, but make onboarding_completed system-managed.
revoke insert, update on public.profiles from public, anon, authenticated;
revoke insert (onboarding_completed), update (onboarding_completed)
  on public.profiles from public, anon, authenticated;
grant insert (id, username, display_name, bio, intents) on public.profiles to authenticated;
grant update (id, username, display_name, bio, intents) on public.profiles to authenticated;

create or replace function public.has_completed_onboarding()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.onboarding_completed = true
  );
$$;

revoke all on function public.has_completed_onboarding() from public, anon;
grant execute on function public.has_completed_onboarding() to authenticated;

create or replace function public.complete_profile_onboarding(selected_intents text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  distinct_intent_count integer;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select count(distinct intent_value) into distinct_intent_count
  from unnest(coalesce(selected_intents, array[]::text[])) as selected_intents_table(intent_value);

  if coalesce(cardinality(selected_intents), 0) not between 1 and 4
     or distinct_intent_count <> cardinality(selected_intents)
     or not (selected_intents <@ array['idea', 'join', 'collaborators', 'portfolio']::text[]) then
    raise exception using errcode = '22023', message = 'Invalid onboarding interests';
  end if;

  update public.profiles p
  set intents = selected_intents, onboarding_completed = true
  where p.id = auth.uid()
    and char_length(btrim(p.display_name)) between 1 and 80
    and p.username is not null
    and p.username ~ '^[A-Za-z0-9_]{3,24}$'
    and (p.bio is null or char_length(p.bio) <= 160)
    and exists (select 1 from public.profile_skills ps where ps.profile_id = p.id);

  if not found then
    raise exception using errcode = 'P0001', message = 'onboarding_profile_incomplete';
  end if;
end;
$$;

revoke all on function public.complete_profile_onboarding(text[]) from public, anon;
grant execute on function public.complete_profile_onboarding(text[]) to authenticated;

-- A private, single-row setting lets operators tune the rate without changing
-- the RPC. The per-user bucket stores no application text or request history.
create table if not exists public.join_application_rate_limit_config (
  singleton boolean primary key default true check (singleton),
  max_submissions integer not null check (max_submissions between 1 and 50),
  window_seconds integer not null check (window_seconds between 60 and 86400)
);

insert into public.join_application_rate_limit_config (singleton, max_submissions, window_seconds)
values (true, 5, 900)
on conflict (singleton) do nothing;

alter table public.join_application_rate_limit_config enable row level security;
revoke all on public.join_application_rate_limit_config from public, anon, authenticated;

create table if not exists public.join_application_rate_limits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  submission_times timestamptz[] not null default array[]::timestamptz[],
  constraint join_application_rate_limits_count_check check (cardinality(submission_times) <= 50)
);

alter table public.join_application_rate_limits enable row level security;
revoke all on public.join_application_rate_limits from public, anon, authenticated;

-- All conditions are checked here because SECURITY DEFINER bypasses table RLS.
-- Locking the per-user bucket row makes concurrent attempts serialize.
create or replace function public.submit_project_join_application(
  target_project_id uuid,
  application_motivation text,
  application_contribution text,
  application_availability text,
  application_additional_information text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  applicant_id uuid := auth.uid();
  project_owner_id uuid;
  request_id uuid;
  now_at timestamptz := clock_timestamp();
  max_submissions integer;
  window_seconds integer;
  recent_submission_times timestamptz[];
begin
  if applicant_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if not public.has_completed_onboarding() then
    raise exception using errcode = '42501', message = 'onboarding_required';
  end if;

  if char_length(btrim(coalesce(application_motivation, ''))) not between 1 and 500
     or char_length(btrim(coalesce(application_contribution, ''))) not between 1 and 500
     or application_availability is null
     or application_availability not in ('A few hours a week', '5–10 hours a week', '10–20 hours a week', '20+ hours a week', 'Flexible / depends on the project')
     or (application_additional_information is not null and char_length(application_additional_information) > 500) then
    raise exception using errcode = '22023', message = 'Invalid application';
  end if;

  select p.owner_id into project_owner_id
  from public.projects p
  where p.id = target_project_id
  for key share;

  if not found or project_owner_id = applicant_id
     or exists (
       select 1 from public.project_members pm
       where pm.project_id = target_project_id and pm.user_id = applicant_id
     ) then
    raise exception using errcode = '42501', message = 'application_not_allowed';
  end if;

  select c.max_submissions, c.window_seconds
  into max_submissions, window_seconds
  from public.join_application_rate_limit_config c
  where c.singleton = true;

  if not found then
    raise exception using errcode = 'P0001', message = 'application_submission_unavailable';
  end if;

  insert into public.join_application_rate_limits (user_id)
  values (applicant_id)
  on conflict (user_id) do nothing;

  select l.submission_times into recent_submission_times
  from public.join_application_rate_limits l
  where l.user_id = applicant_id
  for update;

  select coalesce(array_agg(submitted_at order by submitted_at), array[]::timestamptz[])
  into recent_submission_times
  from unnest(recent_submission_times) as previous_submissions(submitted_at)
  where submitted_at > now_at - make_interval(secs => window_seconds);

  if cardinality(recent_submission_times) >= max_submissions then
    raise exception using errcode = 'P0001', message = 'application_rate_limited';
  end if;

  recent_submission_times := array_append(recent_submission_times, now_at);
  update public.join_application_rate_limits l
  set submission_times = recent_submission_times
  where l.user_id = applicant_id;

  insert into public.join_requests (
    project_id, user_id, motivation, contribution, availability, additional_information
  ) values (
    target_project_id, applicant_id, btrim(application_motivation), btrim(application_contribution),
    application_availability, nullif(btrim(application_additional_information), '')
  ) returning id into request_id;

  return request_id;
end;
$$;

revoke all on function public.submit_project_join_application(uuid, text, text, text, text) from public, anon;
grant execute on function public.submit_project_join_application(uuid, text, text, text, text) to authenticated;

-- Remove the previous direct insert path so every new application is throttled.
revoke insert on public.join_requests from public, anon, authenticated;
revoke insert (project_id, user_id, motivation, contribution, availability, additional_information)
  on public.join_requests from public, anon, authenticated;

-- Apply onboarding requirements to direct table operations as well as RPC calls.
drop policy if exists "Users can create projects they own" on public.projects;
create policy "Users can create projects they own"
  on public.projects for insert to authenticated
  with check (owner_id = auth.uid() and public.has_completed_onboarding());

drop policy if exists "Owners can update their projects" on public.projects;
create policy "Owners can update their projects"
  on public.projects for update to authenticated
  using (owner_id = auth.uid() and public.has_completed_onboarding())
  with check (owner_id = auth.uid() and public.has_completed_onboarding());

drop policy if exists "Owners can delete their projects" on public.projects;
create policy "Owners can delete their projects"
  on public.projects for delete to authenticated
  using (owner_id = auth.uid() and public.has_completed_onboarding());

drop policy if exists "Owners can add project skills" on public.project_skills;
create policy "Owners can add project skills"
  on public.project_skills for insert to authenticated
  with check (
    public.has_completed_onboarding()
    and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "Owners can remove project skills" on public.project_skills;
create policy "Owners can remove project skills"
  on public.project_skills for delete to authenticated
  using (
    public.has_completed_onboarding()
    and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "Users can request to join other projects" on public.join_requests;
create policy "Users can request to join other projects"
  on public.join_requests for insert to authenticated
  with check (
    public.has_completed_onboarding()
    and user_id = auth.uid()
    and status = 'pending'
    and exists (select 1 from public.projects p where p.id = project_id and p.owner_id <> auth.uid())
    and not exists (
      select 1 from public.project_members pm
      where pm.project_id = join_requests.project_id and pm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can cancel own pending requests" on public.join_requests;
create policy "Users can cancel own pending requests"
  on public.join_requests for delete to authenticated
  using (public.has_completed_onboarding() and user_id = auth.uid() and status = 'pending');

drop policy if exists "Members can leave or owners can remove members" on public.project_members;
create policy "Members can leave or owners can remove members"
  on public.project_members for delete to authenticated
  using (
    public.has_completed_onboarding()
    and (
      user_id = (select auth.uid())
      or exists (
        select 1 from public.projects p
        where p.id = project_id and p.owner_id = (select auth.uid()) and p.owner_id <> user_id
      )
    )
  );

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
  if not public.has_completed_onboarding() then raise exception 'Complete onboarding first'; end if;

  select jr.project_id into request_project_id from public.join_requests jr where jr.id = target_request_id;
  if not found then raise exception 'Request not found'; end if;
  select p.owner_id into project_owner_id from public.projects p where p.id = request_project_id for update;
  if not found or project_owner_id <> auth.uid() then raise exception 'Not project owner'; end if;
  select jr.user_id, jr.status into request_user_id, request_status
  from public.join_requests jr where jr.id = target_request_id and jr.project_id = request_project_id for update;
  if not found then raise exception 'Request not found'; end if;
  if request_status = 'accepted' then return 'accepted'; end if;
  if request_status <> 'pending' then raise exception 'Request is no longer pending'; end if;

  select 1 + count(*) into member_count from public.project_members pm where pm.project_id = request_project_id;
  if not exists (
    select 1 from public.project_members pm where pm.project_id = request_project_id and pm.user_id = request_user_id
  ) and member_count >= 10 then return 'full'; end if;

  insert into public.project_members (project_id, user_id)
  values (request_project_id, request_user_id) on conflict (project_id, user_id) do nothing;
  update public.join_requests set status = 'accepted' where id = target_request_id;
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
  if not public.has_completed_onboarding() then raise exception 'Complete onboarding first'; end if;

  select jr.project_id into request_project_id from public.join_requests jr where jr.id = target_request_id;
  if not found then raise exception 'Request not found'; end if;
  select p.owner_id into project_owner_id from public.projects p where p.id = request_project_id for update;
  if not found or project_owner_id <> auth.uid() then raise exception 'Not project owner'; end if;
  select jr.status into request_status
  from public.join_requests jr where jr.id = target_request_id and jr.project_id = request_project_id for update;
  if not found then raise exception 'Request not found'; end if;
  if request_status = 'rejected' then return 'rejected'; end if;
  if request_status <> 'pending' then raise exception 'Request is no longer pending'; end if;

  update public.join_requests set status = 'rejected' where id = target_request_id;
  return 'rejected';
end;
$$;
