import { Pool, types } from "pg";

// DATE columns (OID 1082) default-parse to local-midnight JS Date objects,
// which then serialize to the wrong calendar day in UTC (India is UTC+5:30).
// Keep them as plain "YYYY-MM-DD" strings instead.
types.setTypeParser(1082, (value: string) => value);

declare global {
  // eslint-disable-next-line no-var
  var __fasalSlotPgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  const useSSL =
    process.env.PGSSLMODE === "require" || connectionString?.includes("supabase.co");

  return new Pool({
    connectionString,
    max: 5,
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  });
}

// Reuse the pool across hot-reloads in dev and warm serverless invocations.
export const pool = global.__fasalSlotPgPool ?? createPool();
if (process.env.NODE_ENV !== "production") global.__fasalSlotPgPool = pool;
