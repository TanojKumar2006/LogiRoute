import pg from "pg";
import { env } from "./env.js";

// Supabase requires TLS. If DATABASE_SSL_CA is set the certificate is fully verified;
// otherwise the connection is encrypted but the certificate is not verified.
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 15_000,
  ssl: env.DATABASE_SSL_CA ? { ca: env.DATABASE_SSL_CA } : { rejectUnauthorized: false },
});

export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
