import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { getYardStatus, upsertYardStatus } from "@/server/yard-status";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getBearerUser(req)) {
    return NextResponse.json({ error: "missing access token" }, { status: 401 });
  }
  const status = await getYardStatus(params.id);
  return NextResponse.json({ yardStatus: status });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getBearerUser(req);
  if (!user || user.role !== "agent") {
    return NextResponse.json({ error: "only an agent can report yard status" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { weighbridgeLanesOccupied, weighbridgeLanesTotal, gunnyBagStockPct, storageLiftingPct } = body ?? {};

  if (typeof weighbridgeLanesOccupied !== "number" || typeof weighbridgeLanesTotal !== "number") {
    return NextResponse.json(
      { error: "weighbridgeLanesOccupied and weighbridgeLanesTotal must be numbers" },
      { status: 400 }
    );
  }

  const status = await upsertYardStatus(params.id, user.id, {
    weighbridgeLanesOccupied,
    weighbridgeLanesTotal,
    gunnyBagStockPct: typeof gunnyBagStockPct === "number" ? gunnyBagStockPct : null,
    storageLiftingPct: typeof storageLiftingPct === "number" ? storageLiftingPct : null,
  });
  return NextResponse.json({ yardStatus: status });
}
