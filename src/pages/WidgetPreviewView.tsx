import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Send,
  X,
  MessageSquare,
  Shield,
  Sliders,
  Copy,
  Check,
  BookOpen,
  Compass,
  Maximize2,
  PanelRight,
  SquareTerminal,
  Globe,
  Monitor,
  Tablet,
  Smartphone,
} from 'lucide-react';
import { store } from '../services/store';
import { authService } from '../services/auth';
import { ContentRenderer } from '../content';
import {
  AccessVisibility,
  EmbedPresentationMode,
  SourceCitation,
  EmbedIdentity,
} from '../types';
import {
  getEmbedCollectionIds,
  resolveEmbedAuthorization,
  resolveAuthorizedSuggestions,
  filterAuthorizedRouteRules,
  clearanceLabelToEmbedIdentity,
} from '../services/embedAuthorization';
import { DocArticleRenderer } from '../components/public/DocArticleRenderer';
import { LanguageSelector } from '../components/LanguageSelector';
import { NextStepButton } from '../components/NextStepButton';
import { DocumentNav, DocumentNavGroup } from '../components/DocumentNav';
import { normalizeAccentHex } from '../components/EmbedCard';
import {
  Card,
  Box,
  Drawer,
  Text,
  Input,
  Button,
  InfoPopover,
} from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import { validatePlainText } from '../services/formSecurity';

export interface WidgetPreviewViewProps {
  initialEmbedId?: string;
  onBack: (activeEmbedId?: string) => void;
}

type SimulatedViewport = 'desktop' | 'tablet' | 'mobile';

const BASE_SIMULATED_ROUTES = [
  {
    path: '/settings/security/sso',
    title: 'Security & SAML SSO Configuration',
    breadcrumb: 'Settings / Security / SSO',
    description:
      'Configure your Identity Provider (Okta, Google Workspace, Azure AD), rotate KMS signing keys, and enforce workspace-wide SSO.',
  },
  {
    path: '/docs/getting-started',
    title: 'Quickstart & Workspace Onboarding',
    breadcrumb: 'Documentation / Getting Started',
    description:
      'Set up your first knowledge collection, ingest Markdown documents, and verify role-based retrieval.',
  },
  {
    path: '/billing/invoices',
    title: 'Workspace Billing & Seat Allocation',
    breadcrumb: 'Settings / Billing & Seats',
    description:
      'Manage Workspace Owner and Workspace User memberships, review monthly seat allocations, and transfer ownership.',
  },
  {
    path: '/api/authentication',
    title: 'Embedded Identity & HMAC Token Signer',
    breadcrumb: 'Developer API / Authentication',
    description:
      'Generate short-lived (5-minute) HMAC-SHA256 identity assertions from your backend to authorize embedded queries.',
  },
];

const PRESENTATION_MODES: {
  id: EmbedPresentationMode;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'widget', label: 'Widget', icon: Globe },
  { id: 'panel', label: 'Panel', icon: PanelRight },
  { id: 'fullscreen', label: 'Fullscreen', icon: Maximize2 },
  { id: 'inline', label: 'Inline', icon: SquareTerminal },
  { id: 'documentation', label: 'Docs', icon: BookOpen },
  { id: 'contextual', label: 'Contextual', icon: Compass },
];

