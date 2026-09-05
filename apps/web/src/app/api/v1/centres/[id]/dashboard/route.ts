import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { getCentreDashboard } from "@/server/bookings";

function isValidDate(date: string | null): date is string {
  return !!date && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getBearerUser(req);
  if (!user || (user.role !== "govt_operator" && user.role !== "govt_oversight")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const dashboard = await getCentreDashboard(params.id, date);
  return NextResponse.json(dashboard);
}
