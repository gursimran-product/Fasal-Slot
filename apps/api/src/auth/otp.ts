import crypto from "node:crypto";
import { redis } from "../redis";

const OTP_TTL_SECONDS = 5 * 60;
const OTP_LENGTH = 4;

function otpKey(phone: string): string {
  return `otp:${phone}`;
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function requestOtp(phone: string): Promise<void> {
  const otp = crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
  await redis.set(otpKey(phone), hashOtp(otp), { EX: OTP_TTL_SECONDS });
  // SMS provider not integrated yet (Phase 2, Week 5) — log for local/dev testing.
  console.log(`[otp] ${phone} -> ${otp} (expires in ${OTP_TTL_SECONDS}s)`);
}

export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const stored = await redis.get(otpKey(phone));
  if (!stored) return false;
  const matches = stored === hashOtp(otp);
  if (matches) await redis.del(otpKey(phone));
  return matches;
}

export { OTP_TTL_SECONDS };
