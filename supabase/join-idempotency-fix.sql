-- Daywave invite/member idempotency fix.
-- Run this in Supabase SQL Editor to remove duplicate joined travelers and make
-- future invite joins safe to retry.

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

notify pgrst, 'reload schema';
