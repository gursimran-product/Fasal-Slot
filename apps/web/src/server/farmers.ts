import type { AuthUser, Farmer, LandParcel, Language } from "@fasal-slot/types";
import { pool } from "./db/pool";

export function canAccessFarmer(user: AuthUser, farmer: Farmer): boolean {
  if (user.role === "farmer") return user.id === farmer.id;
  if (user.role === "agent") return user.id === farmer.agentId;
  return user.role === "govt_operator" || user.role === "govt_oversight";
}

interface FarmerRow {
  id: string;
  name: string;
  phone: string;
  village: string | null;
  district: string | null;
  state: string | null;
  language: Language;
  aadhaar_ref: string | null;
  land_details: Farmer["landDetails"];
  mfmb_id: string | null;
  guardian_name: string | null;
  holding_category: string | null;
  land_acres: string | null;
  bank_name: string | null;
  bank_account_last4: string | null;
  bank_ifsc: string | null;
  agent_id: string | null;
  consent_at: string | null;
  created_by: Farmer["createdBy"];
  created_at: string;
  updated_at: string;
}

function mapFarmer(row: FarmerRow): Farmer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    village: row.village,
    district: row.district,
    state: row.state,
    language: row.language,
    aadhaarRef: row.aadhaar_ref,
    landDetails: row.land_details,
    mfmbId: row.mfmb_id,
    guardianName: row.guardian_name,
    holdingCategory: row.holding_category,
    landAcres: row.land_acres ? Number(row.land_acres) : null,
    bankName: row.bank_name,
    bankAccountLast4: row.bank_account_last4,
    bankIfsc: row.bank_ifsc,
    agentId: row.agent_id,
    consentAt: row.consent_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getFarmerById(id: string): Promise<Farmer | null> {
  const { rows } = await pool.query<FarmerRow>("SELECT * FROM farmers WHERE id = $1", [id]);
  return rows.length ? mapFarmer(rows[0]) : null;
}

export interface CreateFarmerInput {
  name: string;
  phone: string;
  village?: string;
  district?: string;
  state?: string;
  language: Language;
  agentId: string | null;
  createdBy: Farmer["createdBy"];
  plrs?: {
    mfmbId?: string;
    guardianName?: string;
    aadhaarRef?: string;
    holdingCategory?: string;
    landAcres?: number;
    bankName?: string;
    bankAccountLast4?: string;
    bankIfsc?: string;
    landParcels?: LandParcel[];
  };
}

export const PHONE_ALREADY_REGISTERED = "phone_already_registered" as const;

export async function createFarmer(
  input: CreateFarmerInput
): Promise<Farmer | typeof PHONE_ALREADY_REGISTERED> {
  const existing = await pool.query("SELECT id FROM farmers WHERE phone = $1", [input.phone]);
  if (existing.rows.length > 0) return PHONE_ALREADY_REGISTERED;

  const landDetails = input.plrs?.landParcels ? { parcels: input.plrs.landParcels } : null;

  const { rows } = await pool.query<FarmerRow>(
    `INSERT INTO farmers (
       name, phone, village, district, state, language, agent_id, created_by, consent_at,
       aadhaar_ref, land_details, mfmb_id, guardian_name, holding_category, land_acres,
       bank_name, bank_account_last4, bank_ifsc
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING *`,
    [
      input.name,
      input.phone,
      input.village ?? null,
      input.district ?? null,
      input.state ?? null,
      input.language,
      input.agentId,
      input.createdBy,
      input.plrs?.aadhaarRef ?? null,
      landDetails ? JSON.stringify(landDetails) : null,
      input.plrs?.mfmbId ?? null,
      input.plrs?.guardianName ?? null,
      input.plrs?.holdingCategory ?? null,
      input.plrs?.landAcres ?? null,
      input.plrs?.bankName ?? null,
      input.plrs?.bankAccountLast4 ?? null,
      input.plrs?.bankIfsc ?? null,
    ]
  );
  return mapFarmer(rows[0]);
}

export async function listFarmersByAgent(agentId: string): Promise<Farmer[]> {
  const { rows } = await pool.query<FarmerRow>(
    "SELECT * FROM farmers WHERE agent_id = $1 ORDER BY created_at DESC",
    [agentId]
  );
  return rows.map(mapFarmer);
}

export async function updateFarmerLanguage(id: string, language: Language): Promise<Farmer | null> {
  const { rows } = await pool.query<FarmerRow>(
    `UPDATE farmers SET language = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [language, id]
  );
  return rows.length ? mapFarmer(rows[0]) : null;
}
