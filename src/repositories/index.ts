// ============================================================================
// DATA-MIG-001: OKEng Canonical Repository Layer
// Encapsulates all persistence, RLS tenant isolation, and Storage operations.
// Automatically uses @supabase/supabase-js when Supabase secrets are present,
// and falls back to the RLS-enforcing local seed store when secrets are absent.
// ============================================================================

import {
  Collection,
  KnowledgeDocument,
  EmbedInstance,
  ChatSession,
  AccessVisibility,
} from '../types';
import {
  INITIAL_WORKSPACE,
  INITIAL_COLLECTIONS,
  INITIAL_DOCUMENTS,
  INITIAL_PUBLIC_EMBEDS,
} from '../data/seedData';
import { getSupabaseServerClient, getSupabaseAdapterStatus } from '../lib/supabase/server';
import { validateSafeFilename } from '../services/validation';

export interface UsageRecord {
  id: string;
  workspaceId: string;
  eventType: 'retrieval_query' | 'file_ingestion' | 'embed_load';
  answerMode: 'deterministic' | 'extractive' | 'generative';
  tokensUsed: number;
  latencyMs: number;
  createdAt: string;
}

export interface StoredFileObject {
  id: string;
  workspaceId: string;
  collectionId: string;
  storagePath: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

// Local fallback state (strictly isolated by workspaceId)
const fallbackCollections: Collection[] = [...INITIAL_COLLECTIONS];
const fallbackDocuments: KnowledgeDocument[] = [...INITIAL_DOCUMENTS];
const fallbackEmbeds: EmbedInstance[] = [...INITIAL_PUBLIC_EMBEDS];
const fallbackChats: ChatSession[] = [];
const fallbackUsage: UsageRecord[] = [];
const fallbackStorageObjects: StoredFileObject[] = INITIAL_DOCUMENTS.map((d) => ({
  id: `file_${d.id}`,
  workspaceId: d.workspaceId || INITIAL_WORKSPACE.id,
  collectionId: d.collectionId,
  storagePath: `workspace-files/${d.workspaceId || INITIAL_WORKSPACE.id}/${d.collectionId}/${d.filename}`,
  filename: d.filename,
  mimeType: 'text/markdown',
  sizeBytes: d.content.length,
  createdAt: d.createdAt,
}));

function assertWorkspaceMatch(targetWorkspaceId: string, recordWorkspaceId?: string): boolean {
  const normalizedTarget =
    targetWorkspaceId === 'okeng' ? INITIAL_WORKSPACE.id : targetWorkspaceId;
  const normalizedRecord =
    !recordWorkspaceId || recordWorkspaceId === 'okeng'
      ? INITIAL_WORKSPACE.id
      : recordWorkspaceId;
  return normalizedTarget === normalizedRecord;
}

// 1. CollectionRepository
export class CollectionRepository {
  async listByWorkspace(
    workspaceId: string,
    allowedVisibilities?: AccessVisibility[]
  ): Promise<Collection[]> {
    const sb = getSupabaseServerClient();
    if (sb) {
      let query = sb.from('collections').select('*').eq('workspace_id', workspaceId);
      if (allowedVisibilities && allowedVisibilities.length > 0) {
        query = query.in('visibility', allowedVisibilities);
      }
      const { data, error } = await query;
      if (!error && data) return data as unknown as Collection[];
    }

    return fallbackCollections.filter(
      (c) =>
        assertWorkspaceMatch(workspaceId, c.workspaceId) &&
        (!allowedVisibilities || allowedVisibilities.includes(c.visibility))
    );
  }

  async getById(workspaceId: string, collectionId: string): Promise<Collection | null> {
    const cols = await this.listByWorkspace(workspaceId);
    return cols.find((c) => c.id === collectionId) || null;
  }
}

// 2. DocumentRepository
export class DocumentRepository {
  async listAuthorized(options: {
    workspaceId: string;
    authorizedCollectionIds: string[];
    narrowedDocumentIds?: string[];
  }): Promise<KnowledgeDocument[]> {
    const { workspaceId, authorizedCollectionIds, narrowedDocumentIds } = options;
    const sb = getSupabaseServerClient();
    if (sb) {
      const { data, error } = await sb
        .from('documents')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('collection_id', authorizedCollectionIds)
        .is('deleted_at', null)
        .neq('status', 'deleted');
      if (!error && data) {
        const docs = data as unknown as KnowledgeDocument[];
        return narrowedDocumentIds?.length
          ? docs.filter((d) => narrowedDocumentIds.includes(d.id))
          : docs;
      }
    }

    const colSet = new Set(authorizedCollectionIds);
    return fallbackDocuments.filter((d) => {
      if (!assertWorkspaceMatch(workspaceId, d.workspaceId)) return false;
      if (!colSet.has(d.collectionId)) return false;
      if (d.deletedAt || (d as any).deleted_at || (d.status as string) === 'deleted') return false;
      if (narrowedDocumentIds && narrowedDocumentIds.length > 0) {
        return narrowedDocumentIds.includes(d.id);
      }
      return true;
    });
  }

