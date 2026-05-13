-- ============================================================
-- TripFlow Database Schema
-- Paste this entire file into Supabase → SQL Editor → Run
-- ============================================================

-- ── TRIPS ────────────────────────────────────────────────────
-- One row per trip (e.g. "Maui Family Trip")
create table trips (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  destination text not null,
  start_date  date not null,
  end_date    date not null,
  invite_code text unique,
  cover_photo text,               -- Unsplash URL
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);

-- ── TRAVELERS ────────────────────────────────────────────────
-- People on a trip. Not tied to auth yet — just names/avatars.
create table travelers (
  id        uuid primary key default gen_random_uuid(),
  trip_id   uuid references trips(id) on delete cascade,
  name      text not null,
  avatar    text not null,         -- emoji e.g. "🧔"
  role      text not null,         -- "Trip Organizer" | "Co-traveler" | "Kid · Age 9"
  status    text not null default 'active',  -- "active" | "invited"
  is_me     boolean not null default false,
  user_id   uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- ── TRIP DAYS ────────────────────────────────────────────────
-- One row per day of a trip (links to its hero photo, weather, etc.)
create table trip_days (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid references trips(id) on delete cascade,
  day_number  int not null,        -- 1-based (Day 1, Day 2…)
  date        date not null,
  label       text,                -- "Day 1 · Arrival", "Day 2 · Beach Day"
  hero_photo  text,                -- Unsplash URL
  hero_alt    text,
  weather_emoji text,
  weather_temp  text,              -- "81°F"
  weather_label text,              -- "Sunny · Light breeze"
  trip_note   text,                -- freeform note shown at bottom of day
  created_at  timestamptz default now(),
  unique(trip_id, day_number)
);

-- ── AGENDA ITEMS ─────────────────────────────────────────────
-- Each activity/event on a day's agenda
create table agenda_items (
  id           uuid primary key default gen_random_uuid(),
  trip_day_id  uuid references trip_days(id) on delete cascade,
  time         text not null,      -- "10:00 AM"
  title        text not null,
  subtitle     text,
  emoji        text not null,
  done         boolean not null default false,
  is_reservation boolean not null default false,
  reservation_label text,          -- "CONFIRMED" | "Booked"
  sort_order   int not null default 0,
  created_at   timestamptz default now()
);

-- ── DOCUMENTS ────────────────────────────────────────────────
-- Flights, hotels, car rentals, activities, dining reservations
create table documents (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid references trips(id) on delete cascade,
  category     text not null,      -- "Flights" | "Hotel" | "Car" | "Activities" | "Dining"
  name         text not null,
  provider     text not null,
  confirmation text not null,
  date         text not null,      -- human-readable "Jun 5 · 7:00 AM"
  status       text not null default 'confirmed',  -- "confirmed" | "pending" | "completed"
  notes        text,
  emoji        text not null,
  file_type    text not null,      -- "pdf" | "screenshot" | "booking"
  file_url     text,               -- Supabase Storage URL (Phase 3)
  created_at   timestamptz default now()
);

-- ── PACKING ITEMS ────────────────────────────────────────────
-- Shared packing checklist for the trip.
create table packing_items (
  id           text primary key,
  trip_id      uuid references trips(id) on delete cascade,
  name         text not null,
  category     text not null,
  assignee     text not null default 'Anyone',
  packed       boolean not null default false,
  is_suggested boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz default now()
);

-- ── MESSAGES ─────────────────────────────────────────────────
-- Group chat messages
create table messages (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid references trips(id) on delete cascade,
  sender_name text not null,
  sender_avatar text not null,
  sender_user_id uuid references auth.users(id) on delete set null,
  is_me       boolean not null default false,
  text        text,
  image_url   text,
  card_type   text,               -- "itinerary" | "reservation" | "location" | null
  card_title  text,
  card_sub    text,
  card_emoji  text,
  created_at  timestamptz default now()
);

-- ============================================================
-- SEED DATA — Maui Family Trip
-- ============================================================

-- Insert the trip
insert into trips (id, title, destination, start_date, end_date, invite_code, cover_photo)
values (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Maui Family Trip',
  'Maui, Hawaii',
  '2026-06-05',
  '2026-06-11',
  'MAUI26',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=400&fit=crop&q=80'
);

-- Travelers
insert into travelers (trip_id, name, avatar, role, status, is_me) values
  ('a1b2c3d4-0000-0000-0000-000000000001', 'You',   '🧔', 'Trip Organizer', 'active', true),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sarah', '👩', 'Co-traveler',    'active', false),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Liam',  '👦', 'Kid · Age 9',    'active', false),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Emma',  '👧', 'Kid · Age 6',    'active', false);

