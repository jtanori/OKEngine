// ============================================================================
// BROWSER-SAFE HOMEPAGE DEMO SSE & CONTEXT ADAPTER
// (src/services/homepageDemoStreamAdapter.ts)
//
// Architectural Invariants:
// - Zero imports from server/** or src/repositories/** (enforced by TOUR-SEC-ARCH-01)
// - Never sends client-side documents, collections, embeds, signingSecret, or JWT tokens
// - Tags every emitted callback with (requestId, exchangeId, tourRunId) fencing identifiers
// ============================================================================

import type { AccessVisibility } from '../types';
import type {
  CanonicalPublicRoute,
  HomepageTourStageId,
  PublicDemoContextRoute,
  PublicHomepageDemoPreset,
} from '../data/homepageTourContract';

export interface HomepageDemoCollectionStatus {
  collectionId:
    | 'COL-PUBLIC'
    | 'COL-DOCS'
    | 'COL-LEGAL'
    | 'COL-CUSTOMER'
    | 'COL-INTERNAL';
  name: string;
  visibility: AccessVisibility;
  authorized: boolean;
  readyDocumentCount: number;
}

export interface HomepageDemoValidatedCitation {
  docId: string;
  title: string;
  filename: string;
  collectionId: string;
  snippet: string;
  similarity: number;
  url: CanonicalPublicRoute;
  citationRenderMode: 'direct_public_doc' | 'public_companion_guide';
}

export type HomepageDemoServerOutcome = 'grounded' | 'refused' | 'failed';

export interface HomepageDemoContextResponse {
  ok: true;
  workspaceId: string;
  embedId: 'EMB-PUBLIC-HOME';
  preset: PublicHomepageDemoPreset;
  effectiveRole: AccessVisibility;
  currentUrl: PublicDemoContextRoute;
  embedBoundCollectionIds: string[];
  roleAuthorizedCollectionIds: string[];
  effectiveScopeCollectionIds: string[];
  narrowedDocumentIds: string[];
  demoPolicyVersion: string;
  authorizationVersion: string | number;
  knowledgeVersion: number;
  collectionStatuses: HomepageDemoCollectionStatus[];
}

export interface HomepageDemoFenceTag {
  requestId: number;
  exchangeId: string;
  tourRunId: number;
}

export interface HomepageDemoMetadataEvent extends HomepageDemoFenceTag {
  preset: PublicHomepageDemoPreset;
  role: AccessVisibility;
  currentUrl: PublicDemoContextRoute;
  serverOutcome: HomepageDemoServerOutcome;
  effectiveCollectionIds: string[];
  collectionStatuses: HomepageDemoCollectionStatus[];
  sources: HomepageDemoValidatedCitation[];
  cta: { label: string; url: CanonicalPublicRoute } | null;
  demoPolicyVersion?: string;
}

export interface HomepageDemoDeltaEvent extends HomepageDemoFenceTag {
  textDelta: string;
}

export interface HomepageDemoDoneEvent extends HomepageDemoFenceTag {
  serverOutcome: HomepageDemoServerOutcome;
  latencyMs: number;
  tokens: number;
}

export interface HomepageDemoErrorEvent extends HomepageDemoFenceTag {
  code: string;
  message: string;
  aborted: boolean;
}

export interface HomepageDemoStreamCallbacks {
  onMetadata?: (event: HomepageDemoMetadataEvent) => void;
  onDelta?: (event: HomepageDemoDeltaEvent) => void;
  onDone?: (event: HomepageDemoDoneEvent) => void;
  onError?: (event: HomepageDemoErrorEvent) => void;
}

export interface StreamHomepageDemoAnswerInput extends HomepageDemoFenceTag {
  question: string;
  preset: PublicHomepageDemoPreset;
  currentUrl: PublicDemoContextRoute;
  language: 'en' | 'es';
  stageId?: HomepageTourStageId;
  signal?: AbortSignal;
  callbacks: HomepageDemoStreamCallbacks;
  fetchImpl?: typeof fetch;
}

export async function fetchHomepageDemoContext(params: {
  preset: PublicHomepageDemoPreset;
  currentUrl: PublicDemoContextRoute;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<HomepageDemoContextResponse> {
  const fetcher = params.fetchImpl ?? fetch;
  const res = await fetcher('/api/demo/homepage-context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embedId: 'EMB-PUBLIC-HOME',
      demoPreset: params.preset,
      currentUrl: params.currentUrl,
    }),
    signal: params.signal,
  });

  if (!res.ok) {
    let errCode = `HTTP_${res.status}`;
    let errMsg = 'Failed to apply demo settings';
    try {
      const payload = await res.json();
      if (payload?.error) errCode = String(payload.error);
      if (payload?.message) errMsg = String(payload.message);
    } catch {
      // Ignore JSON parse fallback
    }
    const err = new Error(errMsg) as Error & { code?: string; status?: number };
    err.code = errCode;
    err.status = res.status;
    throw err;
  }

  return (await res.json()) as HomepageDemoContextResponse;
}

