import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { lookupPlrsRecord } from "@/server/plrs-registry";

export async function GET(req: NextRequest) {
  const user = getBearerUser(req);
  if (!user || user.role !== "agent") {
    return NextResponse.json({ error: "only an agent can look up the registry" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q || !q.trim()) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  const record = await lookupPlrsRecord(q);
  if (!record) return NextResponse.json({ error: "no matching record" }, { status: 404 });

  return NextResponse.json({ record });
}
