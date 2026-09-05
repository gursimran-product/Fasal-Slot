import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { getFarmerById, updateFarmerLanguage, canAccessFarmer } from "@/server/farmers";

const VALID_LANGUAGES = ["en", "hi", "pa"];

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getBearerUser(req);
  if (!user) return NextResponse.json({ error: "missing access token" }, { status: 401 });

  const farmer = await getFarmerById(params.id);
  if (!farmer) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!canAccessFarmer(user, farmer)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { language } = body ?? {};
  if (!VALID_LANGUAGES.includes(language)) {
    return NextResponse.json({ error: "language must be one of en, hi, pa" }, { status: 400 });
  }

  const updated = await updateFarmerLanguage(params.id, language);
  return NextResponse.json({ farmer: updated });
}
