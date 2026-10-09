import {
  Workspace,
  Collection,
  KnowledgeDocument,
  DocumentChunk,
  AccessVisibility,
  TestQueryDiagnosis,
  SourceCitation,
  ChatMessage,
  EmbedConfig,
  EmbedInstance,
  SupportedLanguage,
  EmbedIdentity,
  AuthorizationScope,
} from '../types';
import {
  getEmbedCollectionIds,
  resolveEmbedAuthorization,
  computeEmbedAuthorizationVersion,
  retrieveKnowledge,
  clearanceLabelToEmbedIdentity,
  identityToClearanceTier,
} from './embedAuthorization';
import {
  INITIAL_WORKSPACE,
  INITIAL_COLLECTIONS,
  INITIAL_DOCUMENTS,
  INITIAL_PUBLIC_EMBEDS,
} from '../data/seedData';

const STORAGE_KEYS = {
  WORKSPACE: 'okeng_workspace_v2',
  COLLECTIONS: 'okeng_collections_v3',
  DOCUMENTS: 'okeng_documents_v3',
  CHATS: 'okeng_chats_v2',
  EMBED_CONFIG: 'okeng_embed_config_v2',
  PUBLIC_EMBEDS: 'okeng_public_embeds_v4',
};

// Helper to chunk document content
function chunkDocument(doc: KnowledgeDocument, collectionVisibility: AccessVisibility): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const lines = doc.content.split('\n');
  let currentHeader = doc.title;
  let currentBuffer: string[] = [];
  let startLine = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#')) {
      if (currentBuffer.length > 0) {
        chunks.push({
          id: `chk_${doc.id}_${chunks.length + 1}`,
          documentId: doc.id,
          collectionId: doc.collectionId,
          collectionVisibility,
          documentTitle: doc.title,
          filename: doc.filename,
          content: `${currentHeader}\n\n${currentBuffer.join('\n').trim()}`,
          lineRange: `Line ${startLine}-${i}`,
        });
        currentBuffer = [];
      }
      currentHeader = line.replace(/^#+\s*/, '');
      startLine = i + 1;
    } else {
      currentBuffer.push(line);
    }
  }

  if (currentBuffer.length > 0) {
    chunks.push({
      id: `chk_${doc.id}_${chunks.length + 1}`,
      documentId: doc.id,
      collectionId: doc.collectionId,
      collectionVisibility,
      documentTitle: doc.title,
      filename: doc.filename,
      content: `${currentHeader}\n\n${currentBuffer.join('\n').trim()}`,
      lineRange: `Line ${startLine}-${lines.length}`,
    });
  }

  return chunks;
}

// Simple TF-IDF / term-frequency cosine vector similarity calculation
function computeSimilarity(query: string, text: string): number {
  const tokenize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const queryTokens = tokenize(query);
  const textTokens = tokenize(text);

  if (queryTokens.length === 0 || textTokens.length === 0) return 0;

  const queryFreq: Record<string, number> = {};
  for (const q of queryTokens) queryFreq[q] = (queryFreq[q] || 0) + 1;

  const textFreq: Record<string, number> = {};
  for (const t of textTokens) textFreq[t] = (textFreq[t] || 0) + 1;

  let dotProduct = 0;
  for (const q of Object.keys(queryFreq)) {
    if (textFreq[q]) {
      dotProduct += queryFreq[q] * textFreq[q];
    }
  }

  const queryNorm = Math.sqrt(Object.values(queryFreq).reduce((sum, v) => sum + v * v, 0));
  const textNorm = Math.sqrt(Object.values(textFreq).reduce((sum, v) => sum + v * v, 0));

  if (queryNorm === 0 || textNorm === 0) return 0;
  const score = dotProduct / (queryNorm * textNorm);
  // Scale between 0.3 and 0.96 for realistic presentation
  return Math.min(0.98, Math.round(score * 100) / 100);
}

class Store {
  private workspace: Workspace;
  private collections: Collection[];
  private documents: KnowledgeDocument[];
  private conversationHistory: ChatMessage[];
  private embedConfig: EmbedConfig;
  private publicEmbeds: EmbedInstance[];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.workspace = this.load(STORAGE_KEYS.WORKSPACE, INITIAL_WORKSPACE);
    const loadedCols = this.load(STORAGE_KEYS.COLLECTIONS, INITIAL_COLLECTIONS);
    const loadedDocs = this.load(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);

