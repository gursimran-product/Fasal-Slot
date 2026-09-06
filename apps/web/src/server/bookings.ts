import crypto from "node:crypto";
import type { PoolClient } from "pg";
import type { Booking, BookingStage, CreatedBy, StatusEvent } from "@fasal-slot/types";
import { pool } from "./db/pool";

interface BookingRow {
  id: string;
  farmer_id: string;
  centre_id: string;
  agent_id: string | null;
  crop: string;
  date: string;
  time_window: string;
  ref_code: string;
  stage: BookingStage;
  reject_reason: string | null;
  amount_paid: string | null;
  quantity_qtl: string | null;
  vehicle_number: string | null;
  driver_name: string | null;
  moisture_declared: boolean;
  moisture_pct: string | null;
  weighbridge_token: string | null;
  gate_number: string | null;
  jform_number: string | null;
  utr_reference: string | null;
  created_by: CreatedBy;
  created_at: string;
  arrived_at: string | null;
  weighed_at: string | null;
  accepted_at: string | null;
  paid_at: string | null;
  updated_at: string;
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    farmerId: row.farmer_id,
    centreId: row.centre_id,
    agentId: row.agent_id,
    crop: row.crop,
    date: row.date,
    timeWindow: row.time_window,
    refCode: row.ref_code,
    stage: row.stage,
    rejectReason: row.reject_reason,
    amountPaid: row.amount_paid ? Number(row.amount_paid) : null,
    quantityQtl: row.quantity_qtl ? Number(row.quantity_qtl) : null,
    vehicleNumber: row.vehicle_number,
    driverName: row.driver_name,
    moistureDeclared: row.moisture_declared,
    moisturePct: row.moisture_pct ? Number(row.moisture_pct) : null,
    weighbridgeToken: row.weighbridge_token,
    gateNumber: row.gate_number,
    jformNumber: row.jform_number,
    utrReference: row.utr_reference,
    createdBy: row.created_by,
    createdAt: row.created_at,
    arrivedAt: row.arrived_at,
    weighedAt: row.weighed_at,
    acceptedAt: row.accepted_at,
    paidAt: row.paid_at,
    updatedAt: row.updated_at,
  };
}

function generateRefCode(): string {
  return "F" + crypto.randomInt(0, 10000).toString().padStart(4, "0");
}

