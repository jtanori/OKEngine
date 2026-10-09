import React from 'react';
import { FolderKanban, ArrowRight, FileText, CheckCircle2, Clock } from 'lucide-react';
import { Collection } from '../types';
import { Card, Text, AccessBadge, Divider } from './ui';
import { useI18n } from '../i18n/I18nContext';

// ============================================================================
// UI-01 §2.2 & 02_component_catalog.md: Collection Summary Card (CO-COLLECTION-CARD)
// ============================================================================

export interface CollectionCardProps {
  collection: Collection;
  totalCount: number;
  readyCount: number;
  processingCount: number;
  onSelect: (collectionId: string) => void;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  totalCount,
  readyCount,
  processingCount,
  onSelect,
}) => {
  const { t } = useI18n();

  return (
    <Card
      variant="surface"
      padding="none"
      interactive
      onClick={() => onSelect(collection.id)}
      className="group flex flex-col justify-between p-5"
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xs bg-subtle border border-line flex items-center justify-center text-ink shrink-0">
              <FolderKanban className="w-3.5 h-3.5" />
            </div>
            <Text variant="h2" tone="primary" className="group-hover:text-accent transition-colors">
              {collection.name}
            </Text>
          </div>
          <AccessBadge visibility={collection.visibility} />
        </div>
        <Text variant="body" tone="secondary" className="line-clamp-2 mb-5">
          {collection.description}
        </Text>
      </div>

      <div>
        <Divider className="mb-3" />
        <div className="flex items-center justify-between text-2xs font-mono text-ink-secondary">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>
                {totalCount} {t('common.documents', 'docs').toLowerCase()}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-success">
              <CheckCircle2 className="w-3 h-3" />
              <span>
                {readyCount} {t('common.ready', 'ready').toLowerCase()}
              </span>
            </span>
            {processingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-warning">
                <Clock className="w-3 h-3" />
                <span>{processingCount}</span>
              </span>
            )}
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Card>
  );
};
