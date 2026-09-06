-- Real per-booking fields recorded by the centre operator during weighing/payment.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS moisture_pct NUMERIC(4,1);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS weighbridge_token VARCHAR(20);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gate_number VARCHAR(10);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS jform_number VARCHAR(30);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS utr_reference VARCHAR(30);

-- Real, generic (not tied to a named individual) gate supervisor contact per centre.
ALTER TABLE centres ADD COLUMN IF NOT EXISTS gate_supervisor_phone VARCHAR(15);

-- Yard status is agent-reported (manually entered), never a live sensor feed.
CREATE TABLE IF NOT EXISTS centre_yard_status (
  centre_id                  UUID PRIMARY KEY REFERENCES centres(id),
  weighbridge_lanes_occupied INTEGER NOT NULL DEFAULT 0,
  weighbridge_lanes_total    INTEGER NOT NULL DEFAULT 0,
  gunny_bag_stock_pct        INTEGER,
  storage_lifting_pct        INTEGER,
  updated_by_agent_id        UUID REFERENCES agents(id),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
