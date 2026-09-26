create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null default '',
  bio text,
  intents text[] not null default '{}',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0
);

create table if not exists public.profile_skills (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, skill_id)
);

insert into public.skills (slug, name, sort_order) values
  ('frontend', 'Frontend', 1),
  ('backend', 'Backend', 2),
  ('full-stack', 'Full Stack', 3),
  ('ui-ux', 'UI/UX', 4),
  ('mobile', 'Mobile', 5),
  ('ai-ml', 'AI / ML', 6),
  ('devops', 'DevOps', 7),
  ('cybersecurity', 'Cybersecurity', 8),
  ('data', 'Data', 9),
  ('product', 'Product', 10)
on conflict (slug) do nothing;

alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.profile_skills enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Anyone can read available skills" on public.skills;
create policy "Anyone can read available skills"
  on public.skills for select
  using (true);

drop policy if exists "Users can read their own profile skills" on public.profile_skills;
create policy "Users can read their own profile skills"
  on public.profile_skills for select
  using (auth.uid() = profile_id);

drop policy if exists "Users can add their own profile skills" on public.profile_skills;
create policy "Users can add their own profile skills"
  on public.profile_skills for insert
  with check (auth.uid() = profile_id);

drop policy if exists "Users can remove their own profile skills" on public.profile_skills;
create policy "Users can remove their own profile skills"
  on public.profile_skills for delete
  using (auth.uid() = profile_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
