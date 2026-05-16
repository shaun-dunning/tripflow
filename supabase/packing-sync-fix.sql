-- Packing list cross-device sync fix.
-- Run this in the Supabase SQL Editor. All statements are safe to re-run.
-- ============================================================

-- Step 1 — Make sure RLS is on (idempotent)
alter table public.packing_items enable row level security;

-- Step 2 — Drop any old policy (safe if it doesn't exist)
drop policy if exists "Trip members can manage packing items" on public.packing_items;

-- Step 3 — Create the policy.
-- Grants full access to authenticated users who either:
--   (a) appear in the travelers table for that trip with their user_id linked, OR
--   (b) are the trip creator (created_by on the trips row)
create policy "Trip members can manage packing items"
on public.packing_items
for all
to authenticated
using (
  exists (
    select 1 from public.travelers t
    where t.trip_id = packing_items.trip_id
      and t.user_id = auth.uid()
  )
  or exists (
    select 1 from public.trips tr
    where tr.id = packing_items.trip_id
      and tr.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.travelers t
    where t.trip_id = packing_items.trip_id
      and t.user_id = auth.uid()
  )
  or exists (
    select 1 from public.trips tr
    where tr.id = packing_items.trip_id
      and tr.created_by = auth.uid()
  )
);

-- Step 4 — Diagnostic: confirm the policy is in place
select schemaname, tablename, policyname, cmd, qual
from pg_policies
where tablename = 'packing_items';

-- Step 5 — Diagnostic: check your membership for the active trip
-- (replace 'YOUR-TRIP-ID' with the actual trip UUID if you want to test)
-- select t.user_id, t.name, t.status, tr.title
-- from public.travelers t
-- join public.trips tr on tr.id = t.trip_id
-- where t.user_id = auth.uid();
