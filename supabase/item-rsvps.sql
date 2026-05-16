-- Item RSVP: per-traveler attendance for individual agenda items
-- Run in Supabase SQL Editor before using the RSVP feature.

CREATE TABLE IF NOT EXISTS item_rsvps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  agenda_item_id TEXT NOT NULL,
  traveler_name  TEXT NOT NULL,
  traveler_avatar TEXT NOT NULL DEFAULT '🧑',
  status         TEXT NOT NULL CHECK (status IN ('in', 'skip')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_id, agenda_item_id, traveler_name)
);

CREATE INDEX IF NOT EXISTS item_rsvps_trip_idx ON item_rsvps (trip_id);
CREATE INDEX IF NOT EXISTS item_rsvps_item_idx ON item_rsvps (agenda_item_id);

-- Row-level security (anon key, same pattern as agenda_items)
ALTER TABLE item_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon select item_rsvps"
  ON item_rsvps FOR SELECT TO anon USING (true);

CREATE POLICY "anon insert item_rsvps"
  ON item_rsvps FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon update item_rsvps"
  ON item_rsvps FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon delete item_rsvps"
  ON item_rsvps FOR DELETE TO anon USING (true);
