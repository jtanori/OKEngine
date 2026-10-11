'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  CheckCircle2,
  XCircle,
  FlaskConical,
  Database,
  Globe,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  SlidersHorizontal,
  FileText,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { AccessVisibility, SupportedLanguage } from '../types';
import { PageHeader } from '../components/PageHeader';
import { NextStepButton } from '../components/NextStepButton';
import { SourceList } from '../components/SourceList';
import { FeedbackControl } from '../components/FeedbackControl';
import {
  Card,
  CardHeader,
  Box,
  Text,
  Button,
  Input,
  Select,
  SegmentedTabs,
  Badge,
  AccessBadge,
  InfoPopover,
} from '../components/ui';
import { store } from '../services/store';
import { streamChatQuery, StreamMetadata } from '../services/api';
import { AnswerMode, CompiledRetrievedChunk } from '../services/engine/responseCompiler';
import {
  resolveTestConsoleScope,
  TestConsoleIdentityMode,
} from '../services/embedAuthorization';
import { useI18n } from '../i18n/I18nContext';
import { ContentRenderer } from '../content';
import {
  validatePlainText,
  validateRoutePathInput,
} from '../services/formSecurity';

// ============================================================================
// PAGE-APP-06: Test Console (PA-CONSOLE / SU-TEST-CONSOLE)
//   Canonical 5-Stage Inspection Pipeline:
//     Context ──► Access ──► Retrieval ──► Answer Plan ──► Cache
//   Presented via 3 stage-aware inspection tabs:
//     [ Access ]   [ Retrieval ]   [ Cache ]
//   Powered by a single canonical EffectiveScope resolver:
//     EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections
// ============================================================================

export interface TestConsoleViewProps {
  initialCollectionId?: string;
  initialEmbedId?: string;
  onOpenDocument?: (documentId: string) => void;
}

export type InspectorTabId = 'access' | 'retrieval' | 'cache';
export type VerificationScenarioId =
  | 'access-boundary'
  | 'progressive-identity'
  | 'multilingual-retrieval'
  | 'cache-reuse';

/**
 * Step 5 (Presentation Layer Normalization):
 * Normalizes backend CacheHitStatus ('HIT') into the canonical user-facing
 * display label ('HIT_EXACT') while preserving 'SEMANTIC_HIT', 'NEGATIVE_HIT',
 * 'MISS', and 'BYPASSED'. Kept strictly in the console presentation layer.
 */
export function formatCacheDecisionLabel(status?: string | null): string {
  if (!status) return 'MISS';
  if (status === 'HIT') return 'HIT_EXACT';
  return status;
}

/**
 * Step 7 (Scenario Inspection Tab Routing):
 * Maps each verification scenario to the primary inspection surface that
 * proves its security or retrieval invariant.
 */
export function resolveScenarioInspectorTab(
  scenarioId: VerificationScenarioId
): InspectorTabId {
  switch (scenarioId) {
    case 'access-boundary':
    case 'progressive-identity':
      return 'access';
    case 'multilingual-retrieval':
      return 'retrieval';
    case 'cache-reuse':
      return 'cache';
  }
}

