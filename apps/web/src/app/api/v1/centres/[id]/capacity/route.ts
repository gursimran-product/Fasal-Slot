import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { getCentreCapacity } from "@/server/centres";

function isValidDate(date: string | null): date is string {
  return !!date && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getBearerUser(req)) {
    return NextResponse.json({ error: "missing access token" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const timeWindows = await getCentreCapacity(params.id, date);
  return NextResponse.json({ time_windows: timeWindows });
}
