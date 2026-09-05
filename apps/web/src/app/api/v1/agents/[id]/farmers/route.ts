import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { listFarmersByAgent } from "@/server/farmers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getBearerUser(req);
  if (!user || user.role !== "agent" || user.id !== params.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const farmers = await listFarmersByAgent(params.id);
  return NextResponse.json({ farmers });
}
