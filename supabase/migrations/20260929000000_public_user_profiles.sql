-- Expose only fields intended for authenticated in-app public profiles.
-- The profiles table itself remains private under its existing RLS policies.
create or replace function public.get_public_profile_by_username(target_username text)
returns table (
  profile_id uuid,
  username text,
  display_name text,
  bio text,
  intents text[],
  created_at timestamptz,
  skill_id uuid,
  skill_slug text,
  skill_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.bio, p.intents, p.created_at,
         s.id, s.slug, s.name
  from public.profiles p
  left join public.profile_skills ps on ps.profile_id = p.id
  left join public.skills s on s.id = ps.skill_id
  where auth.uid() is not null
    and p.onboarding_completed = true
    and lower(p.username) = lower(trim(target_username))
  order by s.sort_order, s.name;
$$;

revoke all on function public.get_public_profile_by_username(text) from public, anon;
grant execute on function public.get_public_profile_by_username(text) to authenticated;
