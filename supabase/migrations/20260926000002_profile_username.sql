-- Keep usernames unique regardless of letter casing for profile edits.
create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null;
