import type { CentreYardStatus } from "@fasal-slot/types";
import { pool } from "./db/pool";

interface YardStatusRow {
  centre_id: string;
  weighbridge_lanes_occupied: number;
  weighbridge_lanes_total: number;
  gunny_bag_stock_pct: number | null;
  storage_lifting_pct: number | null;
  updated_by_agent_id: string | null;
  updated_by_agent_name: string | null;
  updated_at: string | null;
}

function mapYardStatus(centreId: string, row: YardStatusRow | undefined): CentreYardStatus {
  if (!row) {
    return {
      centreId,
      weighbridgeLanesOccupied: 0,
      weighbridgeLanesTotal: 0,
      gunnyBagStockPct: null,
      storageLiftingPct: null,
      updatedByAgentId: null,
      updatedByAgentName: null,
      updatedAt: null,
    };
  }
  return {
    centreId: row.centre_id,
    weighbridgeLanesOccupied: row.weighbridge_lanes_occupied,
    weighbridgeLanesTotal: row.weighbridge_lanes_total,
    gunnyBagStockPct: row.gunny_bag_stock_pct,
    storageLiftingPct: row.storage_lifting_pct,
    updatedByAgentId: row.updated_by_agent_id,
    updatedByAgentName: row.updated_by_agent_name,
    updatedAt: row.updated_at,
  };
}

export async function getYardStatus(centreId: string): Promise<CentreYardStatus> {
  const { rows } = await pool.query<YardStatusRow>(
    `SELECT y.*, a.name AS updated_by_agent_name
     FROM centre_yard_status y
     LEFT JOIN agents a ON a.id = y.updated_by_agent_id
     WHERE y.centre_id = $1`,
    [centreId]
  );
  return mapYardStatus(centreId, rows[0]);
}

export async function upsertYardStatus(
  centreId: string,
  agentId: string,
  input: {
    weighbridgeLanesOccupied: number;
    weighbridgeLanesTotal: number;
    gunnyBagStockPct: number | null;
    storageLiftingPct: number | null;
  }
): Promise<CentreYardStatus> {
  await pool.query(
    `INSERT INTO centre_yard_status
       (centre_id, weighbridge_lanes_occupied, weighbridge_lanes_total, gunny_bag_stock_pct, storage_lifting_pct, updated_by_agent_id, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (centre_id) DO UPDATE SET
       weighbridge_lanes_occupied = EXCLUDED.weighbridge_lanes_occupied,
       weighbridge_lanes_total = EXCLUDED.weighbridge_lanes_total,
       gunny_bag_stock_pct = EXCLUDED.gunny_bag_stock_pct,
       storage_lifting_pct = EXCLUDED.storage_lifting_pct,
       updated_by_agent_id = EXCLUDED.updated_by_agent_id,
       updated_at = NOW()`,
    [
      centreId,
      input.weighbridgeLanesOccupied,
      input.weighbridgeLanesTotal,
      input.gunnyBagStockPct,
      input.storageLiftingPct,
      agentId,
    ]
  );
  return getYardStatus(centreId);
}
