import { NextResponse, type NextRequest } from "next/server";
import { lookupBookingByRefAndPhone } from "@/server/bookings";

export async function GET(req: NextRequest, { params }: { params: { ref: string } }) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");

  if (!phone || !/^\d{10}$/.test(phone)) {
    return NextResponse.json({ error: "phone query param (10 digits) is required" }, { status: 400 });
  }

  const booking = await lookupBookingByRefAndPhone(params.ref, phone);
  if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ booking });
}
