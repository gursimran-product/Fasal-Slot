import type { AuthUser, Farmer, Language } from "@fasal-slot/types";
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
  land_details: Record<string, unknown> | null;
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
}

export const PHONE_ALREADY_REGISTERED = "phone_already_registered" as const;

export async function createFarmer(
  input: CreateFarmerInput
): Promise<Farmer | typeof PHONE_ALREADY_REGISTERED> {
  const existing = await pool.query("SELECT id FROM farmers WHERE phone = $1", [input.phone]);
  if (existing.rows.length > 0) return PHONE_ALREADY_REGISTERED;

  const { rows } = await pool.query<FarmerRow>(
    `INSERT INTO farmers (name, phone, village, district, state, language, agent_id, created_by, consent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
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
    ]
  );
  return mapFarmer(rows[0]);
}

export async function updateFarmerLanguage(id: string, language: Language): Promise<Farmer | null> {
  const { rows } = await pool.query<FarmerRow>(
    `UPDATE farmers SET language = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [language, id]
  );
  return rows.length ? mapFarmer(rows[0]) : null;
}
