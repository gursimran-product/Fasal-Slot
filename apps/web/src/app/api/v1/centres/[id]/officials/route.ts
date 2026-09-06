import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { listMandiOfficials } from "@/server/agents";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getBearerUser(req)) {
    return NextResponse.json({ error: "missing access token" }, { status: 401 });
  }
  const officials = await listMandiOfficials(params.id);
  return NextResponse.json({ officials });
}
