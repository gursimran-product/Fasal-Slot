import { Router } from "express";
import bcrypt from "bcryptjs";
import type { AuthUser } from "@fasal-slot/types";
import { pool } from "../db/pool";
import { requestOtp, verifyOtp, OTP_TTL_SECONDS } from "../auth/otp";
import {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  signAccessToken,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_MAX_AGE_MS,
} from "../auth/tokens";
import { authenticate } from "../auth/middleware";

const router = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  path: "/",
};

function isValidPhone(phone: unknown): phone is string {
  return typeof phone === "string" && /^\d{10}$/.test(phone);
}

async function findUserByPhone(phone: string): Promise<AuthUser | null> {
  const farmer = await pool.query(
    "SELECT id, name, phone, language FROM farmers WHERE phone = $1",
    [phone]
  );
  if (farmer.rows.length > 0) {
    const f = farmer.rows[0];
    return { id: f.id, role: "farmer", name: f.name, phone: f.phone };
  }

  const agent = await pool.query(
    "SELECT id, name, phone, centre_id FROM agents WHERE phone = $1 AND is_active = true",
    [phone]
  );
  if (agent.rows.length > 0) {
    const a = agent.rows[0];
    return { id: a.id, role: "agent", name: a.name, phone: a.phone, centreId: a.centre_id };
  }

  return null;
}

async function findUserById(id: string, role: AuthUser["role"]): Promise<AuthUser | null> {
  if (role === "farmer") {
    const { rows } = await pool.query(
      "SELECT id, name, phone FROM farmers WHERE id = $1",
      [id]
    );
    if (rows.length === 0) return null;
    return { id: rows[0].id, role: "farmer", name: rows[0].name, phone: rows[0].phone };
  }

  if (role === "agent") {
    const { rows } = await pool.query(
      "SELECT id, name, phone, email, centre_id FROM agents WHERE id = $1",
      [id]
    );
    if (rows.length === 0) return null;
    return {
      id: rows[0].id,
      role: "agent",
      name: rows[0].name,
      phone: rows[0].phone,
      email: rows[0].email,
      centreId: rows[0].centre_id,
    };
  }

  const { rows } = await pool.query(
    "SELECT id, name, email, role, centre_id FROM govt_users WHERE id = $1",
    [id]
  );
  if (rows.length === 0) return null;
  return {
    id: rows[0].id,
    role: rows[0].role === "oversight" ? "govt_oversight" : "govt_operator",
    name: rows[0].name,
    email: rows[0].email,
    centreId: rows[0].centre_id,
  };
}

async function createFarmerStub(phone: string): Promise<AuthUser> {
  const { rows } = await pool.query(
    `INSERT INTO farmers (name, phone, language, created_by)
     VALUES ($1, $2, 'en', 'farmer')
     RETURNING id, name, phone`,
    ["Farmer", phone]
  );
  const f = rows[0];
  return { id: f.id, role: "farmer", name: f.name, phone: f.phone };
}

async function issueSession(res: import("express").Response, user: AuthUser) {
  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id, user.role);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
  return { access_token: accessToken, user };
}

router.post("/otp/request", async (req, res) => {
  const { phone } = req.body ?? {};
  if (!isValidPhone(phone)) {
    return res.status(400).json({ error: "phone must be a 10-digit number" });
  }
  await requestOtp(phone);
  res.status(200).json({ expires_in: OTP_TTL_SECONDS });
});

router.post("/otp/verify", async (req, res) => {
  const { phone, otp } = req.body ?? {};
  if (!isValidPhone(phone) || typeof otp !== "string") {
    return res.status(400).json({ error: "phone and otp are required" });
  }

  const valid = await verifyOtp(phone, otp);
  if (!valid) {
    return res.status(401).json({ error: "invalid or expired otp" });
  }

  let user = await findUserByPhone(phone);
  if (!user) user = await createFarmerStub(phone);

  const session = await issueSession(res, user);
  res.status(200).json(session);
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "email and password are required" });
  }

  const govt = await pool.query(
    "SELECT id, name, email, password_hash, role, centre_id FROM govt_users WHERE email = $1 AND is_active = true",
    [email]
  );
  if (govt.rows.length > 0) {
    const g = govt.rows[0];
    if (!(await bcrypt.compare(password, g.password_hash))) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    const user: AuthUser = {
      id: g.id,
      role: g.role === "oversight" ? "govt_oversight" : "govt_operator",
      name: g.name,
      email: g.email,
      centreId: g.centre_id,
    };
    return res.status(200).json(await issueSession(res, user));
  }

  const agent = await pool.query(
    "SELECT id, name, email, password_hash, centre_id FROM agents WHERE email = $1 AND is_active = true",
    [email]
  );
  if (agent.rows.length > 0 && agent.rows[0].password_hash) {
    const a = agent.rows[0];
    if (!(await bcrypt.compare(password, a.password_hash))) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    const user: AuthUser = {
      id: a.id,
      role: "agent",
      name: a.name,
      email: a.email,
      centreId: a.centre_id,
    };
    return res.status(200).json(await issueSession(res, user));
  }

  res.status(401).json({ error: "invalid credentials" });
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "missing refresh token" });

  const rotated = await rotateRefreshToken(token);
  if (!rotated) {
    res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
    return res.status(401).json({ error: "invalid or expired refresh token" });
  }

  res.cookie(REFRESH_COOKIE_NAME, rotated.token, cookieOptions);

  const user = await findUserById(rotated.userId, rotated.userRole);
  if (!user) {
    res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
    return res.status(401).json({ error: "user no longer exists" });
  }

  const accessToken = signAccessToken(user);
  res.status(200).json({ access_token: accessToken });
});

router.post("/logout", authenticate, async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (token) await revokeRefreshToken(token);
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
  res.status(204).send();
});

export default router;