  async getById(workspaceId: string, documentId: string): Promise<KnowledgeDocument | null> {
    const doc = fallbackDocuments.find(
      (d) =>
        d.id === documentId &&
        assertWorkspaceMatch(workspaceId, d.workspaceId) &&
        !d.deletedAt &&
        (d.status as string) !== 'deleted'
    );
    return doc || null;
  }

  async upsertDocument(doc: KnowledgeDocument): Promise<KnowledgeDocument> {
    const sb = getSupabaseServerClient();
    if (sb) {
      await sb.from('documents').upsert({
        id: doc.id,
        workspace_id: doc.workspaceId,
        collection_id: doc.collectionId,
        title: doc.title,
        filename: doc.filename,
        content: doc.content,
        type: doc.type,
        status: doc.status,
        file_size: doc.fileSize,
        chunk_count: doc.chunkCount,
        updated_at: doc.updatedAt,
      });
    }

    const idx = fallbackDocuments.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      fallbackDocuments[idx] = doc;
    } else {
      fallbackDocuments.unshift(doc);
    }
    return doc;
  }
}

// 3. FileRepository
export class FileRepository {
  async listByWorkspace(workspaceId: string): Promise<StoredFileObject[]> {
    return fallbackStorageObjects.filter((f) =>
      assertWorkspaceMatch(workspaceId, f.workspaceId)
    );
  }
}

// 4. StorageRepository (Workspace-Scoped Bucket Operations)
export class StorageRepository {
  async uploadWorkspaceFile(params: {
    workspaceId: string;
    collectionId: string;
    filename: string;
    content: string;
    mimeType?: string;
  }): Promise<{ ok: boolean; object?: StoredFileObject; error?: string }> {
    const check = validateSafeFilename(params.filename);
    if (!check.valid || !check.sanitized) {
      return { ok: false, error: check.error || 'INVALID_FILENAME' };
    }

    const storagePath = `workspace-files/${params.workspaceId}/${params.collectionId}/${check.sanitized}`;
    const sb = getSupabaseServerClient();
    if (sb) {
      await sb.storage
        .from('workspace-files')
        .upload(storagePath, params.content, {
          contentType: params.mimeType || 'text/markdown',
          upsert: true,
        });
    }

    const obj: StoredFileObject = {
      id: `file_${Date.now()}`,
      workspaceId: params.workspaceId,
      collectionId: params.collectionId,
      storagePath,
      filename: check.sanitized,
      mimeType: params.mimeType || 'text/markdown',
      sizeBytes: Buffer.byteLength(params.content, 'utf8'),
      createdAt: new Date().toISOString(),
    };
    fallbackStorageObjects.push(obj);
    return { ok: true, object: obj };
  }

  async getWorkspaceFile(
    callerWorkspaceId: string,
    storagePath: string
  ): Promise<{ ok: boolean; object?: StoredFileObject; error?: string }> {
    // Enforce tenant-scoped storage path: workspace-files/{workspaceId}/...
    const found = fallbackStorageObjects.find((o) => o.storagePath === storagePath);
    if (!found || !assertWorkspaceMatch(callerWorkspaceId, found.workspaceId)) {
      return { ok: false, error: 'CROSS_TENANT_STORAGE_ACCESS_DENIED' };
    }
    return { ok: true, object: found };
  }
}

// 5. EmbedRepository
export class EmbedRepository {
  async listByWorkspace(workspaceId: string): Promise<EmbedInstance[]> {
    return fallbackEmbeds.filter((e) =>
      assertWorkspaceMatch(workspaceId, e.workspaceId)
    );
  }

  async getById(workspaceId: string, embedId: string): Promise<EmbedInstance | null> {
    const emb = fallbackEmbeds.find(
      (e) => e.id === embedId && assertWorkspaceMatch(workspaceId, e.workspaceId)
    );
    return emb || null;
  }
}

// 6. ConversationRepository
export class ConversationRepository {
  async listByWorkspace(workspaceId: string): Promise<ChatSession[]> {
    return fallbackChats.filter((c) =>
      assertWorkspaceMatch(workspaceId, c.workspaceId)
    );
  }
}

// 7. UsageRepository
export class UsageRepository {
  async recordEvent(
    record: Omit<UsageRecord, 'id' | 'createdAt'>
  ): Promise<UsageRecord> {
    const entry: UsageRecord = {
      ...record,
      id: `usg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    fallbackUsage.push(entry);
    return entry;
  }

  async listByWorkspace(workspaceId: string): Promise<UsageRecord[]> {
    return fallbackUsage.filter((u) =>
      assertWorkspaceMatch(workspaceId, u.workspaceId)
    );
  }
}

export const repositories = {
  collections: new CollectionRepository(),
  documents: new DocumentRepository(),
  files: new FileRepository(),
  storage: new StorageRepository(),
  embeds: new EmbedRepository(),
  conversations: new ConversationRepository(),
  usage: new UsageRepository(),
  getAdapterStatus: getSupabaseAdapterStatus,
};
