import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { getFarmerById } from "@/server/farmers";
import { createBatchBookings } from "@/server/bookings";

function isValidDate(date: unknown): date is string {
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export async function POST(req: NextRequest) {
  const user = getBearerUser(req);
  if (!user || user.role !== "agent") {
    return NextResponse.json({ error: "only an agent can create a batch booking" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { farmerIds, centreId, crop, date, timeWindow } = body ?? {};

  if (!Array.isArray(farmerIds) || farmerIds.length === 0 || !farmerIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "farmerIds must be a non-empty array of strings" }, { status: 400 });
  }
  if (typeof centreId !== "string" || !centreId) {
    return NextResponse.json({ error: "centreId is required" }, { status: 400 });
  }
  if (typeof crop !== "string" || !crop) {
    return NextResponse.json({ error: "crop is required" }, { status: 400 });
  }
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (typeof timeWindow !== "string" || !timeWindow) {
    return NextResponse.json({ error: "timeWindow is required" }, { status: 400 });
  }

  // Every farmer in the batch must actually be registered to this agent —
  // otherwise an agent could book slots against an arbitrary farmer id.
  const farmers = await Promise.all(farmerIds.map((id: string) => getFarmerById(id)));
  const invalid = farmers.some((f) => !f || f.agentId !== user.id);
  if (invalid) {
    return NextResponse.json({ error: "one or more farmers are not registered to this agent" }, { status: 403 });
  }

  const result = await createBatchBookings({
    farmerIds,
    centreId,
    agentId: user.id,
    crop,
    date,
    timeWindow,
  });

  if (result === "no_capacity_configured") {
    return NextResponse.json({ error: "no capacity configured for this centre/date/time window" }, { status: 400 });
  }

  return NextResponse.json(result, { status: 201 });
}
