import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { getBookingById, getBookingStatusHistory, cancelBooking } from "@/server/bookings";

function canAccessBooking(user: { id: string; role: string }, booking: { farmerId: string; agentId: string | null }): boolean {
  if (user.role === "farmer") return user.id === booking.farmerId;
  if (user.role === "agent") return user.id === booking.agentId;
  return user.role === "govt_operator" || user.role === "govt_oversight";
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getBearerUser(req);
  if (!user) return NextResponse.json({ error: "missing access token" }, { status: 401 });

  const booking = await getBookingById(params.id);
  if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canAccessBooking(user, booking)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const statusHistory = await getBookingStatusHistory(booking.id);
  return NextResponse.json({ booking, statusHistory });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getBearerUser(req);
  if (!user) return NextResponse.json({ error: "missing access token" }, { status: 401 });
  if (user.role !== "farmer" && user.role !== "agent") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const booking = await getBookingById(params.id);
  if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canAccessBooking(user, booking)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const cancelled = await cancelBooking(booking.id, user.role, user.id);
  if (!cancelled) return NextResponse.json({ error: "already cancelled" }, { status: 409 });

  return new NextResponse(null, { status: 204 });
}
