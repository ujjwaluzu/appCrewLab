-- Harden github_user_connections and repair the installation upsert policy.
--
-- 1. The `authenticated` role could SELECT every column of github_user_connections,
--    which let any signed-in browser pull another account's AES-GCM ciphertext for
--    its own row through PostgREST. Token columns are no longer granted; they are
--    reachable only through SECURITY DEFINER functions that re-check auth.uid().
-- 2. Every read and write of github_user_connections now goes through those
--    functions, so direct INSERT/UPDATE/DELETE privileges are revoked too. That
--    also stops a browser from writing arbitrary ciphertext into its own row.
-- 3. "Project owners manage their GitHub installation" was a FOR ALL policy whose
--    USING clause required connected_by = auth.uid(). Both install call sites
--    write with INSERT ... ON CONFLICT DO UPDATE on project_id, so re-pointing a
--    project at a different installation failed the UPDATE check against the row
--    written by the previous user. Splitting insert/update/delete and dropping
--    connected_by from the UPDATE USING clause keeps ownership as the real
--    boundary while letting the current owner re-link.

alter table public.github_user_connections
  add column if not exists token_version bigint not null default 0;

-- Non-sensitive columns stay directly readable so server routes can render the
-- connected login without a round trip through a definer function.
revoke all on public.github_user_connections from public, anon, authenticated;
grant select (user_id, github_user_id, github_login, created_at, updated_at)
  on public.github_user_connections to authenticated;

-- Reads the caller's own token ciphertexts for server-side refresh.
-- SECURITY DEFINER bypasses RLS, so auth.uid() is re-checked here.
create or replace function public.github_user_connection_tokens(target_user_id uuid)
returns table (
  user_id uuid,
  access_token_encrypted text,
  refresh_token_encrypted text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  token_version bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or caller_id <> target_user_id then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  return query
    select c.user_id,
           c.access_token_encrypted,
           c.refresh_token_encrypted,
           c.access_token_expires_at,
           c.refresh_token_expires_at,
           c.token_version
      from public.github_user_connections c
     where c.user_id = target_user_id;
end;
$$;

revoke all on function public.github_user_connection_tokens(uuid) from public, anon;
grant execute on function public.github_user_connection_tokens(uuid) to authenticated;

-- Stores a completed OAuth exchange. The row is locked before the prior refresh
-- token is read so that two overlapping reconnects cannot interleave, and an
-- absent refresh token keeps the stored one instead of erasing a token that is
-- still valid for six months.
create or replace function public.github_upsert_user_connection(
  target_user_id uuid,
  github_user_id text,
  github_login text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  prior_refresh_token text;
  prior_refresh_expires_at timestamptz;
begin
  if caller_id is null or caller_id <> target_user_id then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if not public.has_completed_onboarding() then
    raise exception using errcode = '42501', message = 'onboarding_required';
  end if;

  select c.refresh_token_encrypted, c.refresh_token_expires_at
    into prior_refresh_token, prior_refresh_expires_at
    from public.github_user_connections c
   where c.user_id = target_user_id
     for update;

  insert into public.github_user_connections as c (
    user_id,
    github_user_id,
    github_login,
    access_token_encrypted,
    refresh_token_encrypted,
    access_token_expires_at,
    refresh_token_expires_at,
    token_version,
    updated_at
  ) values (
    target_user_id,
    github_user_id,
    github_login,
    access_token_encrypted,
    coalesce(refresh_token_encrypted, prior_refresh_token),
    access_token_expires_at,
    coalesce(refresh_token_expires_at, prior_refresh_expires_at),
    1,
    now()
  )
  on conflict (user_id) do update set
    github_user_id = excluded.github_user_id,
    github_login = excluded.github_login,
    access_token_encrypted = excluded.access_token_encrypted,
    refresh_token_encrypted = excluded.refresh_token_encrypted,
    access_token_expires_at = excluded.access_token_expires_at,
    refresh_token_expires_at = excluded.refresh_token_expires_at,
    token_version = c.token_version + 1,
    updated_at = now();
end;
$$;

revoke all on function public.github_upsert_user_connection(uuid, text, text, text, text, timestamptz, timestamptz) from public, anon;
grant execute on function public.github_upsert_user_connection(uuid, text, text, text, text, timestamptz, timestamptz) to authenticated;

-- Commits a refreshed token pair under optimistic locking. Returns false when
-- another writer already rotated the row, which is how a losing request in a
-- multi-instance deployment learns to re-read instead of reporting a stale
-- "reauthorize" state. Absent refresh fields keep their stored values, matching
-- the behaviour of the initial authorization exchange.
create or replace function public.github_apply_refreshed_token(
  target_user_id uuid,
  expected_token_version bigint,
  new_access_token_encrypted text,
  new_refresh_token_encrypted text,
  new_access_token_expires_at timestamptz,
  new_refresh_token_expires_at timestamptz
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or caller_id <> target_user_id then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  update public.github_user_connections c
     set access_token_encrypted = new_access_token_encrypted,
         refresh_token_encrypted = coalesce(new_refresh_token_encrypted, c.refresh_token_encrypted),
         access_token_expires_at = new_access_token_expires_at,
         refresh_token_expires_at = coalesce(new_refresh_token_expires_at, c.refresh_token_expires_at),
         token_version = c.token_version + 1,
         updated_at = now()
   where c.user_id = target_user_id
     and c.token_version = expected_token_version;

  return found;
end;
$$;

revoke all on function public.github_apply_refreshed_token(uuid, bigint, text, text, timestamptz, timestamptz) from public, anon;
grant execute on function public.github_apply_refreshed_token(uuid, bigint, text, text, timestamptz, timestamptz) to authenticated;

-- Drops the caller's connection row. Returns false when there was nothing to
-- remove so the route can skip the GitHub-side revocation call.
create or replace function public.github_delete_user_connection(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or caller_id <> target_user_id then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  delete from public.github_user_connections c where c.user_id = target_user_id;
  return found;
end;
$$;

revoke all on function public.github_delete_user_connection(uuid) from public, anon;
grant execute on function public.github_delete_user_connection(uuid) to authenticated;

drop policy if exists "Project owners manage their GitHub installation" on public.project_github_installations;

create policy "Project owners add their GitHub installation"
  on public.project_github_installations for insert to authenticated
  with check (
    public.has_completed_onboarding()
    and connected_by = (select auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_github_installations.project_id and p.owner_id = (select auth.uid())
    )
  );

-- connected_by is intentionally absent from USING. It records who last wrote the
-- row, not who may replace it, and requiring it here made re-linking impossible
-- for any owner other than the previous connector.
create policy "Project owners update their GitHub installation"
  on public.project_github_installations for update to authenticated
  using (
    public.has_completed_onboarding()
    and exists (
      select 1 from public.projects p
      where p.id = project_github_installations.project_id and p.owner_id = (select auth.uid())
    )
  )
  with check (
    public.has_completed_onboarding()
    and connected_by = (select auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_github_installations.project_id and p.owner_id = (select auth.uid())
    )
  );

create policy "Project owners remove their GitHub installation"
  on public.project_github_installations for delete to authenticated
  using (
    public.has_completed_onboarding()
    and exists (
      select 1 from public.projects p
      where p.id = project_github_installations.project_id and p.owner_id = (select auth.uid())
    )
  );