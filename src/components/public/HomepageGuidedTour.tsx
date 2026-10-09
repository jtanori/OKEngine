import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Compass,
  FileText,
  MessageSquare,
  RotateCcw,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import {
  APPROVED_HOMEPAGE_TOUR_CONTRACT,
  PUBLIC_DEMO_CONTEXT_ROUTES,
  resolveTourStageCapabilities,
  type HomepageTourStageContract,
  type HomepageTourStageId,
  type PublicDemoContextRoute,
  type PublicHomepageDemoPreset,
} from '../../data/homepageTourContract';
import {
  fetchHomepageDemoContext,
  streamHomepageDemoAnswer,
} from '../../services/homepageDemoStreamAdapter';
import {
  HomepageTourController,
  type DispatchedStreamIntent,
  type HomepageTourControllerState,
} from '../../services/homepageTourController';
import { Button, Text } from '../ui';
import { ContentRenderer } from '../../content';
import { useI18n } from '../../i18n/I18nContext';

export interface HomepageGuidedTourProps {
  openFromHeroRequest?: { nonce: number } | null;
  heroButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onSelectCitationSlug: (slug: string) => void;
  onNavigateUrl: (url: string) => void;
}

export const HomepageGuidedTour: React.FC<HomepageGuidedTourProps> = ({
  openFromHeroRequest,
  heroButtonRef,
  onSelectCitationSlug,
  onNavigateUrl,
}) => {
  const { t, language } = useI18n();
  const stages = APPROVED_HOMEPAGE_TOUR_CONTRACT;

  const controllerRef = useRef<HomepageTourController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new HomepageTourController();
  }
  const controller = controllerRef.current;

  const [state, setState] = useState<HomepageTourControllerState>(() =>
    controller.getState()
  );
  const [followUpInput, setFollowUpInput] = useState('');
  const [expandedCitationExchangeIds, setExpandedCitationExchangeIds] =
    useState<Record<string, boolean>>({});

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const settingsToggleRef = useRef<HTMLButtonElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const conversationScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubscribe = controller.subscribe((nextState) => {
      setState({ ...nextState });
    });
    return () => {
      unsubscribe();
    };
  }, [controller]);

  useEffect(() => {
    return () => {
      controller.unmount();
    };
  }, [controller]);

  const executeStreamIntent = (intent: DispatchedStreamIntent | null) => {
    if (!intent) return;
    const uiLang: 'en' | 'es' = language === 'es' ? 'es' : 'en';
    void streamHomepageDemoAnswer({
      requestId: intent.requestId,
      exchangeId: intent.exchangeId,
      tourRunId: intent.tourRunId,
      question: intent.question,
      preset: intent.preset,
      currentUrl: intent.currentUrl,
      language: uiLang,
      stageId: intent.kind === 'stage_canonical' ? intent.stageId : undefined,
      signal: intent.signal,
      callbacks: {
        onMetadata: (ev) => controller.handleMetadataEvent(ev),
        onDelta: (ev) => controller.handleDeltaEvent(ev),
        onDone: (ev) => controller.handleDoneEvent(ev),
        onError: (ev) => controller.handleErrorEvent(ev),
      },
    });
  };

  // Handle Hero CTA ("What is OKEng?") open request
  const lastHeroNonceRef = useRef<number | null>(null);
  useEffect(() => {
    if (
      openFromHeroRequest &&
      openFromHeroRequest.nonce !== lastHeroNonceRef.current
    ) {
      lastHeroNonceRef.current = openFromHeroRequest.nonce;
      const intent = controller.openAssistant('hero_cta');
      executeStreamIntent(intent);
    }
  });

  const latestExchange =
    state.conversation.exchanges[state.conversation.exchanges.length - 1];

  // Keep the latest submitted question displayed at the top of the visible scroll area when responses load
  useEffect(() => {
    const container = conversationScrollRef.current;
    if (!container || !latestExchange) return;

    const alignLatestQuestionToTop = () => {
      const promptEl = container.querySelector<HTMLElement>(
        `[data-testid="tour-exchange-prompt-${latestExchange.exchangeId}"]`
      );
      if (!promptEl) return;

      if (
        state.conversation.exchanges.length === 1 &&
        container.scrollHeight <= container.clientHeight
      ) {
        container.scrollTop = 0;
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const promptRect = promptEl.getBoundingClientRect();
      const topPadding = 12;
      const targetScrollTop =
        container.scrollTop + (promptRect.top - containerRect.top) - topPadding;

      container.scrollTop = Math.max(0, targetScrollTop);
    };

    alignLatestQuestionToTop();
    const rafId = requestAnimationFrame(alignLatestQuestionToTop);
    return () => cancelAnimationFrame(rafId);
  }, [
    latestExchange?.exchangeId,
    latestExchange?.status,
    latestExchange?.answerMarkdown,
    state.conversation.exchanges.length,
    state.requestLifecycle.status,
  ]);

  // Focus management & layered Escape / Tab trap when dialog is open
  const prevIsOpenRef = useRef<boolean>(state.display.isOpen);
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    const isOpen = state.display.isOpen;
    prevIsOpenRef.current = isOpen;

    if (!wasOpen && isOpen) {
      requestAnimationFrame(() => {
        closeBtnRef.current?.focus();
      });
    } else if (wasOpen && !isOpen) {
      const triggerKind = state.display.lastTriggerKind;
      requestAnimationFrame(() => {
        if (triggerKind === 'hero_cta' && heroButtonRef?.current) {
          heroButtonRef.current.focus();
        } else {
          launcherRef.current?.focus();
        }
      });
    }
  }, [state.display.isOpen, state.display.lastTriggerKind, heroButtonRef]);

  useEffect(() => {
    if (!state.display.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        const result = controller.handleDismiss('escape');
        if (result === 'closed_settings') {
          requestAnimationFrame(() => {
            settingsToggleRef.current?.focus();
          });
        }
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.display.isOpen, controller]);

  const activeStage: HomepageTourStageContract = useMemo(
    () =>
      stages.find((s) => s.stageId === state.tourSession.activeStageId) ??
      stages[0],
    [stages, state.tourSession.activeStageId]
  );

  const resolvedCapabilities = useMemo(
    () => resolveTourStageCapabilities(activeStage),
    [activeStage]
  );

  const handleStageSelect = (stageId: HomepageTourStageId) => {
    const intent = controller.dispatchStageQuestion(stageId);
    executeStreamIntent(intent);
  };

  const handleAdvanceNextStage = () => {
    const intent = controller.advanceToNextStage();
    executeStreamIntent(intent);
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpInput.trim()) return;
    const promptToSend = followUpInput;
    setFollowUpInput('');
    const intent = controller.dispatchFollowUpQuestion(promptToSend);
    executeStreamIntent(intent);
  };

  const handleRunRefusalProbe = () => {
    const intent = controller.dispatchRefusalProbe();
    executeStreamIntent(intent);
  };

  const handleApplySettings = async () => {
    const op = controller.beginApplySettings();
    if (!op) return;
    try {
      const response = await fetchHomepageDemoContext({
        preset: op.preset,
        currentUrl: op.currentUrl,
      });
      controller.commitSettingsSuccess(op.opId, response);
    } catch (err: unknown) {
      controller.commitSettingsFailure(
        op.opId,
        err instanceof Error ? err.message : 'Failed to apply demo settings'
      );
    }
  };

  const handleResetDemo = async () => {
    const op = controller.beginResetDemo();
    if (!op) return;
    try {
      const response = await fetchHomepageDemoContext({
        preset: op.preset,
        currentUrl: op.currentUrl,
      });
      controller.commitSettingsSuccess(op.opId, response);
    } catch (err: unknown) {
      controller.commitSettingsFailure(
        op.opId,
        err instanceof Error ? err.message : 'Failed to reset demo settings'
      );
    }
  };

  const handleRestartTour = () => {
    const intent = controller.restartTour();
    executeStreamIntent(intent);
  };

  const handleCitationClick = (url: string, filename: string) => {
    if (url.startsWith('/docs/')) {
      onSelectCitationSlug(url.replace(/^\/docs\//, ''));
      return;
    }
    if (url === '/terms' || url === '/privacy' || url === '/acceptable-use') {
      onNavigateUrl(url);
      return;
    }
    onSelectCitationSlug(filename.replace(/\.md$/i, ''));
  };

  const completedSet = useMemo(
    () => new Set(state.tourSession.completedStageIds),
    [state.tourSession.completedStageIds]
  );

  return (
    <>
      {/* Floating Launcher (Visible when assistant panel is closed) */}
      {!state.display.isOpen && (
        <div className="fixed bottom-5 right-5 !m-0 z-40">
          <button
            ref={launcherRef}
            type="button"
            data-testid="homepage-tour-launcher"
            onClick={() => {
              const intent = controller.openAssistant('launcher');
              executeStreamIntent(intent);
            }}
            aria-label={t(
              'public.tour.launcher_label',
              'Guided Tour Assistant'
            )}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-ink text-surface rounded-sm border border-ink shadow-md hover:bg-ink/90 transition-colors cursor-pointer text-xs font-medium"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>{t('public.tour.hero_primary_cta', 'What is OKEng?')}</span>
            <span className="font-mono text-2xs px-1.5 py-0.5 bg-surface/15 rounded-xs">
              {completedSet.size}/{stages.length}
            </span>
          </button>
        </div>
      )}

      {/* Floating Conversational Guided Tour Dialog */}
      {state.display.isOpen && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="homepage-tour-dialog-title"
          data-testid="homepage-guided-tour"
          className="fixed inset-x-0 bottom-0 !m-0 w-full h-[90dvh] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[420px] sm:h-[640px] sm:max-h-[calc(100dvh-2.5rem)] z-50 bg-surface border border-line sm:rounded-sm shadow-xl flex flex-col overflow-hidden"
        >
          {/* Dialog Header */}
          <div className="px-4 py-3 bg-elevated border-b border-line flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Compass className="w-4 h-4 text-accent shrink-0" />
              <h2
                id="homepage-tour-dialog-title"
                className="text-xs font-semibold text-ink truncate"
              >
                {t('public.tour.heading', 'Guided Product Tour')}
              </h2>
              <span className="font-mono text-2xs text-ink-secondary">
                {activeStage.stageNumber}/{stages.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                ref={settingsToggleRef}
                type="button"
                data-testid="homepage-tour-settings-toggle"
                aria-expanded={state.display.isSettingsDrawerOpen}
                onClick={() => controller.toggleSettingsDrawer()}
                className={`hidden px-2 py-1 rounded-xs border text-2xs font-mono items-center gap-1 transition-colors cursor-pointer ${
                  state.display.isSettingsDrawerOpen
                    ? 'bg-ink text-surface border-ink'
                    : 'bg-surface text-ink-secondary border-line hover:text-ink'
                }`}
              >
                <Settings className="w-3 h-3" />
                <span>{t('public.tour.demo_settings', 'Demo settings')}</span>
              </button>

              <button
                ref={closeBtnRef}
                type="button"
                data-testid="homepage-tour-close"
                aria-label={t('public.tour.close_label', 'Close assistant')}
                onClick={() => controller.handleDismiss('close_button')}
                className="p-1 rounded-xs text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 5-Stage Stepper Controller */}
          <div
            role="tablist"
            aria-label={t('public.tour.stages_aria', 'Homepage tour stages')}
            className="px-4 py-2 border-b border-line bg-surface grid grid-cols-5 gap-1.5 items-center shrink-0"
          >
            {stages.map((stage) => {
              const isActive = stage.stageId === activeStage.stageId;
              const isCompleted = completedSet.has(stage.stageId);
              const stageTitle = t(stage.titleKey, stage.title);
              return (
                <button
                  key={stage.stageId}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={stageTitle}
                  title={stageTitle}
                  data-testid={`tour-stage-tab-${stage.stageNumber}`}
                  onClick={() => handleStageSelect(stage.stageId)}
                  className="group py-1.5 flex items-center cursor-pointer focus:outline-none"
                >
                  <span
                    className={`block h-1 w-full rounded-xs transition-colors ${
                      isActive
                        ? 'bg-ink'
                        : isCompleted
                        ? 'bg-accent'
                        : 'bg-line group-hover:bg-ink-muted'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Optional Collapsed Demo Settings Drawer */}
          {state.display.isSettingsDrawerOpen && (
            <div
              data-testid="homepage-tour-settings-drawer"
              className="p-3.5 bg-elevated border-b border-line space-y-3 text-xs shrink-0 max-h-[55%] overflow-y-auto"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink">
                  {t('public.tour.demo_settings', 'Demo settings')}
                </span>
                <span className="font-mono text-2xs text-ink-secondary">
                  {t('public.tour.active_identity', 'Identity:')}{' '}
                  {state.demoSettings.appliedSettings.preset} ·{' '}
                  {state.demoSettings.appliedSettings.currentUrl}
                </span>
              </div>

              {/* Preset Selector */}
              <div className="space-y-1">
                <label className="block text-2xs text-ink-secondary font-medium">
                  {t('public.host.identity_label', 'Identity:')}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['visitor', 'member', 'admin'] as PublicHomepageDemoPreset[]).map(
                    (presetOpt) => {
                      const selected =
                        state.demoSettings.draftSettings.preset === presetOpt;
                      const label =
                        presetOpt === 'admin'
                          ? t('public.host.identity_admin', 'Admin')
                          : presetOpt === 'member'
                          ? t('public.host.identity_member', 'Member')
                          : t('public.host.identity_visitor', 'Visitor');
                      return (
                        <button
                          key={presetOpt}
                          type="button"
                          disabled={state.demoSettings.status === 'applying'}
                          data-testid={`demo-preset-${presetOpt}`}
                          onClick={() =>
                            controller.updateDraftSettings({ preset: presetOpt })
                          }
                          className={`py-1.5 px-2 rounded-xs border text-2xs font-medium transition-colors cursor-pointer ${
                            selected
                              ? 'bg-ink text-surface border-ink'
                              : 'bg-surface text-ink border-line hover:bg-subtle'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Page Context Route Selector */}
              <div className="space-y-1">
                <label className="block text-2xs text-ink-secondary font-medium">
                  {t('public.host.context_label', 'Context:')}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {PUBLIC_DEMO_CONTEXT_ROUTES.map((routeOpt) => {
                    const selected =
                      state.demoSettings.draftSettings.currentUrl === routeOpt;
                    return (
                      <button
                        key={routeOpt}
                        type="button"
                        disabled={state.demoSettings.status === 'applying'}
                        data-testid={`demo-route-${routeOpt}`}
                        onClick={() =>
                          controller.updateDraftSettings({ currentUrl: routeOpt })
                        }
                        className={`py-1.5 px-2 rounded-xs border font-mono text-2xs truncate transition-colors cursor-pointer ${
                          selected
                            ? 'bg-ink text-surface border-ink'
                            : 'bg-surface text-ink border-line hover:bg-subtle'
                        }`}
                      >
                        {routeOpt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Server-Computed Collection Scope Status Table */}
              <div className="space-y-1">
                <span className="block text-2xs text-ink-secondary font-medium">
                  {t(
                    'public.tour.collection_status_heading',
                    'Server-computed collection scope'
                  )}
                </span>
                <div className="border border-line rounded-xs bg-surface divide-y divide-line">
                  {state.demoSettings.appliedSettings.collectionStatuses.map(
                    (row) => (
                      <div
                        key={row.collectionId}
                        className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-2xs font-mono"
                      >
                        <span className="truncate text-ink">
                          {row.collectionId} ({row.visibility})
                        </span>
                        <span
                          className={
                            row.authorized
                              ? 'text-accent font-semibold'
                              : 'text-ink-muted'
                          }
                        >
                          {row.authorized
                            ? `✓ ${t('public.tour.collection_authorized', 'Authorized')}`
                            : `✕ ${t('public.tour.collection_excluded', 'Excluded')}`}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {state.demoSettings.errorMessage && (
                <p className="text-2xs text-danger">
                  {state.demoSettings.errorMessage}
                </p>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={state.demoSettings.status === 'applying'}
                  data-testid="homepage-tour-reset-demo-btn"
                  onClick={handleResetDemo}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t('public.tour.reset_demo', 'Reset demo')}</span>
                </Button>

                <Button
                  size="sm"
                  variant="primary"
                  disabled={state.demoSettings.status === 'applying'}
                  data-testid="homepage-tour-apply-settings-btn"
                  onClick={handleApplySettings}
                >
                  <span>
                    {state.demoSettings.status === 'applying'
                      ? t('public.tour.applying_settings', 'Applying...')
                      : t('public.tour.apply_settings', 'Apply settings')}
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* TIER 1: PRIMARY — TOUR CONVERSATION STREAM */}
          <div
            ref={conversationScrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface"
          >
            {/* Active Stage Context Header */}
            <div className="p-3 bg-canvas border border-line rounded-xs space-y-1">
              <Text variant="caption" className="font-semibold text-ink">
                {t(activeStage.titleKey, activeStage.title)}
              </Text>
              <Text variant="caption" tone="secondary" className="leading-relaxed">
                {t(activeStage.needKey, activeStage.visitorNeed)}
              </Text>
            </div>

            {state.conversation.exchanges.map((ex) => (
              <div
                key={ex.exchangeId}
                data-testid={`tour-exchange-${ex.exchangeId}`}
                className="space-y-2.5"
              >
                {/* Visitor Prompt Bubble */}
                <div
                  data-testid={`tour-exchange-prompt-${ex.exchangeId}`}
                  className="flex flex-col items-end"
                >
                  <div className="max-w-[90%] px-3 py-2 bg-ink text-surface rounded-xs text-xs leading-relaxed">
                    {ex.prompt}
                  </div>
                  <span className="mt-1 font-mono text-2xs text-ink-muted">
                    {ex.presetUsed} · {ex.currentUrlUsed}
                  </span>
                </div>

                {/* Grounded Assistant Response Card */}
                <div className="p-3.5 bg-canvas border border-line rounded-xs space-y-3 text-xs">
                  {ex.status === 'streaming' && !ex.answerMarkdown && (
                    <div className="flex items-center gap-2 text-ink-secondary font-mono text-2xs">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse text-accent" />
                      <span>
                        {t(
                          'public.tour.streaming_status',
                          'Retrieving grounded answer...'
                        )}
                      </span>
                    </div>
                  )}

                  {ex.answerMarkdown && (
                    <ContentRenderer
                      content={ex.answerMarkdown}
                      context="EMBEDDED_CHAT"
                      locale={language}
                      roleKind="anonymous"
                      options={{
                        showActions: false,
                        showCitations: false,
                        showMetadata: false,
                        showTableOfContents: false,
                      }}
                    />
                  )}

                  {/* Verified Citations (only on completed grounded answers, collapsible & collapsed by default) */}
                  {ex.status === 'completed' && ex.sources.length > 0 && (
                    <div className="pt-2.5 border-t border-line space-y-2">
                      <button
                        type="button"
                        aria-expanded={Boolean(
                          expandedCitationExchangeIds[ex.exchangeId]
                        )}
                        data-testid={`tour-sources-toggle-${ex.exchangeId}`}
                        onClick={() =>
                          setExpandedCitationExchangeIds((prev) => ({
                            ...prev,
                            [ex.exchangeId]: !prev[ex.exchangeId],
                          }))
                        }
                        className="w-full flex items-center justify-between gap-2 font-mono text-2xs text-ink-secondary hover:text-ink transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-accent shrink-0" />
                          <span>
                            {t(
                              'public.tour.sources_heading',
                              'Verified sources'
                            )}{' '}
                            ({ex.sources.length})
                          </span>
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${
                            expandedCitationExchangeIds[ex.exchangeId]
                              ? 'rotate-180 text-ink'
                              : 'text-ink-muted'
                          }`}
                        />
                      </button>

                      {expandedCitationExchangeIds[ex.exchangeId] && (
                        <div className="flex flex-wrap gap-1.5">
                          {ex.sources.map((src) => (
                            <button
                              key={`${ex.exchangeId}-${src.docId}`}
                              type="button"
                              onClick={() =>
                                handleCitationClick(src.url, src.filename)
                              }
                              className="px-2 py-1 bg-surface border border-line rounded-xs text-2xs font-mono text-ink hover:border-ink transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3 text-accent shrink-0" />
                              <span className="truncate max-w-[180px]">
                                {src.title}
                              </span>
                              <span className="text-ink-muted">
                                ({src.collectionId})
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Conservative Missing-Topic Refusal Badge */}
                  {ex.status === 'refused' && (
                    <div className="pt-2 border-t border-line flex items-center gap-1.5 text-2xs font-mono text-ink-secondary">
                      <ShieldAlert className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span>
                        {t(
                          'public.tour.refusal_verified',
                          'Conservative refusal verified (CAP-MISSING-TOPIC-REFUSAL): 0 fabricated citations returned.'
                        )}
                      </span>
                    </div>
                  )}

                  {/* Failed Exchange Retry Controls (Separated Stage vs Follow-Up Retry) */}
                  {ex.status === 'failed' && (
                    <div className="pt-2 border-t border-line flex items-center justify-between gap-2">
                      <span className="text-2xs text-danger">
                        {ex.errorMessage || 'Request failed'}
                      </span>
                      {ex.kind === 'stage_canonical' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          data-testid="homepage-tour-retry-stage-btn"
                          onClick={() =>
                            executeStreamIntent(controller.retryStageQuestion())
                          }
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>
                            {t('public.tour.retry_stage', 'Retry stage question')}
                          </span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          data-testid="homepage-tour-retry-followup-btn"
                          onClick={() =>
                            executeStreamIntent(
                              controller.retryFollowUpQuestion()
                            )
                          }
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>
                            {t(
                              'public.tour.retry_followup',
                              'Retry follow-up question'
                            )}
                          </span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* TIER 2: NEXT — CONTRACT-DRIVEN PROGRESSION */}
          <div className="px-4 py-3 bg-elevated border-t border-line space-y-2 shrink-0">
            {activeStage.progression.kind === 'advance_stage' ? (
              <div>
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full justify-between"
                  data-testid="homepage-tour-next-stage-cta"
                  onClick={handleAdvanceNextStage}
                >
                  <span>
                    {t(
                      activeStage.progression.ctaLabelKey,
                      activeStage.progression.ctaLabelDefault
                    )}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    data-testid="homepage-tour-terminal-primary-cta"
                    onClick={() =>
                      onNavigateUrl(
                        activeStage.progression.kind === 'terminal'
                          ? activeStage.progression.primaryDestination.url
                          : '/signup'
                      )
                    }
                  >
                    <span>
                      {t(
                        activeStage.progression.primaryDestination.labelKey,
                        activeStage.progression.primaryDestination.label
                      )}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    data-testid="homepage-tour-terminal-secondary-cta"
                    onClick={() =>
                      onNavigateUrl(
                        activeStage.progression.kind === 'terminal'
                          ? activeStage.progression.secondaryDestination.url
                          : '/docs/getting-started'
                      )
                    }
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>
                      {t(
                        activeStage.progression.secondaryDestination.labelKey,
                        activeStage.progression.secondaryDestination.label
                      )}
                    </span>
                  </Button>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    data-testid="homepage-tour-restart-btn"
                    onClick={handleRestartTour}
                    className="text-2xs font-mono text-ink-secondary hover:text-ink flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>
                      {t(
                        activeStage.progression.restartActionLabelKey,
                        activeStage.progression.restartActionLabelDefault
                      )}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* TIER 3: SECONDARY — FOLLOW-UP INPUT & REFUSAL PROBE */}
          <div className="p-3 bg-surface border-t border-line space-y-2 shrink-0">
            <form
              data-testid="homepage-tour-followup-form"
              onSubmit={handleFollowUpSubmit}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                placeholder={t(
                  'public.tour.followup_placeholder',
                  'Ask a follow-up question...'
                )}
                aria-label={t(
                  'public.tour.followup_placeholder',
                  'Ask a follow-up question...'
                )}
                className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-canvas border border-line rounded-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink"
              />
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                disabled={!followUpInput.trim()}
                data-testid="homepage-tour-followup-submit"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('public.tour.followup_submit', 'Ask')}</span>
              </Button>
            </form>

            <div className="flex items-center justify-between gap-2 text-2xs">
              <button
                type="button"
                data-testid="homepage-tour-refusal-probe-btn"
                onClick={handleRunRefusalProbe}
                className="text-ink-secondary hover:text-ink font-mono flex items-center gap-1 cursor-pointer"
              >
                <ShieldAlert className="w-3 h-3 text-accent" />
                <span>
                  {t(
                    'public.tour.try_refusal_short',
                    'Try an unanswerable question'
                  )}
                </span>
              </button>

              <span className="font-mono text-ink-muted">EMB-PUBLIC-HOME</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
