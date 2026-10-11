import type {
  RepositoryRegistry,
  RetrievalService,
  AuthorizedRetrievalQuery,
  RetrievedChunkResult,
} from './types'
import { memoryRepositories, MemoryRetrievalService } from './memory.repository';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseRepositories } from './supabase.repository';
import { isSupabaseConfigured } from '../lib/supabase/server';

export * from './types';

export class StartupConfigError extends Error {
  public readonly code = 'STARTUP_CONFIG_INVALID';

  constructor(message: string) {
    super(message);
    this.name = 'StartupConfigError';
  }
}

export class DatabaseUnavailableError extends Error {
  public readonly status = 503;
  public readonly code = 'DATABASE_UNAVAILABLE';

  constructor(message: string) {
    super(message);
    this.name = 'DatabaseUnavailableError';
  }
}

/**
 * Validates that staging and production environments never start in memory mode
 * or without required Supabase credentials (P0-DATA-01 / REPRO-06).
 */
export function validateStartupDataMode(envOverride?: {
  OKENG_ENV?: string;
  OKENG_DATA_MODE?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}): { valid: true; env: string; dataMode: string } {
  const runtimeProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  const env = (runtimeProduction ? 'production' : envOverride?.OKENG_ENV ?? process.env.OKENG_ENV ?? 'development').toLowerCase();
  const dataMode = (
    envOverride?.OKENG_DATA_MODE ??
    process.env.OKENG_DATA_MODE ??
    (env === 'staging' || env === 'production' ? 'supabase' : 'memory')
  ).toLowerCase();

  if (env === 'staging' || env === 'production') {
    if (dataMode !== 'supabase') {
      throw new StartupConfigError(
        `[STARTUP_CONFIG_INVALID] OKENG_ENV='${env}' requires OKENG_DATA_MODE='supabase' (received '${dataMode}'). In-memory seed fallback is forbidden in staging/production.`
      );
    }
    const url = envOverride?.SUPABASE_URL ?? process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const anonKey =
      envOverride?.SUPABASE_ANON_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.VITE_SUPABASE_ANON_KEY;
    const serviceKey =
      envOverride?.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceKey) {
      throw new StartupConfigError(
        `[STARTUP_CONFIG_INVALID] OKENG_ENV='${env}' requires SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.`
      );
    }
  } else if (dataMode === 'supabase') {
    const url = envOverride?.SUPABASE_URL ?? process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const anonKey = envOverride?.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
    const serviceKey = envOverride?.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceKey) {
      throw new StartupConfigError(
        '[STARTUP_CONFIG_INVALID] OKENG_DATA_MODE=supabase requires SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.'
      );
    }
  }

  return { valid: true, env, dataMode };
}

