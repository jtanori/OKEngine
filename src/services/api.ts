import {
  AccessVisibility,
  SourceCitation,
  DocumentNextStep,
  SupportedLanguage,
  EmbedIdentity,
  AuthorizationScope,
} from '../types';
import { store } from './store';
import { AnswerMode, CompiledRetrievedChunk } from './engine/responseCompiler';
import { CacheDecisionTelemetry } from '../cache/cache.types';
import { LanguageContext } from '../i18n/i18n.resolver';

export interface StreamAnswerPlanMeta {
  answerMode: AnswerMode;
  answerType: string;
  document?: string;
  section?: string;
  matchedTokens: string[];
  matchedSynonyms: string[];
  routeBoostApplied: boolean;
  stepsCount: number;
  sourceLanguages?: SupportedLanguage[];
  retrievalMode?: string;
  translationMode?: string;
}

export interface StreamMetadata {
  role: AccessVisibility;
  currentUrl: string;
  cacheTelemetry?: CacheDecisionTelemetry;
  languageContext?: LanguageContext;
  answerPlan?: StreamAnswerPlanMeta;
  authorizedCollections: { id: string; name: string; visibility: AccessVisibility }[];
  blockedCollections: { id: string; name: string; visibility: AccessVisibility }[];
  effectiveCollectionIds?: readonly string[];
  authorizationVersion?: string;
  knowledgeVersion?: number;
  retrievedChunks?: CompiledRetrievedChunk[];
  sources: SourceCitation[];
  cta?: DocumentNextStep;
}

export interface StreamCallbacks {
  onMetadata?: (meta: StreamMetadata) => void;
  onChunk: (textChunk: string) => void;
  onDone?: (data: { latencyMs: number; tokens: number }) => void;
  onError?: (err: Error) => void;
}

export async function streamChatQuery(
  params: {
    question: string;
    role: AccessVisibility;
    currentUrl?: string;
    answerMode?: AnswerMode;
    responseLanguage?: SupportedLanguage | 'auto';
    uiLanguage?: SupportedLanguage;
    embedId?: string;
    scopeKey?: string;
    targetScopeCollectionIds?: readonly string[];
    identity?: EmbedIdentity;
    authorizationScope?: AuthorizationScope;
  },
  callbacks: StreamCallbacks
): Promise<void> {
  const {
    question,
    role,
    currentUrl = '/dashboard',
    answerMode = 'deterministic',
    responseLanguage = 'auto',
    uiLanguage = 'en',
    embedId,
    scopeKey,
    targetScopeCollectionIds,
    identity,
    authorizationScope,
  } = params;

  try {
    const documents = store.getDocuments();
    const collections = store.getCollections();
    const embeds = store.getEmbeds();

    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        role,
        currentUrl,
        answerMode,
        responseLanguage,
        uiLanguage,
        embedId,
        scopeKey,
        targetScopeCollectionIds: targetScopeCollectionIds
          ? [...targetScopeCollectionIds]
          : undefined,
        allowedCollectionIds: authorizationScope
          ? [...authorizationScope.collectionIds]
          : undefined,
        identity,
        documents,
        collections,
        embeds,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.replace(/^data:\s*/, ''));
            if (data.type === 'metadata' && callbacks.onMetadata) {
              callbacks.onMetadata(data);
            } else if (data.type === 'chunk') {
              callbacks.onChunk(data.text);
            } else if (data.type === 'done' && callbacks.onDone) {
              callbacks.onDone(data);
            } else if (data.type === 'error' && callbacks.onError) {
              callbacks.onError(new Error(data.message));
            }
          } catch (e) {
            console.warn('Failed to parse SSE line:', trimmed, e);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Backend stream request failed, falling back to client engine:', err);
    const localDiag = store.queryKnowledge({
      question,
      role,
      currentUrl,
      embedId,
      targetScopeCollectionIds,
      identity,
      authorizationScope,
    });

    if (callbacks.onMetadata) {
      callbacks.onMetadata({
        role: localDiag.role,
        currentUrl: localDiag.currentUrl,
        authorizedCollections: localDiag.authorizedCollections,
        blockedCollections: localDiag.blockedCollections,
        effectiveCollectionIds: localDiag.authorizedCollections.map((c) => c.id),
        retrievedChunks: localDiag.retrievedChunks.map((chk) => ({
          chunkId: chk.chunkId,
          documentId: chk.documentId || 'doc_fallback',
          collectionId: chk.collectionId || 'COL-PUBLIC',
          documentTitle: chk.documentTitle,
          filename: chk.filename,
          sectionHeading: chk.sectionHeading || chk.documentTitle,
          similarity: chk.similarity,
          bm25Score: chk.bm25Score ?? chk.similarity,
          routeBoost: chk.routeBoost ?? 0,
          routeBoostApplied: chk.routeBoostApplied ?? false,
          lineStart: chk.lineStart ?? 1,
          lineEnd: chk.lineEnd ?? 24,
          matchedTokens: chk.matchedTokens || [],
          preview: chk.preview,
        })),
        sources: localDiag.sources,
        cta: localDiag.cta,
      });
    }

    callbacks.onChunk(localDiag.answer);

    if (callbacks.onDone) {
      callbacks.onDone({
        latencyMs: localDiag.latencyMs,
        tokens: localDiag.tokens,
      });
    }
  }
}
