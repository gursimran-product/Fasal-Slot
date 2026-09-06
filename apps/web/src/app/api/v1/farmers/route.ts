import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { createFarmer, PHONE_ALREADY_REGISTERED } from "@/server/farmers";
import { isValidPhone } from "@/server/auth-service";
import { verifyConsentToken } from "@/server/consent-token";

const VALID_LANGUAGES = ["en", "hi", "pa"];

export async function POST(req: NextRequest) {
  const user = getBearerUser(req);
  // Farmers self-register via OTP verify (which auto-creates a stub record);
  // this endpoint is for an agent (or, in future, a helpline operator) adding
  // a farmer on their behalf.
  if (!user || user.role !== "agent") {
    return NextResponse.json({ error: "only an agent can register a farmer here" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, phone, village, district, state, language, consentToken, plrs } = body ?? {};

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: "phone must be a 10-digit number" }, { status: 400 });
  }
  if (!VALID_LANGUAGES.includes(language)) {
    return NextResponse.json({ error: "language must be one of en, hi, pa" }, { status: 400 });
  }
  if (typeof consentToken !== "string" || !verifyConsentToken(consentToken, phone)) {
    return NextResponse.json(
      { error: "farmer consent must be OTP-verified before registration" },
      { status: 400 }
    );
  }

  const result = await createFarmer({
    name: name.trim(),
    phone,
    village,
    district,
    state,
    language,
    agentId: user.id,
    createdBy: "agent",
    plrs: plrs && typeof plrs === "object" ? plrs : undefined,
  });

  if (result === PHONE_ALREADY_REGISTERED) {
    return NextResponse.json({ error: "a farmer with this phone is already registered" }, { status: 409 });
  }

  return NextResponse.json({ farmer: result }, { status: 201 });
}
