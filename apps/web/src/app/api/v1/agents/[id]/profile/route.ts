import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { getAgentFirmProfile, getAgentLinkedFarmersStats } from "@/server/agents";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getBearerUser(req);
  if (!user) return NextResponse.json({ error: "missing access token" }, { status: 401 });
  const isSelf = user.role === "agent" && user.id === params.id;
  const isGovt = user.role === "govt_operator" || user.role === "govt_oversight";
  if (!isSelf && !isGovt) {
    return NextResponse.json({ error: "not authorized to view this profile" }, { status: 403 });
  }

  const profile = await getAgentFirmProfile(params.id);
  if (!profile) return NextResponse.json({ error: "not found" }, { status: 404 });

  const stats = await getAgentLinkedFarmersStats(params.id);

  return NextResponse.json({ profile, stats });
}
