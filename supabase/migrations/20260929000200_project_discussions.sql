create table if not exists public.project_discussion_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists project_discussion_posts_project_created_idx
  on public.project_discussion_posts (project_id, created_at desc);

alter table public.project_discussion_posts enable row level security;

drop policy if exists "Project members can read discussion posts" on public.project_discussion_posts;
create policy "Project members can read discussion posts"
  on public.project_discussion_posts for select to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_discussion_posts.project_id
        and (
          p.owner_id = (select auth.uid())
          or exists (
            select 1
            from public.project_members pm
            where pm.project_id = project_discussion_posts.project_id
              and pm.user_id = (select auth.uid())
          )
        )
    )
  );

drop policy if exists "Onboarded project members can post to discussions" on public.project_discussion_posts;
create policy "Onboarded project members can post to discussions"
  on public.project_discussion_posts for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.onboarding_completed
    )
    and exists (
      select 1
      from public.projects p
      where p.id = project_discussion_posts.project_id
        and (
          p.owner_id = (select auth.uid())
          or exists (
            select 1
            from public.project_members pm
            where pm.project_id = project_discussion_posts.project_id
              and pm.user_id = (select auth.uid())
          )
        )
    )
  );

revoke all on public.project_discussion_posts from public, anon, authenticated;
grant select on public.project_discussion_posts to authenticated;
grant insert (project_id, body) on public.project_discussion_posts to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'The Supabase Realtime publication is missing.';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_discussion_posts'
  ) then
    alter publication supabase_realtime add table public.project_discussion_posts;
  end if;
end
$$;
