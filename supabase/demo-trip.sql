-- ============================================================
-- Daywave anonymized demo trip
-- Paste into Supabase SQL Editor after membership-policies.sql.
--
-- This creates a separate, shareable Maui demo at /join/DEMO.
-- It intentionally uses fake names, fake confirmation numbers, and
-- non-sensitive sample trip details. It does not touch MAUI26.
-- ============================================================

begin;

-- Re-seed only the anonymized demo records. This keeps the demo clean if you
-- run the script again, while leaving your real family trip untouched.
delete from public.messages
where trip_id = 'b2c3d4e5-1111-2222-3333-444444444444'
  and sender_user_id is null;

delete from public.documents
where trip_id = 'b2c3d4e5-1111-2222-3333-444444444444';

delete from public.agenda_items
where trip_day_id in (
  select id from public.trip_days
  where trip_id = 'b2c3d4e5-1111-2222-3333-444444444444'
);

delete from public.trip_days
where trip_id = 'b2c3d4e5-1111-2222-3333-444444444444';

delete from public.travelers
where trip_id = 'b2c3d4e5-1111-2222-3333-444444444444'
  and user_id is null;

insert into public.trips (id, title, destination, start_date, end_date, invite_code, cover_photo, created_by)
values (
  'b2c3d4e5-1111-2222-3333-444444444444',
  'Maui Demo Trip',
  'Maui, Hawaii',
  '2026-06-05',
  '2026-06-11',
  'DEMO',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&h=500&fit=crop&q=85',
  null
)
on conflict (id) do update set
  title = excluded.title,
  destination = excluded.destination,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  invite_code = excluded.invite_code,
  cover_photo = excluded.cover_photo;

insert into public.travelers (id, trip_id, name, avatar, role, status, is_me, user_id) values
  ('b2c3d4e5-1111-2222-3333-000000000101', 'b2c3d4e5-1111-2222-3333-444444444444', 'Alex',  '🧑', 'Trip Organizer', 'active', true,  null),
  ('b2c3d4e5-1111-2222-3333-000000000102', 'b2c3d4e5-1111-2222-3333-444444444444', 'Jamie', '👩', 'Co-traveler',    'active', false, null),
  ('b2c3d4e5-1111-2222-3333-000000000103', 'b2c3d4e5-1111-2222-3333-444444444444', 'Riley', '👧', 'Beach crew',     'active', false, null),
  ('b2c3d4e5-1111-2222-3333-000000000104', 'b2c3d4e5-1111-2222-3333-444444444444', 'Casey', '👦', 'Snack captain',  'active', false, null);

insert into public.trip_days (id, trip_id, day_number, date, label, hero_photo, hero_alt, weather_emoji, weather_temp, weather_label, trip_note) values
  ('b2c3d4e5-1111-2222-3333-000000000201', 'b2c3d4e5-1111-2222-3333-444444444444',
   1, '2026-06-05', 'Day 1 · Arrival Day',
   'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&h=500&fit=crop&q=85', 'Airplane wing above clouds',
   '🌤️', '79°F', 'Partly cloudy · Warm evening',
   'Keep the first night easy: pick up the car, check in, and grab a casual dinner near the resort.'),

  ('b2c3d4e5-1111-2222-3333-000000000202', 'b2c3d4e5-1111-2222-3333-444444444444',
   2, '2026-06-06', 'Day 2 · Beach + Snorkel',
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&h=500&fit=crop&q=85', 'Maui beach',
   '☀️', '82°F', 'Sunny · Light breeze',
   'Beach morning, downtime after lunch, then a late afternoon snorkel sail. Reef-safe sunscreen is already packed.'),

  ('b2c3d4e5-1111-2222-3333-000000000203', 'b2c3d4e5-1111-2222-3333-444444444444',
   3, '2026-06-07', 'Day 3 · Road to Hana',
   'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&h=500&fit=crop&q=85', 'Lush tropical forest',
   '🌧️', '74°F', 'Passing showers · Bring a layer',
   'Download offline maps and leave early. The best stops are easier when the car is stocked before sunrise.'),

  ('b2c3d4e5-1111-2222-3333-000000000204', 'b2c3d4e5-1111-2222-3333-444444444444',
   4, '2026-06-08', 'Day 4 · Pool + Spa',
   'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&h=500&fit=crop&q=85', 'Spa pool',
   '⛅', '80°F', 'Mild clouds · Comfortable',
   'A slower day by design: pool time, spa appointments, and an easy sunset dinner.'),

  ('b2c3d4e5-1111-2222-3333-000000000205', 'b2c3d4e5-1111-2222-3333-444444444444',
   5, '2026-06-09', 'Day 5 · Upcountry',
   'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=900&h=500&fit=crop&q=85', 'Upcountry landscape',
   '🌤️', '76°F', 'Cooler inland · Clear afternoon',
   'Market morning, scenic stops, and room for a flexible lunch depending on energy.'),

  ('b2c3d4e5-1111-2222-3333-000000000206', 'b2c3d4e5-1111-2222-3333-444444444444',
   6, '2026-06-10', 'Day 6 · West Maui',
   'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=900&h=500&fit=crop&q=85', 'West Maui coastline',
   '☀️', '84°F', 'Hot and sunny · Great beach day',
   'Last full day: keep the morning open, then meet for dinner after sunset photos.'),

  ('b2c3d4e5-1111-2222-3333-000000000207', 'b2c3d4e5-1111-2222-3333-444444444444',
   7, '2026-06-11', 'Day 7 · Departure',
   'https://images.unsplash.com/photo-1476158085676-e67f57ed9ed7?w=900&h=500&fit=crop&q=85', 'Coastline at dusk',
   '☁️', '77°F', 'Cloudy · Travel day',
   'Check out, return the car, and leave enough airport buffer for bags and snacks.');

