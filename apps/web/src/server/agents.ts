import type { AgentFirmProfile, AgentLinkedFarmersStats, AgentStaff, MandiOfficial } from "@fasal-slot/types";
import { pool } from "./db/pool";

export interface AgentPublicInfo {
  id: string;
  name: string;
  phone: string | null;
  licenseNumber: string | null;
  centreId: string | null;
}

export async function getAgentPublicById(id: string): Promise<AgentPublicInfo | null> {
  const { rows } = await pool.query(
    "SELECT id, name, phone, license_number, centre_id FROM agents WHERE id = $1 AND is_active = true",
    [id]
  );
  if (rows.length === 0) return null;
  return {
    id: rows[0].id,
    name: rows[0].name,
    phone: rows[0].phone,
    licenseNumber: rows[0].license_number,
    centreId: rows[0].centre_id,
  };
}

export async function getAgentFirmProfile(id: string): Promise<AgentFirmProfile | null> {
  const { rows } = await pool.query(
    `SELECT id, name, phone, email, license_number, centre_id, firm_name, proprietor_name, pan, gstin,
            firm_address, registered_since, bank_name, bank_account_number, bank_ifsc, bank_branch,
            security_deposit, yard_shed, weighbridge_lanes, daily_capacity_qtl, license_issue_date, license_expiry_date
     FROM agents WHERE id = $1 AND is_active = true`,
    [id]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    licenseNumber: row.license_number,
    centreId: row.centre_id,
    firmName: row.firm_name,
    proprietorName: row.proprietor_name,
    pan: row.pan,
    gstin: row.gstin,
    firmAddress: row.firm_address,
    registeredSince: row.registered_since,
    bankName: row.bank_name,
    bankAccountNumber: row.bank_account_number,
    bankIfsc: row.bank_ifsc,
    bankBranch: row.bank_branch,
    securityDeposit: row.security_deposit ? Number(row.security_deposit) : null,
    yardShed: row.yard_shed,
    weighbridgeLanes: row.weighbridge_lanes,
    dailyCapacityQtl: row.daily_capacity_qtl ? Number(row.daily_capacity_qtl) : null,
    licenseIssueDate: row.license_issue_date,
    licenseExpiryDate: row.license_expiry_date,
  };
}

export async function listAgentStaff(agentId: string): Promise<AgentStaff[]> {
  const { rows } = await pool.query(
    `SELECT * FROM agent_staff WHERE agent_id = $1 ORDER BY created_at ASC`,
    [agentId]
  );
  return rows.map((row) => ({
    id: row.id,
    agentId: row.agent_id,
    name: row.name,
    phone: row.phone,
    role: row.role,
    authorizationScope: row.authorization_scope,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

export async function addAgentStaff(
  agentId: string,
  input: { name: string; phone?: string | null; role?: string | null; authorizationScope?: string | null }
): Promise<AgentStaff> {
  const { rows } = await pool.query(
    `INSERT INTO agent_staff (agent_id, name, phone, role, authorization_scope)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [agentId, input.name, input.phone ?? null, input.role ?? null, input.authorizationScope ?? null]
  );
  const row = rows[0];
  return {
    id: row.id,
    agentId: row.agent_id,
    name: row.name,
    phone: row.phone,
    role: row.role,
    authorizationScope: row.authorization_scope,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function listMandiOfficials(centreId: string): Promise<MandiOfficial[]> {
  const { rows } = await pool.query(
    `SELECT * FROM mandi_officials WHERE centre_id = $1 ORDER BY category`,
    [centreId]
  );
  return rows.map((row) => ({
    id: row.id,
    centreId: row.centre_id,
    name: row.name,
    designation: row.designation,
    phone: row.phone,
    category: row.category,
    officeHours: row.office_hours,
  }));
}

export async function getAgentLinkedFarmersStats(agentId: string): Promise<AgentLinkedFarmersStats> {
  const { rows: farmerRows } = await pool.query(
    `SELECT land_acres, land_details FROM farmers WHERE agent_id = $1`,
    [agentId]
  );
  const totalFarmers = farmerRows.length;
  const totalLandAcres = farmerRows.reduce((sum, r) => sum + Number(r.land_acres ?? 0), 0);
  // "Approved quota" = the sum of each linked farmer's PLRS-declared estimated
  // yield across all their land parcels (only known for PLRS-linked farmers).
  let approvedQuotaQtl = 0;
  for (const row of farmerRows) {
    const parcels = row.land_details?.parcels as { estimatedYieldQtl: number }[] | undefined;
    if (parcels) approvedQuotaQtl += parcels.reduce((sum, p) => sum + Number(p.estimatedYieldQtl ?? 0), 0);
  }

  const { rows: bookingRows } = await pool.query(
    `SELECT stage, COALESCE(SUM(quantity_qtl), 0)::float AS qtl, COALESCE(SUM(amount_paid), 0)::float AS paid
     FROM bookings WHERE agent_id = $1 AND stage != 'cancelled' AND stage != 'rejected'
     GROUP BY stage`,
    [agentId]
  );

  const { rows: todayRows } = await pool.query(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(quantity_qtl), 0)::float AS qtl
     FROM bookings
     WHERE agent_id = $1 AND date = CURRENT_DATE AND stage != 'cancelled' AND stage != 'rejected'`,
    [agentId]
  );

  let weighedOrPaidQtl = 0;
  let bookedInTransitQtl = 0;
  let seasonCommissionEarned = 0;
  for (const row of bookingRows) {
    if (row.stage === "weighed" || row.stage === "accepted" || row.stage === "paid") {
      weighedOrPaidQtl += row.qtl;
    } else {
      bookedInTransitQtl += row.qtl;
    }
    if (row.stage === "paid") {
      seasonCommissionEarned += row.paid * 0.025;
    }
  }

  return {
    totalFarmers,
    totalLandAcres,
    approvedQuotaQtl,
    weighedOrPaidQtl,
    bookedInTransitQtl,
    todaysBookedSlots: todayRows[0].count,
    todaysBookedQtl: todayRows[0].qtl,
    seasonCommissionEarned,
  };
}
