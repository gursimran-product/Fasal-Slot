CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS centres (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(200) NOT NULL,
  state        VARCHAR(60),
  district     VARCHAR(120),
  village      VARCHAR(120),
  lat          DECIMAL(10, 7),
  lng          DECIMAL(10, 7),
  crops        TEXT[] NOT NULL DEFAULT '{}',
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  phone         VARCHAR(15) UNIQUE,
  email         VARCHAR(200) UNIQUE,
  password_hash VARCHAR(200),
  centre_id     UUID REFERENCES centres(id),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS farmers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(120) NOT NULL,
  phone        VARCHAR(15) UNIQUE,
  village      VARCHAR(120),
  district     VARCHAR(120),
  state        VARCHAR(60),
  language     VARCHAR(5) NOT NULL DEFAULT 'en',
  aadhaar_ref  VARCHAR(12),
  land_details JSONB,
  agent_id     UUID REFERENCES agents(id),
  consent_at   TIMESTAMPTZ,
  created_by   VARCHAR(20),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS centre_capacity (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id    UUID NOT NULL REFERENCES centres(id),
  date         DATE NOT NULL,
  time_window  VARCHAR(20) NOT NULL,
  total_slots  INTEGER NOT NULL DEFAULT 20,
  updated_by   UUID,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(centre_id, date, time_window)
);

CREATE TABLE IF NOT EXISTS bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id     UUID NOT NULL REFERENCES farmers(id),
  centre_id     UUID NOT NULL REFERENCES centres(id),
  agent_id      UUID REFERENCES agents(id),
  crop          VARCHAR(60) NOT NULL,
  date          DATE NOT NULL,
  time_window   VARCHAR(20) NOT NULL,
  ref_code      VARCHAR(12) UNIQUE NOT NULL,
  stage         VARCHAR(20) NOT NULL DEFAULT 'booked',
  reject_reason VARCHAR(500),
  amount_paid   DECIMAL(12, 2),
  created_by    VARCHAR(20) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  arrived_at    TIMESTAMPTZ,
  weighed_at    TIMESTAMPTZ,
  accepted_at   TIMESTAMPTZ,
  paid_at       TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS status_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id),
  from_stage      VARCHAR(20),
  to_stage        VARCHAR(20) NOT NULL,
  triggered_by    VARCHAR(20) NOT NULL,
  triggered_by_id UUID,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS govt_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  role          VARCHAR(20) NOT NULL,
  centre_id     UUID REFERENCES centres(id),
  state         VARCHAR(60),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id    UUID REFERENCES farmers(id),
  booking_id   UUID REFERENCES bookings(id),
  channel      VARCHAR(10) NOT NULL,
  language     VARCHAR(5) NOT NULL,
  template_key VARCHAR(60) NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending',
  provider_ref VARCHAR(200),
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      VARCHAR(15) NOT NULL,
  otp_hash   VARCHAR(200) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  user_role  VARCHAR(20) NOT NULL,
  token_hash VARCHAR(200) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_centre_date ON bookings(centre_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_farmer ON bookings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_stage ON bookings(stage);
CREATE INDEX IF NOT EXISTS idx_bookings_ref ON bookings(ref_code);
CREATE INDEX IF NOT EXISTS idx_status_events_booking ON status_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_booking ON notification_log(booking_id);