async function insertBookingWithRefCode(
  client: PoolClient,
  input: {
    farmerId: string;
    centreId: string;
    agentId: string | null;
    crop: string;
    date: string;
    timeWindow: string;
    createdBy: CreatedBy;
    quantityQtl?: number | null;
    vehicleNumber?: string | null;
    driverName?: string | null;
    moistureDeclared?: boolean;
  },
  attemptsLeft = 5
): Promise<Booking> {
  const refCode = generateRefCode();
  try {
    const { rows } = await client.query<BookingRow>(
      `INSERT INTO bookings (farmer_id, centre_id, agent_id, crop, date, time_window, ref_code, created_by, quantity_qtl, vehicle_number, driver_name, moisture_declared)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        input.farmerId,
        input.centreId,
        input.agentId,
        input.crop,
        input.date,
        input.timeWindow,
        refCode,
        input.createdBy,
        input.quantityQtl ?? null,
        input.vehicleNumber ?? null,
        input.driverName ?? null,
        input.moistureDeclared ?? false,
      ]
    );
    const booking = rows[0];
    await client.query(
      `INSERT INTO status_events (booking_id, from_stage, to_stage, triggered_by, triggered_by_id)
       VALUES ($1, NULL, 'booked', $2, $3)`,
      [booking.id, input.createdBy === "agent" ? "agent" : "farmer", input.agentId ?? input.farmerId]
    );
    return mapBooking(booking);
  } catch (err) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505" && attemptsLeft > 0) {
      return insertBookingWithRefCode(client, input, attemptsLeft - 1);
    }
    throw err;
  }
}

async function lockAndCountCapacity(
  client: PoolClient,
  centreId: string,
  date: string,
  timeWindow: string
): Promise<{ totalSlots: number; bookedCount: number } | null> {
  const capRes = await client.query(
    `SELECT total_slots FROM centre_capacity WHERE centre_id = $1 AND date = $2 AND time_window = $3 FOR UPDATE`,
    [centreId, date, timeWindow]
  );
  if (capRes.rows.length === 0) return null;

  const countRes = await client.query(
    `SELECT COUNT(*)::int AS count FROM bookings
     WHERE centre_id = $1 AND date = $2 AND time_window = $3 AND stage != 'cancelled'`,
    [centreId, date, timeWindow]
  );

  return { totalSlots: capRes.rows[0].total_slots, bookedCount: countRes.rows[0].count };
}

export type CreateBookingResult = Booking | "full" | "no_capacity_configured";

export async function createBooking(input: {
  farmerId: string;
  centreId: string;
  agentId: string | null;
  crop: string;
  date: string;
  timeWindow: string;
  createdBy: CreatedBy;
  quantityQtl: number;
  vehicleNumber?: string | null;
  driverName?: string | null;
  moistureDeclared: boolean;
}): Promise<CreateBookingResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const capacity = await lockAndCountCapacity(client, input.centreId, input.date, input.timeWindow);
    if (!capacity) {
      await client.query("ROLLBACK");
      return "no_capacity_configured";
    }
    if (capacity.bookedCount >= capacity.totalSlots) {
      await client.query("ROLLBACK");
      return "full";
    }

    const booking = await insertBookingWithRefCode(client, input);
    await client.query("COMMIT");
    return booking;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export interface BatchSkip {
  farmerId: string;
  reason: string;
}

export type CreateBatchBookingsResult =
  | { bookings: Booking[]; skipped: BatchSkip[] }
  | "no_capacity_configured";

export async function createBatchBookings(input: {
  farmerIds: string[];
  centreId: string;
  agentId: string;
  crop: string;
  date: string;
  timeWindow: string;
}): Promise<CreateBatchBookingsResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const capacity = await lockAndCountCapacity(client, input.centreId, input.date, input.timeWindow);
    if (!capacity) {
      await client.query("ROLLBACK");
      return "no_capacity_configured";
    }

    let available = capacity.totalSlots - capacity.bookedCount;
    const bookings: Booking[] = [];
    const skipped: BatchSkip[] = [];

    for (const farmerId of input.farmerIds) {
      if (available <= 0) {
        skipped.push({ farmerId, reason: "centre full for this slot" });
        continue;
      }
      const booking = await insertBookingWithRefCode(client, {
        farmerId,
        centreId: input.centreId,
        agentId: input.agentId,
        crop: input.crop,
        date: input.date,
        timeWindow: input.timeWindow,
        createdBy: "agent",
      });
      bookings.push(booking);
      available--;
    }

    await client.query("COMMIT");
    return { bookings, skipped };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const { rows } = await pool.query<BookingRow>("SELECT * FROM bookings WHERE id = $1", [id]);
  return rows.length ? mapBooking(rows[0]) : null;
}

export async function getBookingStatusHistory(bookingId: string): Promise<StatusEvent[]> {
  const { rows } = await pool.query(
    `SELECT * FROM status_events WHERE booking_id = $1 ORDER BY created_at ASC`,
    [bookingId]
  );
  return rows.map((row) => ({
    id: row.id,
    bookingId: row.booking_id,
    fromStage: row.from_stage,
    toStage: row.to_stage,
    triggeredBy: row.triggered_by,
    triggeredById: row.triggered_by_id,
    notes: row.notes,
    createdAt: row.created_at,
  }));
}

export async function lookupBookingByRefAndPhone(ref: string, phone: string): Promise<Booking | null> {
  const { rows } = await pool.query<BookingRow>(
    `SELECT b.* FROM bookings b
     JOIN farmers f ON f.id = b.farmer_id
     WHERE b.ref_code = $1 AND f.phone = $2`,
    [ref, phone]
  );
  return rows.length ? mapBooking(rows[0]) : null;
}

export const RESCHEDULE_CUTOFF_HOURS = 2;

export type RescheduleBookingResult =
  | Booking
  | "not_found"
  | "not_booked_stage"
  | "past_cutoff"
  | "no_capacity_configured"
  | "full";

export async function rescheduleBooking(
  bookingId: string,
  farmerId: string,
  input: { centreId: string; date: string; timeWindow: string; reason: string | null }
): Promise<RescheduleBookingResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<BookingRow>(
      "SELECT * FROM bookings WHERE id = $1 AND farmer_id = $2 FOR UPDATE",
      [bookingId, farmerId]
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return "not_found";
    }
    const oldBooking = mapBooking(rows[0]);
    if (oldBooking.stage !== "booked") {
      await client.query("ROLLBACK");
      return "not_booked_stage";
    }

    const windowStart = oldBooking.timeWindow.split(/[-–]/)[0]?.trim();
    const cutoffAt = new Date(`${oldBooking.date}T${windowStart}:00`);
    cutoffAt.setHours(cutoffAt.getHours() - RESCHEDULE_CUTOFF_HOURS);
    if (Number.isFinite(cutoffAt.getTime()) && new Date() > cutoffAt) {
      await client.query("ROLLBACK");
      return "past_cutoff";
    }

    const capacity = await lockAndCountCapacity(client, input.centreId, input.date, input.timeWindow);
    if (!capacity) {
      await client.query("ROLLBACK");
      return "no_capacity_configured";
    }
    if (capacity.bookedCount >= capacity.totalSlots) {
      await client.query("ROLLBACK");
      return "full";
    }

    await client.query(
      `UPDATE bookings SET stage = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [oldBooking.id]
    );
    await client.query(
      `INSERT INTO status_events (booking_id, from_stage, to_stage, triggered_by, triggered_by_id, notes)
       VALUES ($1, 'booked', 'cancelled', 'farmer', $2, $3)`,
      [oldBooking.id, farmerId, input.reason ? `Rescheduled: ${input.reason}` : "Rescheduled"]
    );

    const newBooking = await insertBookingWithRefCode(client, {
      farmerId,
      centreId: input.centreId,
      agentId: oldBooking.agentId,
      crop: oldBooking.crop,
      date: input.date,
      timeWindow: input.timeWindow,
      createdBy: "farmer",
      quantityQtl: oldBooking.quantityQtl,
      vehicleNumber: oldBooking.vehicleNumber,
      driverName: oldBooking.driverName,
      moistureDeclared: oldBooking.moistureDeclared,
    });

    await client.query("COMMIT");
    return newBooking;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function cancelBooking(id: string, triggeredBy: "farmer" | "agent", triggeredById: string): Promise<Booking | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<BookingRow>(
      `UPDATE bookings SET stage = 'cancelled', updated_at = NOW() WHERE id = $1 AND stage != 'cancelled' RETURNING *`,
      [id]
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query(
      `INSERT INTO status_events (booking_id, from_stage, to_stage, triggered_by, triggered_by_id)
       VALUES ($1, $2, 'cancelled', $3, $4)`,
      [id, rows[0].stage, triggeredBy, triggeredById]
    );
    await client.query("COMMIT");
    return mapBooking(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listFarmerBookings(farmerId: string): Promise<Booking[]> {
  const { rows } = await pool.query<BookingRow>(
    `SELECT * FROM bookings WHERE farmer_id = $1 ORDER BY created_at DESC`,
    [farmerId]
  );
  return rows.map(mapBooking);
}

const ALLOWED_TRANSITIONS: Partial<Record<BookingStage, BookingStage[]>> = {
  booked: ["arrived"],
  arrived: ["weighed"],
  weighed: ["accepted", "rejected"],
  accepted: ["paid"],
};

const STAGE_TIMESTAMP_COLUMN: Partial<Record<BookingStage, string>> = {
  arrived: "arrived_at",
  weighed: "weighed_at",
  accepted: "accepted_at",
  paid: "paid_at",
};

export type AdvanceStageResult =
  | Booking
  | "not_found"
  | "invalid_transition"
  | "reject_reason_required";

export async function advanceBookingStage(
  bookingId: string,
  toStage: BookingStage,
  triggeredBy: "govt_operator",
  triggeredById: string,
  options: {
    rejectReason?: string;
    amountPaid?: number;
    moisturePct?: number;
    weighbridgeToken?: string;
    gateNumber?: string;
    jformNumber?: string;
    utrReference?: string;
  } = {}
): Promise<AdvanceStageResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<BookingRow>(
      "SELECT * FROM bookings WHERE id = $1 FOR UPDATE",
      [bookingId]
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return "not_found";
    }

    const booking = rows[0];
    const allowed = ALLOWED_TRANSITIONS[booking.stage] ?? [];
    if (!allowed.includes(toStage)) {
      await client.query("ROLLBACK");
      return "invalid_transition";
    }
    if (toStage === "rejected" && !options.rejectReason) {
      await client.query("ROLLBACK");
      return "reject_reason_required";
    }

    const setClauses = ["stage = $1", "updated_at = NOW()"];
    const params: unknown[] = [toStage];

    const timestampColumn = STAGE_TIMESTAMP_COLUMN[toStage];
    if (timestampColumn) {
      params.push(new Date());
      setClauses.push(`${timestampColumn} = $${params.length}`);
    }
    if (toStage === "rejected") {
      params.push(options.rejectReason);
      setClauses.push(`reject_reason = $${params.length}`);
    }
    if (toStage === "paid" && options.amountPaid != null) {
      params.push(options.amountPaid);
      setClauses.push(`amount_paid = $${params.length}`);
    }
    if (toStage === "weighed") {
      if (options.moisturePct != null) {
        params.push(options.moisturePct);
        setClauses.push(`moisture_pct = $${params.length}`);
      }
      if (options.weighbridgeToken) {
        params.push(options.weighbridgeToken);
        setClauses.push(`weighbridge_token = $${params.length}`);
      }
      if (options.gateNumber) {
        params.push(options.gateNumber);
        setClauses.push(`gate_number = $${params.length}`);
      }
    }
    if (toStage === "paid") {
      if (options.jformNumber) {
        params.push(options.jformNumber);
        setClauses.push(`jform_number = $${params.length}`);
      }
      if (options.utrReference) {
        params.push(options.utrReference);
        setClauses.push(`utr_reference = $${params.length}`);
      }
    }

    params.push(bookingId);
    const updateRes = await client.query<BookingRow>(
      `UPDATE bookings SET ${setClauses.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params
    );

    await client.query(
      `INSERT INTO status_events (booking_id, from_stage, to_stage, triggered_by, triggered_by_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [bookingId, booking.stage, toStage, triggeredBy, triggeredById, options.rejectReason ?? null]
    );

    await client.query("COMMIT");
    return mapBooking(updateRes.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export interface BookingWithFarmer extends Booking {
  farmerName: string;
  farmerPhone: string;
}

export interface CentreDashboard {
  counts: Record<BookingStage, number>;
  queue: BookingWithFarmer[];
  waiting: BookingWithFarmer[];
}

export async function getCentreDashboard(centreId: string, date: string): Promise<CentreDashboard> {
  const { rows } = await pool.query(
    `SELECT b.*, f.name AS farmer_name, f.phone AS farmer_phone
     FROM bookings b
     JOIN farmers f ON f.id = b.farmer_id
     WHERE b.centre_id = $1 AND b.date = $2
     ORDER BY b.time_window, b.arrived_at ASC NULLS LAST, b.created_at ASC`,
    [centreId, date]
  );

  const counts: Record<BookingStage, number> = {
    booked: 0,
    arrived: 0,
    weighed: 0,
    accepted: 0,
    rejected: 0,
    paid: 0,
    cancelled: 0,
  };
  const queue: BookingWithFarmer[] = [];
  const waiting: BookingWithFarmer[] = [];

  for (const row of rows) {
    counts[row.stage as BookingStage] += 1;
    const item: BookingWithFarmer = {
      ...mapBooking(row),
      farmerName: row.farmer_name,
      farmerPhone: row.farmer_phone,
    };
    if (row.stage === "booked") waiting.push(item);
    else if (row.stage !== "cancelled") queue.push(item);
  }

  return { counts, queue, waiting };
}

export async function listAgentBookings(
  agentId: string,
  filter: { date?: string; stage?: string }
): Promise<Booking[]> {
  const conditions = ["agent_id = $1"];
  const params: unknown[] = [agentId];

  if (filter.date) {
    params.push(filter.date);
    conditions.push(`date = $${params.length}`);
  }
  if (filter.stage) {
    params.push(filter.stage);
    conditions.push(`stage = $${params.length}`);
  }

  const { rows } = await pool.query<BookingRow>(
    `SELECT * FROM bookings WHERE ${conditions.join(" AND ")} ORDER BY date, time_window`,
    params
  );
  return rows.map(mapBooking);
}
