import {
  RepositoryRegistry,
  RetrievalService,
  AuthorizedRetrievalQuery,
  RetrievedChunkResult,
} from './types';
import { memoryRepositories, MemoryRetrievalService } from './memory.repository';
import { supabaseRepositories } from './supabase.repository';
import { isSupabaseConfigured, getSupabaseServerClient } from '../lib/supabase/server';

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
  const env = (envOverride?.OKENG_ENV ?? process.env.OKENG_ENV ?? 'development').toLowerCase();
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
  }

  return { valid: true, env, dataMode };
}

export function shouldEnforceFailClosedPersistence(): boolean {
  const env = (process.env.OKENG_ENV || 'development').toLowerCase();
  const mode = (process.env.OKENG_DATA_MODE || '').toLowerCase();
  return env === 'staging' || env === 'production' || mode === 'supabase';
}

function getActiveRepositories(): RepositoryRegistry {
  if (shouldEnforceFailClosedPersistence()) {
    if (!isSupabaseConfigured()) {
      throw new DatabaseUnavailableError(
        'Database persistence is required in staging/production or when OKENG_DATA_MODE=supabase, but Supabase is not configured. Failing closed without seed fallback.'
      );
    }
    return supabaseRepositories;
  }
  return memoryRepositories;
}

async function executeFailClosedRepoCall<T>(
  operationName: string,
  supabaseCall: () => Promise<T>,
  memoryCall: () => Promise<T>
): Promise<T> {
  if (shouldEnforceFailClosedPersistence()) {
    if (!isSupabaseConfigured()) {
      throw new DatabaseUnavailableError(
        `[DATABASE_UNAVAILABLE] Cannot execute ${operationName}: Supabase persistence is not configured and fail-closed mode is active.`
      );
    }
    try {
      return await supabaseCall();
    } catch (err: any) {
      if (err instanceof DatabaseUnavailableError) throw err;
      throw new DatabaseUnavailableError(
        `[DATABASE_UNAVAILABLE] ${operationName} failed in fail-closed mode: ${err?.message || 'database error'}`
      );
    }
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
      const client = getSupabaseServerClient();
      if (!client) {
        throw new DatabaseUnavailableError(
          '[DATABASE_UNAVAILABLE] Cannot retrieve authorized chunks: Supabase client is unconfigured in fail-closed mode.'
        );
      }

      if (query.queryEmbedding && query.queryEmbedding.length > 0) {
        const { data, error } = await client.rpc('match_authorized_document_chunks', {
          p_workspace_id: query.workspaceId,
          p_authorized_collection_ids: query.authorizedCollectionIds,
          p_query_embedding: query.queryEmbedding,
          p_match_count: query.limit || 6,
          p_language: query.language || null,
        });

        if (error) {
          throw new DatabaseUnavailableError(
            `[DATABASE_UNAVAILABLE] match_authorized_document_chunks RPC failed: ${error.message}`
          );
        }

        if (Array.isArray(data)) {
          return data.map((row: any) => ({
            chunkId: row.chunk_id,
            documentId: row.document_id,
            collectionId: row.collection_id,
            title: row.document_title,
            filename: row.document_filename,
            headingPath: row.heading_path || row.document_title,
            content: row.content,
            language: row.language || 'en',
            score: Number(row.similarity || 0.8),
            routeContext: row.route_context || undefined,
          }));
        }
        return [];
      }

      const docs = await repositories.documents.listAuthorized({
        workspaceId: query.workspaceId,
        authorizedCollectionIds: query.authorizedCollectionIds,
        narrowedDocumentIds: query.narrowedDocumentIds,
      });

      if (docs.length === 0) return [];
      return this.memoryService.retrieveAuthorizedChunks(query);
    }

    return this.memoryService.retrieveAuthorizedChunks(query);
  }
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
        () => supabaseRepositories.workspaces.getBySlug(slug),
        () => memoryRepositories.workspaces.getBySlug(slug)
      ),
    getById: (id) =>
      executeFailClosedRepoCall(
        'workspaces.getById',
        () => supabaseRepositories.workspaces.getById(id),
        () => memoryRepositories.workspaces.getById(id)
      ),
    updateSettings: (id, patch) =>
      executeFailClosedRepoCall(
        'workspaces.updateSettings',
        () => supabaseRepositories.workspaces.updateSettings(id, patch),
        () => memoryRepositories.workspaces.updateSettings(id, patch)
      ),
  },
  collections: {
    listByWorkspace: (wsId) =>
      executeFailClosedRepoCall(
        'collections.listByWorkspace',
        () => supabaseRepositories.collections.listByWorkspace(wsId),
        () => memoryRepositories.collections.listByWorkspace(wsId)
      ),
    getById: (wsId, colId) =>
      executeFailClosedRepoCall(
        'collections.getById',
        () => supabaseRepositories.collections.getById(wsId, colId),
        () => memoryRepositories.collections.getById(wsId, colId)
      ),
    create: (col) =>
      executeFailClosedRepoCall(
        'collections.create',
        () => supabaseRepositories.collections.create(col),
        () => memoryRepositories.collections.create(col)
      ),
    update: (wsId, colId, patch) =>
      executeFailClosedRepoCall(
        'collections.update',
        () => supabaseRepositories.collections.update(wsId, colId, patch),
        () => memoryRepositories.collections.update(wsId, colId, patch)
      ),
  },
  documents: {
    listAuthorized: (params) =>
      executeFailClosedRepoCall(
        'documents.listAuthorized',
        () => supabaseRepositories.documents.listAuthorized(params),
        () => memoryRepositories.documents.listAuthorized(params)
      ),
    getById: (wsId, docId) =>
      executeFailClosedRepoCall(
        'documents.getById',
        () => supabaseRepositories.documents.getById(wsId, docId),
        () => memoryRepositories.documents.getById(wsId, docId)
      ),
    upsertDocument: (doc) =>
      executeFailClosedRepoCall(
        'documents.upsertDocument',
        () => supabaseRepositories.documents.upsertDocument(doc),
        () => memoryRepositories.documents.upsertDocument(doc)
      ),
    softDeleteDocument: (wsId, docId) =>
      executeFailClosedRepoCall(
        'documents.softDeleteDocument',
        () => supabaseRepositories.documents.softDeleteDocument(wsId, docId),
        () => memoryRepositories.documents.softDeleteDocument(wsId, docId)
      ),
    listChunksByDocument: (wsId, docId) =>
      executeFailClosedRepoCall(
        'documents.listChunksByDocument',
        () => supabaseRepositories.documents.listChunksByDocument(wsId, docId),
        () => memoryRepositories.documents.listChunksByDocument(wsId, docId)
      ),
    replaceDocumentChunks: (wsId, docId, colId, chunks) =>
      executeFailClosedRepoCall(
        'documents.replaceDocumentChunks',
        () => supabaseRepositories.documents.replaceDocumentChunks(wsId, docId, colId, chunks),
        () => memoryRepositories.documents.replaceDocumentChunks(wsId, docId, colId, chunks)
      ),
  },
  embeds: {
    listByWorkspace: (wsId) =>
      executeFailClosedRepoCall(
        'embeds.listByWorkspace',
        () => supabaseRepositories.embeds.listByWorkspace(wsId),
        () => memoryRepositories.embeds.listByWorkspace(wsId)
      ),
    getById: (wsId, embedId) =>
      executeFailClosedRepoCall(
        'embeds.getById',
        () => supabaseRepositories.embeds.getById(wsId, embedId),
        () => memoryRepositories.embeds.getById(wsId, embedId)
      ),
    upsertEmbed: (embed) =>
      executeFailClosedRepoCall(
        'embeds.upsertEmbed',
        () => supabaseRepositories.embeds.upsertEmbed(embed),
        () => memoryRepositories.embeds.upsertEmbed(embed)
      ),
  },
  conversations: {
    listSessions: (wsId) =>
      executeFailClosedRepoCall(
        'conversations.listSessions',
        () => supabaseRepositories.conversations.listSessions(wsId),
        () => memoryRepositories.conversations.listSessions(wsId)
      ),
    createSession: (session) =>
      executeFailClosedRepoCall(
        'conversations.createSession',
        () => supabaseRepositories.conversations.createSession(session),
        () => memoryRepositories.conversations.createSession(session)
      ),
    appendMessage: (wsId, sessionId, msg) =>
      executeFailClosedRepoCall(
        'conversations.appendMessage',
        () => supabaseRepositories.conversations.appendMessage(wsId, sessionId, msg),
        () => memoryRepositories.conversations.appendMessage(wsId, sessionId, msg)
      ),
    recordFeedback: (wsId, msgId, rating) =>
      executeFailClosedRepoCall(
        'conversations.recordFeedback',
        () => supabaseRepositories.conversations.recordFeedback(wsId, msgId, rating),
        () => memoryRepositories.conversations.recordFeedback(wsId, msgId, rating)
      ),
  },
  usage: {
    recordEvent: (event) =>
      executeFailClosedRepoCall(
        'usage.recordEvent',
        () => supabaseRepositories.usage.recordEvent(event),
        () => memoryRepositories.usage.recordEvent(event)
      ),
    listEvents: (wsId, limit) =>
      executeFailClosedRepoCall(
        'usage.listEvents',
        () => supabaseRepositories.usage.listEvents(wsId, limit),
        () => memoryRepositories.usage.listEvents(wsId, limit)
      ),
  },
  retrieval: new HybridRetrievalService(),
  getAdapterStatus: () => {
    const configured = isSupabaseConfigured();
    const failClosed = shouldEnforceFailClosedPersistence();
    return {
      mode: configured
        ? 'supabase-live'
        : failClosed
        ? 'fail-closed-unconfigured'
        : 'memory-fallback',
      supabaseConfigured: configured,
      failClosedEnforced: failClosed,
    };
  },
};
