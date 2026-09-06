import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { rescheduleBooking } from "@/server/bookings";

function isValidDate(date: unknown): date is string {
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getBearerUser(req);
  if (!user) return NextResponse.json({ error: "missing access token" }, { status: 401 });
  if (user.role !== "farmer") {
    return NextResponse.json({ error: "only a farmer can reschedule their own booking" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { centreId, date, timeWindow, reason } = body ?? {};

  if (typeof centreId !== "string" || !centreId) {
    return NextResponse.json({ error: "centreId is required" }, { status: 400 });
  }
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (typeof timeWindow !== "string" || !timeWindow) {
    return NextResponse.json({ error: "timeWindow is required" }, { status: 400 });
  }
  if (reason != null && typeof reason !== "string") {
    return NextResponse.json({ error: "reason must be a string" }, { status: 400 });
  }

  const result = await rescheduleBooking(params.id, user.id, {
    centreId,
    date,
    timeWindow,
    reason: reason || null,
  });

  if (result === "not_found") {
    return NextResponse.json({ error: "booking not found" }, { status: 404 });
  }
  if (result === "not_booked_stage") {
    return NextResponse.json({ error: "only a booking still in the booked stage can be rescheduled" }, { status: 409 });
  }
  if (result === "past_cutoff") {
    return NextResponse.json({ error: "too close to the scheduled gate entry to reschedule" }, { status: 409 });
  }
  if (result === "no_capacity_configured") {
    return NextResponse.json({ error: "no capacity configured for this centre/date/time window" }, { status: 400 });
  }
  if (result === "full") {
    return NextResponse.json({ error: "this time window is fully booked" }, { status: 409 });
  }

  return NextResponse.json({ booking: result }, { status: 201 });
}
