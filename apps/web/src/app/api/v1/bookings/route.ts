import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { getFarmerById } from "@/server/farmers";
import { createBooking } from "@/server/bookings";

function isValidDate(date: unknown): date is string {
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export async function POST(req: NextRequest) {
  const user = getBearerUser(req);
  if (!user) return NextResponse.json({ error: "missing access token" }, { status: 401 });
  if (user.role !== "farmer" && user.role !== "agent") {
    return NextResponse.json({ error: "only a farmer or agent can create a booking" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { centreId, crop, date, timeWindow, quantityQtl, vehicleNumber, driverName, moistureDeclared } = body ?? {};

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
  if (typeof quantityQtl !== "number" || !Number.isFinite(quantityQtl) || quantityQtl < 1 || quantityQtl > 500) {
    return NextResponse.json({ error: "quantityQtl must be a number between 1 and 500" }, { status: 400 });
  }
  if (moistureDeclared !== true) {
    return NextResponse.json({ error: "moisture declaration is required" }, { status: 400 });
  }
  if (vehicleNumber != null && typeof vehicleNumber !== "string") {
    return NextResponse.json({ error: "vehicleNumber must be a string" }, { status: 400 });
  }
  if (driverName != null && typeof driverName !== "string") {
    return NextResponse.json({ error: "driverName must be a string" }, { status: 400 });
  }

  let farmerId: string;
  let agentId: string | null;

  if (user.role === "farmer") {
    farmerId = user.id;
    agentId = null;
  } else {
    if (typeof body.farmerId !== "string" || !body.farmerId) {
      return NextResponse.json({ error: "farmerId is required" }, { status: 400 });
    }
    const farmer = await getFarmerById(body.farmerId);
    if (!farmer || farmer.agentId !== user.id) {
      return NextResponse.json({ error: "farmer is not registered to this agent" }, { status: 403 });
    }
    farmerId = farmer.id;
    agentId = user.id;
  }

  const result = await createBooking({
    farmerId,
    centreId,
    agentId,
    crop,
    date,
    timeWindow,
    createdBy: user.role,
    quantityQtl,
    vehicleNumber: vehicleNumber || null,
    driverName: driverName || null,
    moistureDeclared: true,
  });

  if (result === "no_capacity_configured") {
    return NextResponse.json({ error: "no capacity configured for this centre/date/time window" }, { status: 400 });
  }
  if (result === "full") {
    return NextResponse.json({ error: "this time window is fully booked" }, { status: 409 });
  }

  return NextResponse.json({ booking: result }, { status: 201 });
}
