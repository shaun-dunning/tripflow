-- TripFlow membership and trip privacy policies.
-- Run this in Supabase SQL Editor after the base schema is installed.

-- Helper avoids recursive RLS checks when policies need to know whether the
-- current auth user is already attached to a trip.
create or replace function public.is_trip_member(target_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.travelers
    where trip_id = target_trip_id
      and user_id = auth.uid()
  );
$$;

grant execute on function public.is_trip_member(uuid) to authenticated;

create or replace function public.get_trip_invite(target_invite_code text)
returns table (
  id uuid,
  title text,
  destination text,
  start_date date,
  end_date date,
  cover_photo text,
  invite_code text
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.title, t.destination, t.start_date, t.end_date, t.cover_photo, t.invite_code
  from public.trips t
  where upper(t.invite_code) = upper(target_invite_code)
  limit 1;
$$;

grant execute on function public.get_trip_invite(text) to anon, authenticated;

alter table public.trips add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.trips enable row level security;

drop policy if exists "Trip creators can create trips" on public.trips;
create policy "Trip creators can create trips"
on public.trips
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "Trip members can read trips" on public.trips;
create policy "Trip members can read trips"
on public.trips
for select
to authenticated
using (created_by = auth.uid() or public.is_trip_member(id));

drop policy if exists "Trip members can update trips" on public.trips;
create policy "Trip members can update trips"
on public.trips
for update
to authenticated
using (created_by = auth.uid() or public.is_trip_member(id))
with check (created_by = auth.uid() or public.is_trip_member(id));

alter table public.travelers enable row level security;

drop policy if exists "Travelers can read their trip crew" on public.travelers;
create policy "Travelers can read their trip crew"
on public.travelers
for select
to authenticated
using (user_id = auth.uid() or public.is_trip_member(trip_id));

drop policy if exists "Invitees can join as themselves" on public.travelers;
create policy "Invitees can join as themselves"
on public.travelers
for insert
to authenticated
with check (
  (user_id = auth.uid() and status = 'active')
  or (user_id is null and public.is_trip_member(trip_id))
);

drop policy if exists "Travelers can update their own profile" on public.travelers;
create policy "Travelers can update their own profile"
on public.travelers
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Trip members can remove invited travelers" on public.travelers;
create policy "Trip members can remove invited travelers"
on public.travelers
for delete
to authenticated
using (public.is_trip_member(trip_id));

alter table public.messages enable row level security;

drop policy if exists "Trip members can read messages" on public.messages;
create policy "Trip members can read messages"
on public.messages
for select
to authenticated
using (public.is_trip_member(trip_id));

drop policy if exists "Trip members can send messages" on public.messages;
create policy "Trip members can send messages"
on public.messages
for insert
to authenticated
with check (
  public.is_trip_member(trip_id)
  and (sender_user_id is null or sender_user_id = auth.uid())
);

alter table public.documents enable row level security;

drop policy if exists "Trip members can read documents" on public.documents;
create policy "Trip members can read documents"
on public.documents
for select
to authenticated
using (public.is_trip_member(trip_id));

drop policy if exists "Trip members can manage documents" on public.documents;
create policy "Trip members can manage documents"
on public.documents
for all
to authenticated
using (public.is_trip_member(trip_id))
with check (public.is_trip_member(trip_id));

alter table public.trip_days enable row level security;

drop policy if exists "Trip members can read trip days" on public.trip_days;
create policy "Trip members can read trip days"
on public.trip_days
for select
to authenticated
using (public.is_trip_member(trip_id));

drop policy if exists "Trip members can update trip days" on public.trip_days;
create policy "Trip members can update trip days"
on public.trip_days
for update
to authenticated
using (public.is_trip_member(trip_id))
with check (public.is_trip_member(trip_id));

alter table public.agenda_items enable row level security;

drop policy if exists "Trip members can read agenda items" on public.agenda_items;
create policy "Trip members can read agenda items"
on public.agenda_items
for select
to authenticated
using (
  exists (
    select 1
    from public.trip_days td
    where td.id = agenda_items.trip_day_id
      and public.is_trip_member(td.trip_id)
  )
);

drop policy if exists "Trip members can manage agenda items" on public.agenda_items;
create policy "Trip members can manage agenda items"
on public.agenda_items
for all
to authenticated
using (
  exists (
    select 1
    from public.trip_days td
    where td.id = agenda_items.trip_day_id
      and public.is_trip_member(td.trip_id)
  )
)
with check (
  exists (
    select 1
    from public.trip_days td
    where td.id = agenda_items.trip_day_id
      and public.is_trip_member(td.trip_id)
  )
);

do $$
begin
  if to_regclass('public.packing_items') is not null then
    alter table public.packing_items enable row level security;

    drop policy if exists "Trip members can manage packing items" on public.packing_items;
    create policy "Trip members can manage packing items"
    on public.packing_items
    for all
    to authenticated
    using (public.is_trip_member(trip_id))
    with check (public.is_trip_member(trip_id));
  end if;
end $$;