-- Trip Days (7 days: Jun 5–11)
insert into trip_days (id, trip_id, day_number, date, label, hero_photo, hero_alt, weather_emoji, weather_temp, weather_label, trip_note) values
  ('d0000001-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
   1, '2026-06-05', 'Day 1 · Arrival Day',
   'https://images.unsplash.com/photo-1476158085676-e67f57ed9ed7?w=800&h=360&fit=crop&q=80', 'Maui coastline at dusk',
   '🌤️', '79°F', 'Partly cloudy · Warm evening',
   'Arrival day — take it easy. Grab shave ice from Ululani''s near the airport. Kids can decompress at the pool.'),

  ('d0000001-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001',
   2, '2026-06-06', 'Day 2 · Beach Day',
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=360&fit=crop&q=80', 'Maui beach',
   '☀️', '82°F', 'Sunny all day · Perfect beach weather',
   'Pack reef-safe sunscreen — Maui requires it by law. Boogie boards are in the Jeep trunk.'),

  ('d0000001-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001',
   3, '2026-06-07', 'Day 3 · Road to Hana',
   'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=360&fit=crop&q=80', 'Lush Maui forest',
   '🌧️', '74°F', 'Showers likely · Bring a layer',
   'Temptation Tours picks us up at 7am sharp. Snacks packed. Don''t forget the waterfall shoes.'),

  ('d0000001-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001',
   4, '2026-06-08', 'Day 4 · Spa & Relax',
   'https://images.unsplash.com/photo-1540202404-a2f29564be05?w=800&h=360&fit=crop&q=80', 'Tropical resort pool',
   '⛅', '80°F', 'Mild clouds · Comfortable',
   'Sarah''s spa appointment at 10am. Afternoon is free — great day for the resort pool or a drive to Lahaina.'),

  ('d0000001-0000-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001',
   5, '2026-06-09', 'Day 5 · Upcountry',
   'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=360&fit=crop&q=80', 'Haleakala sunrise',
   '🌅', '65°F', 'Cool at altitude · Jacket needed',
   'Haleakala summit at sunrise — alarm at 3:30am. Bring layers, it''s 40°F at the top.'),

  ('d0000001-0000-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000001',
   6, '2026-06-10', 'Day 6 · West Maui',
   'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&h=360&fit=crop&q=80', 'Kaanapali beach',
   '☀️', '84°F', 'Hot and sunny · Great beach day',
   'Last full beach day. Hit Ka''anapali or Napili Bay. Cliff diving at Black Rock if the kids are up for it.'),

  ('d0000001-0000-0000-0000-000000000007', 'a1b2c3d4-0000-0000-0000-000000000001',
   7, '2026-06-11', 'Day 7 · Departure',
   'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=360&fit=crop&q=80', 'Airplane wing over clouds',
   '☁️', '77°F', 'Overcast · Flight at 4:10 PM',
   'Flight departs OGG at 4:10pm. Check-out at 11am. Grab lunch at Kihei Caffe before heading to the airport.');

-- Agenda items for Day 2 (Beach Day — the main demo day)
insert into agenda_items (trip_day_id, time, title, subtitle, emoji, done, is_reservation, reservation_label, sort_order) values
  ('d0000001-0000-0000-0000-000000000002', '8:30 AM',  'Breakfast Buffet',      'Andaz · Moana Terrace', '🍳', true,  false, null, 1),
  ('d0000001-0000-0000-0000-000000000002', '10:00 AM', 'Wailea Beach',          'Bring gear & umbrella', '🏖️', true,  false, null, 2),
  ('d0000001-0000-0000-0000-000000000002', '12:30 PM', 'Shave Ice',             'Ululani''s · Kihei',    '🍧', false, false, null, 3),
  ('d0000001-0000-0000-0000-000000000002', '4:30 PM',  'Molokini Snorkel Tour', 'Pride of Maui · 4 tickets', '🤿', false, true, 'CONFIRMED', 4),
  ('d0000001-0000-0000-0000-000000000002', '7:00 PM',  'Mama''s Fish House',    'Party of 4 · Window table', '🐟', false, true, 'CONFIRMED', 5);

