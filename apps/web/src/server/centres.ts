import type { Centre, CentreCapacityWithAvailability } from "@fasal-slot/types";
import { pool } from "./db/pool";

interface CentreRow {
  id: string;
  name: string;
  state: string | null;
  district: string | null;
  village: string | null;
  lat: string | null;
  lng: string | null;
  crops: string[];
  is_active: boolean;
  created_at: string;
}

function mapCentre(row: CentreRow): Centre {
  return {
    id: row.id,
    name: row.name,
    state: row.state,
    district: row.district,
    village: row.village,
    lat: row.lat ? Number(row.lat) : null,
    lng: row.lng ? Number(row.lng) : null,
    crops: row.crops,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export interface ListCentresFilter {
  state?: string;
  district?: string;
  crop?: string;
}

export async function listCentres(filter: ListCentresFilter): Promise<Centre[]> {
  const conditions: string[] = ["is_active = true"];
  const params: unknown[] = [];

  if (filter.state) {
    params.push(filter.state);
    conditions.push(`state = $${params.length}`);
  }
  if (filter.district) {
    params.push(filter.district);
    conditions.push(`district = $${params.length}`);
  }
  if (filter.crop) {
    params.push(filter.crop);
    conditions.push(`$${params.length} = ANY(crops)`);
  }

  const { rows } = await pool.query<CentreRow>(
    `SELECT * FROM centres WHERE ${conditions.join(" AND ")} ORDER BY name`,
    params
  );
  return rows.map(mapCentre);
}

export type RiskLevel = "low" | "watch" | "high";

export interface CentreRisk {
  centre: Centre;
  booked: number;
  inFlight: number;
  completed: number;
  rejected: number;
  riskLevel: RiskLevel;
}

export async function getOversightRollup(date: string, state?: string): Promise<CentreRisk[]> {
  const centres = await listCentres({ state });

  const results: CentreRisk[] = [];
  for (const centre of centres) {
    const { rows } = await pool.query(
      `SELECT stage, COUNT(*)::int AS count FROM bookings WHERE centre_id = $1 AND date = $2 GROUP BY stage`,
      [centre.id, date]
    );
    const counts: Record<string, number> = {};
    for (const row of rows) counts[row.stage] = row.count;

    const booked = counts.booked ?? 0;
    const inFlight = (counts.arrived ?? 0) + (counts.weighed ?? 0) + (counts.accepted ?? 0);
    const completed = counts.paid ?? 0;
    const rejected = counts.rejected ?? 0;

    let riskLevel: RiskLevel = "low";
    if (inFlight >= 2 && completed === 0) riskLevel = "high";
    else if (inFlight >= 1 && completed === 0) riskLevel = "watch";

    results.push({ centre, booked, inFlight, completed, rejected, riskLevel });
  }
  return results;
}

export async function getCentreCapacity(
  centreId: string,
  date: string
): Promise<CentreCapacityWithAvailability[]> {
  const { rows } = await pool.query(
    `SELECT
       cc.id, cc.centre_id, cc.date, cc.time_window, cc.total_slots,
       cc.updated_by, cc.updated_at,
       COALESCE(b.booked_count, 0)::int AS booked_count
     FROM centre_capacity cc
     LEFT JOIN (
       SELECT time_window, COUNT(*) AS booked_count
       FROM bookings
       WHERE centre_id = $1 AND date = $2 AND stage != 'cancelled'
       GROUP BY time_window
     ) b ON b.time_window = cc.time_window
     WHERE cc.centre_id = $1 AND cc.date = $2
     ORDER BY cc.time_window`,
    [centreId, date]
  );

  return rows.map((row) => ({
    id: row.id,
    centreId: row.centre_id,
    date: row.date,
    timeWindow: row.time_window,
    totalSlots: row.total_slots,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
    bookedCount: row.booked_count,
    availableSlots: Math.max(row.total_slots - row.booked_count, 0),
  }));
}
