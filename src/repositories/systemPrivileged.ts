/**
 * SystemPrivilegedRepository - Isolates SUPABASE_SERVICE_ROLE_KEY
 * Exports only 4 audited methods per SEC-01 §4
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSystemPrivilegedSupabaseClient } from '../lib/supabase/server';

export interface SecurityAuditLogEntry {
  id?: string;
  workspaceId: string;
  actorId: string;
  action: string;
  targetResource?: string;
  result: 'ALLOW' | 'DENY';
  metadata?: Record<string, unknown>;
  ipHash?: string;
  createdAt?: string;
}

export interface UsageRecord {
  workspaceId: string;
  eventType: string;
  userId?: string;
  sessionId?: string;
  tokensUsed?: number;
  latencyMs?: number;
  answerMode?: string;
  createdAt?: string;
}

export interface VerifiedEmbedCorpusRequest {
  workspaceId: string;
  authorizedCollectionIds: string[];
  embedId?: string;
}

export interface VerifiedAuthUser {
  id: string;
  email: string;
  name?: string;
  platformRole?: string;
}

function getPrivilegedClient(): SupabaseClient | null {
  try {
    return getSystemPrivilegedSupabaseClient('SRV-PRIV-02_SECURITY_AUDIT_LOG_APPEND');
  } catch {
    return null;
  }
}

/**
 * SRV-PRIV-01: Append security audit log (append-only)
 */
export async function appendSecurityAuditLog(entry: SecurityAuditLogEntry): Promise<void> {
  const client = getPrivilegedClient();
  if (!client) {
    // In dev without DB, log to console but don't fail
    console.warn('[AUDIT]', JSON.stringify({
      workspaceId: entry.workspaceId,
      action: entry.action,
      result: entry.result,
      actorIdHash: entry.actorId ? hashId(entry.actorId) : undefined,
    }));
    return;
  }

  // Sanitize PII/secrets before write
  const sanitized = {
    id: entry.id || `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    workspace_id: entry.workspaceId,
    actor_id: entry.actorId,
    action: entry.action,
    target_resource: entry.targetResource?.slice(0, 500),
    result: entry.result,
    metadata: entry.metadata ? JSON.stringify(sanitizeMetadata(entry.metadata)) : null,
    ip_hash: entry.ipHash,
    created_at: entry.createdAt || new Date().toISOString(),
  };

  const { error } = await client.from('security_audit_logs').insert(sanitized);
  if (error) {
    console.error('[AUDIT_WRITE_FAILED]', error.message);
    // Don't throw - audit failure shouldn't break main flow, but log
  }
}

function sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const forbiddenKeys = ['password', 'token', 'signingSecret', 'secret', 'apiKey', 'authorization', 'cookie'];
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    const lower = k.toLowerCase();
    if (forbiddenKeys.some(fk => lower.includes(fk))) {
      result[k] = '[REDACTED]';
    } else {
      result[k] = v;
    }
  }
  return result;
}

function hashId(id: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(id).digest('hex').slice(0, 16);
}

/**
 * SRV-PRIV-02: Record usage event (append-only)
 */
export async function recordUsageEvent(event: UsageRecord): Promise<void> {
  const client = getPrivilegedClient();
  if (!client) {
    console.warn('[USAGE]', JSON.stringify(event));
    return;
  }

  const row = {
    id: `usage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    workspace_id: event.workspaceId,
    event_type: event.eventType,
    user_id: event.userId,
    session_id: event.sessionId,
    tokens_used: event.tokensUsed || 0,
    latency_ms: event.latencyMs || 0,
    answer_mode: event.answerMode,
    created_at: event.createdAt || new Date().toISOString(),
  };

  const { error } = await client.from('usage_records').insert(row);
  if (error) {
    console.error('[USAGE_WRITE_FAILED]', error.message);
  }
}

/**
 * SRV-PRIV-03: Load verified embed corpus (server-resolved scope only)
 */
export async function loadVerifiedEmbedCorpus(request: VerifiedEmbedCorpusRequest): Promise<{
  documents: any[];
  chunks: any[];
}> {
  const client = getPrivilegedClient();
  if (!client) {
    // Fallback to memory repositories in dev
    const { memoryRepositories } = await import('./memory.repository');
    const docs = await memoryRepositories.documents.listAuthorized({
      workspaceId: request.workspaceId,
      authorizedCollectionIds: request.authorizedCollectionIds,
    });
    return { documents: docs, chunks: [] };
  }

  // Strictly filter by workspace_id and authorized collectionIds
  const { data: documents, error: docError } = await client
    .from('documents')
    .select('*')
    .eq('workspace_id', request.workspaceId)
    .in('collection_id', request.authorizedCollectionIds)
    .is('deleted_at', null)
    .eq('status', 'ready');

  if (docError) {
    throw new Error(`Failed to load verified corpus: ${docError.message}`);
  }

  const { data: chunks, error: chunkError } = await client
    .from('document_chunks')
    .select('*')
    .eq('workspace_id', request.workspaceId)
    .in('collection_id', request.authorizedCollectionIds);

  if (chunkError) {
    console.warn('[CORPUS_CHUNKS_FAILED]', chunkError.message);
    return { documents: documents || [], chunks: [] };
  }

  return { documents: documents || [], chunks: chunks || [] };
}

/**
 * SRV-PRIV-04: Sync authenticated user account
 */
export async function syncAuthenticatedUserAccount(user: VerifiedAuthUser): Promise<any> {
  const client = getPrivilegedClient();
  if (!client) {
    return {
      id: user.id,
      email: user.email,
      name: user.name || user.email.split('@')[0],
      platform_role: user.platformRole || 'USER',
      account_status: 'ACTIVE',
    };
  }

  // Upsert user
  const { data, error } = await client
    .from('users')
    .upsert({
      id: user.id,
      email: user.email,
      name: user.name || user.email.split('@')[0],
      platform_role: user.platformRole || 'USER',
      account_status: 'ACTIVE',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('[USER_SYNC_FAILED]', error.message);
    throw new Error(`Failed to sync user account: ${error.message}`);
  }

  return data;
}

export const SystemPrivilegedRepository = {
  appendSecurityAuditLog,
  recordUsageEvent,
  loadVerifiedEmbedCorpus,
  syncAuthenticatedUserAccount,
};
