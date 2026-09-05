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
  },
  attemptsLeft = 5
): Promise<Booking> {
  const refCode = generateRefCode();
  try {
    const { rows } = await client.query<BookingRow>(
      `INSERT INTO bookings (farmer_id, centre_id, agent_id, crop, date, time_window, ref_code, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [input.farmerId, input.centreId, input.agentId, input.crop, input.date, input.timeWindow, refCode, input.createdBy]
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
