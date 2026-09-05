import type { NextRequest } from "next/server";
import type { AuthUser } from "@fasal-slot/types";
import { verifyAccessToken } from "./tokens";

export function getBearerUser(req: NextRequest): AuthUser | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    return verifyAccessToken(header.slice("Bearer ".length));
  } catch {
    return null;
  }
}
