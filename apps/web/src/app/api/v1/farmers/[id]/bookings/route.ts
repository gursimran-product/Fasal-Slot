import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { getFarmerById, canAccessFarmer } from "@/server/farmers";
import { listFarmerBookings } from "@/server/bookings";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getBearerUser(req);
  if (!user) return NextResponse.json({ error: "missing access token" }, { status: 401 });

  const farmer = await getFarmerById(params.id);
  if (!farmer) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canAccessFarmer(user, farmer)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const bookings = await listFarmerBookings(params.id);
  return NextResponse.json({ bookings });
}
