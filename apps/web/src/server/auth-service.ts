import bcrypt from "bcryptjs";
import type { AuthUser } from "@fasal-slot/types";
import { pool } from "./db/pool";

export function isValidPhone(phone: unknown): phone is string {
  return typeof phone === "string" && /^\d{10}$/.test(phone);
}

export async function findUserByPhone(phone: string): Promise<AuthUser | null> {
  const farmer = await pool.query(
    "SELECT id, name, phone FROM farmers WHERE phone = $1",
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

export async function findUserById(
  id: string,
  role: AuthUser["role"]
): Promise<AuthUser | null> {
  if (role === "farmer") {
    const { rows } = await pool.query("SELECT id, name, phone FROM farmers WHERE id = $1", [id]);
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

export async function createFarmerStub(phone: string): Promise<AuthUser> {
  const { rows } = await pool.query(
    `INSERT INTO farmers (name, phone, language, created_by)
     VALUES ($1, $2, 'en', 'farmer')
     RETURNING id, name, phone`,
    ["Farmer", phone]
  );
  const f = rows[0];
  return { id: f.id, role: "farmer", name: f.name, phone: f.phone };
}

export async function authenticateWithPassword(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const govt = await pool.query(
    "SELECT id, name, email, password_hash, role, centre_id FROM govt_users WHERE email = $1 AND is_active = true",
    [email]
  );
  if (govt.rows.length > 0) {
    const g = govt.rows[0];
    if (!(await bcrypt.compare(password, g.password_hash))) return null;
    return {
      id: g.id,
      role: g.role === "oversight" ? "govt_oversight" : "govt_operator",
      name: g.name,
      email: g.email,
      centreId: g.centre_id,
    };
  }

  const agent = await pool.query(
    "SELECT id, name, email, password_hash, centre_id FROM agents WHERE email = $1 AND is_active = true",
    [email]
  );
  if (agent.rows.length > 0 && agent.rows[0].password_hash) {
    const a = agent.rows[0];
    if (!(await bcrypt.compare(password, a.password_hash))) return null;
    return {
      id: a.id,
      role: "agent",
      name: a.name,
      email: a.email,
      centreId: a.centre_id,
    };
  }

  return null;
}
