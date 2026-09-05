import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { listCentres } from "@/server/centres";

export async function GET(req: NextRequest) {
  if (!getBearerUser(req)) {
    return NextResponse.json({ error: "missing access token" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const centres = await listCentres({
    state: searchParams.get("state") ?? undefined,
    district: searchParams.get("district") ?? undefined,
    crop: searchParams.get("crop") ?? undefined,
  });

  return NextResponse.json({ centres });
}
