import React, { useState, useMemo } from 'react';
import { Search, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { store } from '../services/store';
import { PageHeader } from '../components/PageHeader';
import { FeedbackControl } from '../components/FeedbackControl';
import { NextStepButton } from '../components/NextStepButton';
import { SourceList } from '../components/SourceList';
import { ChatMessage } from '../types';
import { ContentRenderer } from '../content';
import { useI18n } from '../i18n/I18nContext';
import {
  Card,
  Box,
  Input,
  Text,
  EmptyState,
  InfoPopover,
  SegmentedTabs,
  Badge,
} from '../components/ui';
import { containsUnsafePayload, sanitizePlainText } from '../services/formSecurity';

// ============================================================================
// PAGE-APP-07: Conversations & Operational Log (PA-INSPECTOR / SU-CONVERSATION-INSPECTOR)
//   - Level 2 Context: CO-PAGE-HEADER with summary telemetry badges
//   - Canonical Filter Model (§2.4): Search + Feedback Filter (All | Helpful | Unhelpful)
//   - Viewport-Bounded Master/Detail (§2.8): Independent scroll for Master Stream
//     and Detail Inspector
//   - Actionable Citations: CO-SOURCE-LIST with onOpenDocument -> File Editor
// ============================================================================

export interface ConversationsViewProps {
  onOpenDocument?: (documentId: string) => void;
}

type FeedbackFilter = 'all' | 'up' | 'down';

export const ConversationsView: React.FC<ConversationsViewProps> = ({
  onOpenDocument,
}) => {
  const { t, language } = useI18n();
  const [conversations] = useState<ChatMessage[]>(store.getConversations());
  const [search, setSearch] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>('all');
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(
    conversations[0] || null
  );

  const helpfulCount = useMemo(
    () => conversations.filter((c) => c.feedback === 'up').length,
    [conversations]
  );
  const unhelpfulCount = useMemo(
    () => conversations.filter((c) => c.feedback === 'down').length,
    [conversations]
  );

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (feedbackFilter === 'up' && c.feedback !== 'up') return false;
      if (feedbackFilter === 'down' && c.feedback !== 'down') return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        c.content.toLowerCase().includes(q) ||
        c.sources?.some(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.filename.toLowerCase().includes(q)
        )
      );
    });
  }, [conversations, feedbackFilter, search]);

  return (
    <div className="flex-1 flex flex-col lg:h-screen lg:overflow-hidden bg-canvas">
      <PageHeader
        title={t('conversations.title', 'Conversations & Operational Log')}
        description={t(
          'conversations.desc',
          'Audit inquiries asked by end-users, inspect cited documents, and monitor customer satisfaction ratings.'
        )}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral" mono>
              <MessageSquare className="w-3 h-3" />
              <span>{conversations.length} Total</span>
            </Badge>
            <Badge tone="success" mono>
              <ThumbsUp className="w-3 h-3" />
              <span>{helpfulCount} {t('conversations.filter_helpful', 'Helpful')}</span>
            </Badge>
            <Badge tone="danger" mono>
              <ThumbsDown className="w-3 h-3" />
              <span>{unhelpfulCount} {t('conversations.filter_unhelpful', 'Unhelpful')}</span>
            </Badge>
          </div>
        }
      />

      {/* Viewport-Bounded Split Master/Detail Inspector (32px workspace axis: p-8 w-full) */}
      <div className="flex-1 min-h-0 p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Left Column: Master Conversation Stream (Independent Scroll) */}
        <Card
          variant="surface"
          padding="none"
          className="lg:col-span-5 flex flex-col min-h-0 overflow-hidden"
        >
          {/* Canonical Filter Region for Conversation Stream */}
          <div className="p-3 border-b border-line bg-elevated space-y-2.5 shrink-0">
            <Input
              type="text"
              sizeVariant="sm"
              leadingIcon={<Search className="w-3.5 h-3.5" />}
              placeholder={t(
                'conversations.search_placeholder',
                'Search inquiries or citations...'
              )}
              error={searchError || undefined}
              aria-label={t(
                'conversations.search_placeholder',
                'Search inquiries or citations...'
              )}
              value={search}
              onChange={(e) => {
                const val = e.target.value;
                if (containsUnsafePayload(val)) {
                  setSearchError(t('validation.unsafe_input'));
                  setSearch(sanitizePlainText(val, 120));
                } else {
                  setSearchError(null);
                  setSearch(val.slice(0, 120));
                }
              }}
            />

            <div className="flex items-center justify-between gap-2">
              <SegmentedTabs<FeedbackFilter>
                size="sm"
                activeId={feedbackFilter}
                onChange={setFeedbackFilter}
                options={[
                  {
                    id: 'all',
                    label: `${t('conversations.filter_all', 'All')} (${conversations.length})`,
                  },
                  {
                    id: 'up',
                    label: `${t('conversations.filter_helpful', 'Helpful')} (${helpfulCount})`,
                  },
                  {
                    id: 'down',
                    label: `${t('conversations.filter_unhelpful', 'Unhelpful')} (${unhelpfulCount})`,
                  },
                ]}
              />
              <Text variant="mono" tone="secondary" className="tabular-nums text-2xs">
                {filtered.length}/{conversations.length}
              </Text>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-line">
            {filtered.length === 0 ? (
              <EmptyState
                title={t('conversations.empty', 'No conversation history matching current filter.')}
                className="border-0 rounded-none"
              />
            ) : (
              filtered.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const citationCount = msg.sources?.length || 0;
                return (
                  <div
                    key={msg.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedMessage(msg)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedMessage(msg);
                      }
                    }}
                    className={`p-4 cursor-pointer transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
                      isSelected
                        ? 'bg-elevated border-l-2 border-l-ink'
                        : 'hover:bg-elevated'
                    }`}
                  >
                    <div className="flex items-center justify-between text-2xs font-mono text-ink-muted mb-1">
                      <Badge
                        tone={msg.role === 'assistant' ? 'accent' : 'neutral'}
                        mono
                        uppercase
                      >
                        {msg.role}
                      </Badge>
                      <span className="tabular-nums">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <Text variant="h3" tone="primary" className="line-clamp-2 font-medium">
                      {msg.content}
                    </Text>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div>
                        {msg.feedback && (
                          <FeedbackControl feedback={msg.feedback} readOnly />
                        )}
                      </div>
                      {citationCount > 0 && (
                        <Text variant="mono" tone="secondary" className="text-2xs tabular-nums">
                          {citationCount} {citationCount === 1 ? 'citation' : 'citations'}
                        </Text>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Right Column: Inquiry Detail Inspector (Independent Scroll) */}
        <Card
          variant="surface"
          padding="md"
          className="lg:col-span-7 flex flex-col min-h-0 overflow-y-auto space-y-6"
        >
          {selectedMessage ? (
            <>
              <div className="flex items-center justify-between border-b border-line pb-4 shrink-0">
                <div>
                  <Text variant="h2" tone="primary">
                    {t('conversations.content_payload', 'Inquiry Details')}
                  </Text>
                  <Text variant="mono" tone="muted" className="block mt-0.5">
                    {new Date(selectedMessage.createdAt).toLocaleString()} ·{' '}
                    <span className="uppercase">{selectedMessage.role}</span>
                  </Text>
                </div>
                <div className="flex items-center gap-2">
                  {selectedMessage.feedback && (
                    <FeedbackControl feedback={selectedMessage.feedback} readOnly />
                  )}
                  <InfoPopover
                    title="Logged Conversation Metadata"
                    items={[
                      {
                        label: t('conversations.message_id', 'Message ID'),
                        value: selectedMessage.id,
                      },
                      {
                        label: 'Role',
                        value: selectedMessage.role,
                      },
                      {
                        label: t('conversations.cited_docs', 'Cited Documents'),
                        value: `${selectedMessage.sources?.length || 0}`,
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Text variant="mono-label" tone="secondary" className="block">
                  {t('conversations.content_payload', 'Content Payload')}
                </Text>
                <Box surface="elevated" padding="sm" radius="sm">
                  <ContentRenderer
                    content={selectedMessage.content}
                    context="CHAT_MESSAGE"
                    locale={language}
                    roleKind="authenticated_editor"
                    citations={
                      selectedMessage.sources?.map((s) => ({
                        documentId: s.docId,
                        collectionId: s.collectionId || 'COL-PUBLIC',
                        title: s.title,
                        filename: s.filename,
                        excerpt: s.snippet,
                        language: s.language,
                      })) || []
                    }
                  />
                </Box>
              </div>

              {selectedMessage.cta && (
                <div className="space-y-1.5">
                  <Text variant="mono-label" tone="secondary" className="block">
                    {t('conversations.next_step_offered', 'Next-Step Action Offered')}
                  </Text>
                  <NextStepButton
                    label={selectedMessage.cta.label}
                    url={selectedMessage.cta.url}
                  />
                </div>
              )}

              {/* Canonical Actionable Source List (CO-SOURCE-LIST -> Opens File Editor) */}
              {selectedMessage.sources && selectedMessage.sources.length > 0 && (
                <div className="pt-3 border-t border-line">
                  <SourceList
                    variant="excerpts"
                    onOpenDocument={onOpenDocument}
                    sources={selectedMessage.sources.map((src) => ({
                      documentId: src.docId,
                      collectionId: src.collectionId || 'COL-PUBLIC',
                      documentTitle: src.title,
                      filename: src.filename,
                      content: src.snippet,
                      similarity: src.similarity,
                      language: src.language,
                    }))}
                  />
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title={t('conversations.select_prompt', 'Select a conversation entry from the log.')}
            />
          )}
        </Card>
      </div>
    </div>
  );
};