    const synced = this.reconcileCanonicalSeeds(this.workspace, loadedCols, loadedDocs);
    this.workspace = synced.workspace;
    this.collections = synced.collections;
    this.documents = synced.documents;
    if (synced.didUpgradeCanonicalSeeds) {
      this.persist(STORAGE_KEYS.WORKSPACE, this.workspace);
      this.persist(STORAGE_KEYS.COLLECTIONS, this.collections);
      this.persist(STORAGE_KEYS.DOCUMENTS, this.documents);
    }

    const rawEmbeds = this.load(STORAGE_KEYS.PUBLIC_EMBEDS, INITIAL_PUBLIC_EMBEDS);
    this.publicEmbeds = rawEmbeds.map((emb) => {
      const colIds = emb.knowledgeScope?.collectionIds || emb.allowedCollectionIds || [];
      if (this.hasProtectedCollectionInScope(colIds) && emb.contextConfig?.useHostUserContext === false) {
        return {
          ...emb,
          contextConfig: {
            useCurrentPage: emb.contextConfig?.useCurrentPage ?? true,
            useHostUserContext: true,
            routeRules: emb.contextConfig?.routeRules,
          },
        };
      }
      return emb;
    });
    this.conversationHistory = this.load(STORAGE_KEYS.CHATS, [
      {
        id: 'msg_sample_1',
        role: 'user',
        content: 'How do I restrict a collection to employees?',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'msg_sample_2',
        role: 'assistant',
        content:
          'Create a collection in your OKEng workspace, set its visibility to **Members** (`members`), and pass a short-lived signed identity assertion from your backend when initializing the widget.',
        sources: [
          {
            docId: 'doc_docs_12',
            title: 'Access Control & Clearance Mapping',
            filename: 'access-control.md',
            collectionId: 'COL-DOCS',
            collectionName: 'Documentation',
            snippet: 'Create a collection in your workspace, set its visibility to members...',
            similarity: 0.95,
          },
        ],
        cta: {
          label: 'Read Access Control Guide',
          url: '/docs/access-control',
        },
        feedback: 'up',
        createdAt: new Date(Date.now() - 3600000 * 2 + 1000).toISOString(),
      },
      {
        id: 'msg_sample_3',
        role: 'assistant',
        content:
          'Production KMS signing secrets are rotated from the **Settings → Credentials & Keys** workspace surface and recorded as an immutable `embed.secret_rotated` audit event.',
        sources: [
          {
            docId: 'doc_admin_10',
            title: 'Production Key Management & Vault Rotation',
            filename: 'kms-key-rotation-sop.md',
            collectionId: 'COL-INTERNAL',
            collectionName: 'Internal Engineering & Runbooks',
            snippet:
              'Production KMS signing secrets are rotated from the Settings → Credentials & Keys workspace surface...',
            similarity: 0.91,
          },
        ],
        cta: {
          label: 'Open Security Settings',
          url: '/workspaces/okeng/settings',
        },
        feedback: 'down',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ]);
    this.embedConfig = this.load(STORAGE_KEYS.EMBED_CONFIG, {
      collectionId: 'all',
      position: 'bottom-right',
      accentColor: '#1D4ED8',
      greetingText: 'How can we help you today?',
      placeholderText: 'Ask a question about OKEng...',
    });
  }

