import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { listAgentBookings } from "@/server/bookings";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getBearerUser(req);
  if (!user || user.role !== "agent" || user.id !== params.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const bookings = await listAgentBookings(params.id, {
    date: searchParams.get("date") ?? undefined,
    stage: searchParams.get("stage") ?? undefined,
  });

  return NextResponse.json({ bookings });
}
