import type { PlrsRegistryRecord } from "@fasal-slot/types";
import { pool } from "./db/pool";

interface PlrsRegistryRow {
  mobile: string;
  mfmb_id: string;
  aadhaar_last4: string;
  name: string;
  guardian_name: string | null;
  village: string | null;
  tehsil: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  holding_category: string | null;
  land_acres: string | null;
  bank_name: string | null;
  bank_account_last4: string | null;
  bank_ifsc: string | null;
  land_parcels: PlrsRegistryRecord["landParcels"];
}

function mapRow(row: PlrsRegistryRow): PlrsRegistryRecord {
  return {
    mobile: row.mobile,
    mfmbId: row.mfmb_id,
    aadhaarLast4: row.aadhaar_last4,
    name: row.name,
    guardianName: row.guardian_name,
    village: row.village,
    tehsil: row.tehsil,
    district: row.district,
    state: row.state,
    pincode: row.pincode,
    holdingCategory: row.holding_category,
    landAcres: row.land_acres ? Number(row.land_acres) : null,
    bankName: row.bank_name,
    bankAccountLast4: row.bank_account_last4,
    bankIfsc: row.bank_ifsc,
    landParcels: row.land_parcels ?? [],
  };
}

// Simulated PLRS lookup — matches a fixed set of seeded demo fixtures by
// mobile number, MFMB ID, or Aadhaar last-4. Not a live government system.
export async function lookupPlrsRecord(query: string): Promise<PlrsRegistryRecord | null> {
  const q = query.trim();
  if (!q) return null;

  const { rows } = await pool.query<PlrsRegistryRow>(
    `SELECT * FROM plrs_demo_registry
     WHERE mobile = $1 OR UPPER(mfmb_id) = UPPER($1) OR aadhaar_last4 = $1
     LIMIT 1`,
    [q]
  );
  return rows.length ? mapRow(rows[0]) : null;
}
