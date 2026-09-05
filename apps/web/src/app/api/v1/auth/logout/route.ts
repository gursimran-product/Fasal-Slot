import { NextResponse, type NextRequest } from "next/server";
import { getBearerUser } from "@/server/request-auth";
import { revokeRefreshToken, REFRESH_COOKIE_NAME } from "@/server/tokens";

export async function POST(req: NextRequest) {
  if (!getBearerUser(req)) {
    return NextResponse.json({ error: "missing access token" }, { status: 401 });
  }

  const token = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (token) await revokeRefreshToken(token);

  const res = new NextResponse(null, { status: 204 });
  res.cookies.delete(REFRESH_COOKIE_NAME);
  return res;
}
