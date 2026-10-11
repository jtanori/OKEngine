// src/lib/usage.ts — Usage metering (from ANALYSIS-001)
// Tracks queries/mo, collections, files per workspace

import { getPool } from './db';

export type Plan = 'starter' | 'pro' | 'escala';
export type PlanInterval = 'monthly' | 'annual';

export const PLAN_LIMITS: Record<Plan, { queries: number; collections: number; files: number; storageBytes: number }> = {
  starter: { queries: 1000, collections: 1, files: 100, storageBytes: 1 * 1024 * 1024 * 1024 },
  pro: { queries: 10000, collections: 10, files: 1000, storageBytes: 10 * 1024 * 1024 * 1024 },
  escala: { queries: Infinity, collections: Infinity, files: Infinity, storageBytes: Infinity },
};

export interface Usage {
  workspace_id: string;
  period_start: string;
  period_end: string;
  queries_count: number;
  files_count: number;
  collections_count: number;
  storage_bytes: number;
}

export async function getUsage(workspaceId: string): Promise<Usage> {
  const pool = getPool();
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  // Try get existing
  const res = await pool.query('SELECT * FROM usage WHERE workspace_id = $1 AND period_start = $2', [workspaceId, periodStart]);
  if (res.rows.length > 0) return res.rows[0];

  // Create new
  const insert = await pool.query(
    'INSERT INTO usage (workspace_id, period_start, period_end, queries_count, files_count, collections_count, storage_bytes) VALUES ($1, $2, $3, 0, 0, 0, 0) RETURNING *',
    [workspaceId, periodStart, periodEnd]
  );
  return insert.rows[0];
}

export async function incrementQueries(workspaceId: string): Promise<void> {
  const pool = getPool();
  const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  await pool.query('UPDATE usage SET queries_count = queries_count + 1 WHERE workspace_id = $1 AND period_start = $2', [workspaceId, periodStart]);
}

export async function checkLimit(workspaceId: string, plan: Plan, type: 'queries' | 'collections' | 'files' | 'storage', currentCount?: number): Promise<{ allowed: boolean; limit: number; current: number }> {
  const limits = PLAN_LIMITS[plan];
  const usage = await getUsage(workspaceId);

  let current: number;
  let limit: number;

  switch (type) {
    case 'queries':
      current = usage.queries_count;
      limit = limits.queries;
      break;
    case 'collections':
      current = currentCount ?? usage.collections_count;
      limit = limits.collections;
      break;
    case 'files':
      current = currentCount ?? usage.files_count;
      limit = limits.files;
      break;
    case 'storage':
      current = usage.storage_bytes;
      limit = limits.storageBytes;
      break;
  }

  return { allowed: current < limit, limit, current };
}
