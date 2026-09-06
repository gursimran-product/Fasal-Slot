import { NextResponse, type NextRequest } from "next/server";
import { authenticateAgentWithLicense, isValidPhone } from "@/server/auth-service";
import { issueRefreshToken, signAccessToken, REFRESH_COOKIE_NAME } from "@/server/tokens";
import { refreshCookieOptions } from "@/server/cookies";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { licenseNumber, phone, mpin } = body ?? {};

  if (
    typeof licenseNumber !== "string" ||
    !licenseNumber.trim() ||
    !isValidPhone(phone) ||
    typeof mpin !== "string" ||
    !/^\d{6}$/.test(mpin)
  ) {
    return NextResponse.json({ error: "licenseNumber, phone, and a 6-digit mpin are required" }, { status: 400 });
  }

  const user = await authenticateAgentWithLicense(licenseNumber.trim(), phone, mpin);
  if (!user) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id, user.role);

  const res = NextResponse.json({ access_token: accessToken, user });
  res.cookies.set(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  return res;
}
