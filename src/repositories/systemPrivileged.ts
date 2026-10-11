/**
 * SystemPrivilegedRepository — the only application boundary that creates a
 * Supabase service-role client. Each method is separately allowlisted; never
 * use this repository for ordinary tenant queries.
 */

import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getSystemPrivilegedSupabaseClient,
  type SystemPrivilegedOperationId,
} from '../lib/supabase/server';

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
}

export interface VerifiedEmbedCorpusRequest {
  /** Values must come from server-side embed verification, never request JSON. */
  workspaceId: string;
  authorizedCollectionIds: string[];
  embedId?: string;
}

export interface AuthUserProfile {
  id: string;
  auth_user_id: string;
  email: string;
  name: string;
  account_status: string;
  platform_role: string | null;
}

function getPrivilegedClient(operationId: SystemPrivilegedOperationId): SupabaseClient | null {
  try {
    return getSystemPrivilegedSupabaseClient(operationId);
  } catch {
    return null;
  }
}

function strictSupabaseMode(): boolean {
  const environment = (process.env.OKENG_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development')).toLowerCase();
  return environment === 'staging' || environment === 'production' || process.env.OKENG_DATA_MODE === 'supabase';
}

/** SRV-PRIV-01: Append a sanitized, append-only security audit event. */
export async function appendSecurityAuditLog(entry: SecurityAuditLogEntry): Promise<void> {
  const client = getPrivilegedClient('SRV-PRIV-01_SECURITY_AUDIT_LOG_APPEND');
  if (!client) {
    if (strictSupabaseMode()) throw new Error('Privileged audit writer is not configured.');
    console.warn('[AUDIT]', JSON.stringify({
      workspaceId: entry.workspaceId,
      action: entry.action,
      result: entry.result,
      actorIdHash: entry.actorId ? hashId(entry.actorId) : undefined,
    }));
    return;
  }

  const sanitizedReason = entry.metadata
    ? (JSON.stringify(sanitizeMetadata(entry.metadata)) || 'No additional details').slice(0, 2000)
    : 'No additional details';
  const { error } = await client.from('security_audit_logs').insert({
    id: entry.id || `audit_${randomUUID()}`,
    workspace_id: entry.workspaceId,
    actor_id: entry.actorId,
    event_type: entry.action.slice(0, 200),
    target_resource: (entry.targetResource || 'unspecified').slice(0, 500),
    outcome: entry.result,
    reason: sanitizedReason,
    created_at: entry.createdAt || new Date().toISOString(),
  });
  if (error) {
    if (strictSupabaseMode()) throw new Error(`Security audit append failed (${error.code || 'unknown'}).`);
    console.error('[AUDIT_WRITE_FAILED]', error.code || 'unknown');
  }
}

function sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const forbiddenKeys = ['password', 'token', 'signingSecret', 'secret', 'apiKey', 'authorization', 'cookie'];
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (forbiddenKeys.some((forbidden) => key.toLowerCase().includes(forbidden.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = value;
    }
  }
  return result;
}

function hashId(id: string): string {
  return createHash('sha256').update(id).digest('hex').slice(0, 16);
}

/** SRV-PRIV-02: Append usage only after the caller verified workspace access. */
export async function recordUsageEvent(event: UsageRecord): Promise<void> {
  const client = getPrivilegedClient('SRV-PRIV-02_USAGE_EVENT_APPEND');
  if (!client) {
    if (strictSupabaseMode()) throw new Error('Privileged usage writer is not configured.');
    console.warn('[USAGE]', JSON.stringify({ workspaceId: event.workspaceId, eventType: event.eventType }));
    return;
  }

  const { error } = await client.from('usage_records').insert({
    id: `usage_${randomUUID()}`,
    workspace_id: event.workspaceId,
    event_type: event.eventType,
    tokens_used: event.tokensUsed || 0,
    latency_ms: event.latencyMs || 0,
    answer_mode: event.answerMode || 'deterministic',
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Usage event append failed (${error.code || 'unknown'}).`);
}

/**
 * SRV-PRIV-03: Load only a server-verified embed scope. This method must not be
 * called with IDs copied from a browser request.
 */
export async function loadVerifiedEmbedCorpus(request: VerifiedEmbedCorpusRequest): Promise<{
  documents: any[];
  chunks: any[];
}> {
  const client = getPrivilegedClient('SRV-PRIV-03_VERIFIED_EMBED_CORPUS_READ');
  if (!client) {
    if (strictSupabaseMode()) throw new Error('Verified embed corpus access is not configured.');
    const { memoryRepositories } = await import('./memory.repository');
    const documents = await memoryRepositories.documents.listAuthorized({
      workspaceId: request.workspaceId,
      authorizedCollectionIds: request.authorizedCollectionIds,
    });
    return { documents, chunks: [] };
  }

  if (!request.workspaceId || request.authorizedCollectionIds.length === 0) {
    return { documents: [], chunks: [] };
  }

  const { data: documents, error: documentError } = await client
    .from('documents')
    .select('*')
    .eq('workspace_id', request.workspaceId)
    .in('collection_id', request.authorizedCollectionIds)
    .is('deleted_at', null)
    .eq('status', 'ready');
  if (documentError) throw new Error(`Verified corpus read failed (${documentError.code || 'unknown'}).`);

  const { data: chunks, error: chunkError } = await client
    .from('document_chunks')
    .select('*')
    .eq('workspace_id', request.workspaceId)
    .in('collection_id', request.authorizedCollectionIds);
  if (chunkError) throw new Error(`Verified corpus chunks read failed (${chunkError.code || 'unknown'}).`);

  return { documents: documents || [], chunks: chunks || [] };
}

/** SRV-PRIV-04: Read an existing profile by verified immutable Auth UUID only. */
export async function lookupAuthUserProfile(authUserId: string): Promise<AuthUserProfile | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authUserId)) {
    return null;
  }
  const client = getPrivilegedClient('SRV-PRIV-04_AUTH_USER_PROFILE_LOOKUP');
  if (!client) return null;

  const { data, error } = await client
    .from('users')
    .select('id, auth_user_id, email, name, account_status, platform_role')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (error) throw new Error(`Auth profile lookup failed (${error.code || 'unknown'}).`);
  return data as AuthUserProfile | null;
}

export const SystemPrivilegedRepository = {
  appendSecurityAuditLog,
  recordUsageEvent,
  loadVerifiedEmbedCorpus,
  lookupAuthUserProfile,
};
