// src/lib/db.ts — PG pool for Next.js (DB-01)
// Direct PostgreSQL access is reserved for trusted system operations such as
// signed billing webhooks and dependency health checks. Tenant-facing queries
// must use a request-scoped Supabase client so PostgreSQL RLS sees auth.uid().
import { Pool } from 'pg';
import { getEnv } from './env';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  const env = getEnv();
  const isProd = env.NODE_ENV === 'production' || process.env.OKENG_ENV === 'staging' || process.env.OKENG_ENV === 'production';
  const sslCa = process.env.DATABASE_SSL_CA;

  pool = new Pool({
    connectionString: env.DATABASE_URL,
    // Never disable certificate verification for a hosted production database.
    ssl: isProd ? { rejectUnauthorized: true, ...(sslCa ? { ca: sslCa } : {}) } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('[db] Pool error', err);
  });

  console.log('[db] Pool created');
  return pool;
}

export async function checkDb(): Promise<{ up: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    await getPool().query('SELECT 1');
    return { up: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { up: false, error: err.message };
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[db] Pool closed');
  }
}
