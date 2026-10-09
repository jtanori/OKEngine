import React from 'react';
import { FileText, ExternalLink, Pencil } from 'lucide-react';
import { Card, Box, Badge, Text } from './ui';
import { useI18n } from '../i18n/I18nContext';
import { ContentRenderer } from '../content';

// ============================================================================
// UI-01 §2.2 & 02_component_catalog.md: Source Attribution List (CO-SOURCE-LIST)
// Renders verified source chips or excerpt cards from authorized retrieval.
// Supports onOpenDocument(docId) to jump directly into the File Editor (PAGE-APP-03).
// ============================================================================

export interface SourceExcerptItem {
  documentId: string;
  collectionId: string;
  documentTitle: string;
  filename: string;
  heading?: string;
  content?: string;
  lineStart?: number;
  lineEnd?: number;
  similarity?: number;
  language?: string;
}

export interface SourceListProps {
  sources: SourceExcerptItem[];
  variant?: 'chips' | 'excerpts';
  onOpenSource?: (source: SourceExcerptItem) => void;
  onOpenDocument?: (documentId: string) => void;
  className?: string;
}

export const SourceList: React.FC<SourceListProps> = ({
  sources,
  variant = 'chips',
  onOpenSource,
  onOpenDocument,
  className = '',
}) => {
  const { t, language: uiLanguage } = useI18n();

  if (sources.length === 0) return null;

  if (variant === 'chips') {
    return (
      <div className={`space-y-1.5 ${className}`.trim()}>
        <Text variant="mono-label" tone="secondary">
          {t('renderer.sources', 'Sources')} ({sources.length})
        </Text>
        <div className="flex flex-wrap gap-1.5">
          {sources.map((src, idx) => (
            <button
              key={`${src.documentId}-${idx}`}
              type="button"
              onClick={() => {
                if (onOpenDocument) {
                  onOpenDocument(src.documentId);
                } else {
                  onOpenSource?.(src);
                }
              }}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xs text-2xs font-mono bg-elevated text-ink border border-line hover:border-accent hover:text-accent transition-colors cursor-pointer"
            >
              <span className="font-semibold text-accent">[{idx + 1}]</span>
              <FileText className="w-3 h-3 text-ink-secondary" />
              <span>{src.filename}</span>
              {src.heading && <span className="text-ink-muted">§ {src.heading}</span>}
              {(onOpenSource || onOpenDocument) && (
                <ExternalLink className="w-2.5 h-2.5 text-ink-muted" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <Text variant="mono-label" tone="secondary" className="block">
        {t('chat.sources', 'Verified Source Excerpts')} ({sources.length})
      </Text>
      <div className="space-y-2">
        {sources.map((src, idx) => {
          const isActionable = Boolean(onOpenDocument || onOpenSource);
          return (
            <Box
              key={`${src.documentId}-${idx}`}
              surface="elevated"
              padding="xs"
              radius="sm"
              className="text-xs space-y-1.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-2xs font-mono">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge tone="accent" mono>
                    [{idx + 1}]
                  </Badge>
                  {isActionable ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenDocument) {
                          onOpenDocument(src.documentId);
                        } else {
                          onOpenSource?.(src);
                        }
                      }}
                      className="font-semibold text-ink hover:text-accent hover:underline inline-flex items-center gap-1.5 cursor-pointer truncate"
                    >
                      <span>{src.filename}</span>
                      {src.heading && <span className="text-ink-secondary">• {src.heading}</span>}
                    </button>
                  ) : (
                    <span className="font-semibold text-ink truncate">
                      {src.filename}
                      {src.heading ? ` • ${src.heading}` : ''}
                    </span>
                  )}
                  {src.language && (
                    <span className="text-ink-secondary">· source: {src.language}</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {src.similarity !== undefined && (
                    <span className="text-accent tabular-nums">
                      Score: {(src.similarity * 100).toFixed(0)}%
                    </span>
                  )}
                  {src.lineStart !== undefined && src.lineEnd !== undefined && (
                    <span className="text-ink-muted">
                      L{src.lineStart}–L{src.lineEnd}
                    </span>
                  )}
                  {onOpenDocument && (
                    <button
                      type="button"
                      onClick={() => onOpenDocument(src.documentId)}
                      title={t('editor.open_in_editor', 'Open in File Editor')}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-surface border border-line text-ink-secondary hover:text-accent hover:border-accent transition-colors cursor-pointer"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                      <span>{t('common.edit', 'Edit')}</span>
                    </button>
                  )}
                </div>
              </div>

              {src.content && (
                <ContentRenderer
                  content={src.content}
                  context="SOURCE_EXCERPT"
                  locale={uiLanguage}
                />
              )}
            </Box>
          );
        })}
      </div>
    </div>
  );
};