export async function streamHomepageDemoAnswer(
  input: StreamHomepageDemoAnswerInput
): Promise<void> {
  const {
    requestId,
    exchangeId,
    tourRunId,
    question,
    preset,
    currentUrl,
    language,
    stageId,
    signal,
    callbacks,
  } = input;
  const fetcher = input.fetchImpl ?? fetch;
  const fenceTag: HomepageDemoFenceTag = { requestId, exchangeId, tourRunId };

  try {
    const res = await fetcher('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embedId: 'EMB-PUBLIC-HOME',
        mode: 'public_homepage_demo',
        demoPreset: preset,
        currentUrl,
        question,
        uiLanguage: language,
        stageId,
      }),
      signal,
    });

    if (!res.ok) {
      let code = `HTTP_${res.status}`;
      let message = 'Request failed';
      try {
        const errBody = await res.json();
        if (errBody?.error) code = String(errBody.error);
        if (errBody?.message) message = String(errBody.message);
      } catch {
        // Ignore JSON parse error
      }
      callbacks.onError?.({
        ...fenceTag,
        code,
        message,
        aborted: false,
      });
      return;
    }

    if (!res.body) {
      callbacks.onError?.({
        ...fenceTag,
        code: 'EMPTY_STREAM_BODY',
        message: 'Response stream was empty.',
        aborted: false,
      });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let receivedDone = false;
    let lastOutcome: HomepageDemoServerOutcome = 'failed';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const lines = frame
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.startsWith('data:'));

        for (const line of lines) {
          const jsonStr = line.replace(/^data:\s*/, '').trim();
          if (!jsonStr) continue;
          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          if (parsed.type === 'metadata') {
            const outcome: HomepageDemoServerOutcome =
              parsed.serverOutcome === 'grounded' ||
              parsed.serverOutcome === 'refused' ||
              parsed.serverOutcome === 'failed'
                ? parsed.serverOutcome
                : 'failed';
            lastOutcome = outcome;

            callbacks.onMetadata?.({
              ...fenceTag,
              preset: (parsed.preset as PublicHomepageDemoPreset) ?? preset,
              role: (parsed.role as AccessVisibility) ?? 'everyone',
              currentUrl: (parsed.currentUrl as PublicDemoContextRoute) ?? currentUrl,
              serverOutcome: outcome,
              effectiveCollectionIds: Array.isArray(parsed.effectiveCollectionIds)
                ? (parsed.effectiveCollectionIds as string[])
                : [],
              collectionStatuses: Array.isArray(parsed.collectionStatuses)
                ? (parsed.collectionStatuses as HomepageDemoCollectionStatus[])
                : [],
              sources: Array.isArray(parsed.sources)
                ? (parsed.sources as HomepageDemoValidatedCitation[])
                : [],
              cta:
                parsed.cta &&
                typeof parsed.cta === 'object' &&
                typeof (parsed.cta as { label?: unknown }).label === 'string' &&
                typeof (parsed.cta as { url?: unknown }).url === 'string'
                  ? {
                      label: (parsed.cta as { label: string }).label,
                      url: (parsed.cta as { url: CanonicalPublicRoute }).url,
                    }
                  : null,
              demoPolicyVersion:
                parsed.cacheTelemetry &&
                typeof parsed.cacheTelemetry === 'object' &&
                typeof (parsed.cacheTelemetry as { demoPolicyVersion?: unknown })
                  .demoPolicyVersion === 'string'
                  ? (parsed.cacheTelemetry as { demoPolicyVersion: string })
                      .demoPolicyVersion
                  : undefined,
            });
          } else if (parsed.type === 'chunk') {
            const textDelta = typeof parsed.text === 'string' ? parsed.text : '';
            if (textDelta) {
              callbacks.onDelta?.({
                ...fenceTag,
                textDelta,
              });
            }
          } else if (parsed.type === 'done') {
            receivedDone = true;
            const doneOutcome: HomepageDemoServerOutcome =
              parsed.serverOutcome === 'grounded' ||
              parsed.serverOutcome === 'refused' ||
              parsed.serverOutcome === 'failed'
                ? parsed.serverOutcome
                : lastOutcome;
            callbacks.onDone?.({
              ...fenceTag,
              serverOutcome: doneOutcome,
              latencyMs: typeof parsed.latencyMs === 'number' ? parsed.latencyMs : 0,
              tokens: typeof parsed.tokens === 'number' ? parsed.tokens : 0,
            });
          }
        }
      }
    }

    if (!receivedDone) {
      callbacks.onError?.({
        ...fenceTag,
        code: 'TRUNCATED_SSE_STREAM',
        message: 'Stream closed before terminal done frame.',
        aborted: false,
      });
    }
  } catch (err: unknown) {
    const isAbort =
      (err instanceof Error && err.name === 'AbortError') ||
      Boolean(signal?.aborted);
    callbacks.onError?.({
      ...fenceTag,
      code: isAbort ? 'REQUEST_ABORTED' : 'NETWORK_STREAM_ERROR',
      message: err instanceof Error ? err.message : 'Stream interrupted',
      aborted: isAbort,
    });
  }
}