insert into public.agenda_items (trip_day_id, time, title, subtitle, emoji, done, is_reservation, reservation_label, sort_order) values
  ('b2c3d4e5-1111-2222-3333-000000000201', '1:00 PM',  'Pick up Hertz rental car',       'Kahului airport · Jeep Wrangler',    '🚙', false, true,  'DEMO', 20),
  ('b2c3d4e5-1111-2222-3333-000000000201', '3:00 PM',  'Check in at Maui Ocean Resort',  'Ocean-view room · bags with bell desk if early', '🏨', false, true, 'DEMO', 30),
  ('b2c3d4e5-1111-2222-3333-000000000201', '6:30 PM',  'Dinner at Monkeypod Kitchen',    'Casual arrival night · reservation held', '🍜', false, true, 'DEMO', 40),

  ('b2c3d4e5-1111-2222-3333-000000000202', '8:30 AM',  'Breakfast at the resort',        'Fuel up before the beach',           '🍳', true,  false, null, 10),
  ('b2c3d4e5-1111-2222-3333-000000000202', '10:00 AM', 'Wailea Beach morning',           'Umbrella, towels, reef-safe sunscreen', '🏖️', true, false, null, 20),
  ('b2c3d4e5-1111-2222-3333-000000000202', '12:30 PM', 'Shave ice stop',                 'Quick treat before downtime',        '🍧', false, false, null, 30),
  ('b2c3d4e5-1111-2222-3333-000000000202', '4:30 PM',  'Molokini snorkel sail',          '4 tickets · gear included',          '🤿', false, true,  'DEMO', 40),
  ('b2c3d4e5-1111-2222-3333-000000000202', '7:15 PM',  'Sunset seafood dinner',          'Reservation · party of 4',           '🐟', false, true,  'DEMO', 50),

  ('b2c3d4e5-1111-2222-3333-000000000203', '6:30 AM',  'Pack snacks + water',            'Cooler, towels, dry bag',            '🥤', false, false, null, 10),
  ('b2c3d4e5-1111-2222-3333-000000000203', '7:00 AM',  'Depart for Road to Hana',        'Leave early for lighter traffic',    '🚗', false, false, null, 20),
  ('b2c3d4e5-1111-2222-3333-000000000203', '9:30 AM',  'Waterfall stop',                 'Easy walk · good photo break',       '💧', false, false, null, 30),
  ('b2c3d4e5-1111-2222-3333-000000000203', '12:00 PM', 'Lunch at food trucks',           'Flexible stop depending on timing',  '🌮', false, false, null, 40),
  ('b2c3d4e5-1111-2222-3333-000000000203', '2:30 PM',  'Black sand beach reservation',   'Timed parking window · state park pass', '🖤', false, true, 'DEMO', 50),

  ('b2c3d4e5-1111-2222-3333-000000000204', '9:00 AM',  'Slow breakfast',                 'No alarm day',                       '🥐', false, false, null, 10),
  ('b2c3d4e5-1111-2222-3333-000000000204', '11:00 AM', 'Pool cabana',                    'Reserved · shaded seats',            '🏊', false, true,  'DEMO', 20),
  ('b2c3d4e5-1111-2222-3333-000000000204', '3:00 PM',  'Spa appointment',                '60-minute massage',                  '💆', false, true,  'DEMO', 30),
  ('b2c3d4e5-1111-2222-3333-000000000204', '6:45 PM',  'Sunset dinner',                  'Outdoor table requested',            '🌅', false, true,  'DEMO', 40),

  ('b2c3d4e5-1111-2222-3333-000000000205', '8:00 AM',  'Upcountry market',               'Breakfast, fruit, local gifts',      '🥭', false, false, null, 10),
  ('b2c3d4e5-1111-2222-3333-000000000205', '11:30 AM', 'Scenic overlook',                'Short stop before lunch',            '📸', false, false, null, 20),
  ('b2c3d4e5-1111-2222-3333-000000000205', '1:00 PM',  'Ocean Vodka farm tour',          'Adults tour · kids can grab snacks', '🍍', false, true, 'DEMO', 30),
  ('b2c3d4e5-1111-2222-3333-000000000205', '3:30 PM',  'Resort downtime',                'Pool or nap',                        '😴', false, false, null, 40),

  ('b2c3d4e5-1111-2222-3333-000000000206', '9:00 AM',  'Beach walk',                     'Coffee first, then coast path',      '🚶', false, false, null, 10),
  ('b2c3d4e5-1111-2222-3333-000000000206', '11:30 AM', 'Lunch near the beach',           'Keep it casual',                     '🍽️', false, false, null, 20),
  ('b2c3d4e5-1111-2222-3333-000000000206', '5:30 PM',  'Sunset photos',                  'Meet by the lawn',                   '📷', false, false, null, 30),
  ('b2c3d4e5-1111-2222-3333-000000000206', '6:15 PM',  'Black Rock cliff dive ceremony', 'Walk over before sunset',            '🔥', false, false, null, 40),
  ('b2c3d4e5-1111-2222-3333-000000000206', '7:30 PM',  'Old Lahaina Luau',               'Reservation · arrive 30 min early',  '🌺', false, true,  'DEMO', 50),

  ('b2c3d4e5-1111-2222-3333-000000000207', '8:00 AM',  'Pack bags',                      'Check drawers and chargers',         '🧳', false, false, null, 10),
  ('b2c3d4e5-1111-2222-3333-000000000207', '11:00 AM', 'Check out',                      'Leave bags at bell desk',            '🏨', false, true,  'DEMO', 20),
  ('b2c3d4e5-1111-2222-3333-000000000207', '1:30 PM',  'Return rental car',              'Allow extra airport buffer',         '🚙', false, true,  'DEMO', 30),
  ('b2c3d4e5-1111-2222-3333-000000000207', '4:10 PM',  'Hawaiian Airlines flight home',  'OGG → SFO · confirmation in Docs',  '✈️', false, true, 'DEMO', 40);

