import React, { useState, useEffect, useMemo } from 'react';
import { Send, AlertCircle, Terminal } from 'lucide-react';
import { store } from '../../services/store';
import {
  getEmbedCollectionIds,
  resolveEmbedAuthorization,
  clearanceLabelToEmbedIdentity,
} from '../../services/embedAuthorization';
import { SourceCitation, DocumentNextStep } from '../../types';
import { ContentRenderer } from '../../content';
import { useI18n } from '../../i18n/I18nContext';
import { Card, Box, Text, Input, Button, InfoPopover } from '../ui';
import { NextStepButton } from '../NextStepButton';
import { validatePlainText } from '../../services/formSecurity';

// ============================================================================
// UI-01 §2.2, PUBLIC-01 §12 & PUBLIC-02: Dogfood Inline Ask Box (CO-ASK-BOX)
// Consumes a real OKEng Embed instance through the canonical pipeline:
// Host Context + Identity Assertion -> resolveEmbedAuthorization -> Retrieval -> Answer + Citations + CTA
// ============================================================================

export type HostSimulatedIdentity = 'anonymous' | 'member' | 'admin';

export interface DogfoodInlineBotProps {
  embedId: 'EMB-PUBLIC-HOME' | 'EMB-PUBLIC-DOCS' | 'EMB-PUBLIC-LEGAL';
  title?: string;
  subtitle?: string;
  suggestedQuestions?: string[];
  hostIdentityMode?: HostSimulatedIdentity;
  hostCurrentUrl?: string;
  hostContextLabel?: string;
  externalTriggerQuestion?: { question: string; nonce: number } | null;
  onActiveQuestionChange?: (question: string | null) => void;
  onSelectCitationSlug?: (slug: string) => void;
  onNavigateUrl?: (url: string) => void;
}