  /**
   * Reconciles persisted workspace, collections, and documents against canonical seed data.
   * Ensures that when canonical seed documents are updated in `INITIAL_DOCUMENTS` (with a newer
   * `updatedAt` timestamp), stale browser `localStorage` copies are upgraded, collection `fileCount`
   * metadata is recomputed from active documents, and `knowledgeVersion` advances to invalidate caches.
   */
  public reconcileCanonicalSeeds(
    persistedWorkspace: Workspace,
    persistedCollections: Collection[],
    persistedDocuments: KnowledgeDocument[]
  ): {
    workspace: Workspace;
    collections: Collection[];
    documents: KnowledgeDocument[];
    didUpgradeCanonicalSeeds: boolean;
  } {
    let didUpgradeCanonicalSeeds = false;

    const docMap = new Map<string, KnowledgeDocument>(
      persistedDocuments.map((d) => [d.id, d])
    );
    for (const seedDoc of INITIAL_DOCUMENTS) {
      const existing = docMap.get(seedDoc.id);
      if (!existing) {
        docMap.set(seedDoc.id, seedDoc);
        didUpgradeCanonicalSeeds = true;
      } else {
        const seedTime = Date.parse(seedDoc.updatedAt || '');
        const existingTime = Date.parse(existing.updatedAt || '');
        if (!Number.isNaN(seedTime) && (Number.isNaN(existingTime) || seedTime > existingTime)) {
          docMap.set(seedDoc.id, seedDoc);
          didUpgradeCanonicalSeeds = true;
        }
      }
    }
    const documents = Array.from(docMap.values());

    const colMap = new Map<string, Collection>(
      persistedCollections.map((c) => [c.id, c])
    );
    for (const seedCol of INITIAL_COLLECTIONS) {
      const existingCol = colMap.get(seedCol.id);
      if (!existingCol) {
        colMap.set(seedCol.id, seedCol);
        didUpgradeCanonicalSeeds = true;
      }
    }

    const collections = Array.from(colMap.values()).map((col) => {
      const activeCount = documents.filter(
        (d) => d.collectionId === col.id && !d.deletedAt && d.status === 'ready'
      ).length;
      if (col.fileCount !== activeCount) {
        didUpgradeCanonicalSeeds = true;
        return { ...col, fileCount: activeCount };
      }
      return col;
    });

    const minKnowledgeVersion = Math.max(
      persistedWorkspace.knowledgeVersion || 1,
      INITIAL_WORKSPACE.knowledgeVersion
    );
    const nextKnowledgeVersion =
      didUpgradeCanonicalSeeds && persistedWorkspace.knowledgeVersion >= INITIAL_WORKSPACE.knowledgeVersion
        ? persistedWorkspace.knowledgeVersion + 1
        : minKnowledgeVersion;

    const workspace: Workspace =
      nextKnowledgeVersion !== persistedWorkspace.knowledgeVersion
        ? { ...persistedWorkspace, knowledgeVersion: nextKnowledgeVersion }
        : persistedWorkspace;

    return {
      workspace,
      collections,
      documents,
      didUpgradeCanonicalSeeds,
    };
  }