insert into public.documents (trip_id, category, name, provider, confirmation, date, status, notes, emoji, file_type) values
  ('b2c3d4e5-1111-2222-3333-444444444444', 'Flights',    'SFO → OGG · Hawaiian Airlines',      'Hawaiian Airlines',    'HA-DEMO-1042',  'Jun 5 · 8:15 AM',    'confirmed', 'Demo seats 12A–D · no real passenger data',        '✈️', 'pdf'),
  ('b2c3d4e5-1111-2222-3333-444444444444', 'Flights',    'OGG → SFO · Hawaiian Airlines',      'Hawaiian Airlines',    'HA-DEMO-2042',  'Jun 11 · 4:10 PM',   'confirmed', 'Demo confirmation only · airport buffer recommended', '✈️', 'pdf'),
  ('b2c3d4e5-1111-2222-3333-444444444444', 'Hotel',      'Maui Ocean Resort',                  'Demo Hotel Group',     'DEMO-HOTEL-88', 'Jun 5 – 11 · 6 nights', 'confirmed', 'Ocean-view room · anonymized booking record',       '🏨', 'booking'),
  ('b2c3d4e5-1111-2222-3333-444444444444', 'Car',        'Jeep Wrangler rental',                'Hertz',                'HZ-DEMO-19',    'Jun 5 – 11',         'confirmed', 'Pick up and return at OGG · fake reservation',       '🚙', 'booking'),
  ('b2c3d4e5-1111-2222-3333-444444444444', 'Activities', 'Molokini snorkel sail',               'Demo Ocean Tours',     'DEMO-SAIL-73',  'Jun 6 · 4:30 PM',    'confirmed', '4 sample tickets · gear included',                  '🤿', 'pdf'),
  ('b2c3d4e5-1111-2222-3333-444444444444', 'Activities', 'Road to Hana private tour',           'Demo Island Guides',   'DEMO-HANA-51',  'Jun 7 · 7:00 AM',    'confirmed', 'Pickup details anonymized · lunch included',         '🚗', 'booking'),
  ('b2c3d4e5-1111-2222-3333-444444444444', 'Activities', 'Waiʻānapanapa parking pass',          'Hawaii State Parks',   'HI-DEMO-22',    'Jun 7 · 2:30 PM',    'confirmed', 'Timed entry window · sample pass only',             '🖤', 'booking'),
  ('b2c3d4e5-1111-2222-3333-444444444444', 'Activities', 'Ocean Vodka farm tour',               'Ocean Vodka',          'OV-DEMO-45',    'Jun 9 · 1:00 PM',    'confirmed', 'Tour reservation · anonymized booking',             '🍍', 'booking'),
  ('b2c3d4e5-1111-2222-3333-444444444444', 'Dining',     'Sunset seafood dinner',               'Demo Seafood House',   'DEMO-DINE-66',  'Jun 6 · 7:15 PM',    'confirmed', 'Party of 4 · sample reservation',                   '🐟', 'screenshot'),
  ('b2c3d4e5-1111-2222-3333-444444444444', 'Dining',     'Monkeypod Kitchen Wailea',            'OpenTable',            'OT-DEMO-88',    'Jun 5 · 6:30 PM',    'confirmed', 'Arrival-night dinner · fake booking',               '🍜', 'booking'),
  ('b2c3d4e5-1111-2222-3333-444444444444', 'Dining',     'Old Lahaina Luau',                    'Old Lahaina Luau',     'OLL-DEMO-77',   'Jun 10 · 7:30 PM',   'pending',   'Confirm seating same day',                           '🌺', 'booking');

