create table if not exists public.github_user_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  github_user_id text not null,
  github_login text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.github_user_connections enable row level security;

drop policy if exists "Users manage their own GitHub connection" on public.github_user_connections;
create policy "Users manage their own GitHub connection"
  on public.github_user_connections for all to authenticated
  using (user_id = (select auth.uid()) and public.has_completed_onboarding())
  with check (user_id = (select auth.uid()) and public.has_completed_onboarding());

revoke all on public.github_user_connections from public, anon, authenticated;
grant select, insert, update, delete on public.github_user_connections to authenticated;

create table if not exists public.project_github_installations (
  project_id uuid primary key references public.projects(id) on delete cascade,
  installation_id text not null,
  account_login text not null,
  connected_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.project_github_installations enable row level security;

drop policy if exists "Project owners manage their GitHub installation" on public.project_github_installations;
create policy "Project owners manage their GitHub installation"
  on public.project_github_installations for all to authenticated
  using (
    public.has_completed_onboarding()
    and connected_by = (select auth.uid())
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

drop policy if exists "Project crew can view GitHub installation metadata" on public.project_github_installations;
create policy "Project crew can view GitHub installation metadata"
  on public.project_github_installations for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_github_installations.project_id
        and (
          p.owner_id = (select auth.uid())
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = (select auth.uid())
          )
        )
    )
  );

revoke all on public.project_github_installations from public, anon, authenticated;
grant select, insert, update, delete on public.project_github_installations to authenticated;

create table if not exists public.project_github_repositories (
  project_id uuid primary key references public.projects(id) on delete cascade,
  installation_id text not null,
  repository_id text not null,
  full_name text not null,
  html_url text not null,
  is_private boolean not null,
  default_branch text not null,
  connected_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_github_repositories_full_name_check check (full_name ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')
);

alter table public.project_github_repositories enable row level security;

drop policy if exists "Project crew can view linked GitHub repository details" on public.project_github_repositories;
create policy "Project crew can view linked GitHub repository details"
  on public.project_github_repositories for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_github_repositories.project_id
        and (
          p.owner_id = (select auth.uid())
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = (select auth.uid())
          )
        )
    )
  );

drop policy if exists "Project owners manage their linked GitHub repository" on public.project_github_repositories;
create policy "Project owners manage their linked GitHub repository"
  on public.project_github_repositories for all to authenticated
  using (
    public.has_completed_onboarding()
    and exists (
      select 1 from public.projects p
      where p.id = project_github_repositories.project_id and p.owner_id = (select auth.uid())
    )
  )
  with check (
    public.has_completed_onboarding()
    and connected_by = (select auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_github_repositories.project_id and p.owner_id = (select auth.uid())
    )
  );

revoke all on public.project_github_repositories from public, anon, authenticated;
grant select, insert, update, delete on public.project_github_repositories to authenticated;
