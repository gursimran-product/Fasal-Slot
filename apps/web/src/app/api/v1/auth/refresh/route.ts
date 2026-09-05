import { NextResponse, type NextRequest } from "next/server";
import { findUserById } from "@/server/auth-service";
import { rotateRefreshToken, signAccessToken, REFRESH_COOKIE_NAME } from "@/server/tokens";
import { refreshCookieOptions } from "@/server/cookies";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "missing refresh token" }, { status: 401 });
  }

  const rotated = await rotateRefreshToken(token);
  if (!rotated) {
    const res = NextResponse.json({ error: "invalid or expired refresh token" }, { status: 401 });
    res.cookies.delete(REFRESH_COOKIE_NAME);
    return res;
  }

  const user = await findUserById(rotated.userId, rotated.userRole);
  if (!user) {
    const res = NextResponse.json({ error: "user no longer exists" }, { status: 401 });
    res.cookies.delete(REFRESH_COOKIE_NAME);
    return res;
  }

  const accessToken = signAccessToken(user);
  const res = NextResponse.json({ access_token: accessToken, user });
  res.cookies.set(REFRESH_COOKIE_NAME, rotated.token, refreshCookieOptions);
  return res;
}
