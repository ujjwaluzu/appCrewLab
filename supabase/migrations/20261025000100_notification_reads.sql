create table if not exists public.notification_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  join_request_id uuid not null references public.join_requests(id) on delete cascade,
  read_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, join_request_id)
);

alter table public.notification_reads enable row level security;
revoke all on public.notification_reads from public, anon, authenticated;
grant select, insert, update, delete on public.notification_reads to authenticated;

create policy "Users can read visible notification markers"
  on public.notification_reads for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.join_requests jr
      where jr.id = join_request_id
        and (
          (jr.user_id = (select auth.uid()) and jr.status <> 'pending')
          or (jr.status = 'pending' and exists (
            select 1 from public.projects p
            where p.id = jr.project_id and p.owner_id = (select auth.uid())
          ))
        )
    )
  );

create policy "Users can mark visible notifications read"
  on public.notification_reads for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.join_requests jr
      where jr.id = join_request_id
        and (
          (jr.user_id = (select auth.uid()) and jr.status <> 'pending')
          or (jr.status = 'pending' and exists (
            select 1 from public.projects p
            where p.id = jr.project_id and p.owner_id = (select auth.uid())
          ))
        )
    )
  );

create policy "Users can update visible notification markers"
  on public.notification_reads for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.join_requests jr
      where jr.id = join_request_id
        and (
          (jr.user_id = (select auth.uid()) and jr.status <> 'pending')
          or (jr.status = 'pending' and exists (
            select 1 from public.projects p
            where p.id = jr.project_id and p.owner_id = (select auth.uid())
          ))
        )
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.join_requests jr
      where jr.id = join_request_id
        and (
          (jr.user_id = (select auth.uid()) and jr.status <> 'pending')
          or (jr.status = 'pending' and exists (
            select 1 from public.projects p
            where p.id = jr.project_id and p.owner_id = (select auth.uid())
          ))
        )
    )
  );

create policy "Users can delete visible notification markers"
  on public.notification_reads for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.join_requests jr
      where jr.id = join_request_id
        and (
          (jr.user_id = (select auth.uid()) and jr.status <> 'pending')
          or (jr.status = 'pending' and exists (
            select 1 from public.projects p
            where p.id = jr.project_id and p.owner_id = (select auth.uid())
          ))
        )
    )
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'join_requests'
     ) then
    alter publication supabase_realtime add table public.join_requests;
  end if;
end;
$$;
