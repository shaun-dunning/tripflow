-- Content reports — stores flag/block events for developer review
create table if not exists public.content_reports (
  id                 uuid primary key default gen_random_uuid(),
  reporter_user_id   uuid not null references auth.users(id) on delete cascade,
  reported_user_id   uuid references auth.users(id) on delete set null,
  message_id         uuid,
  trip_id            uuid references public.trips(id) on delete cascade,
  reason             text not null default 'objectionable_content',
  content_preview    text,
  created_at         timestamptz not null default now()
);

alter table public.content_reports enable row level security;

create policy "users can file reports"
  on public.content_reports
  for insert
  with check (auth.uid() = reporter_user_id);

create policy "service role reads all reports"
  on public.content_reports
  for select
  using (auth.role() = 'service_role');

-- Blocked users — per-user block list; messages from blocked users are hidden
create table if not exists public.blocked_users (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  blocked_user_id  uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  unique (user_id, blocked_user_id)
);

alter table public.blocked_users enable row level security;

create policy "users manage own blocks"
  on public.blocked_users
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
