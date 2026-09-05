import { NextResponse, type NextRequest } from "next/server";
import {
  isValidPhone,
  findUserByPhone,
  createFarmerStub,
} from "@/server/auth-service";
import { verifyOtp } from "@/server/otp";
import { issueRefreshToken, signAccessToken, REFRESH_COOKIE_NAME } from "@/server/tokens";
import { refreshCookieOptions } from "@/server/cookies";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { phone, otp } = body ?? {};

  if (!isValidPhone(phone) || typeof otp !== "string") {
    return NextResponse.json({ error: "phone and otp are required" }, { status: 400 });
  }

  const valid = await verifyOtp(phone, otp);
  if (!valid) {
    return NextResponse.json({ error: "invalid or expired otp" }, { status: 401 });
  }

  const user = (await findUserByPhone(phone)) ?? (await createFarmerStub(phone));

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id, user.role);

  const res = NextResponse.json({ access_token: accessToken, user });
  res.cookies.set(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  return res;
}