export const DogfoodInlineBot: React.FC<DogfoodInlineBotProps> = ({
  embedId,
  title,
  subtitle,
  suggestedQuestions = [],
  hostIdentityMode = 'anonymous',
  hostCurrentUrl = '/',
  hostContextLabel,
  externalTriggerQuestion,
  onActiveQuestionChange,
  onSelectCitationSlug,
  onNavigateUrl,
}) => {
  const { language, t } = useI18n();
  const embed = store.getPublicEmbed(embedId);
  const workspace = store.getWorkspace();
  const allCollections = store.getCollections();
  const [question, setQuestion] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [askedQuestion, setAskedQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string>('');
  const [sources, setSources] = useState<SourceCitation[]>([]);
  const [nextStep, setNextStep] = useState<DocumentNextStep | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Derive target and authorized collection scope via the single canonical resolver
  const targetCollectionIds = useMemo(() => getEmbedCollectionIds(embed), [embed]);
  const resolvedIdentity = useMemo(
    () =>
      clearanceLabelToEmbedIdentity(
        hostIdentityMode === 'admin'
          ? 'admin'
          : hostIdentityMode === 'member'
          ? 'member'
          : 'anonymous'
      ),
    [hostIdentityMode]
  );

  const authorizationScope = useMemo(
    () =>
      resolveEmbedAuthorization(
        resolvedIdentity,
        targetCollectionIds,
        allCollections
      ),
    [resolvedIdentity, targetCollectionIds, allCollections]
  );

  const authorizedCollections = useMemo(() => {
    const allowedSet = new Set(authorizationScope.collectionIds);
    return allCollections.filter((c) => allowedSet.has(c.id));
  }, [allCollections, authorizationScope]);

  const executeQuery = async (
    queryText: string,
    overrideIdentityMode?: HostSimulatedIdentity,
    overrideCurrentUrl?: string
  ) => {
    if (isStreaming) return;

    const validation = validatePlainText(queryText, {
      required: true,
      minLength: 2,
      maxLength: 500,
      fieldLabel: t('chat.ask_button', 'Question'),
    });

    if (!validation.valid) {
      setInputError(
        t(validation.errorKey || 'validation.query_required', validation.errorMessage)
      );
      return;
    }

    setInputError(null);
    const trimmed = validation.sanitizedValue;

    if (!embed) {
      setErrorState(
        t(
          'public.bot.error_missing_embed',
          'Embed configuration not found in workspace.'
        )
      );
      return;
    }

    const activeIdentityMode = overrideIdentityMode ?? hostIdentityMode;
    const activeCurrentUrl = overrideCurrentUrl ?? hostCurrentUrl;

    setAskedQuestion(trimmed);
    onActiveQuestionChange?.(trimmed);
    setAnswer('');
    setSources([]);
    setNextStep(null);
    setErrorState(null);
    setIsStreaming(true);

    try {
      const readyDocs = store
        .getDocuments()
        .filter((d) => d.status === 'ready' && !d.deletedAt);

      // EMBED-01: When the host supplies an authenticated identity (member or admin),
      // request a real short-lived HMAC-SHA256 assertion from the host backend signer
      // so /api/chat/stream verifies the signature through resolveRequestEmbedIdentity.
      let signedToken: string | undefined;
      if (activeIdentityMode === 'member' || activeIdentityMode === 'admin') {
        const now = Math.floor(Date.now() / 1000);
        const signRes = await fetch('/api/auth/token/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signingSecret: workspace.signingSecret,
            claims: {
              workspace_id: workspace.id,
              embed_id: embedId,
              sub:
                activeIdentityMode === 'admin'
                  ? 'usr_demo_admin'
                  : 'usr_demo_member',
              role: activeIdentityMode,
              iat: now,
              exp: now + 300,
            },
          }),
        });
        if (!signRes.ok) {
          throw new Error(`Host token signer returned HTTP ${signRes.status}`);
        }
        const signData = await signRes.json();
        signedToken = signData.token;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (signedToken) {
        headers['Authorization'] = `Bearer ${signedToken}`;
      }

      // Pass the full workspace corpus and targetScopeCollectionIds; server-side
      // resolveRequestEmbedIdentity -> resolveEmbedAuthorization enforces pre-retrieval filtering.
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: 'embed',
          embedId,
          question: trimmed,
          workspaceId: workspace.id,
          currentUrl: activeCurrentUrl,
          role:
            activeIdentityMode === 'admin'
              ? 'admins'
              : activeIdentityMode === 'member'
              ? 'members'
              : 'everyone',
          token: signedToken,
          targetScopeCollectionIds: Array.from(targetCollectionIds),
          collections: allCollections,
          documents: readyDocs,
          embeds: store.getEmbeds(),
          uiLanguage: language,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat service returned HTTP ${response.status}`);
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

        for (const block of lines) {
          const line = block.trim();
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.substring(6));
            if (payload.type === 'metadata') {
              if (Array.isArray(payload.sources)) {
                setSources(payload.sources);
                if (payload.nextStep) {
                  setNextStep(payload.nextStep);
                } else if (payload.sources.length > 0) {
                  const topDoc = readyDocs.find(
                    (d) => d.id === payload.sources[0].docId
                  );
                  if (topDoc?.nextStep) {
                    setNextStep(topDoc.nextStep);
                  }
                }
              }
            } else if (payload.type === 'chunk' && payload.text) {
              setAnswer((prev) => prev + payload.text);
            }
          } catch {
            // ignore partial SSE line
          }
        }
      }
    } catch {
      // PUBLIC-01 §42: Failure isolation — chat errors never crash the host page
      setErrorState(
        t(
          'public.bot.error_unavailable',
          'Chat service is temporarily unavailable. Public documentation remains accessible.'
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    if (externalTriggerQuestion && externalTriggerQuestion.question) {
      setQuestion(externalTriggerQuestion.question);
      setInputError(null);
      executeQuery(externalTriggerQuestion.question);
    }
  }, [externalTriggerQuestion?.nonce]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeQuery(question);
  };

  const resolvedTitle = title || t('public.bot.home_title', 'Ask OKEng');
  const collectionNames =
    authorizedCollections.map((c) => c.name).join(', ') ||
    t('common.everyone', 'Public');
  const collectionIds =
    authorizationScope.collectionIds.join(', ') || 'COL-PUBLIC';

  const identityLabel =
    hostIdentityMode === 'admin'
      ? `${t('common.admins', 'Admin')} (Signed HMAC Assertion)`
      : hostIdentityMode === 'member'
      ? `${t('common.members', 'Member')} (Signed HMAC Assertion)`
      : `${t('common.everyone', 'Visitor')} (Anonymous)`;

  return (
    <Card variant="surface" padding="none">
      {/* Embed Header Bar */}
      <div className="px-5 py-3 bg-elevated border-b border-line rounded-t-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="w-3.5 h-3.5 text-accent shrink-0" />
          <Text variant="h3" tone="primary" className="truncate">
            {resolvedTitle}
          </Text>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {embed?.contextConfig?.useCurrentPage && (
            <span className="hidden sm:inline-block font-mono text-2xs text-ink-secondary">
              {t('public.host.context_short', 'Context:')} {hostCurrentUrl}
            </span>
          )}
          <InfoPopover
            title={t('info.assistant_details', 'Assistant & Knowledge Scope Details')}
            description={t(
              'info.assistant_desc',
              'This assistant retrieves answers strictly from the authorized collections listed below before generating a response.'
            )}
            items={[
              {
                label: t('info.embed_name', 'Assistant Name'),
                value: embed?.name || resolvedTitle,
                mono: false,
              },
              {
                label: t('info.embed_id', 'System Embed ID'),
                value: embedId,
              },
              {
                label: t('info.surface_mode', 'Presentation Mode'),
                value: 'Inline Assistant',
                mono: false,
              },
              {
                label: t('info.collections', 'Authorized Collections'),
                value: collectionNames,
                mono: false,
              },
              {
                label: t('info.collection_ids', 'Effective Collection IDs'),
                value: collectionIds,
              },
              {
                label: t('info.access_level', 'Active Host Identity'),
                value: identityLabel,
                mono: false,
              },
            ]}
          />
        </div>
      </div>

      <div className="p-5 space-y-4">
        {subtitle && (
          <Text variant="body" tone="secondary">
            {subtitle}
          </Text>
        )}

        {/* Suggested Questions (PUBLIC-01 §12) */}
        {suggestedQuestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isStreaming}
                onClick={() => {
                  setQuestion(q);
                  setInputError(null);
                  executeQuery(q);
                }}
                className="text-left px-2.5 py-1 bg-elevated hover:bg-subtle border border-line rounded-xs text-2xs text-ink transition-colors cursor-pointer disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} noValidate className="flex items-start gap-2">
          <div className="flex-1">
            <Input
              type="text"
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder={
                embed?.placeholderText ||
                t('chat.placeholder', 'Ask a question about the documentation...')
              }
              hint={t(
                'public.bot.scope_hint',
                'Pre-retrieval authorization filters collections before scoring or answer generation.'
              )}
              error={inputError || undefined}
              disabled={isStreaming}
              aria-label={resolvedTitle}
            />
          </div>
          <Button
            variant="primary"
            size="md"
            type="submit"
            isLoading={isStreaming}
            className="shrink-0"
          >
            {!isStreaming && <Send className="w-3.5 h-3.5" />}
            <span>
              {isStreaming ? t('common.loading', 'Loading...') : t('chat.ask_button', 'Ask')}
            </span>
          </Button>
        </form>

        {/* Failure Isolation Banner (PUBLIC-01 §42) */}
        {errorState && (
          <Box surface="danger" padding="xs" radius="sm" className="flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorState}</span>
          </Box>
        )}

        {/* Answer, Unified Source Citations & Next-Step CTA (PUBLIC-01 §13–16) */}
        {askedQuestion && !errorState && (
          <div className="pt-3 border-t border-line space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Text variant="mono" tone="secondary">
                Q: <span className="text-ink font-medium">{askedQuestion}</span>
              </Text>
              {embed?.contextConfig?.useCurrentPage && (
                <Text variant="mono" tone="secondary" className="text-2xs">
                  {t('public.host.context_used', "You're viewing:")}{' '}
                  <span className="text-ink">
                    {hostContextLabel || hostCurrentUrl}
                  </span>
                </Text>
              )}
            </div>

            <Box surface="elevated" padding="sm" radius="sm" className="space-y-3">
              <ContentRenderer
                content={answer || t('common.loading', 'Retrieving authorized chunks...')}
                context="CHAT_ANSWER"
                locale={language}
                roleKind={
                  hostIdentityMode === 'admin'
                    ? 'authenticated_editor'
                    : hostIdentityMode === 'member'
                    ? 'authenticated_reader'
                    : 'anonymous'
                }
                citations={sources.map((src) => ({
                  documentId: src.docId,
                  collectionId: src.collectionId || 'COL-PUBLIC',
                  title: src.title,
                  filename: src.filename,
                  excerpt: src.snippet,
                  language: src.language,
                }))}
                onOpenSource={
                  onSelectCitationSlug
                    ? (cit) => onSelectCitationSlug(cit.filename.replace(/\.md$/i, ''))
                    : undefined
                }
                onRegenerate={() => askedQuestion && executeQuery(askedQuestion)}
              />

              {nextStep && embed?.behaviorConfig?.ctaBehavior !== 'hidden' && (
                <NextStepButton
                  label={nextStep.label}
                  url={nextStep.url}
                  onTrigger={({ url }) => {
                    if (onNavigateUrl) {
                      onNavigateUrl(url);
                    } else if (url.startsWith('/docs/') && onSelectCitationSlug) {
                      onSelectCitationSlug(url.replace(/^\/docs\//, ''));
                    }
                  }}
                />
              )}
            </Box>
          </div>
        )}
      </div>
    </Card>
  );
};

