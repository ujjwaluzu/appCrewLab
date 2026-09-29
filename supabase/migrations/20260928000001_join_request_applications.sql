alter table public.join_requests
  add column if not exists motivation text,
  add column if not exists contribution text,
  add column if not exists availability text,
  add column if not exists additional_information text,
  add column if not exists application_legacy boolean not null default true;

-- Existing requests predate applications. Keep them reviewable without inventing
-- answers, while making the application fields mandatory for every new request.
alter table public.join_requests alter column application_legacy set default false;

alter table public.join_requests
  add constraint join_requests_motivation_required_length
    check (application_legacy or (motivation is not null and char_length(btrim(motivation)) between 1 and 500)),
  add constraint join_requests_contribution_required_length
    check (application_legacy or (contribution is not null and char_length(btrim(contribution)) between 1 and 500)),
  add constraint join_requests_availability_valid
    check (application_legacy or availability in ('A few hours a week', '5–10 hours a week', '10–20 hours a week', '20+ hours a week', 'Flexible / depends on the project')),
  add constraint join_requests_additional_information_length
    check (additional_information is null or char_length(additional_information) <= 500);

-- Applications are immutable to clients. New request rows can only set the
-- answers and ownership keys; status and timestamps keep their DB defaults.
revoke insert on public.join_requests from public, anon, authenticated;
grant insert (project_id, user_id, motivation, contribution, availability, additional_information)
  on public.join_requests to authenticated;
