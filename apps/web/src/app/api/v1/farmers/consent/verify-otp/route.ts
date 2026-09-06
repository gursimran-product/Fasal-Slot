import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { isValidPhone } from "@/server/auth-service";
import { verifyOtp } from "@/server/otp";
import { signConsentToken } from "@/server/consent-token";

export async function POST(req: NextRequest) {
  const user = getBearerUser(req);
  if (!user || user.role !== "agent") {
    return NextResponse.json({ error: "only an agent can verify farmer consent" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { phone, otp } = body ?? {};

  if (!isValidPhone(phone) || typeof otp !== "string") {
    return NextResponse.json({ error: "phone and otp are required" }, { status: 400 });
  }

  const valid = await verifyOtp(phone, otp);
  if (!valid) {
    return NextResponse.json({ error: "invalid or expired otp" }, { status: 401 });
  }

  return NextResponse.json({ consentToken: signConsentToken(phone) });
}
