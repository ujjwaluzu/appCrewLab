-- Keep GitHub connection ciphertext and verified repository links behind the
-- server-only Supabase service role. Authenticated browser sessions may still
-- read safe metadata allowed by RLS, but cannot call token RPCs or write ids
-- that the server later uses with the GitHub App.

-- Existing links predate the server-only write boundary and cannot be
-- distinguished from rows written directly through PostgREST. Require owners
-- to re-select those repositories through the verified server route once.
alter table public.project_github_repositories
  add column if not exists server_verified_at timestamptz;

revoke insert, update, delete on public.project_github_installations from public, anon, authenticated;
revoke insert, update, delete on public.project_github_repositories from public, anon, authenticated;
grant select on public.project_github_installations to authenticated;
grant select on public.project_github_repositories to authenticated;
grant all privileges on public.project_github_installations to service_role;
grant all privileges on public.project_github_repositories to service_role;
grant all privileges on public.github_user_connections to service_role;

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
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Server authorization required';
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
  prior_refresh_token text;
  prior_refresh_expires_at timestamptz;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Server authorization required';
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
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Server authorization required';
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

create or replace function public.github_delete_user_connection(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Server authorization required';
  end if;

  delete from public.github_user_connections c where c.user_id = target_user_id;
  return found;
end;
$$;

revoke all on function public.github_user_connection_tokens(uuid) from public, anon, authenticated;
revoke all on function public.github_upsert_user_connection(uuid, text, text, text, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.github_apply_refreshed_token(uuid, bigint, text, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.github_delete_user_connection(uuid) from public, anon, authenticated;

grant execute on function public.github_user_connection_tokens(uuid) to service_role;
grant execute on function public.github_upsert_user_connection(uuid, text, text, text, text, timestamptz, timestamptz) to service_role;
grant execute on function public.github_apply_refreshed_token(uuid, bigint, text, text, timestamptz, timestamptz) to service_role;
grant execute on function public.github_delete_user_connection(uuid) to service_role;
