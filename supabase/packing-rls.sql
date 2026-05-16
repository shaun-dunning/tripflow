-- Fix packing list cross-device sync.
-- Run this in the Supabase SQL Editor (safe to re-run — all statements are idempotent).

alter table public.packing_items enable row level security;

drop policy if exists "Trip members can manage packing items" on public.packing_items;
create policy "Trip members can manage packing items"
on public.packing_items
for all
to authenticated
using  (public.is_trip_member(trip_id))
with check (public.is_trip_member(trip_id));