  public rehydrateFromStorage(): void {
    const loadedWs = this.load(STORAGE_KEYS.WORKSPACE, INITIAL_WORKSPACE);
    const loadedCols = this.load(STORAGE_KEYS.COLLECTIONS, INITIAL_COLLECTIONS);
    const loadedDocs = this.load(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
    const synced = this.reconcileCanonicalSeeds(loadedWs, loadedCols, loadedDocs);
    this.workspace = synced.workspace;
    this.collections = synced.collections;
    this.documents = synced.documents;
    if (synced.didUpgradeCanonicalSeeds) {
      this.persist(STORAGE_KEYS.WORKSPACE, this.workspace);
      this.persist(STORAGE_KEYS.COLLECTIONS, this.collections);
      this.persist(STORAGE_KEYS.DOCUMENTS, this.documents);
    }
  }

  private load<T>(key: string, fallback: T): T {
    try {
      if (typeof localStorage === 'undefined') return fallback;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private persist(key: string, data: unknown) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(data));
      }
      this.notify();
    } catch (e) {
      console.error('Storage error', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // Workspace
  public getWorkspace(): Workspace {
    return this.workspace;
  }

  public updateWorkspace(name: string, defaultLanguage?: SupportedLanguage): void {
    this.workspace = {
      ...this.workspace,
      name,
      ...(defaultLanguage ? { defaultLanguage } : {}),
    };
    this.persist(STORAGE_KEYS.WORKSPACE, this.workspace);
  }

  public regenerateSecret(): string {
    const newSecret = `sk_live_sec_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    this.workspace = { ...this.workspace, signingSecret: newSecret };
    this.persist(STORAGE_KEYS.WORKSPACE, this.workspace);
    return newSecret;
  }

  // Collections
  public getCollections(): Collection[] {
    return this.collections;
  }

  public getCollection(id: string): Collection | undefined {
    return this.collections.find((c) => c.id === id);
  }

  public createCollection(name: string, description: string, visibility: AccessVisibility): Collection {
    const col: Collection = {
      id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workspaceId: this.workspace.id,
      name,
      description,
      visibility,
      fileCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.collections = [col, ...this.collections];
    this.persist(STORAGE_KEYS.COLLECTIONS, this.collections);
    return col;
  }

  public updateCollection(id: string, updates: Partial<Pick<Collection, 'name' | 'description' | 'visibility'>>): void {
    this.collections = this.collections.map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
    );
    this.persist(STORAGE_KEYS.COLLECTIONS, this.collections);
    this.bumpKnowledgeVersion();
  }

  public deleteCollection(id: string): void {
    this.collections = this.collections.filter((c) => c.id !== id);
    this.documents = this.documents.filter((d) => d.collectionId !== id);
    this.persist(STORAGE_KEYS.COLLECTIONS, this.collections);
    this.persist(STORAGE_KEYS.DOCUMENTS, this.documents);
    this.bumpKnowledgeVersion();
  }

  // Documents
  public getDocuments(collectionId?: string): KnowledgeDocument[] {
    if (collectionId) {
      return this.documents.filter((d) => d.collectionId === collectionId);
    }
    return this.documents;
  }

  public getDocument(id: string): KnowledgeDocument | undefined {
    return this.documents.find((d) => d.id === id);
  }

  public getDocumentByFilename(filenameOrSlug: string): KnowledgeDocument | undefined {
    const clean = filenameOrSlug.replace(/\.md$/i, '').toLowerCase();
    return this.documents.find(
      (d) =>
        !d.deletedAt &&
        d.status === 'ready' &&
        (d.filename.toLowerCase() === `${clean}.md` || d.filename.toLowerCase() === clean)
    );
  }

  // PUBLIC-01 §22: Dogfood retrieval search over a collection without requiring an LLM call
  public searchCollectionDocuments(collectionId: string, query: string): KnowledgeDocument[] {
    const col = this.getCollection(collectionId);
    if (!col || col.visibility !== 'everyone') return [];
    const docs = this.getDocuments(collectionId).filter(
      (d) => d.status === 'ready' && !d.deletedAt
    );
    if (!query.trim()) return docs;

    return docs
      .map((doc) => ({
        doc,
        score: computeSimilarity(query, `${doc.title} ${doc.filename} ${doc.content}`),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.doc);
  }

  // PUBLIC-01 §29 & EMBED-02: First-Class Embed Inventory & CRUD
  public getPublicEmbeds(): EmbedInstance[] {
    return this.publicEmbeds;
  }

  public getPublicEmbed(embedId: string): EmbedInstance | undefined {
    return this.publicEmbeds.find((e) => e.id === embedId);
  }

  public getEmbeds(): EmbedInstance[] {
    return this.publicEmbeds;
  }

  public getEmbed(embedId: string): EmbedInstance | undefined {
    return this.publicEmbeds.find((e) => e.id === embedId);
  }

  private hasProtectedCollectionInScope(collectionIds: string[]): boolean {
    return collectionIds.some((id) => {
      const col = this.collections.find((c) => c.id === id);
      return col?.visibility === 'members' || col?.visibility === 'admins';
    });
  }

  public createEmbed(data: {
    name: string;
    mode: NonNullable<EmbedInstance['mode']>;
    collectionIds: string[];
    documentIds?: string[];
  }): EmbedInstance {
    const now = new Date().toISOString();
    const id = `EMB-${data.name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 14)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const newEmbed: EmbedInstance = {
      id,
      workspaceId: this.workspace.id,
      name: data.name,
      status: 'active',
      mode: data.mode,
      knowledgeScope: {
        collectionIds: data.collectionIds,
        documentIds: data.documentIds,
      },
      contextConfig: {
        useCurrentPage: true,
        useHostUserContext: true,
      },
      behaviorConfig: {
        initialState: data.mode === 'widget' ? 'closed' : 'open',
        suggestedQuestions: [
          'What is the fastest way to get started?',
          'How do I restrict a collection to employees?',
        ],
        showNavigation: data.mode === 'documentation' || data.mode === 'contextual',
        ctaBehavior: 'inline-link',
      },
      appearanceConfig: {
        theme: 'light',
        width: data.mode === 'panel' ? '360px' : data.mode === 'contextual' ? '320px' : '380px',
        position: data.mode === 'panel' || data.mode === 'contextual' ? 'right' : 'bottom-right',
        radius: '4px',
        accentColor: '#1D4ED8',
        surfaceColor: '#FFFFFF',
        textColor: '#171717',
        mutedColor: '#6B6B67',
        borderColor: '#DEDDD8',
      },
      position: 'bottom-right',
      accentColor: '#1D4ED8',
      greetingText: `Ask ${data.name} a question...`,
      placeholderText: 'Ask a question...',
      allowedCollectionIds: data.collectionIds,
      createdAt: now,
      updatedAt: now,
    };

    this.publicEmbeds = [newEmbed, ...this.publicEmbeds];
    this.persist(STORAGE_KEYS.PUBLIC_EMBEDS, this.publicEmbeds);
    return newEmbed;
  }

  public updateEmbed(embedId: string, updates: Partial<EmbedInstance>): EmbedInstance | undefined {
    let updated: EmbedInstance | undefined;
    this.publicEmbeds = this.publicEmbeds.map((emb) => {
      if (emb.id !== embedId) return emb;
      const collectionIds =
        updates.knowledgeScope?.collectionIds ||
        updates.allowedCollectionIds ||
        emb.knowledgeScope?.collectionIds ||
        emb.allowedCollectionIds;
      const requiresHostUserContext = this.hasProtectedCollectionInScope(collectionIds);
      const mergedContextConfig = {
        useCurrentPage:
          updates.contextConfig?.useCurrentPage ??
          emb.contextConfig?.useCurrentPage ??
          true,
        useHostUserContext: requiresHostUserContext
          ? true
          : updates.contextConfig?.useHostUserContext ??
            emb.contextConfig?.useHostUserContext ??
            true,
        routeRules:
          updates.contextConfig?.routeRules !== undefined
            ? updates.contextConfig.routeRules
            : emb.contextConfig?.routeRules,
      };
      updated = {
        ...emb,
        ...updates,
        allowedCollectionIds: collectionIds,
        knowledgeScope: {
          collectionIds,
          documentIds:
            updates.knowledgeScope?.documentIds !== undefined
              ? updates.knowledgeScope.documentIds
              : emb.knowledgeScope?.documentIds,
        },
        contextConfig: mergedContextConfig,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
    this.persist(STORAGE_KEYS.PUBLIC_EMBEDS, this.publicEmbeds);
    return updated;
  }

  public duplicateEmbed(embedId: string): EmbedInstance | undefined {
    const source = this.getEmbed(embedId);
    if (!source) return undefined;
    const now = new Date().toISOString();
    const copy: EmbedInstance = {
      ...source,
      id: `${source.id}-COPY-${Math.random().toString(36).substring(2, 4).toUpperCase()}`,
      name: `${source.name} (Copy)`,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    this.publicEmbeds = [copy, ...this.publicEmbeds];
    this.persist(STORAGE_KEYS.PUBLIC_EMBEDS, this.publicEmbeds);
    return copy;
  }

  public deleteEmbed(embedId: string): void {
    this.publicEmbeds = this.publicEmbeds.filter((e) => e.id !== embedId);
    this.persist(STORAGE_KEYS.PUBLIC_EMBEDS, this.publicEmbeds);
  }

  public resolveEmbedCssVariables(embed: EmbedInstance): Record<string, string> {
    const app = embed.appearanceConfig;
    return {
      '--okeng-accent': app?.accentColor || embed.accentColor || '#1D4ED8',
      '--okeng-surface': app?.surfaceColor || '#FFFFFF',
      '--okeng-text': app?.textColor || '#171717',
      '--okeng-muted': app?.mutedColor || '#6B6B67',
      '--okeng-border': app?.borderColor || '#DEDDD8',
      '--okeng-radius': app?.radius || '4px',
      '--okeng-chat-width': app?.width || '360px',
    };
  }

  public saveDocument(docData: Partial<KnowledgeDocument> & { title: string; filename: string; collectionId: string; content: string }): KnowledgeDocument {
    const existing = docData.id ? this.getDocument(docData.id) : undefined;
    const now = new Date().toISOString();

    const targetDoc: KnowledgeDocument = {
      id: existing ? existing.id : `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workspaceId: this.workspace.id,
      collectionId: docData.collectionId,
      title: docData.title,
      filename: docData.filename.endsWith('.md') ? docData.filename : `${docData.filename}.md`,
      content: docData.content,
      type: 'markdown',
      status: 'ready',
      fileSize: `${(docData.content.length / 1024).toFixed(1)} KB`,
      nextStep: docData.nextStep,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      indexedAt: now,
      chunkCount: Math.max(1, Math.ceil(docData.content.split('\n\n').length)),
    };

    if (existing) {
      this.documents = this.documents.map((d) => (d.id === targetDoc.id ? targetDoc : d));
    } else {
      this.documents = [targetDoc, ...this.documents];
    }

    // Update collection fileCount
    this.recalculateCollectionFileCounts();
    this.persist(STORAGE_KEYS.DOCUMENTS, this.documents);
    return targetDoc;
  }

  public deleteDocument(id: string): void {
    this.documents = this.documents.filter((d) => d.id !== id);
    this.recalculateCollectionFileCounts();
    this.persist(STORAGE_KEYS.DOCUMENTS, this.documents);
  }

  public reindexDocument(id: string): void {
    this.documents = this.documents.map((d) =>
      d.id === id ? { ...d, status: 'processing' as const, indexedAt: new Date().toISOString() } : d
    );
    this.persist(STORAGE_KEYS.DOCUMENTS, this.documents);

    setTimeout(() => {
      this.documents = this.documents.map((d) =>
        d.id === id ? { ...d, status: 'ready' as const, indexedAt: new Date().toISOString() } : d
      );
      this.persist(STORAGE_KEYS.DOCUMENTS, this.documents);
    }, 1200);
  }

  public getKnowledgeVersion(): number {
    return this.workspace.knowledgeVersion || 184;
  }

  public bumpKnowledgeVersion(): number {
    const nextVersion = (this.workspace.knowledgeVersion || 184) + 1;
    this.workspace = {
      ...this.workspace,
      knowledgeVersion: nextVersion,
    };
    this.persist(STORAGE_KEYS.WORKSPACE, this.workspace);
    return nextVersion;
  }

  private recalculateCollectionFileCounts() {
    this.collections = this.collections.map((c) => ({
      ...c,
      fileCount: this.documents.filter((d) => d.collectionId === c.id).length,
    }));
    this.persist(STORAGE_KEYS.COLLECTIONS, this.collections);
    this.bumpKnowledgeVersion();
  }

  // Embed Config
  public getEmbedConfig(): EmbedConfig {
    return this.embedConfig;
  }

  public updateEmbedConfig(updates: Partial<EmbedConfig>): void {
    this.embedConfig = { ...this.embedConfig, ...updates };
    this.persist(STORAGE_KEYS.EMBED_CONFIG, this.embedConfig);
  }

  // Conversation history
  public getConversations(): ChatMessage[] {
    return this.conversationHistory;
  }

  public addMessage(msg: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
    const message: ChatMessage = {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.conversationHistory = [message, ...this.conversationHistory];
    this.persist(STORAGE_KEYS.CHATS, this.conversationHistory);
    return message;
  }

  public recordFeedback(messageId: string, feedback: 'up' | 'down'): void {
    this.conversationHistory = this.conversationHistory.map((m) =>
      m.id === messageId ? { ...m, feedback } : m
    );
    this.persist(STORAGE_KEYS.CHATS, this.conversationHistory);
  }

  // ==========================================
  // CORE RETRIEVAL & ROLE ISOLATION INVARIANT
  // ==========================================
  public resolveEmbedAuthorizationScope(
    embedIdOrInstance: string | EmbedInstance,
    identity: EmbedIdentity
  ): AuthorizationScope {
    const embed =
      typeof embedIdOrInstance === 'string'
        ? this.getEmbed(embedIdOrInstance)
        : embedIdOrInstance;
    const attachedIds = getEmbedCollectionIds(embed);
    return resolveEmbedAuthorization(identity, attachedIds, this.collections);
  }

  public getEmbedAuthorizationVersion(embedIdOrInstance: string | EmbedInstance): string {
    const embed =
      typeof embedIdOrInstance === 'string'
        ? this.getEmbed(embedIdOrInstance)
        : embedIdOrInstance;
    return computeEmbedAuthorizationVersion(embed, this.collections);
  }

  public retrieveKnowledge(params: {
    query: string;
    authorizationScope: AuthorizationScope;
    narrowedDocumentIds?: readonly string[];
    context?: {
      currentUrl?: string;
      responseLanguage?: SupportedLanguage | 'auto';
      uiLanguage?: SupportedLanguage;
    };
  }) {
    return retrieveKnowledge({
      query: params.query,
      authorizationScope: params.authorizationScope,
      documents: this.documents,
      collections: this.collections,
      narrowedDocumentIds: params.narrowedDocumentIds,
      context: {
        currentUrl: params.context?.currentUrl,
        responseLanguage: params.context?.responseLanguage,
        uiLanguage: params.context?.uiLanguage,
        workspaceDefaultLanguage: this.workspace.defaultLanguage || 'en',
      },
    });
  }

  public queryKnowledge(params: {
    question: string;
    role?: AccessVisibility;
    identity?: EmbedIdentity;
    embedId?: string;
    targetScopeCollectionIds?: readonly string[];
    authorizationScope?: AuthorizationScope;
    currentUrl?: string;
  }): TestQueryDiagnosis {
    const startTime = performance.now();
    const { question, currentUrl = '/app' } = params;

    // 1. Resolve canonical EmbedIdentity and AuthorizationScope
    // Invariant: Authorization happens strictly before retrieval, and
    // AuthorizationScope.collectionIds is the sole knowledge-universe input.
    const resolvedIdentity: EmbedIdentity =
      params.authorizationScope?.identity ||
      params.identity ||
      clearanceLabelToEmbedIdentity(params.role || 'everyone');

    const effectiveRoleLabel: AccessVisibility =
      params.role || identityToClearanceTier(resolvedIdentity);

    let effectiveScope: AuthorizationScope;
    let candidateCollections: Collection[];

    if (params.authorizationScope) {
      effectiveScope = params.authorizationScope;
      const targetIds =
        params.targetScopeCollectionIds || effectiveScope.collectionIds;
      const targetSet = new Set(targetIds);
      candidateCollections = this.collections.filter((c) => targetSet.has(c.id));
    } else if (params.targetScopeCollectionIds) {
      effectiveScope = resolveEmbedAuthorization(
        resolvedIdentity,
        params.targetScopeCollectionIds,
        this.collections
      );
      const targetSet = new Set(params.targetScopeCollectionIds);
      candidateCollections = this.collections.filter((c) => targetSet.has(c.id));
    } else if (params.embedId) {
      const embed = this.getEmbed(params.embedId);
      const attachedIds = getEmbedCollectionIds(embed);
      effectiveScope = resolveEmbedAuthorization(
        resolvedIdentity,
        attachedIds,
        this.collections
      );
      const attachedSet = new Set(attachedIds);
      candidateCollections = this.collections.filter((c) => attachedSet.has(c.id));
    } else {
      const allIds = this.collections.map((c) => c.id);
      effectiveScope = resolveEmbedAuthorization(
        resolvedIdentity,
        allIds,
        this.collections
      );
      candidateCollections = this.collections;
    }

    const authorizedCollectionIdSet = new Set(effectiveScope.collectionIds);
    const authorizedCollections = this.collections.filter((c) =>
      authorizedCollectionIdSet.has(c.id)
    );
    const blockedCollections = candidateCollections.filter(
      (c) => !authorizedCollectionIdSet.has(c.id)
    );

    // 2. Gather ONLY documents in AuthorizationScope.collectionIds
    const authorizedDocs = this.documents.filter(
      (d) =>
        !d.deletedAt &&
        d.status === 'ready' &&
        authorizedCollectionIdSet.has(d.collectionId)
    );

    // 3. Chunk authorized documents only (unauthorized documents are NEVER chunked or scored)
    const allAuthorizedChunks: DocumentChunk[] = [];
    for (const doc of authorizedDocs) {
      const col = this.getCollection(doc.collectionId);
      if (col) {
        allAuthorizedChunks.push(...chunkDocument(doc, col.visibility));
      }
    }

    // 4. Score chunks
    const scoredChunks = allAuthorizedChunks
      .map((chk) => {
        const baseScore = computeSimilarity(question, chk.content);
        const doc = this.getDocument(chk.documentId);
        const routeBoostApplied = Boolean(
          doc?.nextStep?.url &&
            currentUrl &&
            currentUrl !== '/' &&
            (doc.nextStep.url.includes(currentUrl) || currentUrl.includes(doc.nextStep.url))
        );
        const routeBoost = routeBoostApplied ? 0.15 : 0;
        const totalScore = Math.min(0.99, Number((baseScore + routeBoost).toFixed(2)));
        const rangeMatch = chk.lineRange?.match(/Line (\d+)-(\d+)/);
        const lineStart = rangeMatch ? Number(rangeMatch[1]) : 1;
        const lineEnd = rangeMatch ? Number(rangeMatch[2]) : 24;
        const qTokens = question
          .toLowerCase()
          .replace(/[^a-z0-9áéíóúñü\s]/gi, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 2);
        const contentLower = chk.content.toLowerCase();
        const matchedTokens = Array.from(
          new Set(qTokens.filter((tok) => contentLower.includes(tok)))
        );
        return {
          chunk: chk,
          score: totalScore,
          bm25Score: Number(baseScore.toFixed(2)),
          routeBoost,
          routeBoostApplied,
          lineStart,
          lineEnd,
          matchedTokens,
        };
      })
      .sort((a, b) => b.score - a.score);

    // Filter top matches (threshold 0.12)
    const topMatches = scoredChunks.filter((item) => item.score > 0.12).slice(0, 3);

    // 5. Construct sources and grounded answer strictly within AuthorizationScope.collectionIds
    const sources: SourceCitation[] = [];
    let bestCta = undefined;

    for (const match of topMatches) {
      const doc = this.getDocument(match.chunk.documentId);
      const col = this.getCollection(match.chunk.collectionId);
      if (doc && authorizedCollectionIdSet.has(doc.collectionId)) {
        if (!bestCta && doc.nextStep) {
          bestCta = doc.nextStep;
        }
        sources.push({
          docId: doc.id,
          title: doc.title,
          filename: doc.filename,
          collectionId: doc.collectionId,
          collectionName: col?.name || 'Collection',
          snippet: match.chunk.content.substring(0, 180) + '...',
          similarity: match.score,
          language: doc.language,
          nextStep: doc.nextStep,
        });
      }
    }

    let answer = '';
    if (topMatches.length === 0) {
      if (effectiveScope.collectionIds.length === 0) {
        answer = `This Embed initialized with an empty authorized knowledge scope (${resolvedIdentity.kind}). Sign in with an authorized identity assertion to access protected collections.`;
      } else if (blockedCollections.length > 0) {
        answer = `No matching information was found in your accessible knowledge collections (Role: **${effectiveRoleLabel}**). Additional collections exist with restricted visibility (Members/Admins) that were excluded from this query.`;
      } else {
        answer = `I couldn't find relevant documentation to answer this question. Try refining your keywords or uploading additional markdown files.`;
      }
    } else {
      const primaryChunk = topMatches[0].chunk;
      const contentSummary = primaryChunk.content
        .split('\n')
        .filter((l) => !l.startsWith('#') && l.trim().length > 0)
        .slice(0, 3)
        .join(' ');

      answer = `Based on **${primaryChunk.documentTitle}**:\n\n${contentSummary}\n\nYou can review the complete file citations below for full technical details.`;
    }

    const latencyMs = Math.round(performance.now() - startTime + 80);
    const tokens = Math.round(question.length / 4 + answer.length / 4 + 140);

    return {
      question,
      role: effectiveRoleLabel,
      currentUrl,
      authorizedCollections: authorizedCollections.map((c) => ({
        id: c.id,
        name: c.name,
        visibility: c.visibility,
      })),
      blockedCollections: blockedCollections.map((c) => ({
        id: c.id,
        name: c.name,
        visibility: c.visibility,
      })),
      retrievedChunks: topMatches.map((m) => ({
        chunkId: m.chunk.id,
        documentId: m.chunk.documentId,
        collectionId: m.chunk.collectionId,
        documentTitle: m.chunk.documentTitle,
        filename: m.chunk.filename,
        sectionHeading: m.chunk.content.split('\n')[0]?.replace(/^#+\s*/, '') || m.chunk.documentTitle,
        similarity: m.score,
        bm25Score: m.bm25Score,
        routeBoost: m.routeBoost,
        routeBoostApplied: m.routeBoostApplied,
        lineStart: m.lineStart,
        lineEnd: m.lineEnd,
        matchedTokens: m.matchedTokens,
        preview: m.chunk.content.substring(0, 160) + '...',
      })),
      answer,
      sources,
      cta: bestCta,
      latencyMs,
      tokens,
    };
  }
}

export const store = new Store();
