-- Farmer profile fields sourced from the (simulated) PLRS lookup.
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS mfmb_id VARCHAR(30);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(120);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS holding_category VARCHAR(30);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS land_acres NUMERIC(6,2);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(120);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_account_last4 VARCHAR(4);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(11);

-- Simulated Punjab Land Records Society registry: a fixed set of demo
-- fixtures an agent can look up by mobile / MFMB ID / Aadhaar last-4 when
-- adding a farmer. This is NOT a live government integration — there is no
-- real PLRS/Aadhaar Vault to connect to — it exists so the add-farmer flow's
-- verified-lookup UX is a real, working feature over real (seeded) data
-- instead of a fabricated static claim.
CREATE TABLE IF NOT EXISTS plrs_demo_registry (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile             VARCHAR(15) UNIQUE NOT NULL,
  mfmb_id            VARCHAR(30) UNIQUE NOT NULL,
  aadhaar_last4      VARCHAR(4) NOT NULL,
  name               VARCHAR(120) NOT NULL,
  guardian_name      VARCHAR(120),
  village            VARCHAR(120),
  tehsil             VARCHAR(120),
  district           VARCHAR(120),
  state              VARCHAR(60),
  pincode            VARCHAR(10),
  holding_category   VARCHAR(30),
  land_acres         NUMERIC(6,2),
  bank_name          VARCHAR(120),
  bank_account_last4 VARCHAR(4),
  bank_ifsc          VARCHAR(11),
  land_parcels       JSONB NOT NULL DEFAULT '[]'
);
