import { NextResponse, type NextRequest } from "next/server";
import { isValidPhone } from "@/server/auth-service";
import { requestOtp, OTP_TTL_SECONDS } from "@/server/otp";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { phone } = body ?? {};

  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: "phone must be a 10-digit number" }, { status: 400 });
  }

  await requestOtp(phone);
  return NextResponse.json({ expires_in: OTP_TTL_SECONDS });
}
