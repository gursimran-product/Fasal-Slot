import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { getAgentPublicById } from "@/server/agents";

// Minimal public directory info (name + phone) — no credentials — so a
// farmer can see and call their assigned Arhtiya.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getBearerUser(req);
  if (!user) return NextResponse.json({ error: "missing access token" }, { status: 401 });

  const agent = await getAgentPublicById(params.id);
  if (!agent) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ agent });
}
