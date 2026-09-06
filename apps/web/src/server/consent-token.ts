import jwt from "jsonwebtoken";

const CONSENT_TOKEN_TTL = "10m";

interface ConsentTokenPayload {
  phone: string;
  purpose: "farmer-consent";
}

// Issued after a farmer's phone is OTP-verified during the agent add-farmer
// flow, so the actual farmer-creation call can prove consent was checked
// without re-consuming the (single-use) OTP.
export function signConsentToken(phone: string): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not set");
  const payload: ConsentTokenPayload = { phone, purpose: "farmer-consent" };
  return jwt.sign(payload, secret, { expiresIn: CONSENT_TOKEN_TTL });
}

export function verifyConsentToken(token: string, phone: string): boolean {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not set");
  try {
    const payload = jwt.verify(token, secret) as ConsentTokenPayload;
    return payload.purpose === "farmer-consent" && payload.phone === phone;
  } catch {
    return false;
  }
}
