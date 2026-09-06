import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { getFarmerById, canAccessFarmer, updateFarmerProfile } from "@/server/farmers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getBearerUser(req);
  if (!user) return NextResponse.json({ error: "missing access token" }, { status: 401 });

  const farmer = await getFarmerById(params.id);
  if (!farmer) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!canAccessFarmer(user, farmer)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({ farmer });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getBearerUser(req);
  if (!user) return NextResponse.json({ error: "missing access token" }, { status: 401 });
  if (user.role !== "farmer" || user.id !== params.id) {
    return NextResponse.json({ error: "only the farmer can edit their own profile" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, village, district, state } = body ?? {};

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
  }
  for (const [key, value] of Object.entries({ village, district, state })) {
    if (value !== undefined && value !== null && typeof value !== "string") {
      return NextResponse.json({ error: `${key} must be a string` }, { status: 400 });
    }
  }

  const updated = await updateFarmerProfile(params.id, {
    name: typeof name === "string" ? name.trim() : undefined,
    village: village === undefined ? undefined : village || null,
    district: district === undefined ? undefined : district || null,
    state: state === undefined ? undefined : state || null,
  });
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ farmer: updated });
}