insert into public.messages (trip_id, sender_name, sender_avatar, sender_user_id, is_me, text, card_type, card_title, card_sub, card_emoji, created_at) values
  ('b2c3d4e5-1111-2222-3333-444444444444', 'Jamie', '👩', null, false, 'Beach morning first, snorkel later? That feels easiest for everyone.', null, null, null, null, '2026-06-06 09:02:00+00'),
  ('b2c3d4e5-1111-2222-3333-444444444444', 'Alex',  '🧑', null, true,  'Yes. Breakfast, beach, downtime, then the sail at 4:30.', null, null, null, null, '2026-06-06 09:08:00+00'),
  ('b2c3d4e5-1111-2222-3333-444444444444', 'Riley', '👧', null, false, 'Can we get shave ice after the beach?', null, null, null, null, '2026-06-06 09:09:00+00'),
  ('b2c3d4e5-1111-2222-3333-444444444444', 'Daywave', '🌺', null, false, null, 'reservation', 'Sunset seafood dinner', 'Tonight · 7:15 PM · Party of 4', '🐟', '2026-06-06 10:41:00+00'),
  ('b2c3d4e5-1111-2222-3333-444444444444', 'Casey', '👦', null, false, 'I vote yes on shave ice.', null, null, null, null, '2026-06-06 10:45:00+00'),
  ('b2c3d4e5-1111-2222-3333-444444444444', 'Daywave', '🌺', null, false, null, 'itinerary', 'Today''s plan', 'Beach 10:00 AM · Snorkel 4:30 PM · Dinner 7:15 PM', '📋', '2026-06-06 13:05:00+00');

do $$
begin
  if to_regclass('public.packing_items') is not null then
    delete from public.packing_items
    where trip_id = 'b2c3d4e5-1111-2222-3333-444444444444';

    insert into public.packing_items (id, trip_id, name, category, assignee, packed, is_suggested, sort_order) values
      ('demo-pack-passports', 'b2c3d4e5-1111-2222-3333-444444444444', 'IDs / passports', 'Documents', 'Alex', true, false, 10),
      ('demo-pack-sunscreen', 'b2c3d4e5-1111-2222-3333-444444444444', 'Reef-safe sunscreen', 'Beach Gear', 'Jamie', true, false, 20),
      ('demo-pack-swimsuits', 'b2c3d4e5-1111-2222-3333-444444444444', 'Swimsuits', 'Clothing', 'Anyone', true, false, 30),
      ('demo-pack-meds', 'b2c3d4e5-1111-2222-3333-444444444444', 'Sea-sickness meds', 'Pharmacy', 'Alex', false, true, 40),
      ('demo-pack-camera', 'b2c3d4e5-1111-2222-3333-444444444444', 'Waterproof phone pouch', 'Beach Gear', 'Anyone', false, true, 50),
      ('demo-pack-snacks', 'b2c3d4e5-1111-2222-3333-444444444444', 'Road to Hana snacks', 'Kids', 'Jamie', false, true, 60)
    on conflict (id) do update set
      trip_id = excluded.trip_id,
      name = excluded.name,
      category = excluded.category,
      assignee = excluded.assignee,
      packed = excluded.packed,
      is_suggested = excluded.is_suggested,
      sort_order = excluded.sort_order;
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
