-- Firm / APMC credential profile fields for the agent's own profile page.
ALTER TABLE agents ADD COLUMN IF NOT EXISTS firm_name VARCHAR(200);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS proprietor_name VARCHAR(120);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS pan VARCHAR(10);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS gstin VARCHAR(15);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS firm_address VARCHAR(500);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS registered_since DATE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS bank_name VARCHAR(120);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(30);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(11);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(150);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS security_deposit NUMERIC(12,2);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS yard_shed VARCHAR(60);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS weighbridge_lanes VARCHAR(60);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS daily_capacity_qtl NUMERIC(10,2);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS license_issue_date DATE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS license_expiry_date DATE;

-- Sub-agents / gate & weighing staff an arhtiya authorizes under their license.
CREATE TABLE IF NOT EXISTS agent_staff (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id             UUID NOT NULL REFERENCES agents(id),
  name                 VARCHAR(120) NOT NULL,
  phone                VARCHAR(15),
  role                 VARCHAR(120),
  authorization_scope  VARCHAR(200),
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Demo civic directory: mandi association / market committee contacts shown
-- on the agent's profile page. Fixed per-centre fixture data (part of this
-- prototype's fictional Punjab Mandi Board universe, same as the "Demo
-- Agent"/"Demo Operator" test accounts) — not a live directory of real people.
CREATE TABLE IF NOT EXISTS mandi_officials (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id    UUID NOT NULL REFERENCES centres(id),
  name         VARCHAR(120) NOT NULL,
  designation  VARCHAR(150) NOT NULL,
  phone        VARCHAR(20),
  category     VARCHAR(30) NOT NULL,
  office_hours VARCHAR(60)
);