export function shouldEnforceFailClosedPersistence(): boolean {
  const runtimeProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  const env = (runtimeProduction ? 'production' : process.env.OKENG_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  const mode = (process.env.OKENG_DATA_MODE || '').toLowerCase();
  return env === 'staging' || env === 'production' || mode === 'supabase';
}


async function executeFailClosedRepoCall<T>(
  operationName: string,
  memoryCall: () => Promise<T>
): Promise<T> {
  if (shouldEnforceFailClosedPersistence()) {
    if (!isSupabaseConfigured()) {
      throw new DatabaseUnavailableError(
        `[DATABASE_UNAVAILABLE] Cannot execute ${operationName}: Supabase persistence is not configured and fail-closed mode is active.`
      );
    }
    // A singleton client has no request JWT, so it cannot safely execute a
    // tenant query. Route handlers must use createUserScopedRepositories().
    throw new DatabaseUnavailableError(
      `[DATABASE_UNAVAILABLE] ${operationName} requires a request-scoped Supabase Auth client.`
    );
  }

  return memoryCall();
}

export class HybridRetrievalService implements RetrievalService {
  private memoryService = new MemoryRetrievalService();

  async retrieveAuthorizedChunks(
    query: AuthorizedRetrievalQuery
  ): Promise<RetrievedChunkResult[]> {
    if (query.authorizedCollectionIds.length === 0) {
      return [];
    }

    if (shouldEnforceFailClosedPersistence()) {
      throw new DatabaseUnavailableError(
        '[DATABASE_UNAVAILABLE] Retrieval requires a request-scoped Supabase Auth client.'
      );
    }

    return this.memoryService.retrieveAuthorizedChunks(query);
  }
}

export function createUserScopedRepositories(client: SupabaseClient): RepositoryRegistry {
  return createSupabaseRepositories(client);
}

export const repositories: RepositoryRegistry & {
  getAdapterStatus: () => {
    mode: 'supabase-live' | 'memory-fallback' | 'fail-closed-unconfigured';
    supabaseConfigured: boolean;
    failClosedEnforced: boolean;
  };
} = {
  workspaces: {
    getBySlug: (slug) =>
      executeFailClosedRepoCall(
        'workspaces.getBySlug',
      () => memoryRepositories.workspaces.getBySlug(slug)
      ),
    getById: (id) =>
      executeFailClosedRepoCall(
        'workspaces.getById',
      () => memoryRepositories.workspaces.getById(id)
      ),
    updateSettings: (id, patch) =>
      executeFailClosedRepoCall(
        'workspaces.updateSettings',
      () => memoryRepositories.workspaces.updateSettings(id, patch)
      ),
  },
  collections: {
    listByWorkspace: (wsId) =>
      executeFailClosedRepoCall(
        'collections.listByWorkspace',
      () => memoryRepositories.collections.listByWorkspace(wsId)
      ),
    getById: (wsId, colId) =>
      executeFailClosedRepoCall(
        'collections.getById',
      () => memoryRepositories.collections.getById(wsId, colId)
      ),
    create: (col) =>
      executeFailClosedRepoCall(
        'collections.create',
      () => memoryRepositories.collections.create(col)
      ),
    update: (wsId, colId, patch) =>
      executeFailClosedRepoCall(
        'collections.update',
      () => memoryRepositories.collections.update(wsId, colId, patch)
      ),
  },
  documents: {
    listAuthorized: (params) =>
      executeFailClosedRepoCall(
        'documents.listAuthorized',
      () => memoryRepositories.documents.listAuthorized(params)
      ),
    getById: (wsId, docId) =>
      executeFailClosedRepoCall(
        'documents.getById',
      () => memoryRepositories.documents.getById(wsId, docId)
      ),
    upsertDocument: (doc) =>
      executeFailClosedRepoCall(
        'documents.upsertDocument',
      () => memoryRepositories.documents.upsertDocument(doc)
      ),
    softDeleteDocument: (wsId, docId) =>
      executeFailClosedRepoCall(
        'documents.softDeleteDocument',
      () => memoryRepositories.documents.softDeleteDocument(wsId, docId)
      ),
    listChunksByDocument: (wsId, docId) =>
      executeFailClosedRepoCall(
        'documents.listChunksByDocument',
      () => memoryRepositories.documents.listChunksByDocument(wsId, docId)
      ),
    replaceDocumentChunks: (wsId, docId, colId, chunks) =>
      executeFailClosedRepoCall(
        'documents.replaceDocumentChunks',
      () => memoryRepositories.documents.replaceDocumentChunks(wsId, docId, colId, chunks)
      ),
  },
  embeds: {
    listByWorkspace: (wsId) =>
      executeFailClosedRepoCall(
        'embeds.listByWorkspace',
      () => memoryRepositories.embeds.listByWorkspace(wsId)
      ),
    getById: (wsId, embedId) =>
      executeFailClosedRepoCall(
        'embeds.getById',
      () => memoryRepositories.embeds.getById(wsId, embedId)
      ),
    upsertEmbed: (embed) =>
      executeFailClosedRepoCall(
        'embeds.upsertEmbed',
      () => memoryRepositories.embeds.upsertEmbed(embed)
      ),
  },
  conversations: {
    listSessions: (wsId) =>
      executeFailClosedRepoCall(
        'conversations.listSessions',
      () => memoryRepositories.conversations.listSessions(wsId)
      ),
    createSession: (session) =>
      executeFailClosedRepoCall(
        'conversations.createSession',
      () => memoryRepositories.conversations.createSession(session)
      ),
    appendMessage: (wsId, sessionId, msg) =>
      executeFailClosedRepoCall(
        'conversations.appendMessage',
      () => memoryRepositories.conversations.appendMessage(wsId, sessionId, msg)
      ),
    recordFeedback: (wsId, msgId, rating) =>
      executeFailClosedRepoCall(
        'conversations.recordFeedback',
      () => memoryRepositories.conversations.recordFeedback(wsId, msgId, rating)
      ),
  },
  usage: {
    recordEvent: (event) =>
      executeFailClosedRepoCall(
        'usage.recordEvent',
      () => memoryRepositories.usage.recordEvent(event)
      ),
    listEvents: (wsId, limit) =>
      executeFailClosedRepoCall(
        'usage.listEvents',
      () => memoryRepositories.usage.listEvents(wsId, limit)
      ),
  },
  retrieval: new HybridRetrievalService(),
  getAdapterStatus: () => {
    const configured = isSupabaseConfigured();
    const failClosed = shouldEnforceFailClosedPersistence();
    return {
      mode: failClosed
        ? configured
          ? 'supabase-live'
          : 'fail-closed-unconfigured'
        : 'memory-fallback',
      supabaseConfigured: configured,
      failClosedEnforced: failClosed,
    };
  },
};