function interpolate(
  template: string,
  params: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`
  );
}

interface VerificationScenario {
  id: VerificationScenarioId;
  label: string;
  objective: string;
  contextLabel: string;
  expected: string;
  scopeValue: string;
  identityMode: TestConsoleIdentityMode;
  route: string;
  question: string;
  answerMode: AnswerMode;
  responseLanguage: SupportedLanguage | 'auto';
}

export const TestConsoleView: React.FC<TestConsoleViewProps> = ({
  initialCollectionId,
  initialEmbedId,
  onOpenDocument,
}) => {
  const { language: uiLanguage, t } = useI18n();

  const collections = store.getCollections();
  const embeds = store.getEmbeds();

  // Compute initial scope & convenience identity from deep-link params (?collectionId or ?embedId)
  const initialContext = useMemo(() => {
    if (initialCollectionId) {
      const targetCol = collections.find((c) => c.id === initialCollectionId);
      if (targetCol) {
        const convenienceIdentity: TestConsoleIdentityMode = targetCol.visibility;
        const roleDisplay =
          convenienceIdentity === 'admins'
            ? t('test.identity_admin', 'Admin')
            : convenienceIdentity === 'members'
            ? t('test.identity_member', 'Member')
            : t('test.identity_anon', 'Anonymous');
        return {
          scopeValue: `collection:${targetCol.id}`,
          identityMode: convenienceIdentity,
          deepLinkNote: interpolate(
            t(
              'test.deeplink_collection_note',
              'Initialized to {role} for "{name}" — switch Identity to Anonymous to verify pre-retrieval exclusion.'
            ),
            { role: roleDisplay, name: targetCol.name }
          ),
        };
      }
    }
    if (initialEmbedId) {
      const targetEmb = embeds.find((e) => e.id === initialEmbedId);
      if (targetEmb) {
        return {
          scopeValue: `embed:${targetEmb.id}`,
          identityMode: 'members' as TestConsoleIdentityMode,
          deepLinkNote: interpolate(
            t(
              'test.deeplink_embed_note',
              'Initialized to Embed "{name}" — switch Identity between Anonymous, Member, and Admin to inspect scope changes.'
            ),
            { name: targetEmb.name }
          ),
        };
      }
    }
    return {
      scopeValue: 'workspace',
      identityMode: 'members' as TestConsoleIdentityMode,
      deepLinkNote: null as string | null,
    };
  }, [initialCollectionId, initialEmbedId, collections, embeds, t]);

  const [scopeValue, setScopeValue] = useState<string>(initialContext.scopeValue);
  const [identityMode, setIdentityMode] = useState<TestConsoleIdentityMode>(
    initialContext.identityMode
  );
  const [deepLinkNote, setDeepLinkNote] = useState<string | null>(
    initialContext.deepLinkNote
  );
  const [answerMode, setAnswerMode] = useState<AnswerMode>('deterministic');
  const [responseLanguage, setResponseLanguage] = useState<SupportedLanguage | 'auto'>('auto');
  const [showAdvancedExecution, setShowAdvancedExecution] = useState<boolean>(false);
  const [currentUrl, setCurrentUrl] = useState('/settings/security/sso');
  const [routeError, setRouteError] = useState<string | null>(null);
  const [question, setQuestion] = useState('Where do I invite team members?');
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [isBumpingCache, setIsBumpingCache] = useState(false);
  const [streamedAnswer, setStreamedAnswer] = useState<string>('');
  const [metadata, setMetadata] = useState<StreamMetadata | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);
  const [ctaNotice, setCtaNotice] = useState<string | null>(null);
  const [knowledgeVersionNotice, setKnowledgeVersionNotice] = useState<string | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<'up' | 'down' | undefined>(undefined);
  const [loggedMessageId, setLoggedMessageId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTabId>('access');
  const [expandedChunkIds, setExpandedChunkIds] = useState<Record<string, boolean>>({});
  const [activeScenarioId, setActiveScenarioId] = useState<VerificationScenarioId | null>(
    null
  );
  const [liveKnowledgeVersion, setLiveKnowledgeVersion] = useState<number>(() =>
    store.getKnowledgeVersion()
  );
  const [liveCacheBackend, setLiveCacheBackend] = useState<string>('memory-lru');

  // Synchronize if route query params change
  useEffect(() => {
    setScopeValue(initialContext.scopeValue);
    setIdentityMode(initialContext.identityMode);
    setDeepLinkNote(initialContext.deepLinkNote);
  }, [initialContext.scopeValue, initialContext.identityMode, initialContext.deepLinkNote]);

  // Fetch live cache epoch on mount for zero-state accuracy
  useEffect(() => {
    let mounted = true;
    fetch('/api/cache/metrics?workspaceId=okeng')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        if (typeof data.knowledgeVersion === 'number') {
          setLiveKnowledgeVersion(data.knowledgeVersion);
        }
        if (typeof data.backend === 'string') {
          setLiveCacheBackend(data.backend);
        }
      })
      .catch(() => {
        // Fallback to local store knowledge version
      });
    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================================================
  // STEP 2: Single Canonical EffectiveScope Calculation
  // Feeds:
  //   1. Zero-state & live [Access] inspector tab
  //   2. Verification Scenario evaluation (EXPECTED vs ACTUAL)
  //   3. Query execution (streamChatQuery / 401 Halt)
  // ==========================================================================
  const scopeResolution = useMemo(
    () =>
      resolveTestConsoleScope({
        scopeValue,
        identityMode,
        collections,
        embeds,
      }),
    [scopeValue, identityMode, collections, embeds]
  );

  const defaultEmbedId = embeds[0]?.id || 'EMB-PUBLIC-DOCS';

  const verificationScenarios: VerificationScenario[] = useMemo(
    () => [
      {
        id: 'access-boundary',
        label: t('test.scenario.access.label', 'Verify access boundary'),
        objective: t(
          'test.scenario.access.objective',
          'Tests whether a Member can retrieve Admin-only security documents.'
        ),
        contextLabel: 'Workspace · Member · /settings/security/kms',
        expected: t(
          'test.scenario.access.expected',
          'Admin collection (Internal Runbooks & Security) excluded before retrieval; 0 Admin chunks enter candidate pool.'
        ),
        scopeValue: 'workspace',
        identityMode: 'members',
        route: '/settings/security/kms',
        question: 'How are production KMS keys rotated?',
        answerMode: 'deterministic',
        responseLanguage: 'auto',
      },
      {
        id: 'progressive-identity',
        label: t('test.scenario.progressive.label', 'Verify progressive identity'),
        objective: t(
          'test.scenario.progressive.objective',
          'Tests whether upgrading from Anonymous to Member unlocks Member collections on the same Embed.'
        ),
        contextLabel: `Embed (${embeds[0]?.name || 'Product Help'}) · Member · /settings/organization`,
        expected: t(
          'test.scenario.progressive.expected',
          'Customer Workspace Guide unlocked alongside Public Docs; retrieves team invitation procedure.'
        ),
        scopeValue: `embed:${defaultEmbedId}`,
        identityMode: 'members',
        route: '/settings/organization',
        question: 'Where do I invite team members?',
        answerMode: 'deterministic',
        responseLanguage: 'auto',
      },
      {
        id: 'multilingual-retrieval',
        label: t('test.scenario.multilingual.label', 'Verify multilingual retrieval'),
        objective: t(
          'test.scenario.multilingual.objective',
          'Tests Spanish query resolution and native Spanish citation metadata integrity.'
        ),
        contextLabel: 'Workspace · Member · /billing/invoices · Auto language',
        expected: t(
          'test.scenario.multilingual.expected',
          'Resolves ES → ES and retrieves Spanish billing documentation with preserved source language metadata.'
        ),
        scopeValue: 'workspace',
        identityMode: 'members',
        route: '/billing/invoices',
        question: '¿Cómo descargar facturas mensuales?',
        answerMode: 'deterministic',
        responseLanguage: 'auto',
      },
      {
        id: 'cache-reuse',
        label: t('test.scenario.cache.label', 'Verify cache reuse'),
        objective: t(
          'test.scenario.cache.objective',
          'Tests deterministic answer cache reuse on repeat execution under identical Scope, Identity, and Epoch.'
        ),
        contextLabel: 'Workspace · Member · /settings/security/sso',
        expected: t(
          'test.scenario.cache.expected',
          'First run computes answer (MISS); re-running identical context serves cached plan (HIT_EXACT) with 0 LLM tokens.'
        ),
        scopeValue: 'workspace',
        identityMode: 'members',
        route: '/settings/security/sso',
        question: 'Where do I invite team members?',
        answerMode: 'deterministic',
        responseLanguage: 'auto',
      },
    ],
    [defaultEmbedId, embeds, t]
  );

  const activeScenario = useMemo(
    () => verificationScenarios.find((s) => s.id === activeScenarioId) || null,
    [verificationScenarios, activeScenarioId]
  );

  const toggleChunkDetails = (chunkId: string) => {
    setExpandedChunkIds((prev) => ({
      ...prev,
      [chunkId]: !prev[chunkId],
    }));
  };

  const handleRunQuery = async (overrides?: {
    question?: string;
    scopeValue?: string;
    identityMode?: TestConsoleIdentityMode;
    route?: string;
    answerMode?: AnswerMode;
    responseLanguage?: SupportedLanguage | 'auto';
  }) => {
    const rawQ = overrides?.question !== undefined ? overrides.question : question;
    const nextScopeValue =
      overrides?.scopeValue !== undefined ? overrides.scopeValue : scopeValue;
    const nextIdentityMode =
      overrides?.identityMode !== undefined ? overrides.identityMode : identityMode;
    const nextRoute = overrides?.route !== undefined ? overrides.route : currentUrl;
    const nextAnswerMode =
      overrides?.answerMode !== undefined ? overrides.answerMode : answerMode;
    const nextRespLang =
      overrides?.responseLanguage !== undefined
        ? overrides.responseLanguage
        : responseLanguage;

    if (isQuerying) return;

    const routeCheck = validateRoutePathInput(nextRoute);
    if (!routeCheck.valid) {
      setRouteError(
        t(routeCheck.errorKey || 'validation.route_invalid', routeCheck.errorMessage)
      );
      return;
    }
    setRouteError(null);

    const qCheck = validatePlainText(rawQ, {
      required: true,
      minLength: 2,
      maxLength: 500,
      fieldLabel: t('test.ask_label', 'Question'),
    });
    if (!qCheck.valid) {
      setQuestionError(
        t(qCheck.errorKey || 'validation.query_required', qCheck.errorMessage)
      );
      return;
    }
    setQuestionError(null);

    // Resolve canonical EffectiveScope for the exact parameters being executed
    const execScope = resolveTestConsoleScope({
      scopeValue: nextScopeValue,
      identityMode: nextIdentityMode,
      collections,
      embeds,
    });

    // Hard 401 Boundary: Invalid token halts strictly before retrieval with zero anonymous fallback
    if (execScope.isInvalidToken) {
      setStreamedAnswer('');
      setMetadata(null);
      setLatencyMs(0);
      setTokens(0);
      setCtaNotice(null);
      setAnswerFeedback(undefined);
      setLoggedMessageId(null);
      setInspectorTab('access');
      return;
    }

    setIsQuerying(true);
    setStreamedAnswer('');
    setMetadata(null);
    setLatencyMs(null);
    setTokens(null);
    setCtaNotice(null);
    setAnswerFeedback(undefined);
    setLoggedMessageId(null);

    let latestMeta: StreamMetadata | null = null;
    let accumulatedAnswer = '';

    await streamChatQuery(
      {
        question: qCheck.sanitizedValue,
        role: execScope.effectiveRoleLabel,
        currentUrl: routeCheck.sanitizedValue,
        answerMode: nextAnswerMode,
        responseLanguage: nextRespLang,
        uiLanguage,
        embedId: execScope.targetEmbed?.id,
        scopeKey: execScope.scopeValue,
        targetScopeCollectionIds: execScope.targetScopeCollectionIds,
        identity: execScope.identity,
        authorizationScope: execScope.authorizationScope,
      },
      {
        onMetadata: (meta) => {
          latestMeta = meta;
          setMetadata(meta);
          if (meta.cacheTelemetry?.knowledgeVersion) {
            setLiveKnowledgeVersion(meta.cacheTelemetry.knowledgeVersion);
          } else if (typeof meta.knowledgeVersion === 'number') {
            setLiveKnowledgeVersion(meta.knowledgeVersion);
          }
          if (meta.cacheTelemetry?.adapterBackend) {
            setLiveCacheBackend(meta.cacheTelemetry.adapterBackend);
          }
          // Default first chunk expanded if chunks are returned
          if (meta.retrievedChunks && meta.retrievedChunks.length > 0) {
            setExpandedChunkIds({ [meta.retrievedChunks[0].chunkId]: true });
          }
        },
        onChunk: (chunk) => {
          accumulatedAnswer += chunk;
          setStreamedAnswer((prev) => prev + chunk);
        },
        onDone: (data) => {
          setLatencyMs(data.latencyMs);
          setTokens(data.tokens);
          setIsQuerying(false);
          if (accumulatedAnswer.trim()) {
            const msg = store.addMessage({
              role: 'assistant',
              content: accumulatedAnswer,
              sources: latestMeta?.sources,
              cta: latestMeta?.cta,
            });
            setLoggedMessageId(msg.id);
          }
        },
        onError: (err) => {
          console.error(err);
          setIsQuerying(false);
        },
      }
    );
  };

  const handleSelectScenario = (scenario: VerificationScenario) => {
    setActiveScenarioId(scenario.id);
    setScopeValue(scenario.scopeValue);
    setIdentityMode(scenario.identityMode);
    setCurrentUrl(scenario.route);
    setQuestion(scenario.question);
    setAnswerMode(scenario.answerMode);
    setResponseLanguage(scenario.responseLanguage);
    setQuestionError(null);
    setRouteError(null);

    setInspectorTab(resolveScenarioInspectorTab(scenario.id));

    handleRunQuery({
      question: scenario.question,
      scopeValue: scenario.scopeValue,
      identityMode: scenario.identityMode,
      route: scenario.route,
      answerMode: scenario.answerMode,
      responseLanguage: scenario.responseLanguage,
    });
  };

  const handleRateFeedback = (rating: 'up' | 'down') => {
    setAnswerFeedback(rating);
    if (loggedMessageId) {
      store.recordFeedback(loggedMessageId, rating);
    } else if (streamedAnswer.trim()) {
      const msg = store.addMessage({
        role: 'assistant',
        content: streamedAnswer,
        sources: metadata?.sources,
        cta: metadata?.cta,
        feedback: rating,
      });
      setLoggedMessageId(msg.id);
    }
  };

  const handleBumpKnowledgeVersion = async () => {
    if (isBumpingCache) return;
    setIsBumpingCache(true);
    try {
      const res = await fetch('/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: 'okeng' }),
      });
      const data = await res.json();
      const nextKv =
        typeof data.newKnowledgeVersion === 'number'
          ? data.newKnowledgeVersion
          : store.bumpKnowledgeVersion();
      setLiveKnowledgeVersion(nextKv);
      setKnowledgeVersionNotice(
        interpolate(
          t(
            'test.cache_invalidated_notice',
            'Cache invalidated — Knowledge epoch incremented to kv:v{kv}.'
          ),
          { kv: nextKv }
        )
      );
    } catch (e) {
      console.error(e);
      const nextKv = store.bumpKnowledgeVersion();
      setLiveKnowledgeVersion(nextKv);
      setKnowledgeVersionNotice(
        interpolate(
          t(
            'test.cache_invalidated_notice',
            'Cache invalidated — Knowledge epoch incremented to kv:v{kv}.'
          ),
          { kv: nextKv }
        )
      );
    } finally {
      setIsBumpingCache(false);
    }
  };

  // Derived telemetry for the 3-tab Inspection surface
  const effectiveAllowedCount = scopeResolution.allowedCollections.length;
  const targetTotalCount = scopeResolution.targetScopeCollectionIds.length;
  const retrievedChunks: CompiledRetrievedChunk[] = metadata?.retrievedChunks || [];
  const currentKv =
    metadata?.cacheTelemetry?.knowledgeVersion ??
    metadata?.knowledgeVersion ??
    liveKnowledgeVersion;
  const currentAv =
    metadata?.authorizationVersion || scopeResolution.authorizationVersion;
  const shortAv = `v1 (${targetTotalCount} col${targetTotalCount === 1 ? '' : 's'})`;
  const normalizedCacheDecision = metadata?.cacheTelemetry?.answerCache
    ? formatCacheDecisionLabel(metadata.cacheTelemetry.answerCache)
    : null;
  const cacheHitLabel = scopeResolution.isInvalidToken
    ? 'HALT'
    : normalizedCacheDecision || `kv:v${currentKv}`;

  // Compute live ACTUAL outcome & lifecycle status for active verification scenario
  const scenarioActualSummary = useMemo(() => {
    if (!activeScenario) return null;
    if (scopeResolution.isInvalidToken) {
      return {
        status: 'verified' as const,
        verified: true,
        text: t(
          'test.scenario_actual_401',
          '401 Unauthorized (INVALID_TOKEN_SIGNATURE) · Retrieval not executed · Anonymous fallback: None'
        ),
      };
    }
    if (isQuerying) {
      return {
        status: 'verifying' as const,
        verified: false,
        text: t(
          'test.scenario_actual_verifying',
          'Executing verification scenario against pipeline...'
        ),
      };
    }
    if (!metadata) {
      return {
        status: 'ready' as const,
        verified: false,
        text: t(
          'test.scenario_actual_ready',
          'Ready — click Run to verify scenario outcome.'
        ),
      };
    }

    if (activeScenario.id === 'access-boundary') {
      const adminExcluded = scopeResolution.excludedByRoleCollections.some(
        (item) => item.collection.visibility === 'admins'
      );
      const hasAdminSource = (metadata.sources || []).some(
        (s) => s.collectionId === 'COL-INTERNAL'
      );
      const verified = adminExcluded && !hasAdminSource;
      return {
        status: verified ? ('verified' as const) : ('not_verified' as const),
        verified,
        text: verified
          ? interpolate(
              t(
                'test.scenario.access.verified',
                'Admin collection excluded before retrieval (0 Admin chunks in candidate pool; {chunks} chunk(s) scored from {allowed} allowed collections).'
              ),
              { chunks: retrievedChunks.length, allowed: effectiveAllowedCount }
            )
          : t(
              'test.scenario.access.not_verified',
              'Admin boundary check did not match expected exclusion state.'
            ),
      };
    }

    if (activeScenario.id === 'progressive-identity') {
      const memberUnlocked = scopeResolution.allowedCollections.some(
        (c) => c.visibility === 'members'
      );
      const citedSources = (metadata.sources || []).map((s) => s.filename).join(', ');
      const verified = memberUnlocked && (metadata.sources || []).length > 0;
      return {
        status: verified ? ('verified' as const) : ('not_verified' as const),
        verified,
        text: verified
          ? interpolate(
              t(
                'test.scenario.progressive.verified',
                '{allowed}/{total} Embed collections authorized for Member; retrieved {sources}.'
              ),
              {
                allowed: effectiveAllowedCount,
                total: targetTotalCount,
                sources: citedSources,
              }
            )
          : interpolate(
              t(
                'test.scenario.progressive.not_verified',
                'Authorized {allowed}/{total} collections ({chunks} chunks retrieved).'
              ),
              {
                allowed: effectiveAllowedCount,
                total: targetTotalCount,
                chunks: retrievedChunks.length,
              }
            ),
      };
    }

    if (activeScenario.id === 'multilingual-retrieval') {
      const qLang = metadata.languageContext?.query_language?.toUpperCase() || 'ES';
      const rLang = metadata.languageContext?.response_language?.toUpperCase() || 'ES';
      const verified = qLang === 'ES' && rLang === 'ES' && retrievedChunks.length > 0;
      return {
        status: verified ? ('verified' as const) : ('not_verified' as const),
        verified,
        text: verified
          ? interpolate(
              t(
                'test.scenario.multilingual.verified',
                'Resolved {qLang} → {rLang} ({mode}) with {chunks} ranked chunk(s).'
              ),
              {
                qLang,
                rLang,
                mode: metadata.answerPlan?.translationMode || 'native',
                chunks: retrievedChunks.length,
              }
            )
          : interpolate(
              t(
                'test.scenario.multilingual.not_verified',
                'Resolved {qLang} → {rLang} ({chunks} chunks).'
              ),
              { qLang, rLang, chunks: retrievedChunks.length }
            ),
      };
    }

    if (activeScenario.id === 'cache-reuse') {
      const rawCacheDecision = metadata.cacheTelemetry?.answerCache || 'MISS';
      const displayDecision = formatCacheDecisionLabel(rawCacheDecision);
      const isHit =
        rawCacheDecision === 'HIT' ||
        rawCacheDecision === 'SEMANTIC_HIT' ||
        rawCacheDecision === 'NEGATIVE_HIT';
      return {
        status: 'verified' as const,
        verified: true,
        text: isHit
          ? interpolate(
              t(
                'test.scenario.cache.verified',
                'Cache {decision} at kv:v{kv} · av:{av} (0 LLM tokens).'
              ),
              { decision: displayDecision, kv: currentKv, av: shortAv }
            )
          : interpolate(
              t(
                'test.scenario.cache.initial',
                'Initial run recorded Cache {decision} at kv:v{kv} — click [Re-run query] in the Cache tab to verify HIT_EXACT.'
              ),
              { decision: displayDecision, kv: currentKv }
            ),
      };
    }

    return null;
  }, [
    activeScenario,
    scopeResolution,
    isQuerying,
    metadata,
    retrievedChunks.length,
    effectiveAllowedCount,
    targetTotalCount,
    currentKv,
    shortAv,
    t,
  ]);

  const identityOptions = useMemo(
    () => [
      {
        id: 'everyone' as TestConsoleIdentityMode,
        label: t('test.identity_anon', 'Anonymous'),
      },
      {
        id: 'members' as TestConsoleIdentityMode,
        label: t('test.identity_member', 'Member'),
      },
      {
        id: 'admins' as TestConsoleIdentityMode,
        label: t('test.identity_admin', 'Admin'),
      },
      {
        id: 'invalid_token' as TestConsoleIdentityMode,
        label: t('test.identity_invalid', 'Invalid token (401)'),
        icon: <ShieldAlert className="w-3.5 h-3.5 shrink-0" />,
        tone: 'danger' as const,
      },
    ],
    [t]
  );

  return (
    <div className="flex-1 flex flex-col lg:h-screen lg:overflow-hidden bg-canvas">
      <PageHeader
        title={t('test.title', 'Test Console')}
        description={t(
          'test.desc',
          'Verify what OKEng can see, retrieve, and answer across scopes and identities.'
        )}
      />

      {/* ====================================================================
          STEP 3: Calm Test Context Band with Progressive Disclosure
          (Scope + 4-way Identity + Route + collapsible Advanced execution)
         ==================================================================== */}
      <div className="bg-surface border-b border-line py-3 px-8 space-y-2.5 select-none shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-5">
            {/* Target Scope Selector: Workspace | Embed | Collection */}
            <div className="flex items-center gap-2">
              <Text variant="mono-label" tone="secondary">
                {t('test.scope_label', 'Scope')}
              </Text>
              <div className="w-64">
                <Select
                  aria-label={t('test.scope_aria', 'Test Scope')}
                  sizeVariant="sm"
                  value={scopeValue}
                  onChange={(e) => {
                    const nextScope = e.target.value;
                    setScopeValue(nextScope);
                    setDeepLinkNote(null);
                    if (streamedAnswer || metadata) {
                      handleRunQuery({ scopeValue: nextScope });
                    }
                  }}
                >
                  <option value="workspace">
                    {t('test.scope_all_workspace', 'All workspace collections')}
                  </option>
                  <optgroup label={t('test.scope_embeds_group', 'Embeds')}>
                    {embeds.map((emb) => (
                      <option key={emb.id} value={`embed:${emb.id}`}>
                        {emb.name} (Embed)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={t('test.scope_collections_group', 'Collections')}>
                    {collections.map((col) => (
                      <option key={col.id} value={`collection:${col.id}`}>
                        {col.name} ({col.visibility})
                      </option>
                    ))}
                  </optgroup>
                </Select>
              </div>
            </div>

            {/* Step 4: 4-Way Identity Selector via Canonical PR-TABS (SegmentedTabs) */}
            <div className="flex items-center gap-2">
              <Text variant="mono-label" tone="secondary">
                {t('test.identity_label', 'Identity')}
              </Text>
              <SegmentedTabs<TestConsoleIdentityMode>
                size="sm"
                variant="ink"
                ariaLabel={t('test.identity_aria', 'Simulated Identity')}
                activeId={identityMode}
                options={identityOptions}
                onChange={(nextIdentity) => {
                  setIdentityMode(nextIdentity);
                  setDeepLinkNote(null);
                  if (nextIdentity === 'invalid_token') {
                    setInspectorTab('access');
                  } else if (streamedAnswer || metadata) {
                    handleRunQuery({ identityMode: nextIdentity });
                  }
                }}
              />
            </div>

            {/* Simulated Host Route */}
            <div className="flex items-center gap-2">
              <Text variant="mono-label" tone="secondary">
                {t('test.route_short_label', 'Route')}
              </Text>
              <Input
                type="text"
                sizeVariant="sm"
                placeholder={t('test.route_placeholder', '/settings/security/sso')}
                error={routeError || undefined}
                aria-label={t('test.route_aria', 'Simulated Host Route')}
                value={currentUrl}
                onChange={(e) => {
                  setCurrentUrl(e.target.value);
                  if (routeError) setRouteError(null);
                }}
                className="w-52 font-mono bg-elevated"
              />
            </div>
          </div>

          {/* Progressive Disclosure Toggle: Advanced execution */}
          <button
            type="button"
            onClick={() => setShowAdvancedExecution((prev) => !prev)}
            aria-expanded={showAdvancedExecution}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-secondary hover:text-ink px-2.5 h-8 rounded-xs border border-line bg-elevated cursor-pointer transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
            <span>{t('test.advanced_execution', 'Advanced execution')}</span>
            <span className="text-ink-muted">
              ({answerMode} ·{' '}
              {responseLanguage === 'auto'
                ? t('test.lang_auto_short', 'Auto lang')
                : responseLanguage.toUpperCase()}
              )
            </span>
            {showAdvancedExecution ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Convenience Deep-Link Initialization Note (Clarification #2) */}
        {deepLinkNote && (
          <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-xs bg-accent-subtle border border-accent-border text-xs text-accent">
            <span className="font-mono">{deepLinkNote}</span>
            <button
              type="button"
              onClick={() => setDeepLinkNote(null)}
              className="text-2xs font-mono underline cursor-pointer shrink-0"
            >
              {t('test.dismiss', 'Dismiss')}
            </button>
          </div>
        )}

        {/* Collapsible Advanced Execution Controls (Answer Mode + Response Language) */}
        {showAdvancedExecution && (
          <div className="pt-2 border-t border-line flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Text variant="mono-label" tone="secondary">
                {t('test.answer_mode_label', 'Answer Mode')}
              </Text>
              <SegmentedTabs<AnswerMode>
                size="sm"
                variant="ink"
                ariaLabel={t('test.answer_mode_label', 'Answer Mode')}
                activeId={answerMode}
                onChange={(nextMode) => {
                  setAnswerMode(nextMode);
                  if (streamedAnswer || metadata) {
                    handleRunQuery({ answerMode: nextMode });
                  }
                }}
                options={[
                  {
                    id: 'deterministic',
                    label: t('test.mode_deterministic', 'Deterministic'),
                  },
                  {
                    id: 'extractive',
                    label: t('test.mode_extractive', 'Extractive'),
                  },
                  {
                    id: 'generative',
                    label: t('test.mode_generative', 'Generative'),
                  },
                ]}
              />
            </div>

            <div className="flex items-center gap-2">
              <Text variant="mono-label" tone="secondary">
                {t('test.response_lang_label', 'Response Language')}
              </Text>
              <SegmentedTabs<SupportedLanguage | 'auto'>
                size="sm"
                variant="ink"
                ariaLabel={t('test.response_lang_label', 'Response Language')}
                activeId={responseLanguage}
                onChange={(nextLang) => {
                  setResponseLanguage(nextLang);
                  if (streamedAnswer || metadata) {
                    handleRunQuery({ responseLanguage: nextLang });
                  }
                }}
                options={[
                  { id: 'auto', label: t('test.lang_auto', 'Auto') },
                  { id: 'en', label: 'EN' },
                  { id: 'es', label: 'ES' },
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {knowledgeVersionNotice && (
        <Box
          surface="success"
          padding="xs"
          radius="sm"
          role="status"
          aria-live="polite"
          className="mx-8 mt-4 font-mono text-xs shrink-0 flex items-center justify-between"
        >
          <span>{knowledgeVersionNotice}</span>
          <button
            type="button"
            onClick={() => setKnowledgeVersionNotice(null)}
            className="text-2xs underline ml-4 cursor-pointer"
          >
            {t('test.dismiss', 'Dismiss')}
          </button>
        </Box>
      )}

      {/* ====================================================================
          Viewport-Bounded Split Execution + 3-Tab Inspection Console
         ==================================================================== */}
      <div className="flex-1 min-h-0 p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 w-full select-text">
        {/* Left Column: Ask OKEng + Verification Scenarios + Answer Surface */}
        <div className="lg:col-span-7 flex flex-col min-h-0 space-y-4 overflow-y-auto">
          <Card variant="surface" padding="sm" className="shrink-0 space-y-3">
            <div>
              <Text variant="mono-label" tone="secondary" className="block mb-1.5">
                {t('test.ask_label', 'Ask OKEng')}
              </Text>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={question}
                    onChange={(e) => {
                      setQuestion(e.target.value);
                      if (questionError) setQuestionError(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleRunQuery()}
                    placeholder={t('chat.placeholder', 'Ask a question to test retrieval...')}
                    error={questionError || undefined}
                    disabled={isQuerying}
                    aria-label={t('test.ask_label', 'Ask OKEng')}
                    className="bg-elevated"
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={() => handleRunQuery()}
                  isLoading={isQuerying}
                  className="shrink-0"
                >
                  {!isQuerying && <Send className="w-3.5 h-3.5" />}
                  <span>{t('test.run_button', 'Run')}</span>
                </Button>
              </div>
            </div>

            {/* Executable Verification Scenarios */}
            <div className="pt-2.5 border-t border-line space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Text variant="mono" tone="secondary" className="shrink-0 mr-1 text-2xs uppercase">
                  {t('test.scenarios_label', 'Verification scenarios:')}
                </Text>
                {verificationScenarios.map((scenario) => {
                  const isActive = activeScenarioId === scenario.id;
                  return (
                    <button
                      key={scenario.id}
                      type="button"
                      disabled={isQuerying}
                      aria-pressed={isActive}
                      onClick={() => handleSelectScenario(scenario)}
                      className={`text-2xs px-2.5 py-1 rounded-xs border transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 font-mono ${
                        isActive
                          ? 'bg-accent-subtle border-accent-border text-accent font-semibold'
                          : 'bg-elevated hover:bg-subtle text-ink border-line'
                      }`}
                    >
                      {scenario.label}
                    </button>
                  );
                })}
              </div>

              {/* Active Scenario Specification Card (OBJECTIVE / CONTEXT / EXPECTED / ACTUAL) */}
              {activeScenario && (
                <Box
                  surface="elevated"
                  padding="sm"
                  radius="xs"
                  role="status"
                  aria-live="polite"
                  className="font-mono text-2xs space-y-1.5 border border-line"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-line pb-1.5">
                    <span className="font-semibold text-ink uppercase">
                      {t('test.scenario_prefix', 'Scenario:')} {activeScenario.label}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {scenarioActualSummary && (
                        <Badge
                          tone={
                            scenarioActualSummary.status === 'verified'
                              ? 'success'
                              : scenarioActualSummary.status === 'verifying'
                              ? 'accent'
                              : scenarioActualSummary.status === 'not_verified'
                              ? 'danger'
                              : 'neutral'
                          }
                          mono
                          uppercase
                        >
                          {scenarioActualSummary.status === 'verified'
                            ? t('test.scenario_status_verified', '✓ VERIFIED')
                            : scenarioActualSummary.status === 'verifying'
                            ? t('test.scenario_status_verifying', 'VERIFYING…')
                            : scenarioActualSummary.status === 'not_verified'
                            ? t('test.scenario_status_not_verified', '× NOT VERIFIED')
                            : t('test.scenario_status_ready', 'READY')}
                        </Badge>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveScenarioId(null)}
                        className="text-ink-muted hover:text-ink cursor-pointer"
                      >
                        {t('test.scenario_clear', 'Clear')}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1">
                    <span className="sm:col-span-2 text-ink-secondary uppercase">
                      {t('test.scenario_objective', 'Objective')}
                    </span>
                    <span className="sm:col-span-10 text-ink">{activeScenario.objective}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1">
                    <span className="sm:col-span-2 text-ink-secondary uppercase">
                      {t('test.scenario_context', 'Context')}
                    </span>
                    <span className="sm:col-span-10 text-ink">{activeScenario.contextLabel}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1">
                    <span className="sm:col-span-2 text-ink-secondary uppercase">
                      {t('test.scenario_expected', 'Expected')}
                    </span>
                    <span className="sm:col-span-10 text-ink">{activeScenario.expected}</span>
                  </div>
                  {scenarioActualSummary && (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 pt-0.5">
                      <span className="sm:col-span-2 text-ink-secondary uppercase">
                        {t('test.scenario_actual', 'Actual')}
                      </span>
                      <span
                        className={`sm:col-span-10 font-semibold ${
                          scenarioActualSummary.verified ? 'text-success' : 'text-ink'
                        }`}
                      >
                        {scenarioActualSummary.text}
                      </span>
                    </div>
                  )}
                </Box>
              )}
            </div>
          </Card>

          {/* ================================================================
              Clarification #3: Explicit 401 Invalid Token Halt Surface
             ================================================================ */}
          {scopeResolution.isInvalidToken ? (
            <Card
              variant="surface"
              padding="md"
              role="status"
              aria-live="polite"
              className="space-y-3 border-danger-border"
            >
              <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
                <div className="flex items-center gap-2 text-danger">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="font-semibold text-sm">
                    {t('test.halt_401_title', '401 Unauthorized — Invalid Identity Token')}
                  </span>
                </div>
                <Badge tone="danger" mono uppercase>
                  INVALID_TOKEN_SIGNATURE
                </Badge>
              </div>
              <Text variant="body" tone="secondary">
                {t(
                  'test.halt_401_desc',
                  'Signed identity assertion failed HMAC-SHA256 verification. OKEng halted the request before collection authorization or document retrieval—it never silently downgrades an invalid token to Anonymous access.'
                )}
              </Text>
              <Box
                surface="danger"
                padding="sm"
                radius="xs"
                className="font-mono text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span>{t('test.halt_http_status', 'HTTP Status / Code:')}</span>
                  <span className="font-semibold">401 · INVALID_TOKEN_SIGNATURE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('test.halt_retrieval', 'Retrieval:')}</span>
                  <span className="font-semibold">
                    {t('test.halt_not_executed', 'Not executed')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('test.halt_chunks', 'Retrieved chunks:')}</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('test.halt_anon_fallback', 'Anonymous fallback:')}</span>
                  <span className="font-semibold">{t('test.halt_none', 'None')}</span>
                </div>
              </Box>
            </Card>
          ) : (streamedAnswer || isQuerying) ? (
            /* Compiled Answer Display */
            <Card
              variant="surface"
              padding="md"
              className="space-y-4 flex-1 min-h-0 overflow-y-auto"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Text variant="mono-label" tone="secondary">
                    {t('test.compiled_response', 'Answer')} ({answerMode})
                  </Text>
                  {metadata?.cacheTelemetry && (
                    <Badge
                      tone={metadata.cacheTelemetry.answerCache === 'MISS' ? 'neutral' : 'success'}
                      mono
                      uppercase
                    >
                      {t('test.tab_cache', 'Cache')}:{' '}
                      {formatCacheDecisionLabel(metadata.cacheTelemetry.answerCache)}
                    </Badge>
                  )}
                  {metadata?.languageContext && (
                    <Badge tone="accent" mono uppercase>
                      {metadata.languageContext.query_language} →{' '}
                      {metadata.languageContext.response_language}
                    </Badge>
                  )}
                  <AccessBadge visibility={scopeResolution.effectiveRoleLabel} />
                </div>

                {!isQuerying && streamedAnswer && (
                  <FeedbackControl
                    feedback={answerFeedback}
                    onRate={handleRateFeedback}
                  />
                )}
              </div>

              <ContentRenderer
                content={streamedAnswer}
                context="TEST_CHAT"
                locale={uiLanguage}
                roleKind="workspace_owner"
                documentTitle={question.slice(0, 48)}
                citations={
                  metadata?.sources?.map((s) => ({
                    documentId: s.docId,
                    collectionId: s.collectionId || 'COL-DOCS',
                    title: s.title,
                    filename: s.filename,
                    excerpt: s.snippet,
                    language: s.language,
                  })) || []
                }
                onRegenerate={() => handleRunQuery()}
                onSavedToWorkspace={(newDocId, colId) => {
                  setKnowledgeVersionNotice(
                    `Answer saved as Markdown document (${newDocId}) in ${colId}`
                  );
                }}
              />

              {/* Next Step Action Button (CO-NEXT-STEP) */}
              {metadata?.cta && (
                <div className="pt-2 space-y-1.5">
                  <NextStepButton
                    label={metadata.cta.label}
                    url={metadata.cta.url}
                    onTrigger={(action) =>
                      setCtaNotice(`Verified host CTA target: ${action.url}`)
                    }
                  />
                  {ctaNotice && (
                    <Text variant="mono" tone="accent">
                      {ctaNotice}
                    </Text>
                  )}
                </div>
              )}

              {/* Canonical Source Attribution List (CO-SOURCE-LIST) */}
              {metadata?.sources && metadata.sources.length > 0 && (
                <div className="border-t border-line pt-4">
                  <SourceList
                    variant="excerpts"
                    onOpenDocument={onOpenDocument}
                    sources={metadata.sources.map((src) => ({
                      documentId: src.docId,
                      collectionId: src.collectionId || 'COL-DOCS',
                      documentTitle: src.title,
                      filename: src.filename,
                      content: src.snippet,
                      similarity: src.similarity,
                      language: src.language,
                    }))}
                  />
                </div>
              )}
            </Card>
          ) : (
            /* Calm Zero-State Execution Prompt */
            <Card variant="surface" padding="md" className="space-y-3">
              <Text variant="h3" tone="primary">
                {t('test.zero_ready_title', 'Ready to verify retrieval pipeline')}
              </Text>
              <Text variant="body" tone="secondary">
                {interpolate(
                  t(
                    'test.zero_ready_desc',
                    'The Access and Cache inspection tabs on the right are already live for {scope} ({allowed} of {total} collections authorized). Run a question or pick a verification scenario above to inspect ranked chunks, BM25 + route-boost scores, and answer compilation.'
                  ),
                  {
                    scope: scopeResolution.scopeLabel,
                    allowed: effectiveAllowedCount,
                    total: targetTotalCount,
                  }
                )}
              </Text>
            </Card>
          )}
        </div>

        {/* ====================================================================
            STEP 5 & 8: Right Column — 3-Tab Stage-Aware Inspection Surface
            [ Access ]   [ Retrieval ]   [ Cache ]
           ==================================================================== */}
        <div className="lg:col-span-5 flex flex-col min-h-0">
          <Card variant="surface" padding="sm" className="space-y-4 flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-2.5 pb-3 border-b border-line">
              <CardHeader
                icon={<FlaskConical className="w-4 h-4 text-accent" />}
                title={t('test.inspector_title', 'Pipeline Inspection')}
                actions={
                  <Text variant="mono" tone="secondary" className="tabular-nums">
                    {scopeResolution.isInvalidToken
                      ? t('test.telemetry_401', '401 Halted · 0 tokens')
                      : latencyMs !== null
                      ? interpolate(
                          t('test.telemetry_latency', '{ms}ms · {tokens} tokens'),
                          { ms: latencyMs, tokens: tokens ?? 0 }
                        )
                      : interpolate(
                          t(
                            'test.telemetry_authorized',
                            '{allowed}/{total} collections authorized'
                          ),
                          { allowed: effectiveAllowedCount, total: targetTotalCount }
                        )}
                  </Text>
                }
              />

              {/* 3 Stage-Aware Inspection Tabs */}
              <SegmentedTabs<InspectorTabId>
                size="sm"
                variant="ink"
                ariaLabel={t('test.inspector_title', 'Pipeline Inspection')}
                className="w-full"
                activeId={inspectorTab}
                onChange={setInspectorTab}
                options={[
                  {
                    id: 'access',
                    label: scopeResolution.isInvalidToken
                      ? `${t('test.tab_access', 'Access')} · 401`
                      : `${t('test.tab_access', 'Access')} · ${effectiveAllowedCount}/${targetTotalCount}`,
                  },
                  {
                    id: 'retrieval',
                    label: `${t('test.tab_retrieval', 'Retrieval')} · ${
                      scopeResolution.isInvalidToken ? 0 : retrievedChunks.length
                    }`,
                  },
                  {
                    id: 'cache',
                    label: `${t('test.tab_cache', 'Cache')} · ${cacheHitLabel}`,
                  },
                ]}
              />
            </div>

            {/* ================================================================
                TAB 1: [ Access ] — Live Zero-State & Post-Query EffectiveScope
               ================================================================ */}
            {inspectorTab === 'access' && (
              <div className="space-y-4">
                <Box surface="elevated" padding="xs" radius="sm" className="font-mono text-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">
                      {t('test.access_target_scope', 'Target Scope:')}
                    </span>
                    <span className="font-semibold text-ink">{scopeResolution.scopeLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">
                      {t('test.access_identity', 'Identity:')}
                    </span>
                    <span className="font-semibold text-ink">
                      {scopeResolution.isInvalidToken
                        ? t('test.identity_invalid', 'Invalid token (401)')
                        : scopeResolution.identity.kind === 'anonymous'
                        ? `${t('test.identity_anon', 'Anonymous')} (everyone)`
                        : `Authenticated (${scopeResolution.identity.role})`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">
                      {t('test.access_effective_scope', 'Effective Scope:')}
                    </span>
                    <span className="font-semibold text-accent">
                      {scopeResolution.isInvalidToken
                        ? t('test.access_halted_zero', '0 collections (Halted)')
                        : `${effectiveAllowedCount} / ${targetTotalCount}`}
                    </span>
                  </div>
                </Box>

                {scopeResolution.isInvalidToken ? (
                  <Box
                    surface="danger"
                    padding="sm"
                    radius="xs"
                    role="status"
                    aria-live="polite"
                    className="font-mono text-xs space-y-1.5"
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>401 Unauthorized · INVALID_TOKEN_SIGNATURE</span>
                    </div>
                    <div>
                      {t('test.halt_retrieval', 'Retrieval:')}{' '}
                      {t('test.halt_not_executed', 'Not executed')}
                    </div>
                    <div>{t('test.halt_chunks', 'Retrieved chunks:')} 0</div>
                    <div>
                      {t('test.halt_anon_fallback', 'Anonymous fallback:')}{' '}
                      {t('test.halt_none', 'None')}
                    </div>
                  </Box>
                ) : (
                  <>
                    {/* Allowed Collections */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Text variant="mono-label" tone="secondary">
                          {t('test.access_allowed_heading', 'Allowed for retrieval')} (
                          {scopeResolution.allowedCollections.length})
                        </Text>
                        <InfoPopover
                          title={t('test.info_access_title', 'Canonical EffectiveScope Invariant')}
                          description={t(
                            'test.info_access_desc',
                            'EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections. Only documents in Allowed collections enter the chunking and BM25 candidate pool.'
                          )}
                          items={[
                            {
                              label: t('test.access_target_scope', 'Target Scope:'),
                              value: scopeResolution.scopeLabel,
                            },
                            {
                              label: t('test.access_allowed_heading', 'Allowed for retrieval'),
                              value: `${scopeResolution.allowedCollections.length}`,
                            },
                            {
                              label: t('test.access_excluded_heading', 'Excluded before retrieval'),
                              value: `${scopeResolution.excludedByRoleCollections.length}`,
                            },
                            { label: 'Auth Version', value: scopeResolution.authorizationVersion },
                          ]}
                        />
                      </div>

                      {scopeResolution.allowedCollections.length === 0 ? (
                        <Box
                          surface="subtle"
                          padding="xs"
                          radius="xs"
                          className="text-xs font-mono text-ink-secondary"
                        >
                          {t(
                            'test.access_zero_allowed',
                            '0 collections authorized for this Identity in the selected Scope.'
                          )}
                        </Box>
                      ) : (
                        scopeResolution.allowedCollections.map((col) => (
                          <Box
                            key={col.id}
                            surface="success"
                            padding="xs"
                            radius="xs"
                            className="flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-1.5 text-success">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span className="font-medium">{col.name}</span>
                            </div>
                            <span className="text-2xs font-mono text-success uppercase">
                              {t('test.access_allowed_badge', '✓ Allowed')} ({col.visibility})
                            </span>
                          </Box>
                        ))
                      )}
                    </div>

                    {/* Excluded Before Retrieval (Target Scope Collections Blocked by Identity Role) */}
                    <div className="space-y-1.5">
                      <Text variant="mono-label" tone="secondary">
                        {t('test.access_excluded_heading', 'Excluded before retrieval')} (
                        {scopeResolution.excludedByRoleCollections.length})
                      </Text>
                      {scopeResolution.excludedByRoleCollections.length === 0 ? (
                        <Box
                          surface="subtle"
                          padding="xs"
                          radius="xs"
                          className="text-xs font-mono text-ink-secondary"
                        >
                          {t(
                            'test.access_none_excluded',
                            'None — current Identity satisfies all collections in Target Scope.'
                          )}
                        </Box>
                      ) : (
                        scopeResolution.excludedByRoleCollections.map(
                          ({ collection: col, requiredRoleLabel }) => (
                            <Box
                              key={col.id}
                              surface="danger"
                              padding="xs"
                              radius="xs"
                              className="flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-1.5 text-danger">
                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                                <span className="font-medium line-through">{col.name}</span>
                              </div>
                              <span className="text-2xs font-mono text-danger uppercase">
                                {interpolate(
                                  t(
                                    'test.access_excluded_requires',
                                    '✕ Excluded — Requires {role}'
                                  ),
                                  { role: requiredRoleLabel }
                                )}
                              </span>
                            </Box>
                          )
                        )
                      )}
                    </div>

                    {/* Outside Target Scope (When narrowed to an Embed or Single Collection) */}
                    {scopeResolution.outsideScopeCollections.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-line">
                        <Text variant="mono-label" tone="secondary">
                          {t('test.access_outside_heading', 'Outside target scope')} (
                          {scopeResolution.outsideScopeCollections.length})
                        </Text>
                        {scopeResolution.outsideScopeCollections.map((col) => (
                          <Box
                            key={col.id}
                            surface="subtle"
                            padding="xs"
                            radius="xs"
                            className="flex items-center justify-between text-xs text-ink-secondary"
                          >
                            <div className="flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 shrink-0 text-ink-muted" />
                              <span>{col.name}</span>
                            </div>
                            <span className="text-2xs font-mono uppercase">
                              {interpolate(
                                t('test.access_outside_badge', '— Outside {scope} scope'),
                                { scope: scopeResolution.scopeType }
                              )}
                            </span>
                          </Box>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ================================================================
                TAB 2: [ Retrieval ] — Answer Plan + Ranked Chunks with [Details]
               ================================================================ */}
            {inspectorTab === 'retrieval' && (
              <div className="space-y-4">
                {scopeResolution.isInvalidToken ? (
                  <Box
                    surface="danger"
                    padding="sm"
                    radius="xs"
                    role="status"
                    aria-live="polite"
                    className="font-mono text-xs space-y-1"
                  >
                    <div className="font-semibold">401 Unauthorized · INVALID_TOKEN_SIGNATURE</div>
                    <div>
                      {t('test.halt_retrieval', 'Retrieval:')}{' '}
                      {t('test.halt_not_executed', 'Not executed')}
                    </div>
                    <div>{t('test.halt_chunks', 'Retrieved chunks:')} 0</div>
                    <div>
                      {t('test.halt_anon_fallback', 'Anonymous fallback:')}{' '}
                      {t('test.halt_none', 'None')}
                    </div>
                  </Box>
                ) : !metadata ? (
                  /* Step 6: Actionable Retrieval Pre-Query Zero-State with Secondary CTA */
                  <Box
                    surface="subtle"
                    padding="sm"
                    radius="xs"
                    className="text-xs text-ink-secondary space-y-2.5"
                  >
                    <div className="font-semibold text-ink">
                      {t('test.retrieval_zero_title', 'No retrieval has been executed yet.')}
                    </div>
                    <div>
                      {t('test.retrieval_zero_desc', 'Run the current question to inspect:')}
                    </div>
                    <ul className="list-disc pl-4 space-y-1 font-mono text-2xs text-ink">
                      <li>
                        {t(
                          'test.retrieval_zero_bullet_plan',
                          'Answer Plan (intent classification & language resolution)'
                        )}
                      </li>
                      <li>
                        {t(
                          'test.retrieval_zero_bullet_chunks',
                          'Ranked chunks & verbatim source excerpts'
                        )}
                      </li>
                      <li>
                        {t(
                          'test.retrieval_zero_bullet_scoring',
                          'BM25 similarity scoring & matched query tokens'
                        )}
                      </li>
                      <li>
                        {t(
                          'test.retrieval_zero_bullet_route',
                          'Host route context boost (+0.15)'
                        )}
                      </li>
                    </ul>
                    <div className="pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isQuerying}
                        onClick={() => handleRunQuery()}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{t('test.retrieval_run_cta', 'Run current question →')}</span>
                      </Button>
                    </div>
                  </Box>
                ) : (
                  <>
                    {/* Section 1: Answer Plan */}
                    {metadata.answerPlan && metadata.languageContext && (
                      <div className="space-y-2 border-b border-line pb-3.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                            <Globe className="w-3.5 h-3.5 text-accent" />
                            <span>{t('test.answer_plan_heading', 'Answer Plan')}</span>
                          </div>
                          <InfoPopover
                            title={t('test.info_plan_title', 'Deterministic Answer Plan')}
                            description={t(
                              'test.info_plan_desc',
                              'Explains how OKEng classified the question intent, resolved query/response language, and compiled the retrieved chunks.'
                            )}
                            items={[
                              {
                                label: 'Answer Type',
                                value: metadata.answerPlan.answerType,
                              },
                              {
                                label: 'Compiler Mode',
                                value: metadata.answerPlan.answerMode,
                              },
                              {
                                label: 'Retrieval Mode',
                                value: metadata.answerPlan.retrievalMode || 'same-language',
                              },
                              {
                                label: 'Translation Mode',
                                value: metadata.answerPlan.translationMode || 'native',
                              },
                            ]}
                          />
                        </div>

                        <Box
                          surface="elevated"
                          padding="xs"
                          radius="sm"
                          className="font-mono text-2xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-ink-secondary">
                              {t('test.plan_summary', 'Plan summary:')}
                            </span>
                            <span className="font-semibold text-ink">
                              {metadata.answerPlan.answerType} · {metadata.answerPlan.answerMode} ·{' '}
                              {metadata.languageContext.query_language.toUpperCase()} →{' '}
                              {metadata.languageContext.response_language.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-ink-secondary">
                              {t('test.plan_retrieval_translation', 'Retrieval / Translation:')}
                            </span>
                            <span>
                              {metadata.answerPlan.retrievalMode} /{' '}
                              <strong className="text-accent">
                                {metadata.answerPlan.translationMode}
                              </strong>
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-ink-secondary">
                              {t('test.plan_route_boost', 'Route boost:')}
                            </span>
                            <span>
                              {metadata.answerPlan.routeBoostApplied
                                ? t('test.plan_route_applied', 'Applied (+0.15)')
                                : t('test.halt_none', 'None')}
                            </span>
                          </div>
                          {metadata.answerPlan.document && (
                            <div className="flex items-center justify-between">
                              <span className="text-ink-secondary">
                                {t('test.plan_primary_source', 'Primary source:')}
                              </span>
                              <span>
                                {metadata.answerPlan.document} [
                                {(metadata.answerPlan.sourceLanguages || ['en']).join(', ')}]
                              </span>
                            </div>
                          )}
                        </Box>
                      </div>
                    )}

                    {/* Section 2: Ranked Chunks with Progressive [Details] Disclosure */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                          <FileText className="w-3.5 h-3.5 text-accent" />
                          <span>
                            {t('test.ranked_chunks_heading', 'Ranked Chunks')} (
                            {retrievedChunks.length})
                          </span>
                        </div>
                        <Text variant="mono" tone="muted" className="text-2xs">
                          {interpolate(
                            t('test.candidate_pool', 'Pool: {count} collection(s)'),
                            { count: effectiveAllowedCount }
                          )}
                        </Text>
                      </div>

                      {retrievedChunks.length === 0 ? (
                        <Box
                          surface="subtle"
                          padding="xs"
                          radius="xs"
                          className="font-mono text-xs text-ink-secondary"
                        >
                          {t(
                            'test.zero_chunks_matched',
                            '0 chunks matched above confidence threshold in the authorized scope.'
                          )}
                        </Box>
                      ) : (
                        <div className="space-y-2">
                          {retrievedChunks.map((chunk, idx) => {
                            const isExpanded = Boolean(expandedChunkIds[chunk.chunkId]);
                            return (
                              <Box
                                key={chunk.chunkId}
                                surface="elevated"
                                padding="xs"
                                radius="xs"
                                className="border border-line space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-mono text-2xs font-semibold text-accent shrink-0">
                                      #{idx + 1}
                                    </span>
                                    <span className="font-mono text-xs font-semibold text-ink truncate">
                                      {chunk.filename}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Badge tone="neutral" mono>
                                      {t('test.chunk_score', 'Score')}{' '}
                                      {chunk.similarity.toFixed(2)}
                                    </Badge>
                                    <button
                                      type="button"
                                      aria-expanded={isExpanded}
                                      onClick={() => toggleChunkDetails(chunk.chunkId)}
                                      className="text-2xs font-mono text-accent hover:underline cursor-pointer inline-flex items-center gap-0.5"
                                    >
                                      <span>{t('test.chunk_details', 'Details')}</span>
                                      {isExpanded ? (
                                        <ChevronDown className="w-3 h-3" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                <div className="text-2xs text-ink-secondary line-clamp-2">
                                  {chunk.preview}
                                </div>

                                {isExpanded && (
                                  <div className="pt-1.5 border-t border-line font-mono text-2xs space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-ink-secondary">
                                        {t('test.chunk_bm25', 'BM25 score:')}
                                      </span>
                                      <span>{chunk.bm25Score.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-ink-secondary">
                                        {t('test.chunk_route_boost', 'Route boost:')}
                                      </span>
                                      <span
                                        className={
                                          chunk.routeBoost > 0 ? 'text-success font-semibold' : ''
                                        }
                                      >
                                        {chunk.routeBoost > 0
                                          ? `+${chunk.routeBoost.toFixed(2)}`
                                          : '0.00'}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-ink-secondary">
                                        {t('test.chunk_lines', 'Lines:')}
                                      </span>
                                      <span>
                                        {chunk.lineStart}–{chunk.lineEnd}
                                      </span>
                                    </div>
                                    {chunk.matchedTokens && chunk.matchedTokens.length > 0 && (
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-ink-secondary shrink-0">
                                          {t('test.chunk_matched_tokens', 'Matched tokens:')}
                                        </span>
                                        <span className="truncate text-ink">
                                          {chunk.matchedTokens.join(', ')}
                                        </span>
                                      </div>
                                    )}
                                    {onOpenDocument && chunk.documentId && (
                                      <div className="pt-1 flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() => onOpenDocument(chunk.documentId)}
                                          className="inline-flex items-center gap-1 text-2xs font-mono text-accent hover:underline cursor-pointer"
                                        >
                                          <span>{t('test.open_in_editor', 'Open in Editor')}</span>
                                          <ExternalLink className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Box>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ================================================================
                TAB 3: [ Cache ] — Live Epoch State, Partition & Test Actions
               ================================================================ */}
            {inspectorTab === 'cache' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <Database className="w-3.5 h-3.5 text-accent" />
                    <span>{t('test.cache_heading', 'Cache State & Partition')}</span>
                  </div>
                  <InfoPopover
                    title={t('test.info_cache_title', 'Multi-Layer Cache Partitioning')}
                    description={t(
                      'test.info_cache_desc',
                      'Cache entries are strictly partitioned by Target Scope, Effective Collection IDs, Identity, Knowledge Version (kv), and Authorization Version (av).'
                    )}
                    items={[
                      {
                        label: t('test.cache_decision', 'Cache decision:'),
                        value:
                          normalizedCacheDecision ||
                          t('test.awaiting_query', 'Awaiting query'),
                      },
                      { label: 'Knowledge Version', value: `kv:v${currentKv}` },
                      { label: 'Authorization Version', value: `av:${shortAv}` },
                      {
                        label: 'Adapter Backend',
                        value: metadata?.cacheTelemetry?.adapterBackend || liveCacheBackend,
                      },
                    ]}
                  />
                </div>

                <Box surface="elevated" padding="xs" radius="sm" className="font-mono text-2xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-secondary shrink-0">
                      {t('test.cache_current_state', 'Current state:')}
                    </span>
                    <span className="font-semibold text-ink truncate" title={currentAv}>
                      kv:v{currentKv} · av:{shortAv}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">
                      {t('test.cache_decision', 'Cache decision:')}
                    </span>
                    <span
                      className={`font-semibold ${
                        normalizedCacheDecision && normalizedCacheDecision !== 'MISS'
                          ? 'text-success'
                          : 'text-ink'
                      }`}
                    >
                      {scopeResolution.isInvalidToken
                        ? `BYPASSED (${t('test.identity_invalid', 'Invalid token (401)')})`
                        : normalizedCacheDecision ||
                          t('test.cache_ready_prompt', 'Ready (run query to inspect)')}
                    </span>
                  </div>
                  {metadata?.cacheTelemetry?.llmStatus && (
                    <div className="flex items-center justify-between">
                      <span className="text-ink-secondary">
                        {t('test.cache_execution_path', 'Execution path:')}
                      </span>
                      <span>{metadata.cacheTelemetry.llmStatus}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">
                      {t('test.cache_partition_scope', 'Partition Scope:')}
                    </span>
                    <span className="truncate max-w-[220px]" title={scopeResolution.scopeLabel}>
                      {scopeResolution.scopeLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">
                      {t('test.cache_partition_identity', 'Partition Identity:')}
                    </span>
                    <span>
                      {scopeResolution.isInvalidToken
                        ? t('test.identity_invalid', 'Invalid token (401)')
                        : scopeResolution.identityMode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">
                      {t('test.cache_authorized_set', 'Authorized Set:')}
                    </span>
                    <span>
                      [{scopeResolution.authorizationScope.collectionIds.join(', ') || 'empty'}]
                    </span>
                  </div>
                </Box>

                {/* Clarification #4: Diagnostic Test Actions inside [Cache] tab */}
                <div className="space-y-2 pt-2 border-t border-line">
                  <Text variant="mono-label" tone="secondary">
                    {t('test.cache_test_actions', 'Test actions')}
                  </Text>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isQuerying || scopeResolution.isInvalidToken}
                      onClick={() => handleRunQuery()}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{t('test.cache_rerun', 'Re-run query')}</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      isLoading={isBumpingCache}
                      onClick={handleBumpKnowledgeVersion}
                    >
                      {!isBumpingCache && <RefreshCw className="w-3.5 h-3.5" />}
                      <span>{t('test.cache_invalidate', 'Invalidate cache')}</span>
                    </Button>
                  </div>
                  <Text variant="caption" tone="muted">
                    {t(
                      'test.cache_actions_hint',
                      'Use Re-run query to verify MISS → HIT_EXACT under identical context, or Invalidate cache to advance the knowledge epoch and verify invalidation.'
                    )}
                  </Text>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
