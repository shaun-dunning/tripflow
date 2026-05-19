create table if not exists public.device_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  trip_id     uuid references public.trips(id) on delete cascade,
  token       text not null,
  platform    text not null default 'ios',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, token)
);

alter table public.device_tokens enable row level security;

-- Users can only manage their own tokens
create policy "users manage own tokens"
  on public.device_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role can read all tokens (for scheduler)
create policy "service role reads all tokens"
  on public.device_tokens
  for select
  using (auth.role() = 'service_role');