-- Documents
insert into documents (trip_id, category, name, provider, confirmation, date, status, notes, emoji, file_type) values
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Flights',    'LAX → OGG · Hawaiian Airlines', 'Hawaiian Airlines', 'HA-7823-F', 'Jun 5 · 7:00 AM',  'completed', 'Seats 14A–D · Checked bags paid',                '✈️', 'pdf'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Flights',    'OGG → LAX · Hawaiian Airlines', 'Hawaiian Airlines', 'HA-7824-F', 'Jun 11 · 4:10 PM',  'confirmed', 'Seats 14A–D · Departs Terminal 2',               '✈️', 'pdf'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Hotel',      'Andaz Maui at Wailea Resort',   'Andaz / Hyatt',     'HY-92847',  'Jun 5 – 11 · 6 nights', 'confirmed', 'Ocean view suite · Early check-in requested', '🏨', 'booking'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Car',        'Jeep Wrangler · Hertz Maui',    'Hertz',             'HZ-441928', 'Jun 5 – 11',       'confirmed', 'Pick up at OGG airport · Full coverage',          '🚙', 'booking'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Activities', 'Molokini Snorkel Tour · Pride of Maui', 'Pride of Maui', 'PM-3847', 'Jun 6 · 4:30 AM', 'confirmed', '4 tickets · Gear included · Depart Maalaea Harbor', '🤿', 'pdf'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Activities', 'Road to Hana Guided Tour',      'Temptation Tours',  'TT-5512',   'Jun 7 · 7:00 AM',  'confirmed', 'Hotel pickup · Lunch included',                  '🚗', 'booking'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Dining',     'Mama''s Fish House',             'Mama''s Fish House', 'MFH-8821', 'Jun 6 · 7:00 PM',  'confirmed', 'Party of 4 · Window table requested',            '🐟', 'screenshot'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Dining',     'Andaz Spa — Couples Massage',   'Andaz Maui Spa',    'SPA-2291',  'Jun 8 · 10:00 AM', 'pending',   '60 min · 2 therapists — call to confirm',        '💆', 'booking');

-- Messages (Group chat seed)
insert into messages (trip_id, sender_name, sender_avatar, is_me, text, card_type, card_title, card_sub, card_emoji, created_at) values
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sarah', '👩', false, 'Good morning! What time are we heading to the beach? 🏖️', null, null, null, null, '2026-06-06 09:02:00+00'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'You',   '🧔', true,  'Plan is 10am. Breakfast buffet closes at 10 so let''s eat first.', null, null, null, null, '2026-06-06 09:08:00+00'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sarah', '👩', false, 'Perfect. I''ll get the kids ready. Liam wants to bring the boogie board 🤙', null, null, null, null, '2026-06-06 09:09:00+00'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Mom',   '👵', false, 'Hi everyone! What time is dinner tonight? Grandpa wants to know if he needs to dress up 😄', null, null, null, null, '2026-06-06 10:34:00+00'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'You',   '🧔', true,  null, 'reservation', 'Mama''s Fish House', 'Tonight · 7:00 PM · Party of 4', '🐟', '2026-06-06 10:41:00+00'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'You',   '🧔', true,  'Smart casual — it''s a nice place but not black tie. Tell Grandpa no flip flops 😂', null, null, null, null, '2026-06-06 10:41:30+00'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Mom',   '👵', false, 'Ha! He says he''s wearing his good Hawaiian shirt 🌺', null, null, null, null, '2026-06-06 10:45:00+00'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sarah', '👩', false, 'Look at this view!! Kids are having the best time 😭❤️', null, null, null, null, '2026-06-06 12:17:00+00'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Mom',   '👵', false, 'Oh my goodness!! Save me a spot 🥹', null, null, null, null, '2026-06-06 12:20:00+00'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'You',   '🧔', true,  null, 'itinerary', 'Today''s Plan', 'Snorkeling 4:30pm · Dinner 7:00pm', '📋', '2026-06-06 13:05:00+00'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sarah', '👩', false, 'Can we push snorkeling 15 mins? Kids are napping and I don''t want to rush', null, null, null, null, '2026-06-06 13:08:00+00');