function matchesRoutePattern(pattern: string, path: string): boolean {
  const cleanPattern = pattern.trim();
  if (cleanPattern === path) return true;
  if (cleanPattern.endsWith('/*')) {
    const prefix = cleanPattern.slice(0, -2);
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  return false;
}

export const WidgetPreviewView: React.FC<WidgetPreviewViewProps> = ({
  initialEmbedId,
  onBack,
}) => {
  const { language, t } = useI18n();
  const embeds = store.getEmbeds();
  const workspace = store.getWorkspace();
  const allCollections = store.getCollections();
  const allDocuments = store.getDocuments();

  const [selectedEmbedId, setSelectedEmbedId] = useState<string>(
    initialEmbedId || embeds[0]?.id || 'EMB-PRODUCT-WIDGET'
  );
  const currentEmbed =
    embeds.find((e) => e.id === selectedEmbedId) || embeds[0];

  // Sync when initialEmbedId prop changes
  useEffect(() => {
    if (initialEmbedId && embeds.some((e) => e.id === initialEmbedId)) {
      setSelectedEmbedId(initialEmbedId);
      const target = embeds.find((e) => e.id === initialEmbedId);
      if (target?.mode) {
        setActiveMode(target.mode);
      }
      setIsWidgetOpen((target?.behaviorConfig?.initialState || 'open') === 'open');
    }
  }, [initialEmbedId]);

  // Allow switching presentation modes live without leaving the simulator
  const [activeMode, setActiveMode] = useState<EmbedPresentationMode>(
    currentEmbed?.mode || 'widget'
  );
  const [simulatedRoute, setSimulatedRoute] = useState<string>(
    BASE_SIMULATED_ROUTES[0].path
  );
  const [simulatedClearance, setSimulatedClearance] =
    useState<AccessVisibility>('everyone');
  const [simulatedIdentityFault, setSimulatedIdentityFault] =
    useState<boolean>(false);
  const [simulatedViewport, setSimulatedViewport] =
    useState<SimulatedViewport>('desktop');
  const [isWidgetOpen, setIsWidgetOpen] = useState<boolean>(() => {
    const init = currentEmbed?.behaviorConfig?.initialState;
    return init ? init === 'open' : true;
  });
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [copiedVars, setCopiedVars] = useState(false);

  // Combine standard simulated routes with any custom routeRules defined on currentEmbed
  const availableRoutes = useMemo(() => {
    const list = [...BASE_SIMULATED_ROUTES];
    const rules = currentEmbed?.contextConfig?.routeRules || [];
    for (const rule of rules) {
      const samplePath = rule.routePattern.endsWith('/*')
        ? rule.routePattern.slice(0, -2)
        : rule.routePattern;
      if (!list.some((r) => r.path === samplePath)) {
        list.push({
          path: samplePath,
          title: rule.promptTitle || `Host Route (${samplePath})`,
          breadcrumb: `Host App / ${samplePath.replace(/^\//, '')}`,
          description: `Simulated host route matching custom rule "${rule.routePattern}".`,
        });
      }
    }
    return list;
  }, [currentEmbed]);

  // Documentation mode state
  const [selectedDocId, setSelectedDocId] = useState<string>('doc_docs_05');
  const docReaderRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (docReaderRef.current) {
      docReaderRef.current.scrollTop = 0;
    }
  }, [selectedDocId, activeMode]);

  // Live query state inside simulator
  const [question, setQuestion] = useState('');
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [askedQuestion, setAskedQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<SourceCitation[]>([]);
  const [cta, setCta] = useState<{ label: string; url: string } | undefined>(
    undefined
  );
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSelectEmbed = (embedId: string) => {
    setSelectedEmbedId(embedId);
    const target = embeds.find((e) => e.id === embedId);
    if (target?.mode) {
      setActiveMode(target.mode);
    }
    const init = target?.behaviorConfig?.initialState;
    setIsWidgetOpen(init ? init === 'open' : true);
    setAskedQuestion(null);
    setAnswer('');
    setSources([]);
  };

  // Host Context & Behavior resolution
  const useCurrentPage = currentEmbed?.contextConfig?.useCurrentPage ?? true;
  const useHostUserContext = currentEmbed?.contextConfig?.useHostUserContext ?? true;
  const effectiveClearance: AccessVisibility = useHostUserContext
    ? simulatedClearance
    : 'everyone';

  const activeRouteMeta =
    availableRoutes.find((r) => r.path === simulatedRoute) || availableRoutes[0];

  // Behavior & Appearance tokens from currentEmbed
  const showNavigation = currentEmbed?.behaviorConfig?.showNavigation ?? true;
  const ctaBehavior = currentEmbed?.behaviorConfig?.ctaBehavior || 'inline-link';
  const appearance = currentEmbed?.appearanceConfig;
  const accentHex = normalizeAccentHex(
    appearance?.accentColor || currentEmbed?.accentColor
  );
  const surfaceWidth = appearance?.width || '380px';
  const surfaceRadius = appearance?.radius || '4px';
  const surfacePosition =
    appearance?.position || currentEmbed?.position || 'bottom-right';
  const themeMode = appearance?.theme || 'light';

  const panelPosition: 'left' | 'right' =
    surfacePosition === 'left' || surfacePosition === 'bottom-left'
      ? 'left'
      : 'right';
  const widgetCornerClass =
    surfacePosition === 'bottom-left' || surfacePosition === 'left'
      ? 'bottom-5 left-5'
      : 'bottom-5 right-5';

  // Canonical Identity & Authorization Scope Resolution
  // Installation != Identity != Authorization != Retrieval
  const simulatedIdentity: EmbedIdentity = useMemo(
    () => clearanceLabelToEmbedIdentity(simulatedClearance),
    [simulatedClearance]
  );

  const embedColIds = useMemo(
    () =>
      currentEmbed
        ? getEmbedCollectionIds(currentEmbed)
        : Object.freeze(['COL-PUBLIC']),
    [currentEmbed]
  );

  const authorizationScope = useMemo(
    () =>
      simulatedIdentityFault
        ? Object.freeze({
            identity: simulatedIdentity,
            collectionIds: Object.freeze([] as string[]),
          })
        : resolveEmbedAuthorization(simulatedIdentity, embedColIds, allCollections),
    [simulatedIdentityFault, simulatedIdentity, embedColIds, allCollections]
  );

  const authorizedColIdSet = useMemo(
    () => new Set(authorizationScope.collectionIds),
    [authorizationScope.collectionIds]
  );

  const authorizedEmbedCollections = useMemo(
    () => allCollections.filter((c) => authorizedColIdSet.has(c.id)),
    [allCollections, authorizedColIdSet]
  );

  const blockedEmbedCollections = useMemo(
    () =>
      allCollections.filter(
        (c) => embedColIds.includes(c.id) && !authorizedColIdSet.has(c.id)
      ),
    [allCollections, embedColIds, authorizedColIdSet]
  );

  // Resolve route-specific rule only when useCurrentPage is enabled, filtered strictly by AuthorizationScope.collectionIds
  const matchedRouteRule = useMemo(() => {
    if (!useCurrentPage) return undefined;
    const ownAuthorizedRules = filterAuthorizedRouteRules(
      currentEmbed?.contextConfig?.routeRules || [],
      authorizationScope,
      allDocuments
    );
    const ownMatch = ownAuthorizedRules.find((r) =>
      matchesRoutePattern(r.routePattern, simulatedRoute)
    );
    if (ownMatch) return ownMatch;
    const fallbackRules = filterAuthorizedRouteRules(
      embeds.find((e) => e.id === 'EMB-SSO-CONTEXTUAL')?.contextConfig?.routeRules || [],
      authorizationScope,
      allDocuments
    );
    return fallbackRules.find((r) =>
      matchesRoutePattern(r.routePattern, simulatedRoute)
    );
  }, [useCurrentPage, currentEmbed, embeds, simulatedRoute, authorizationScope, allDocuments]);

  // Documents available inside this Embed given AuthorizationScope.collectionIds + optional document narrowing
  const narrowedDocIds =
    (useCurrentPage ? matchedRouteRule?.documentIds : undefined) ||
    currentEmbed?.knowledgeScope?.documentIds;

  const accessibleDocuments = useMemo(() => {
    const baseDocs = allDocuments.filter(
      (d) =>
        authorizedColIdSet.has(d.collectionId) &&
        !d.deletedAt &&
        d.status === 'ready'
    );
    if (narrowedDocIds && narrowedDocIds.length > 0) {
      const pinned = baseDocs.filter((d) => narrowedDocIds.includes(d.id));
      return pinned.length > 0 ? pinned : baseDocs;
    }
    return baseDocs;
  }, [allDocuments, authorizedColIdSet, narrowedDocIds]);

  const activeDoc =
    accessibleDocuments.find((d) => d.id === selectedDocId) ||
    accessibleDocuments[0];

  const docNavGroups: DocumentNavGroup[] = useMemo(() => {
    return authorizedEmbedCollections
      .map((col) => {
        const colDocs = accessibleDocuments.filter(
          (d) => d.collectionId === col.id
        );
        return {
          id: col.id,
          title: col.name,
          badge: col.visibility !== 'everyone' ? col.visibility : undefined,
          items: colDocs.map((d) => ({
            id: d.id,
            title: d.title,
          })),
        };
      })
      .filter((g) => g.items.length > 0);
  }, [authorizedEmbedCollections, accessibleDocuments]);

  // Starter questions: route rule -> embed behaviorConfig -> fallback, filtered by AuthorizationScope.collectionIds
  const rawSuggestedQuestions =
    (useCurrentPage && matchedRouteRule?.suggestedQuestions?.length
      ? matchedRouteRule.suggestedQuestions
      : undefined) ||
    (currentEmbed?.behaviorConfig?.suggestedQuestions?.length
      ? currentEmbed.behaviorConfig.suggestedQuestions
      : undefined) || [
      'How do I configure SAML 2.0 SSO with Okta?',
      'How does OKEng enforce role isolation before retrieval?',
      'How do I sign a 5-minute embedded identity token?',
    ];

  const suggestedQuestions = useMemo(
    () =>
      resolveAuthorizedSuggestions({
        authorizationScope,
        documents: allDocuments,
        configuredSuggestions: rawSuggestedQuestions,
      }),
    [authorizationScope, allDocuments, rawSuggestedQuestions]
  );

  const cssVariables = currentEmbed
    ? store.resolveEmbedCssVariables(currentEmbed)
    : {};

  const handleCopyCssVars = () => {
    const cssText = `:root {\n${Object.entries(cssVariables)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n')}\n}`;
    navigator.clipboard.writeText(cssText);
    setCopiedVars(true);
    setTimeout(() => setCopiedVars(false), 1800);
  };

  const runSimulatedQuery = async (qText: string) => {
    if (simulatedIdentityFault) {
      setAskedQuestion(qText);
      setAnswer(
        '**401 Unauthorized (`INVALID_TOKEN_SIGNATURE`)**: The supplied `identityToken` failed HS256 verification. OKEng never silently downgrades an invalid or expired identity assertion to anonymous.'
      );
      setSources([]);
      setCta(undefined);
      return;
    }

    const check = validatePlainText(qText, {
      required: true,
      minLength: 2,
      maxLength: 500,
      fieldLabel: 'Question',
    });
    if (!check.valid) {
      setQuestionError(check.error);
      return;
    }
    const cleanQuestion = check.sanitized;
    setQuestionError(null);
    setAskedQuestion(cleanQuestion);
    setQuestion('');
    setIsStreaming(true);
    setAnswer('');
    setSources([]);
    setCta(undefined);

    const effectiveUrl = useCurrentPage ? simulatedRoute : '/workspace';

    // Run deterministic authorization-before-retrieval consuming ONLY AuthorizationScope
    const diagnosis = store.queryKnowledge({
      question: cleanQuestion,
      authorizationScope,
      currentUrl: effectiveUrl,
    });

    const scopedCitations = diagnosis.sources.filter((s) =>
      authorizedColIdSet.has(s.collectionId)
    );
    setSources(scopedCitations);
    setCta(scopedCitations[0]?.nextStep || diagnosis.cta);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: cleanQuestion,
          role: effectiveClearance,
          currentUrl: effectiveUrl,
          language,
          chunks: diagnosis.retrievedChunks.map((c) => ({
            documentTitle: c.documentTitle,
            heading: c.filename,
            content: c.preview,
          })),
        }),
      });

      if (!response.ok) throw new Error('Fallback to local synthesis');
      const data = await response.json();
      setAnswer(data.answer || diagnosis.answer);
    } catch {
      setAnswer(diagnosis.answer);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSimulatedQuery(question);
  };

  const renderCtaIfAllowed = (ctaItem?: { label: string; url: string }) => {
    if (!ctaItem || ctaBehavior === 'hidden') return null;
    return (
      <div className="space-y-1">
        <NextStepButton label={ctaItem.label} url={ctaItem.url} />
        <div className="text-2xs font-mono text-ink-muted">
          CTA mode: {ctaBehavior === 'new-tab' ? 'Opens in new tab' : 'Inline link'}
        </div>
      </div>
    );
  };

  // Reusable Conversational Assistant Sub-Surface (used in Widget, Panel, Contextual, and Docs right rail)
  const renderAssistantFeed = (compact = false) => (
    <div className="flex flex-col h-full min-h-0">
      <div
        className={`flex-1 overflow-y-auto ${
          compact ? 'p-3.5 space-y-3.5' : 'p-4 space-y-4'
        } select-text`}
      >
        {/* Contextual Greeting Banner */}
        <Box surface="elevated" padding="sm" radius="sm" className="p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-2xs font-mono uppercase tracking-wider font-semibold"
              style={{ color: accentHex }}
            >
              {useCurrentPage && matchedRouteRule?.promptTitle
                ? matchedRouteRule.promptTitle
                : currentEmbed?.name || 'OKEng Assistant'}
            </span>
            <span className="text-2xs font-mono text-ink-muted">
              Clearance: {effectiveClearance.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-ink leading-relaxed">
            {currentEmbed?.greetingText ||
              'Ask a question grounded in your authorized collections.'}
          </p>
        </Box>

        {/* Starter Questions when no question asked yet */}
        {!askedQuestion && (
          <div className="space-y-1.5">
            <div className="text-2xs font-mono uppercase tracking-wider text-ink-muted">
              Suggested for {useCurrentPage ? simulatedRoute : 'Workspace'}
            </div>
            <div className="space-y-1.5">
              {suggestedQuestions.map((sq) => (
                <button
                  key={sq}
                  type="button"
                  onClick={() => runSimulatedQuery(sq)}
                  className="w-full text-left px-3 py-2 rounded-sm bg-canvas hover:bg-surface-hover border border-line text-xs text-ink flex items-center justify-between gap-2 transition-colors"
                >
                  <span>{sq}</span>
                  <span
                    className="font-mono text-2xs shrink-0"
                    style={{ color: accentHex }}
                  >
                    Ask →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Q&A Thread */}
        {askedQuestion && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <div
                className="text-surface px-3 py-2 rounded-sm text-xs max-w-[88%]"
                style={{ backgroundColor: accentHex }}
              >
                {askedQuestion}
              </div>
            </div>

            <div className="bg-surface border border-line rounded-sm p-3.5 space-y-3">
              {isStreaming ? (
                <div className="flex items-center gap-2 text-xs text-ink-secondary font-mono py-2">
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: accentHex }}
                  />
                  <span>Synthesizing grounded response...</span>
                </div>
              ) : (
                <>
                  <ContentRenderer content={answer} className="text-xs" />

                  {sources.length > 0 && (
                    <div className="pt-2.5 border-t border-line-subtle space-y-1.5">
                      <div className="text-2xs font-mono uppercase tracking-wider text-ink-muted">
                        Grounded Sources ({sources.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {sources.map((src) => (
                          <button
                            key={src.docId}
                            type="button"
                            onClick={() => {
                              setSelectedDocId(src.docId);
                            }}
                            className="px-2 py-0.5 rounded-xs bg-canvas hover:bg-surface-hover border border-line text-2xs font-mono text-ink flex items-center gap-1 transition-colors"
                          >
                            <BookOpen
                              className="w-2.5 h-2.5"
                              style={{ color: accentHex }}
                            />
                            <span>{src.filename}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {renderCtaIfAllowed(cta)}
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setAskedQuestion(null);
                setAnswer('');
                setSources([]);
              }}
              className="text-2xs font-mono text-ink-secondary hover:text-ink underline"
            >
              ← Clear &amp; show starter questions
            </button>
          </div>
        )}
      </div>

      {/* Prompt Input Footer */}
      <form
        onSubmit={handleFormSubmit}
        className="p-3 border-t border-line bg-surface shrink-0 space-y-1.5"
      >
        <div className="flex items-center gap-1.5">
          <div className="flex-1">
            <Input
              type="text"
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                if (questionError) setQuestionError(null);
              }}
              placeholder={
                currentEmbed?.placeholderText || 'Ask a question...'
              }
              maxLength={500}
              error={questionError}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!question.trim() || isStreaming}
            aria-label="Send question"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );

  const viewportWrapperClass =
    simulatedViewport === 'mobile'
      ? 'max-w-[390px] w-full mx-auto border-x border-line shadow-md'
      : simulatedViewport === 'tablet'
      ? 'max-w-[768px] w-full mx-auto border-x border-line shadow-md'
      : 'w-full';

  return (
    <div
      className={`h-screen flex flex-col overflow-hidden ${
        themeMode === 'high-contrast' ? 'contrast-125 bg-canvas' : 'bg-canvas'
      }`}
    >
      {/* ====================================================================
          COMPACT SINGLE-ROW HOST SIMULATOR TOOLBAR (SU-EMBED-HOST-SIMULATOR)
          Tests Embed + Mode + Route + Identity + Viewport + Inspect Telemetry
          ==================================================================== */}
      <header className="h-12 bg-surface border-b border-line px-4 flex items-center justify-between gap-3 shrink-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => onBack(currentEmbed?.id)}>
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('simulator.back', 'Back')}</span>
          </Button>

          <span className="text-line select-none">|</span>

          {/* Active Embed Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-2xs font-mono uppercase tracking-wider text-ink-muted hidden xl:inline">
              {t('simulator.embed_label', 'Embed:')}
            </span>
            <select
              value={selectedEmbedId}
              onChange={(e) => handleSelectEmbed(e.target.value)}
              aria-label="Select Embed Instance"
              className="px-2 py-1 text-xs font-medium bg-canvas border border-line rounded-sm text-ink focus:outline-none focus:border-accent"
            >
              {embeds.map((emb) => (
                <option key={emb.id} value={emb.id}>
                  {emb.name}
                </option>
              ))}
            </select>
            <InfoPopover
              title="Active Simulated Embed"
              items={[
                { label: 'Embed ID', value: currentEmbed?.id || 'NONE' },
                { label: 'Configured Mode', value: currentEmbed?.mode || 'widget' },
                {
                  label: 'Theme / Radius / Width',
                  value: `${themeMode} · ${surfaceRadius} · ${surfaceWidth}`,
                },
                {
                  label: 'Scoped Collections',
                  value: embedColIds.join(', '),
                },
                {
                  label: 'Authorized Collections',
                  value:
                    authorizedEmbedCollections.map((c) => c.id).join(', ') || 'NONE',
                },
              ]}
            />
          </div>

          {/* Presentation Mode Switcher (6 Canonical Modes) */}
          <div className="hidden md:flex items-center bg-canvas p-0.5 rounded-sm border border-line">
            {PRESENTATION_MODES.map((m) => {
              const Icon = m.icon;
              const isSelected = activeMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMode(m.id)}
                  className={`px-2 py-1 rounded-xs text-2xs font-medium flex items-center gap-1 transition-colors ${
                    isSelected
                      ? 'bg-surface text-ink shadow-2xs border border-line-subtle'
                      : 'text-ink-secondary hover:text-ink'
                  }`}
                  title={`Simulate ${m.label} mode`}
                >
                  <Icon
                    className={`w-3 h-3 ${
                      isSelected ? 'text-accent' : 'text-ink-muted'
                    }`}
                  />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Controls: Host Route + Simulated Clearance + Viewport + Inspect */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Simulated Host Route */}
          <div className="hidden lg:flex items-center gap-1.5">
            <span className="text-2xs font-mono text-ink-muted">
              {t('simulator.route_label', 'Route:')}
            </span>
            <select
              value={simulatedRoute}
              onChange={(e) => setSimulatedRoute(e.target.value)}
              aria-label="Simulated Host Route"
              className="px-2 py-1 text-2xs font-mono bg-canvas border border-line rounded-sm text-ink focus:outline-none focus:border-accent"
            >
              {availableRoutes.map((r) => (
                <option key={r.path} value={r.path}>
                  {r.path}
                </option>
              ))}
            </select>
          </div>

          {/* Simulated Host User Identity Clearance + Invalid Token Fault Toggle */}
          <div
            className="flex items-center bg-canvas p-0.5 rounded-sm border border-line"
            title="Simulate progressive host user identity (Anonymous, Member, Admin, or Invalid Token 401)"
          >
            {(
              [
                { id: 'everyone', label: t('simulator.role_anon', 'Anon') },
                { id: 'members', label: t('simulator.role_member', 'Member') },
                { id: 'admins', label: t('simulator.role_admin', 'Admin') },
              ] as const
            ).map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => {
                  setSimulatedIdentityFault(false);
                  setSimulatedClearance(tier.id);
                }}
                className={`px-2 py-0.5 rounded-xs text-2xs font-mono uppercase transition-colors ${
                  !simulatedIdentityFault && simulatedClearance === tier.id
                    ? 'bg-ink text-surface font-medium'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                {tier.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSimulatedIdentityFault(!simulatedIdentityFault)}
              title="Simulate invalid/expired identityToken (must reject with 401, never downgrade to anonymous)"
              className={`px-2 py-0.5 rounded-xs text-2xs font-mono uppercase transition-colors ${
                simulatedIdentityFault
                  ? 'bg-danger text-surface font-medium'
                  : 'text-ink-muted hover:text-danger'
              }`}
            >
              Invalid (401)
            </button>
          </div>

          {/* Viewport Switcher (Desktop | Tablet | Mobile) */}
          <div className="hidden sm:flex items-center bg-canvas p-0.5 rounded-sm border border-line">
            {(
              [
                { id: 'desktop', label: 'Desktop', icon: Monitor },
                { id: 'tablet', label: 'Tablet', icon: Tablet },
                { id: 'mobile', label: 'Mobile', icon: Smartphone },
              ] as const
            ).map((vp) => {
              const VpIcon = vp.icon;
              const isSelected = simulatedViewport === vp.id;
              return (
                <button
                  key={vp.id}
                  type="button"
                  onClick={() => setSimulatedViewport(vp.id)}
                  title={`Simulate ${vp.label} viewport`}
                  aria-label={`Simulate ${vp.label} viewport`}
                  className={`px-1.5 py-1 rounded-xs text-2xs font-mono flex items-center gap-1 transition-colors ${
                    isSelected
                      ? 'bg-surface text-ink border border-line-subtle'
                      : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  <VpIcon className="w-3 h-3" />
                  <span className="hidden xl:inline">{vp.label}</span>
                </button>
              );
            })}
          </div>

          <LanguageSelector variant="compact" />

          {/* Compact Inspect Popover (Route, User, Viewport, Host Context, Theme Variables) */}
          <div className="relative">
            <Button
              variant={isInspectOpen ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setIsInspectOpen(!isInspectOpen)}
            >
              <Sliders className="w-3 h-3" />
              <span>{t('simulator.inspect', 'Inspect')}</span>
            </Button>

            {isInspectOpen && (
              <div className="absolute right-0 mt-1.5 w-96 bg-surface border border-line rounded-sm shadow-lg p-3.5 z-50 space-y-3 text-xs select-text">
                <div className="flex items-center justify-between border-b border-line-subtle pb-2">
                  <span className="font-mono text-2xs uppercase tracking-wider font-semibold text-ink">
                    Host Integration Diagnostics
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsInspectOpen(false)}
                    aria-label="Close diagnostics"
                    className="text-ink-muted hover:text-ink"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 1. Route */}
                <div className="space-y-1 text-2xs font-mono">
                  <div className="uppercase tracking-wider text-ink-muted font-semibold">
                    1. Route Context
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Host Route:</span>
                    <span className="text-ink">{simulatedRoute}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">useCurrentPage:</span>
                    <span className="text-ink">{useCurrentPage ? 'true' : 'false'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Matched Route Rule:</span>
                    <span className="text-accent">
                      {matchedRouteRule ? matchedRouteRule.routePattern : 'None (Default)'}
                    </span>
                  </div>
                </div>

                {/* 2. User Identity */}
                <div className="space-y-1 text-2xs font-mono border-t border-line-subtle pt-2">
                  <div className="uppercase tracking-wider text-ink-muted font-semibold">
                    2. User Identity &amp; Clearance
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">useHostUserContext:</span>
                    <span className="text-ink">
                      {useHostUserContext ? 'true (HMAC Signed)' : 'false (Forced Anon)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Effective Clearance:</span>
                    <span className="text-accent uppercase">{effectiveClearance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Authorized Collections:</span>
                    <span className="text-success">
                      {authorizedEmbedCollections.map((c) => c.name).join(', ') || 'None'}
                    </span>
                  </div>
                  {blockedEmbedCollections.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Excluded by Role:</span>
                      <span className="text-danger">
                        {blockedEmbedCollections.map((c) => c.name).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Viewport & Surface */}
                <div className="space-y-1 text-2xs font-mono border-t border-line-subtle pt-2">
                  <div className="uppercase tracking-wider text-ink-muted font-semibold">
                    3. Viewport &amp; Surface Geometry
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Simulated Viewport:</span>
                    <span className="text-ink uppercase">
                      {simulatedViewport === 'desktop'
                        ? 'Desktop (100%)'
                        : simulatedViewport === 'tablet'
                        ? 'Tablet (768px)'
                        : 'Mobile (390px)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Width / Position / Radius:</span>
                    <span className="text-ink">
                      {surfaceWidth} · {surfacePosition} · {surfaceRadius}
                    </span>
                  </div>
                </div>

                {/* 4. Host Context & Behavior */}
                <div className="space-y-1 text-2xs font-mono border-t border-line-subtle pt-2">
                  <div className="uppercase tracking-wider text-ink-muted font-semibold">
                    4. Behavior Configuration
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">initialState / ctaBehavior:</span>
                    <span className="text-ink">
                      {currentEmbed?.behaviorConfig?.initialState || 'closed'} · {ctaBehavior}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">showNavigation:</span>
                    <span className="text-ink">{showNavigation ? 'true' : 'false'}</span>
                  </div>
                </div>

                {/* 5. Controlled CSS Variables */}
                <div className="border-t border-line-subtle pt-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xs uppercase tracking-wider text-ink-muted font-semibold">
                      5. Theme Variables (--okeng-*)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCssVars}
                      className="text-2xs font-mono text-accent hover:underline flex items-center gap-1"
                    >
                      {copiedVars ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedVars ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-2 bg-canvas border border-line rounded-xs font-mono text-2xs text-ink-secondary overflow-x-auto">
                    {Object.entries(cssVariables)
                      .map(([k, v]) => `${k}: ${v};`)
                      .join('\n')}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ====================================================================
          MAIN SIMULATED HOST STAGE (Constrained by Simulated Viewport)
          ==================================================================== */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden bg-canvas">
        <div className={`flex-1 flex min-h-0 relative overflow-hidden ${viewportWrapperClass}`}>
          {/* MODE 5: FULLSCREEN DOCUMENTATION (SU-EMBED-DOCUMENTATION) */}
          {activeMode === 'documentation' ? (
            <div className="flex-1 flex min-h-0 bg-surface">
              {/* Column 1: Document Tree Navigation (respects behaviorConfig.showNavigation) */}
              {showNavigation && (
                <aside className="w-60 border-r border-line bg-canvas flex flex-col shrink-0">
                  <div className="p-3.5 border-b border-line flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen
                        className="w-4 h-4"
                        style={{ color: accentHex }}
                      />
                      <span className="text-xs font-semibold text-ink truncate">
                        {currentEmbed?.name || 'Documentation'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    <DocumentNav
                      groups={docNavGroups}
                      activeItemId={activeDoc?.id}
                      onSelectItem={(docId) => setSelectedDocId(docId)}
                    />
                  </div>
                </aside>
              )}

              {/* Column 2: Primary Markdown Document Reader */}
              <main
                ref={docReaderRef}
                className="flex-1 overflow-y-auto p-8 bg-surface select-text"
              >
                {activeDoc ? (
                  <div className="w-full">
                    <DocArticleRenderer
                      document={activeDoc}
                    />
                  </div>
                ) : (
                  <div className="text-sm text-ink-secondary">
                    No authorized documents available for this role clearance.
                  </div>
                )}
              </main>

              {/* Column 3: Contextual Knowledge Assistant Rail */}
              <aside className="w-80 border-l border-line bg-canvas flex flex-col shrink-0">
                <div className="px-4 py-3 border-b border-line bg-surface flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare
                      className="w-3.5 h-3.5"
                      style={{ color: accentHex }}
                    />
                    <span className="text-xs font-semibold text-ink">
                      Ask Documentation
                    </span>
                  </div>
                  <span className="text-2xs font-mono text-ink-muted">
                    {authorizedEmbedCollections.length} col(s)
                  </span>
                </div>
                <div className="flex-1 min-h-0">{renderAssistantFeed(true)}</div>
              </aside>
            </div>
          ) : activeMode === 'fullscreen' ? (
            /* MODE 3: FULLSCREEN ASSISTANT (SU-EMBED-FULLSCREEN) */
            <div className="flex-1 flex flex-col bg-surface min-h-0">
              <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-canvas">
                <div>
                  <h1 className="text-base font-semibold text-ink">
                    {currentEmbed?.name || 'OKEng Knowledge Portal'}
                  </h1>
                  <p className="text-xs text-ink-secondary">
                    Scoped to:{' '}
                    {authorizedEmbedCollections.map((c) => c.name).join(', ')} (
                    {accessibleDocuments.length} accessible docs)
                  </p>
                </div>
                <span className="text-2xs font-mono text-ink-muted">
                  SU-EMBED-FULLSCREEN · {workspace.slug}
                </span>
              </div>
              <div className="flex-1 w-full min-h-0 flex flex-col">
                {renderAssistantFeed(false)}
              </div>
            </div>
          ) : (
            /* HOST APPLICATION CANVAS (Used by Widget, Slide-In Panel, Inline, and Contextual Help) */
            <div className="flex-1 flex min-h-0 relative overflow-hidden">
              <main className="flex-1 overflow-y-auto p-8 space-y-6 select-text">
                <div className="w-full space-y-6">
                  {/* Simulated Host Page Header */}
                  <Card variant="surface" padding="lg" className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-mono uppercase tracking-wider text-ink-muted">
                        Host Application · {activeRouteMeta.breadcrumb}
                      </span>
                      <span
                        className="text-2xs font-mono"
                        style={{ color: accentHex }}
                      >
                        route: {simulatedRoute}
                      </span>
                    </div>
                    <Text variant="h1" tone="primary">
                      {activeRouteMeta.title}
                    </Text>
                    <Text
                      variant="body"
                      tone="secondary"
                      className="leading-relaxed"
                    >
                      {activeRouteMeta.description}
                    </Text>

                    {!useHostUserContext && simulatedClearance !== 'everyone' && (
                      <div className="p-2.5 bg-warning/10 border border-warning/30 rounded-xs text-2xs font-mono text-warning">
                        Note: Signed host identity assertions are disabled on this Embed
                        (useHostUserContext = false). Queries execute with Anonymous (everyone)
                        clearance.
                      </div>
                    )}
                  </Card>

                  {/* MODE 4: INLINE ASSISTANT (SU-EMBED-INLINE) */}
                  {activeMode === 'inline' && (
                    <div
                      className="bg-surface border-2 shadow-sm overflow-hidden"
                      style={{
                        borderColor: `${accentHex}4D`,
                        borderRadius: surfaceRadius,
                      }}
                    >
                      <div className="px-4 py-2.5 bg-accent/5 border-b border-line flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <SquareTerminal
                            className="w-4 h-4"
                            style={{ color: accentHex }}
                          />
                          <span className="text-xs font-semibold text-ink">
                            {currentEmbed?.name} (Inline Component · &lt;OKEngAsk /&gt;)
                          </span>
                        </div>
                        <span className="text-2xs font-mono text-ink-muted">
                          SU-EMBED-INLINE
                        </span>
                      </div>
                      <div className="h-[420px] flex flex-col">
                        {renderAssistantFeed(false)}
                      </div>
                    </div>
                  )}

                  {/* Simulated Host Application Settings Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card variant="surface" padding="md" className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                        <Shield
                          className="w-4 h-4"
                          style={{ color: accentHex }}
                        />
                        <span>Identity Provider Connection</span>
                      </div>
                      <Text variant="caption" tone="secondary">
                        Connect SAML 2.0 or OIDC assertions to map host user roles to OKEng
                        collection visibility tiers.
                      </Text>
                    </Card>
                    <Card variant="surface" padding="md" className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                        <BookOpen
                          className="w-4 h-4"
                          style={{ color: accentHex }}
                        />
                        <span>Active Knowledge Scope</span>
                      </div>
                      <Text variant="caption" tone="secondary">
                        Authorized collections for{' '}
                        <strong>{effectiveClearance.toUpperCase()}</strong>:{' '}
                        {authorizedEmbedCollections
                          .map((c) => c.name)
                          .join(', ') || 'None'}
                        .
                      </Text>
                    </Card>
                  </div>
                </div>
              </main>

              {/* MODE 2: SLIDE-IN PANEL (SU-EMBED-PANEL — Respects width & position) */}
              {activeMode === 'panel' && (
                <div
                  className="h-full shrink-0 flex flex-col"
                  style={{ width: surfaceWidth }}
                >
                  <Drawer
                    isOpen={true}
                    onClose={() => setActiveMode('widget')}
                    size="sm"
                    position={panelPosition}
                    inline
                    title={currentEmbed?.name || 'Knowledge Panel'}
                    subtitle={`SU-EMBED-PANEL · ${surfaceWidth} · ${panelPosition}`}
                  >
                    <div className="-m-5 h-[calc(100%+2.5rem)] flex flex-col">
                      {renderAssistantFeed(true)}
                    </div>
                  </Drawer>
                </div>
              )}

              {/* MODE 6: CONTEXTUAL HELP SIDEBAR (SU-EMBED-CONTEXTUAL-HELP — Respects width, position & showNavigation) */}
              {activeMode === 'contextual' && (
                <aside
                  className={`bg-surface ${
                    panelPosition === 'left'
                      ? 'border-r border-line order-first'
                      : 'border-l border-line'
                  } flex flex-col shrink-0 h-full shadow-lg`}
                  style={{ width: surfaceWidth }}
                >
                  <div className="px-4 py-3 border-b border-line bg-canvas flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Compass
                        className="w-4 h-4"
                        style={{ color: accentHex }}
                      />
                      <span className="text-xs font-semibold text-ink">
                        {useCurrentPage && matchedRouteRule?.promptTitle
                          ? matchedRouteRule.promptTitle
                          : 'Contextual Help'}
                      </span>
                    </div>
                    <span className="text-2xs font-mono text-ink-muted">
                      {simulatedRoute}
                    </span>
                  </div>

                  {/* Pinned / Route-Matched Documents */}
                  {showNavigation && (
                    <div className="p-3.5 border-b border-line bg-canvas/50 space-y-2">
                      <div className="text-2xs font-mono uppercase tracking-wider text-ink-muted">
                        Pinned Articles for this Route ({accessibleDocuments.length})
                      </div>
                      <div className="space-y-1">
                        {accessibleDocuments.slice(0, 3).map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => {
                              setSelectedDocId(doc.id);
                              setActiveMode('documentation');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xs bg-surface hover:bg-surface-hover border border-line text-xs text-ink flex items-center justify-between gap-2 transition-colors"
                          >
                            <span className="truncate font-medium">
                              {doc.title}
                            </span>
                            <span
                              className="text-2xs font-mono shrink-0"
                              style={{ color: accentHex }}
                            >
                              Read →
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 min-h-0">{renderAssistantFeed(true)}</div>
                </aside>
              )}

              {/* MODE 1: FLOATING WIDGET (SU-EMBED-CHAT — Respects width, position, radius, accentColor & initialState) */}
              {activeMode === 'widget' && (
                <div
                  className={`absolute ${widgetCornerClass} z-20 flex flex-col items-end`}
                >
                  {isWidgetOpen ? (
                    <div
                      className="h-[520px] bg-surface border border-line shadow-xl flex flex-col overflow-hidden"
                      style={{
                        width: surfaceWidth,
                        borderRadius: surfaceRadius,
                      }}
                    >
                      <div
                        className="px-4 py-3 text-surface flex items-center justify-between shrink-0"
                        style={{ backgroundColor: accentHex }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe className="w-4 h-4 text-surface shrink-0" />
                          <div className="truncate">
                            <div className="text-xs font-semibold truncate">
                              {currentEmbed?.name || 'Product Help'}
                            </div>
                            <div className="text-2xs font-mono opacity-85">
                              SU-EMBED-CHAT · {effectiveClearance.toUpperCase()}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsWidgetOpen(false)}
                          aria-label="Minimize widget"
                          className="p-1 rounded-xs hover:bg-surface/15 text-surface transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 min-h-0">
                        {renderAssistantFeed(true)}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsWidgetOpen(true)}
                      className="px-4 py-2.5 text-surface shadow-lg text-xs font-medium flex items-center gap-2 hover:opacity-95 transition-opacity"
                      style={{
                        backgroundColor: accentHex,
                        borderRadius: surfaceRadius,
                      }}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{currentEmbed?.name || 'Ask OKEng'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
