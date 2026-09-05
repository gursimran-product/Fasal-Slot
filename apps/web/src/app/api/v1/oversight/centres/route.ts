import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { getOversightRollup } from "@/server/centres";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const user = getBearerUser(req);
  if (!user || user.role !== "govt_oversight") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? todayIso();
  const state = searchParams.get("state") ?? undefined;

  const centres = await getOversightRollup(date, state);
  return NextResponse.json({ centres });
}
