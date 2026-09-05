import { REFRESH_COOKIE_MAX_AGE_SECONDS } from "./tokens";

export const refreshCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  path: "/",
};
