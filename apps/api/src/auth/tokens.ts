import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool";
import type { AuthUser } from "@fasal-slot/types";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_DAYS = 7;

export function signAccessToken(user: AuthUser): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not set");
  return jwt.sign(user, secret, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AuthUser {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not set");
  return jwt.verify(token, secret) as AuthUser;
}

function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueRefreshToken(
  userId: string,
  userRole: AuthUser["role"]
): Promise<string> {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, user_role, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, userRole, hashRefreshToken(token), expiresAt]
  );
  return token;
}

export async function rotateRefreshToken(
  token: string
): Promise<{ userId: string; userRole: AuthUser["role"]; token: string } | null> {
  const tokenHash = hashRefreshToken(token);
  const { rows } = await pool.query(
    `SELECT id, user_id, user_role FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );
  if (rows.length === 0) return null;

  const { id, user_id: userId, user_role: userRole } = rows[0];
  await pool.query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1", [id]);
  const newToken = await issueRefreshToken(userId, userRole);
  return { userId, userRole, token: newToken };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await pool.query(
    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1",
    [hashRefreshToken(token)]
  );
}

export const REFRESH_COOKIE_NAME = "refresh_token";
export const REFRESH_COOKIE_MAX_AGE_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
