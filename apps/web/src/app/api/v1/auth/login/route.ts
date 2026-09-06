import { NextResponse, type NextRequest } from "next/server";
import { authenticateWithPassword } from "@/server/auth-service";
import { issueRefreshToken, signAccessToken, REFRESH_COOKIE_NAME } from "@/server/tokens";
import { refreshCookieOptions } from "@/server/cookies";
import { trackSignIn } from "@/server/analytics";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, password, token } = body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const user = await authenticateWithPassword(email, password, typeof token === "string" ? token : undefined);
  if (!user) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id, user.role);
  trackSignIn(user, "password");

  const res = NextResponse.json({ access_token: accessToken, user });
  res.cookies.set(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  return res;
}
