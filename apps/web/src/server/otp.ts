import crypto from "node:crypto";
import { pool } from "./db/pool";

export const OTP_TTL_SECONDS = 5 * 60;
const OTP_LENGTH = 4;

// Dev convenience only: these numbers always get a fixed OTP instead of a
// random one, so local testing doesn't require checking server logs. Never
// active in production regardless of what's in this map.
const DEV_STATIC_OTP: Record<string, string> = {
  "9123456780": "1234",
};

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function requestOtp(phone: string): Promise<string> {
  const staticOtp = process.env.NODE_ENV !== "production" ? DEV_STATIC_OTP[phone] : undefined;
  const otp =
    staticOtp ??
    crypto
      .randomInt(0, 10 ** OTP_LENGTH)
      .toString()
      .padStart(OTP_LENGTH, "0");
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await pool.query(
    `INSERT INTO otp_requests (phone, otp_hash, expires_at) VALUES ($1, $2, $3)`,
    [phone, hashOtp(otp), expiresAt]
  );

  // No SMS provider connected — the OTP is returned to the caller so the
  // login screen can display it directly instead of sending a real SMS.
  console.log(`[otp] ${phone} -> ${otp} (expires in ${OTP_TTL_SECONDS}s)`);
  return otp;
}

export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT id FROM otp_requests
     WHERE phone = $1 AND otp_hash = $2 AND used = false AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone, hashOtp(otp)]
  );
  if (rows.length === 0) return false;

  await pool.query("UPDATE otp_requests SET used = true WHERE id = $1", [rows[0].id]);
  return true;
}
