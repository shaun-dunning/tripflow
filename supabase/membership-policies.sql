-- Daywave membership and trip privacy policies.
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

with ranked as (
  select
    id,
    row_number() over (partition by trip_id, user_id order by created_at asc, id asc) as row_number
  from public.travelers
  where user_id is not null
)
delete from public.travelers traveler
using ranked
where traveler.id = ranked.id
  and ranked.row_number > 1;

create unique index if not exists travelers_one_user_per_trip_idx
on public.travelers (trip_id, user_id)
where user_id is not null;

create or replace function public.join_trip_by_invite(
  target_invite_code text,
  traveler_name text,
  traveler_avatar text default '🧑'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_trip_id uuid;
  joiner_id uuid;
  clean_name text;
  clean_avatar text;
  existing_traveler_id uuid;
  claimed_traveler_id uuid;
begin
  joiner_id := auth.uid();
  if joiner_id is null then
    raise exception 'You must be signed in to join a trip.';
  end if;

  select t.id
  into target_trip_id
  from public.trips t
  where upper(t.invite_code) = upper(target_invite_code)
  limit 1;

  if target_trip_id is null then
    raise exception 'Invite not found.';
  end if;

  clean_name := coalesce(
    nullif(trim(traveler_name), ''),
    nullif(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1), ''),
    'Traveler'
  );
  clean_avatar := coalesce(nullif(traveler_avatar, ''), '🧑');

  select traveler.id
  into existing_traveler_id
  from public.travelers traveler
  where traveler.trip_id = target_trip_id
    and traveler.user_id = joiner_id
  order by traveler.created_at asc, traveler.id asc
  limit 1;

  if existing_traveler_id is not null then
    update public.travelers
    set
      name = clean_name,
      avatar = clean_avatar,
      status = 'active'
    where id = existing_traveler_id;

    return target_trip_id;
  end if;

  select traveler.id
  into claimed_traveler_id
  from public.travelers traveler
  where traveler.trip_id = target_trip_id
    and traveler.user_id is null
    and lower(trim(traveler.name)) = lower(clean_name)
  order by traveler.created_at asc, traveler.id asc
  limit 1;

  if claimed_traveler_id is not null then
    update public.travelers
    set
      user_id = joiner_id,
      avatar = clean_avatar,
      role = coalesce(role, 'Co-traveler'),
      status = 'active',
      is_me = false
    where id = claimed_traveler_id;
  else
    insert into public.travelers (trip_id, user_id, name, avatar, role, status, is_me)
    values (
      target_trip_id,
      joiner_id,
      clean_name,
      clean_avatar,
      'Co-traveler',
      'active',
      false
    );
  end if;

  insert into public.messages (trip_id, sender_name, sender_avatar, sender_user_id, is_me, text)
  values (
    target_trip_id,
    'Daywave',
    '🌺',
    null,
    false,
    clean_name || ' joined the trip.'
  );

  return target_trip_id;
end;
$$;

grant execute on function public.join_trip_by_invite(text, text, text) to authenticated;

update public.messages
set sender_name = 'Daywave'
where sender_name in ('TripFlow', 'Tripflow');

with ranked_join_messages as (
  select
    id,
    row_number() over (partition by trip_id, text, sender_name order by created_at asc, id asc) as row_number
  from public.messages
  where sender_name = 'Daywave'
    and text like '% joined the trip.'
)
delete from public.messages message
using ranked_join_messages ranked
where message.id = ranked.id
  and ranked.row_number > 1;

create or replace function public.create_trip_with_organizer(
  trip_title text,
  trip_destination text,
  trip_start_date date,
  trip_end_date date,
  traveler_name text,
  traveler_avatar text,
  trip_cover_photo text default null
)
returns table (
  id uuid,
  title text,
  destination text,
  start_date date,
  end_date date,
  cover_photo text,
  invite_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_trip_id uuid;
  new_invite_code text;
  creator_id uuid;
  trip_day date;
  day_number int := 1;
begin
  creator_id := auth.uid();
  if creator_id is null then
    raise exception 'You must be signed in to create a trip.';
  end if;

  loop
    new_invite_code := upper(
      left(regexp_replace(coalesce(trip_title, 'TRIP'), '[^a-zA-Z0-9]', '', 'g'), 5)
      || substr(md5(random()::text || clock_timestamp()::text), 1, 4)
    );
    if length(new_invite_code) < 4 then
      new_invite_code := 'TRIP' || substr(md5(random()::text || clock_timestamp()::text), 1, 4);
    end if;
    exit when not exists (
      select 1
      from public.trips existing_trip
      where existing_trip.invite_code = new_invite_code
    );
  end loop;

  insert into public.trips (title, destination, start_date, end_date, invite_code, cover_photo, created_by)
  values (
    trim(trip_title),
    trim(trip_destination),
    trip_start_date,
    trip_end_date,
    new_invite_code,
    trip_cover_photo,
    creator_id
  )
  returning trips.id into new_trip_id;

  insert into public.travelers (trip_id, user_id, name, avatar, role, status, is_me)
  values (
    new_trip_id,
    creator_id,
    coalesce(nullif(trim(traveler_name), ''), 'Trip organizer'),
    coalesce(nullif(traveler_avatar, ''), '🧳'),
    'Trip Organizer',
    'active',
    true
  );

  trip_day := trip_start_date;
  while trip_day <= trip_end_date loop
    insert into public.trip_days (trip_id, day_number, date, label)
    values (
      new_trip_id,
      day_number,
      trip_day,
      'Day ' || day_number ||
        case
          when trip_day = trip_start_date then ' · Arrival day'
          when trip_day = trip_end_date then ' · Departure day'
          else ' · Open day'
        end
    )
    on conflict (trip_id, day_number) do nothing;

    trip_day := trip_day + interval '1 day';
    day_number := day_number + 1;
  end loop;

  return query
  select t.id, t.title, t.destination, t.start_date, t.end_date, t.cover_photo, t.invite_code
  from public.trips t
  where t.id = new_trip_id;
end;
$$;

grant execute on function public.create_trip_with_organizer(text, text, date, date, text, text, text) to authenticated;

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
